import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { parseRelatorioUpseller } from "@/lib/upseller";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const arquivo = form?.get("arquivo");
  if (!(arquivo instanceof File)) {
    return NextResponse.json(
      { erro: "Envie o arquivo .xlsx no campo 'arquivo'" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await arquivo.arrayBuffer());

  let resultado;
  try {
    resultado = await parseRelatorioUpseller(buffer);
  } catch (e) {
    return NextResponse.json(
      { erro: e instanceof Error ? e.message : "Falha ao ler o arquivo" },
      { status: 422 }
    );
  }

  if (resultado.linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma linha de venda encontrada no arquivo" },
      { status: 422 }
    );
  }

  const agora = new Date().toISOString();
  let inseridas = 0;
  let atualizadas = 0;

  // Upsert por data em transação única — nunca duplica.
  db.transaction((tx) => {
    for (const linha of resultado.linhas) {
      const existente = tx
        .select({ data: tables.vendasDiarias.data })
        .from(tables.vendasDiarias)
        .where(eq(tables.vendasDiarias.data, linha.data))
        .limit(1)
        .all();

      tx.insert(tables.vendasDiarias)
        .values({
          data: linha.data,
          pedidosValidos: linha.pedidosValidos,
          valorValidas: linha.valorValidas,
          pedidosCancelados: linha.pedidosCancelados,
          valorCanceladas: linha.valorCanceladas,
          fonte: "import",
          atualizadoEm: agora,
        })
        .onConflictDoUpdate({
          target: tables.vendasDiarias.data,
          set: {
            pedidosValidos: linha.pedidosValidos,
            valorValidas: linha.valorValidas,
            pedidosCancelados: linha.pedidosCancelados,
            valorCanceladas: linha.valorCanceladas,
            fonte: "import",
            atualizadoEm: agora,
          },
        })
        .run();

      if (existente.length > 0) atualizadas++;
      else inseridas++;
    }
  });

  const datas = resultado.linhas.map((l) => l.data).sort();
  return NextResponse.json({
    ok: true,
    inseridas,
    atualizadas,
    ignoradas: resultado.ignoradas,
    periodo: { de: datas[0], ate: datas[datas.length - 1] },
  });
}

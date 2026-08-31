import { NextRequest, NextResponse } from "next/server";
import { desc, sql } from "drizzle-orm";
import { db, tables } from "@/db";
import { isISODate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET() {
  const linhas = db
    .select()
    .from(tables.vendasDiarias)
    .orderBy(desc(tables.vendasDiarias.data))
    .limit(60)
    .all();
  return NextResponse.json(linhas);
}

interface LancamentoBody {
  data?: string;
  pedidosValidos?: number;
  valorValidas?: number;
  pedidosCancelados?: number;
  valorCanceladas?: number;
  unidades?: number | null;
}

export async function POST(req: NextRequest) {
  let body: LancamentoBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400 });
  }

  const { data } = body;
  if (!data || !isISODate(data)) {
    return NextResponse.json(
      { erro: "Data obrigatória no formato AAAA-MM-DD" },
      { status: 400 }
    );
  }

  const numeros = {
    pedidosValidos: body.pedidosValidos ?? 0,
    valorValidas: body.valorValidas ?? 0,
    pedidosCancelados: body.pedidosCancelados ?? 0,
    valorCanceladas: body.valorCanceladas ?? 0,
  };
  for (const [campo, v] of Object.entries(numeros)) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) {
      return NextResponse.json(
        { erro: `Campo ${campo} deve ser um número maior ou igual a zero` },
        { status: 400 }
      );
    }
  }
  const unidades =
    body.unidades == null || (body.unidades as unknown) === ""
      ? null
      : Math.round(Number(body.unidades));

  const agora = new Date().toISOString();
  db.insert(tables.vendasDiarias)
    .values({
      data,
      pedidosValidos: Math.round(numeros.pedidosValidos),
      valorValidas: numeros.valorValidas,
      pedidosCancelados: Math.round(numeros.pedidosCancelados),
      valorCanceladas: numeros.valorCanceladas,
      unidades,
      fonte: "manual",
      atualizadoEm: agora,
    })
    .onConflictDoUpdate({
      target: tables.vendasDiarias.data,
      set: {
        pedidosValidos: Math.round(numeros.pedidosValidos),
        valorValidas: numeros.valorValidas,
        pedidosCancelados: Math.round(numeros.pedidosCancelados),
        valorCanceladas: numeros.valorCanceladas,
        unidades,
        fonte: "manual",
        atualizadoEm: agora,
      },
    })
    .run();

  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  const data = req.nextUrl.searchParams.get("data");
  if (!data || !isISODate(data)) {
    return NextResponse.json({ erro: "Data inválida" }, { status: 400 });
  }
  db.delete(tables.vendasDiarias)
    .where(sql`${tables.vendasDiarias.data} = ${data}`)
    .run();
  return NextResponse.json({ ok: true });
}

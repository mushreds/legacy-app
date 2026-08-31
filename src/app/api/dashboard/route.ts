import { NextRequest, NextResponse } from "next/server";
import { calcularDashboardMes, type Cenario } from "@/lib/metas";

export const dynamic = "force-dynamic";

const CENARIOS: Cenario[] = ["piso", "meta", "teto"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const ano = Number(sp.get("ano"));
  const mes = Number(sp.get("mes"));
  const cenarioParam = sp.get("cenario") ?? "meta";

  if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    return NextResponse.json({ erro: "Parâmetros ano/mes inválidos" }, { status: 400 });
  }
  if (!CENARIOS.includes(cenarioParam as Cenario)) {
    return NextResponse.json({ erro: "Cenário inválido" }, { status: 400 });
  }

  const resultado = calcularDashboardMes(ano, mes, cenarioParam as Cenario);
  if (!resultado) {
    return NextResponse.json(
      { erro: `Nenhuma meta cadastrada para ${mes}/${ano} (cenário ${cenarioParam}).` },
      { status: 404 }
    );
  }
  return NextResponse.json(resultado);
}

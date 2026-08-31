import { NextRequest, NextResponse } from "next/server";
import { construirDiario, construirMensal, construirSemanal, type Granularidade } from "@/lib/visoes";
import { hojeISO } from "@/lib/format";

export const dynamic = "force-dynamic";

const JANELA_PADRAO: Record<Granularidade, number> = { diario: 30, semanal: 12, mensal: 12 };
const JANELA_MAXIMA: Record<Granularidade, number> = { diario: 90, semanal: 52, mensal: 36 };
const GRANULARIDADES: Granularidade[] = ["diario", "semanal", "mensal"];

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const granularidadeParam = sp.get("granularidade") ?? "diario";
  if (!GRANULARIDADES.includes(granularidadeParam as Granularidade)) {
    return NextResponse.json({ erro: "Granularidade inválida" }, { status: 400 });
  }
  const granularidade = granularidadeParam as Granularidade;

  const janelaBruta = Number(sp.get("janela"));
  const janela = Number.isFinite(janelaBruta) && janelaBruta > 0
    ? Math.min(Math.trunc(janelaBruta), JANELA_MAXIMA[granularidade])
    : JANELA_PADRAO[granularidade];

  const hoje = hojeISO();
  const pontos =
    granularidade === "diario" ? construirDiario(janela, hoje)
      : granularidade === "semanal" ? construirSemanal(janela, hoje)
      : construirMensal(janela, hoje);

  return NextResponse.json({ granularidade, janela, pontos });
}

import { NextResponse } from "next/server";
import { escolherMesPadrao, getMesesComMeta } from "@/lib/metas";

export const dynamic = "force-dynamic";

export async function GET() {
  const meses = getMesesComMeta();
  const padrao = escolherMesPadrao();
  return NextResponse.json({ meses, padrao, cenarios: ["piso", "meta", "teto"] });
}

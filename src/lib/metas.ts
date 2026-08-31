// Cálculos do dashboard mensal. Nenhum valor de meta é fixo aqui — tudo vem
// das tabelas metas_mensais, vendas_diarias e parametros (fatores de dia da
// semana), lidas do banco a cada chamada.
import { and, eq } from "drizzle-orm";
import { db, tables } from "@/db";
import { hojeISO } from "./format";

export type Cenario = "piso" | "meta" | "teto";

export interface DiaDashboard {
  data: string; // YYYY-MM-DD
  diaSemana: number; // 1=segunda ... 7=domingo
  fator: number;
  metaDia: number;
  metaAcumulada: number;
  realizadoDia: number;
  /** null para dias futuros (ainda não têm lançamento a somar) */
  realizadoAcumulado: number | null;
}

export interface DashboardMes {
  ano: number;
  mes: number;
  cenario: Cenario;
  valorMetaMes: number;
  unidadesMetaMes: number | null;
  hoje: string;
  dias: DiaDashboard[];
  metaAcumuladaHoje: number;
  realizadoAcumuladoHoje: number;
  percentAtingimento: number | null;
  projecaoFechamento: number | null;
  farol: "verde" | "amarelo" | "vermelho" | null;
}

function isoWeekday(date: Date): number {
  const d = date.getDay(); // 0=domingo ... 6=sábado
  return d === 0 ? 7 : d;
}

function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

function dataISO(ano: number, mes: number, dia: number): string {
  const m = String(mes).padStart(2, "0");
  const d = String(dia).padStart(2, "0");
  return `${ano}-${m}-${d}`;
}

export function getFatoresDia(): Record<number, number> {
  const linhas = db.select().from(tables.parametros).all();
  const mapa: Record<number, number> = {};
  for (const l of linhas) {
    const m = l.chave.match(/^fator_dia_([1-7])$/);
    if (m) mapa[Number(m[1])] = l.valor;
  }
  return mapa;
}

export function getMesesComMeta(): Array<{ ano: number; mes: number }> {
  const linhas = db
    .select({ ano: tables.metasMensais.ano, mes: tables.metasMensais.mes })
    .from(tables.metasMensais)
    .all();
  const vistos = new Set<string>();
  const meses: Array<{ ano: number; mes: number }> = [];
  for (const l of linhas) {
    const chave = `${l.ano}-${l.mes}`;
    if (!vistos.has(chave)) {
      vistos.add(chave);
      meses.push({ ano: l.ano, mes: l.mes });
    }
  }
  meses.sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes));
  return meses;
}

/** Escolhe o mês padrão do dashboard: o mês atual se tiver meta cadastrada,
 * senão o mês com meta mais próximo (preferindo o futuro). */
export function escolherMesPadrao(): { ano: number; mes: number } | null {
  const meses = getMesesComMeta();
  if (meses.length === 0) return null;

  const agora = new Date();
  const atualChave = agora.getFullYear() * 12 + (agora.getMonth() + 1);

  const exato = meses.find((m) => m.ano * 12 + m.mes === atualChave);
  if (exato) return exato;

  const futuro = meses.find((m) => m.ano * 12 + m.mes > atualChave);
  return futuro ?? meses[meses.length - 1];
}

export function calcularDashboardMes(
  ano: number,
  mes: number,
  cenario: Cenario
): DashboardMes | null {
  const metaRow = db
    .select()
    .from(tables.metasMensais)
    .where(
      and(
        eq(tables.metasMensais.ano, ano),
        eq(tables.metasMensais.mes, mes),
        eq(tables.metasMensais.cenario, cenario)
      )
    )
    .limit(1)
    .all()[0];
  if (!metaRow) return null;

  const fatores = getFatoresDia();
  const nDias = diasNoMes(ano, mes);

  const diasInfo = Array.from({ length: nDias }, (_, i) => {
    const dia = i + 1;
    const date = new Date(ano, mes - 1, dia);
    const diaSemana = isoWeekday(date);
    return { data: dataISO(ano, mes, dia), diaSemana, fator: fatores[diaSemana] ?? 1 };
  });
  const totalFatores = diasInfo.reduce((soma, d) => soma + d.fator, 0);

  const vendas = db.select().from(tables.vendasDiarias).all();
  const realizadoPorData = new Map(vendas.map((v) => [v.data, v.valorValidas]));

  const hoje = hojeISO();

  let metaAcum = 0;
  let realizadoAcum = 0;
  const dias: DiaDashboard[] = diasInfo.map((d) => {
    const metaDia = totalFatores > 0 ? (metaRow.valorMeta * d.fator) / totalFatores : 0;
    metaAcum += metaDia;
    const realizadoDia = realizadoPorData.get(d.data) ?? 0;
    let realizadoAcumulado: number | null = null;
    if (d.data <= hoje) {
      realizadoAcum += realizadoDia;
      realizadoAcumulado = realizadoAcum;
    }
    return {
      data: d.data,
      diaSemana: d.diaSemana,
      fator: d.fator,
      metaDia,
      metaAcumulada: metaAcum,
      realizadoDia,
      realizadoAcumulado,
    };
  });

  let metaAcumuladaHoje: number;
  if (dias.length === 0) {
    metaAcumuladaHoje = 0;
  } else if (hoje < dias[0].data) {
    metaAcumuladaHoje = 0; // mês ainda não começou
  } else if (hoje > dias[dias.length - 1].data) {
    metaAcumuladaHoje = metaAcum; // mês já terminou
  } else {
    metaAcumuladaHoje = dias.find((d) => d.data === hoje)?.metaAcumulada ?? metaAcum;
  }

  const realizadoAcumuladoHoje = realizadoAcum;

  const percentAtingimento =
    metaAcumuladaHoje > 0 ? realizadoAcumuladoHoje / metaAcumuladaHoje : null;

  const projecaoFechamento =
    percentAtingimento != null ? percentAtingimento * metaRow.valorMeta : null;

  const farol: DashboardMes["farol"] =
    percentAtingimento == null
      ? null
      : percentAtingimento >= 1
        ? "verde"
        : percentAtingimento >= 0.9
          ? "amarelo"
          : "vermelho";

  return {
    ano,
    mes,
    cenario,
    valorMetaMes: metaRow.valorMeta,
    unidadesMetaMes: metaRow.unidadesMeta,
    hoje,
    dias,
    metaAcumuladaHoje,
    realizadoAcumuladoHoje,
    percentAtingimento,
    projecaoFechamento,
    farol,
  };
}

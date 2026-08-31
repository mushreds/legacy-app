// Visões diária, semanal e mensal com comparativo contra o mesmo período do
// ano anterior. Tudo derivado de vendas_diarias — nenhum número fixo aqui.
import { db, tables } from "@/db";

export type Granularidade = "diario" | "semanal" | "mensal";

export interface PontoComparativo {
  chave: string; // identificador ordenável do período (ISO de início / "AAAA-MM")
  rotulo: string; // rótulo curto (cabeçalho de tabela/gráfico)
  rotuloCompleto: string; // rótulo completo (tooltip)
  valor: number;
  pedidos: number;
  valorAnoAnterior: number | null;
  pedidosAnoAnterior: number | null;
  variacaoPercentual: number | null;
}

interface ResumoPeriodo {
  valor: number;
  pedidos: number;
  temDados: boolean;
}

interface LinhaVenda {
  data: string;
  valorValidas: number;
  pedidosValidos: number;
}

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function partes(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

function paraISO(y: number, m: number, d: number): string {
  // O construtor Date normaliza estouros (ex.: dia 0 do mês => último dia do
  // mês anterior), o que é conveniente para addDias.
  const dt = new Date(y, m - 1, d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addDias(iso: string, delta: number): string {
  const { y, m, d } = partes(iso);
  return paraISO(y, m, d + delta);
}

function anoAnterior(iso: string): string {
  const { y, m, d } = partes(iso);
  return paraISO(y - 1, m, d);
}

function segundaDaSemana(iso: string): string {
  const { y, m, d } = partes(iso);
  const dt = new Date(y, m - 1, d);
  const diaSemana = dt.getDay(); // 0 = domingo
  const deltaParaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
  return addDias(iso, deltaParaSegunda);
}

function diaCurto(iso: string): string {
  const { d, m } = partes(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

function dataCompleta(iso: string): string {
  const { d, m, y } = partes(iso);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

function mesRotulo(ano: number, mes: number): string {
  return `${MESES_ABREV[mes - 1]}/${ano}`;
}

function mapaVendas(): Map<string, LinhaVenda> {
  const linhas = db
    .select({
      data: tables.vendasDiarias.data,
      valorValidas: tables.vendasDiarias.valorValidas,
      pedidosValidos: tables.vendasDiarias.pedidosValidos,
    })
    .from(tables.vendasDiarias)
    .all();
  return new Map(linhas.map((l) => [l.data, l]));
}

function diaResumo(mapa: Map<string, LinhaVenda>, iso: string): ResumoPeriodo {
  const row = mapa.get(iso);
  return row
    ? { valor: row.valorValidas, pedidos: row.pedidosValidos, temDados: true }
    : { valor: 0, pedidos: 0, temDados: false };
}

// Comparação lexicográfica funciona pois as datas são sempre "AAAA-MM-DD".
function somarPeriodo(
  mapa: Map<string, LinhaVenda>,
  iniISO: string,
  fimISO: string
): ResumoPeriodo {
  let cursor = iniISO;
  let valor = 0;
  let pedidos = 0;
  let temDados = false;
  while (cursor <= fimISO) {
    const row = mapa.get(cursor);
    if (row) {
      valor += row.valorValidas;
      pedidos += row.pedidosValidos;
      temDados = true;
    }
    cursor = addDias(cursor, 1);
  }
  return { valor, pedidos, temDados };
}

function somarMes(mapa: Map<string, LinhaVenda>, ano: number, mes: number): ResumoPeriodo {
  const nDias = new Date(ano, mes, 0).getDate();
  return somarPeriodo(mapa, paraISO(ano, mes, 1), paraISO(ano, mes, nDias));
}

function montarPonto(
  chave: string,
  rotulo: string,
  rotuloCompleto: string,
  atual: ResumoPeriodo,
  anteriorResumo: ResumoPeriodo
): PontoComparativo {
  const valorAnoAnterior = anteriorResumo.temDados ? anteriorResumo.valor : null;
  const pedidosAnoAnterior = anteriorResumo.temDados ? anteriorResumo.pedidos : null;
  const variacaoPercentual =
    valorAnoAnterior != null && valorAnoAnterior > 0
      ? (atual.valor - valorAnoAnterior) / valorAnoAnterior
      : null;
  return {
    chave,
    rotulo,
    rotuloCompleto,
    valor: atual.valor,
    pedidos: atual.pedidos,
    valorAnoAnterior,
    pedidosAnoAnterior,
    variacaoPercentual,
  };
}

export function construirDiario(janela: number, hojeISO: string): PontoComparativo[] {
  const mapa = mapaVendas();
  const pontos: PontoComparativo[] = [];
  for (let i = janela - 1; i >= 0; i--) {
    const data = addDias(hojeISO, -i);
    const atual = diaResumo(mapa, data);
    const anterior = diaResumo(mapa, anoAnterior(data));
    pontos.push(montarPonto(data, diaCurto(data), dataCompleta(data), atual, anterior));
  }
  return pontos;
}

export function construirSemanal(janela: number, hojeISO: string): PontoComparativo[] {
  const mapa = mapaVendas();
  const segundaAtual = segundaDaSemana(hojeISO);
  const pontos: PontoComparativo[] = [];
  for (let i = janela - 1; i >= 0; i--) {
    const inicio = addDias(segundaAtual, -7 * i);
    const fim = addDias(inicio, 6);
    const atual = somarPeriodo(mapa, inicio, fim);

    const inicioAnterior = segundaDaSemana(anoAnterior(inicio));
    const fimAnterior = addDias(inicioAnterior, 6);
    const anterior = somarPeriodo(mapa, inicioAnterior, fimAnterior);

    const rotulo = `${diaCurto(inicio)}–${diaCurto(fim)}`;
    const rotuloCompleto = `Semana de ${dataCompleta(inicio)} a ${dataCompleta(fim)}`;
    pontos.push(montarPonto(inicio, rotulo, rotuloCompleto, atual, anterior));
  }
  return pontos;
}

export function construirMensal(janela: number, hojeISO: string): PontoComparativo[] {
  const mapa = mapaVendas();
  const { y: anoHoje, m: mesHoje } = partes(hojeISO);
  const totalMesesHoje = anoHoje * 12 + (mesHoje - 1);
  const pontos: PontoComparativo[] = [];
  for (let i = janela - 1; i >= 0; i--) {
    const totalMeses = totalMesesHoje - i;
    const ano = Math.floor(totalMeses / 12);
    const mes = (totalMeses % 12) + 1;
    const chave = `${ano}-${String(mes).padStart(2, "0")}`;
    const atual = somarMes(mapa, ano, mes);
    const anterior = somarMes(mapa, ano - 1, mes);
    const rotulo = mesRotulo(ano, mes);
    pontos.push(montarPonto(chave, rotulo, rotulo, atual, anterior));
  }
  return pontos;
}

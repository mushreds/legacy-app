// Parser do relatório "Performance das Vendas" do Upseller (.xlsx).
// Colunas esperadas: Data, Total de Pedidos, Valor Total de Vendas, Pedidos Válidos,
// Valor de Vendas Válidas, Pedidos Cancelados, Valor de Vendas Canceladas,
// Clientes, Vendas por Cliente.
import ExcelJS from "exceljs";

export interface LinhaUpseller {
  data: string; // YYYY-MM-DD
  pedidosValidos: number;
  valorValidas: number;
  pedidosCancelados: number;
  valorCanceladas: number;
}

export interface ResultadoParse {
  linhas: LinhaUpseller[];
  ignoradas: number;
}

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

// Aceita número, "1.234,56", "R$ 1.234,56" e "1234.56".
function parseNumeroBR(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "object" && "result" in (v as object)) {
    return parseNumeroBR((v as { result: unknown }).result);
  }
  let s = String(v).replace(/[R$\s]/g, "");
  if (s === "") return null;
  const temVirgula = s.includes(",");
  if (temVirgula) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    // "8.080" sem casa decimal = milhar brasileiro
    s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Aceita Date (célula de data), "DD/MM/AAAA" e "AAAA-MM-DD".
function parseData(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    // ExcelJS devolve datas em UTC — usar os campos UTC evita deslizar um dia.
    const y = v.getUTCFullYear();
    const m = String(v.getUTCMonth() + 1).padStart(2, "0");
    const d = String(v.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  return null;
}

function valorCelula(cell: ExcelJS.CellValue): unknown {
  if (cell != null && typeof cell === "object") {
    if ("result" in cell) return (cell as ExcelJS.CellFormulaValue).result;
    if ("richText" in cell) {
      return (cell as ExcelJS.CellRichTextValue).richText
        .map((r) => r.text)
        .join("");
    }
    if ("text" in cell) return (cell as { text: string }).text;
  }
  return cell;
}

export async function parseRelatorioUpseller(
  buffer: Buffer
): Promise<ResultadoParse> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);

  for (const ws of wb.worksheets) {
    const resultado = parsePlanilha(ws);
    if (resultado) return resultado;
  }
  throw new Error(
    'Não encontrei o cabeçalho esperado (Data, Pedidos Válidos, Valor de Vendas Válidas...). Confira se o arquivo é o relatório "Performance das Vendas" do Upseller.'
  );
}

function parsePlanilha(ws: ExcelJS.Worksheet): ResultadoParse | null {
  // Procura a linha de cabeçalho nas primeiras 20 linhas.
  let headerRow = -1;
  const colunas: Record<string, number> = {};

  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const row = ws.getRow(r);
    const encontradas: Record<string, number> = {};
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      const texto = normalizar(String(valorCelula(cell.value) ?? ""));
      if (texto === "data") encontradas.data = col;
      else if (texto === "pedidos validos") encontradas.pedidosValidos = col;
      else if (texto === "valor de vendas validas") encontradas.valorValidas = col;
      else if (texto === "pedidos cancelados") encontradas.pedidosCancelados = col;
      else if (texto === "valor de vendas canceladas")
        encontradas.valorCanceladas = col;
    });
    if (
      encontradas.data &&
      encontradas.pedidosValidos &&
      encontradas.valorValidas
    ) {
      headerRow = r;
      Object.assign(colunas, encontradas);
      break;
    }
  }

  if (headerRow === -1) return null;

  const linhas: LinhaUpseller[] = [];
  let ignoradas = 0;

  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const rawData = valorCelula(row.getCell(colunas.data).value);
    if (rawData == null || String(rawData).trim() === "") continue;

    const data = parseData(rawData);
    if (!data) {
      // linhas de total/rodapé
      ignoradas++;
      continue;
    }

    const pedidosValidos = parseNumeroBR(
      valorCelula(row.getCell(colunas.pedidosValidos).value)
    );
    const valorValidas = parseNumeroBR(
      valorCelula(row.getCell(colunas.valorValidas).value)
    );
    const pedidosCancelados = colunas.pedidosCancelados
      ? parseNumeroBR(valorCelula(row.getCell(colunas.pedidosCancelados).value))
      : 0;
    const valorCanceladas = colunas.valorCanceladas
      ? parseNumeroBR(valorCelula(row.getCell(colunas.valorCanceladas).value))
      : 0;

    if (pedidosValidos == null || valorValidas == null) {
      ignoradas++;
      continue;
    }

    linhas.push({
      data,
      pedidosValidos: Math.round(pedidosValidos),
      valorValidas,
      pedidosCancelados: Math.round(pedidosCancelados ?? 0),
      valorCanceladas: valorCanceladas ?? 0,
    });
  }

  return { linhas, ignoradas };
}

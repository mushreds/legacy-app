// Formatação brasileira: R$ 1.234,56 e DD/MM/AAAA. Datas internas são "YYYY-MM-DD".

export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDataBR(isoDate: string): string {
  const [ano, mes, dia] = isoDate.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatInt(n: number): string {
  return n.toLocaleString("pt-BR");
}

export function hojeISO(): string {
  const d = new Date();
  return toISO(d);
}

export function ontemISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toISO(d);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const RE_ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(s: string): boolean {
  return RE_ISO.test(s);
}

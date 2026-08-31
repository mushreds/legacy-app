import { eq, and } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

type Db = BetterSQLite3Database<typeof schema>;

// Dados de Plano_Metas_Setembro2026.xlsx
const CATEGORIAS: Array<{ nome: string; ticket: number; unDia: number }> = [
  { nome: "Camisa MC gola padre", ticket: 61, unDia: 138 },
  { nome: "Camisa gola italiana (MC/social)", ticket: 54, unDia: 34 },
  { nome: "Short/bermuda linho", ticket: 52, unDia: 24 },
  { nome: "Vestido feminino", ticket: 51, unDia: 21 },
  { nome: "Camisa ML gola italiana", ticket: 68, unDia: 13 },
  { nome: "Kits/conjuntos", ticket: 128, unDia: 8 },
  { nome: "Camisa xadrez", ticket: 76, unDia: 8 },
  { nome: "Camisa ML gola padre", ticket: 95, unDia: 7 },
  { nome: "Demais (camiseta, suéter, calça...)", ticket: 45, unDia: 12 },
];

const METAS_SET_2026: Array<{
  cenario: "piso" | "meta" | "teto";
  valor: number;
  unidades: number;
}> = [
  { cenario: "piso", valor: 435_000, unidades: 7733 },
  { cenario: "meta", valor: 450_000, unidades: 8000 },
  { cenario: "teto", valor: 520_000, unidades: 9244 },
];

const MARCOS: Array<{
  data: string;
  titulo: string;
  descricao: string;
  gatilho: string | null;
}> = [
  {
    data: "2026-09-08",
    titulo: "Checkpoint semana 1",
    descricao:
      "Atingimento acumulado, mix por produto, tração do vestido e da Dunas",
    gatilho:
      "Desvio acumulado > ±10%: redistribuir metas das semanas restantes; vestido acima da cota: aumentar meta e verba dele",
  },
  {
    data: "2026-09-15",
    titulo: "Checkpoint semana 2",
    descricao:
      "Ritmo vs projeção de fechamento, cancelamentos ML, estoque dos campeões",
    gatilho:
      "Projeção < Piso (R$ 435 mil): plano de reação — promoção/ads; ruptura à vista em SKU top: acelerar reposição",
  },
  {
    data: "2026-09-22",
    titulo: "Checkpoint semana 3 + prévia de outubro",
    descricao:
      "Fechamento provável de setembro; definir meta de outubro com o realizado",
    gatilho:
      "Fixar meta out entre 1,2x e 1,5x o fechamento de setembro (razão histórica out/set)",
  },
  {
    data: "2026-10-01",
    titulo: "Fechamento de setembro e recalibragem do Q4",
    descricao:
      "Resultado final vs 3 cenários; atualizar fatores de dia da semana; rever tickets",
    gatilho: "Recalibrar TODAS as metas do Q4 com o número real de setembro",
  },
  {
    data: "2026-10-10",
    titulo: "Planejamento Black Friday",
    descricao:
      "Estoque necessário p/ nov (nov/out histórico ≈ 1,4–1,5x), criativos, verba, promoções",
    gatilho: "Compra de estoque BF precisa estar disparada até aqui",
  },
  {
    data: "2026-11-01",
    titulo: "Pré-Black Friday",
    descricao:
      "Campanhas no ar, cadência de promoções do ML/Shein, metas diárias de nov carregadas",
    gatilho: null,
  },
  {
    data: "2026-12-01",
    titulo: "Pós-BF / Natal",
    descricao:
      "Dezembro é historicamente o MAIOR mês (não novembro) — garantir estoque e prazo de entrega até o Natal",
    gatilho: "Meta dez ≈ 1,15–1,3x novembro",
  },
];

// Fatores de venda por dia da semana (seg=1 ... dom=7) e razões sazonais.
const PARAMETROS: Array<{ chave: string; valor: number; descricao: string }> = [
  { chave: "fator_dia_1", valor: 1.065, descricao: "Fator de venda — segunda" },
  { chave: "fator_dia_2", valor: 1.15, descricao: "Fator de venda — terça" },
  { chave: "fator_dia_3", valor: 1.141, descricao: "Fator de venda — quarta" },
  { chave: "fator_dia_4", valor: 1.033, descricao: "Fator de venda — quinta" },
  { chave: "fator_dia_5", valor: 0.905, descricao: "Fator de venda — sexta" },
  { chave: "fator_dia_6", valor: 0.803, descricao: "Fator de venda — sábado" },
  { chave: "fator_dia_7", valor: 0.902, descricao: "Fator de venda — domingo" },
  { chave: "razao_set_ago", valor: 1.09, descricao: "Sazonalidade set/ago" },
  { chave: "razao_out_set", valor: 1.35, descricao: "Sazonalidade out/set" },
  { chave: "razao_nov_out", valor: 1.47, descricao: "Sazonalidade nov/out" },
  { chave: "razao_dez_nov", valor: 1.21, descricao: "Sazonalidade dez/nov" },
];

export function seedIfEmpty(db: Db) {
  const jaTemMetas = db.select().from(schema.metasMensais).limit(1).all();
  if (jaTemMetas.length > 0) return;
  runSeed(db);
}

export function runSeed(db: Db) {
  db.transaction((tx) => {
    for (const c of CATEGORIAS) {
      tx.insert(schema.categorias)
        .values({ nome: c.nome, ticketMedioUnitario: c.ticket })
        .onConflictDoUpdate({
          target: schema.categorias.nome,
          set: { ticketMedioUnitario: c.ticket },
        })
        .run();
    }

    for (const m of METAS_SET_2026) {
      tx.insert(schema.metasMensais)
        .values({
          ano: 2026,
          mes: 9,
          valorMeta: m.valor,
          unidadesMeta: m.unidades,
          cenario: m.cenario,
        })
        .onConflictDoUpdate({
          target: [
            schema.metasMensais.ano,
            schema.metasMensais.mes,
            schema.metasMensais.cenario,
          ],
          set: { valorMeta: m.valor, unidadesMeta: m.unidades },
        })
        .run();
    }

    const cats = tx.select().from(schema.categorias).all();
    for (const c of CATEGORIAS) {
      const cat = cats.find((x) => x.nome === c.nome);
      if (!cat) continue;
      tx.insert(schema.metasPorCategoria)
        .values({ ano: 2026, mes: 9, categoriaId: cat.id, unidadesDiaMeta: c.unDia })
        .onConflictDoUpdate({
          target: [
            schema.metasPorCategoria.ano,
            schema.metasPorCategoria.mes,
            schema.metasPorCategoria.categoriaId,
          ],
          set: { unidadesDiaMeta: c.unDia },
        })
        .run();
    }

    for (const m of MARCOS) {
      const existe = tx
        .select()
        .from(schema.marcos)
        .where(and(eq(schema.marcos.data, m.data), eq(schema.marcos.titulo, m.titulo)))
        .limit(1)
        .all();
      if (existe.length === 0) {
        tx.insert(schema.marcos)
          .values({
            data: m.data,
            titulo: m.titulo,
            descricao: m.descricao,
            gatilhoDeRealinhamento: m.gatilho,
          })
          .run();
      }
    }

    for (const p of PARAMETROS) {
      tx.insert(schema.parametros)
        .values(p)
        .onConflictDoUpdate({
          target: schema.parametros.chave,
          set: { valor: p.valor, descricao: p.descricao },
        })
        .run();
    }
  });
}

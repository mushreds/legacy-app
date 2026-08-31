import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Datas sempre armazenadas como ISO "YYYY-MM-DD" (texto), exibidas como DD/MM/AAAA.

export const vendasDiarias = sqliteTable(
  "vendas_diarias",
  {
    data: text("data").primaryKey(),
    pedidosValidos: integer("pedidos_validos").notNull().default(0),
    valorValidas: real("valor_validas").notNull().default(0),
    pedidosCancelados: integer("pedidos_cancelados").notNull().default(0),
    valorCanceladas: real("valor_canceladas").notNull().default(0),
    unidades: integer("unidades"),
    fonte: text("fonte", { enum: ["manual", "import"] })
      .notNull()
      .default("manual"),
    atualizadoEm: text("atualizado_em").notNull(),
  }
);

export const categorias = sqliteTable("categorias", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull().unique(),
  ticketMedioUnitario: real("ticket_medio_unitario").notNull().default(0),
});

export const vendasPorCategoria = sqliteTable(
  "vendas_por_categoria",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    data: text("data").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    unidades: integer("unidades").notNull().default(0),
    valor: real("valor"),
  },
  (t) => ({
    dataCategoriaUnq: uniqueIndex("vendas_por_categoria_data_categoria_unq").on(
      t.data,
      t.categoriaId
    ),
  })
);

export const metasMensais = sqliteTable(
  "metas_mensais",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ano: integer("ano").notNull(),
    mes: integer("mes").notNull(),
    valorMeta: real("valor_meta").notNull(),
    unidadesMeta: integer("unidades_meta"),
    cenario: text("cenario", { enum: ["piso", "meta", "teto"] })
      .notNull()
      .default("meta"),
  },
  (t) => ({
    anoMesCenarioUnq: uniqueIndex("metas_mensais_ano_mes_cenario_unq").on(
      t.ano,
      t.mes,
      t.cenario
    ),
  })
);

export const metasPorCategoria = sqliteTable(
  "metas_por_categoria",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ano: integer("ano").notNull(),
    mes: integer("mes").notNull(),
    categoriaId: integer("categoria_id")
      .notNull()
      .references(() => categorias.id),
    unidadesDiaMeta: real("unidades_dia_meta").notNull().default(0),
  },
  (t) => ({
    anoMesCategoriaUnq: uniqueIndex("metas_por_categoria_ano_mes_cat_unq").on(
      t.ano,
      t.mes,
      t.categoriaId
    ),
  })
);

export const promocoes = sqliteTable("promocoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  canal: text("canal").notNull(),
  tipo: text("tipo", {
    enum: ["cupom", "oferta_relampago", "campanha_plataforma", "desconto_direto"],
  }).notNull(),
  dataInicio: text("data_inicio").notNull(),
  dataFim: text("data_fim").notNull(),
  descontoPercentual: real("desconto_percentual"),
  observacoes: text("observacoes"),
});

export const marcos = sqliteTable("marcos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  data: text("data").notNull(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  gatilhoDeRealinhamento: text("gatilho_de_realinhamento"),
  status: text("status", { enum: ["pendente", "revisado"] })
    .notNull()
    .default("pendente"),
});

// Parâmetros de cálculo (fatores de dia da semana, razões sazonais) ficam no
// banco para que nenhuma meta seja número fixo no código.
export const parametros = sqliteTable("parametros", {
  chave: text("chave").primaryKey(),
  valor: real("valor").notNull(),
  descricao: text("descricao"),
});

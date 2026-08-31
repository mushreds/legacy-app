# Vendas & Metas

App web local para acompanhar vendas diárias contra metas (operação de
e-commerce de moda em marketplaces, com dados do ERP Upseller).

Stack: Next.js + TypeScript, SQLite (arquivo local, zero configuração) com
Drizzle ORM. Sem autenticação — uso individual em `localhost`.

## Como rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Na primeira execução o app cria o banco em
`data/vendas.db`, aplica as migrações e semeia automaticamente:

- as metas de setembro/2026 (piso R$ 435 mil · meta R$ 450 mil · teto R$ 520 mil);
- as 9 categorias de produto com ticket unitário e meta de unidades/dia;
- os 7 marcos de realinhamento (08/09, 15/09, 22/09, 01/10, 10/10, 01/11, 01/12);
- os fatores de venda por dia da semana e as razões sazonais (tabela `parametros`).

Nenhum cálculo de meta usa número fixo no código — tudo é lido dessas tabelas.

## Uso diário

**Lançamento diário** (`/lancamento`):

- Formulário rápido para digitar o dia anterior (pedidos válidos, valor,
  cancelamentos, unidades). Salvar duas vezes a mesma data sobrescreve
  (upsert), nunca duplica.
- Botão de importar o relatório **"Performance das Vendas"** do Upseller
  (.xlsx). O importador localiza o cabeçalho automaticamente, aceita datas
  `DD/MM/AAAA` e valores `1.234,56`, ignora linhas de total e faz upsert por
  data — reimportar o mesmo arquivo apenas atualiza os dias existentes.

**Dashboard do mês** (`/dashboard`):

- Meta acumulada até hoje, calculada ponderando cada dia pelo fator de dia
  da semana (tabela `parametros`) — não por divisão simples do total pelo
  número de dias do mês.
- Realizado acumulado (soma de `vendas_diarias.valor_validas`), % de
  atingimento e projeção de fechamento pelo ritmo atual (extrapola a razão
  realizado/meta acumulados sobre a meta do mês inteiro).
- Farol: verde (≥100% da meta acumulada), amarelo (90–99%), vermelho (<90%).
- Gráfico de linha (Recharts) com meta acumulada vs. realizado acumulado dia
  a dia, marcador de "hoje" e seletor de mês/cenário (piso, meta ou teto).

**Visões diária, semanal e mensal** (`/visoes`):

- Três abas com tabela e gráfico de barras agregando `vendas_diarias` por dia,
  semana (segunda a domingo) ou mês.
- Comparativo contra o mesmo período do ano anterior (mesmo dia, mesma semana
  — 52 semanas atrás — ou mesmo mês do ano anterior), mostrado só quando há
  lançamento naquele período; caso contrário aparece "—" em vez de um zero
  enganoso.
- Seletor de janela (ex.: últimos 30/60/90 dias, 12/26/52 semanas, 6/12/24
  meses).

## Backup do banco

Todo o dado vive em um único arquivo SQLite: `data/vendas.db`.

```bash
# com o app parado, basta copiar o arquivo:
cp data/vendas.db ~/backups/vendas-$(date +%Y%m%d).db

# com o app rodando (WAL ativo), prefira o backup consistente do sqlite3:
sqlite3 data/vendas.db ".backup '~/backups/vendas-$(date +%Y%m%d).db'"
```

Para restaurar, pare o app e copie o backup de volta para `data/vendas.db`
(apague `data/vendas.db-wal` e `data/vendas.db-shm` se existirem).

## Scripts úteis

| Comando               | O que faz                                              |
| --------------------- | ------------------------------------------------------ |
| `npm run dev`         | Sobe o app em modo desenvolvimento                     |
| `npm run build`       | Build de produção                                      |
| `npm run start`       | Sobe o build de produção                               |
| `npm run db:generate` | Gera migração SQL após mudar `src/db/schema.ts`        |
| `npm run db:migrate`  | Aplica migrações (também roda sozinho ao subir o app)  |
| `npm run db:seed`     | Reaplica a semente de metas/categorias/marcos          |

## Fases

- Fase 1: schema completo + lançamento manual + importação Upseller.
- Fase 2: dashboard do mês (meta acumulada por fator de dia da semana,
  projeção de fechamento, farol).
- **Fase 3 (atual):** visões diária/semanal/mensal com comparativo ano anterior.
- Fase 4: metas por categoria com realizado semanal.
- Fase 5: promoções (CRUD + faixas no gráfico).
- Fase 6: marcos de realinhamento + recalibragem de metas.

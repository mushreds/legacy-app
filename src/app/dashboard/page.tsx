"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL, formatDataBR } from "@/lib/format";

type Cenario = "piso" | "meta" | "teto";

interface DiaDashboard {
  data: string;
  diaSemana: number;
  fator: number;
  metaDia: number;
  metaAcumulada: number;
  realizadoDia: number;
  realizadoAcumulado: number | null;
}

interface DashboardMes {
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

interface Opcoes {
  meses: Array<{ ano: number; mes: number }>;
  padrao: { ano: number; mes: number } | null;
  cenarios: Cenario[];
}

const NOMES_MES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const FAROL_TEXTO: Record<NonNullable<DashboardMes["farol"]>, string> = {
  verde: "No ritmo da meta",
  amarelo: "Atenção — perto da meta",
  vermelho: "Abaixo da meta",
};

function formatPercent(p: number | null): string {
  if (p == null) return "—";
  return `${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function DashboardPage() {
  const [opcoes, setOpcoes] = useState<Opcoes | null>(null);
  const [ano, setAno] = useState<number | null>(null);
  const [mes, setMes] = useState<number | null>(null);
  const [cenario, setCenario] = useState<Cenario>("meta");
  const [dados, setDados] = useState<DashboardMes | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/opcoes")
      .then((r) => r.json())
      .then((json: Opcoes) => {
        setOpcoes(json);
        if (json.padrao) {
          setAno(json.padrao.ano);
          setMes(json.padrao.mes);
        }
      });
  }, []);

  const carregar = useCallback(async () => {
    if (ano == null || mes == null) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/dashboard?ano=${ano}&mes=${mes}&cenario=${cenario}`);
      const json = await res.json();
      if (!res.ok) {
        setErro(json.erro ?? "Erro ao carregar o dashboard");
        setDados(null);
      } else {
        setDados(json);
      }
    } finally {
      setCarregando(false);
    }
  }, [ano, mes, cenario]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const dadosGrafico = useMemo(() => {
    if (!dados) return [];
    return dados.dias.map((d) => ({
      data: formatDataBR(d.data),
      metaAcumulada: Math.round(d.metaAcumulada),
      realizadoAcumulado:
        d.realizadoAcumulado == null ? null : Math.round(d.realizadoAcumulado),
    }));
  }, [dados]);

  const rotuloHoje = dados ? formatDataBR(dados.hoje) : null;

  return (
    <>
      <h1>Dashboard do mês</h1>
      <p className="subtitulo">
        Meta acumulada até hoje (ponderada pelos fatores de dia da semana) contra
        o realizado, projeção de fechamento pelo ritmo atual e farol do mês.
      </p>

      <div className="barra-filtros">
        <div className="campo-inline">
          <label htmlFor="mes-select">Mês</label>
          <select
            id="mes-select"
            value={ano != null && mes != null ? `${ano}-${mes}` : ""}
            onChange={(e) => {
              const [a, m] = e.target.value.split("-").map(Number);
              setAno(a);
              setMes(m);
            }}
          >
            {opcoes?.meses.map((o) => (
              <option key={`${o.ano}-${o.mes}`} value={`${o.ano}-${o.mes}`}>
                {NOMES_MES[o.mes - 1]}/{o.ano}
              </option>
            ))}
          </select>
        </div>

        <div className="campo-inline">
          <label>Cenário</label>
          <div className="abas-cenario">
            {(opcoes?.cenarios ?? ["piso", "meta", "teto"]).map((c) => (
              <button
                key={c}
                type="button"
                className={`aba-cenario ${cenario === c ? "ativa" : ""}`}
                onClick={() => setCenario(c)}
              >
                {c === "piso" ? "Piso" : c === "teto" ? "Teto" : "Meta"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && <div className="aviso-erro">{erro}</div>}

      {!erro && dados && (
        <>
          <div className="kpis">
            <div className="cartao">
              <div className="kpi-label">Meta acumulada até hoje</div>
              <div className="kpi-valor">{formatBRL(dados.metaAcumuladaHoje)}</div>
              <div className="kpi-sub">de {formatBRL(dados.valorMetaMes)} no mês</div>
            </div>
            <div className="cartao">
              <div className="kpi-label">Realizado acumulado</div>
              <div className="kpi-valor">{formatBRL(dados.realizadoAcumuladoHoje)}</div>
              <div className="kpi-sub">até {rotuloHoje}</div>
            </div>
            <div className="cartao">
              <div className="kpi-label">% da meta acumulada</div>
              <div className="kpi-valor">{formatPercent(dados.percentAtingimento)}</div>
              {dados.farol && (
                <div className={`farol farol-${dados.farol}`} style={{ marginTop: 6 }}>
                  <span className="farol-bolinha" />
                  {FAROL_TEXTO[dados.farol]}
                </div>
              )}
            </div>
            <div className="cartao">
              <div className="kpi-label">Projeção de fechamento</div>
              <div className="kpi-valor">
                {dados.projecaoFechamento == null
                  ? "—"
                  : formatBRL(dados.projecaoFechamento)}
              </div>
              <div className="kpi-sub">pelo ritmo atual</div>
            </div>
          </div>

          <div className="cartao">
            <h2>Meta acumulada vs. realizado acumulado</h2>
            <div style={{ width: "100%", height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={dadosGrafico} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" />
                  <XAxis dataKey="data" tick={{ fontSize: 11 }} interval={Math.max(0, Math.floor(dadosGrafico.length / 10) - 1)} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: number) => (v / 1000).toLocaleString("pt-BR") + "k"}
                    width={48}
                  />
                  <Tooltip
                    formatter={(valor: number) => formatBRL(valor)}
                    labelStyle={{ color: "var(--texto)" }}
                  />
                  <Legend />
                  {rotuloHoje && (
                    <ReferenceLine
                      x={rotuloHoje}
                      stroke="var(--texto-suave)"
                      strokeDasharray="4 4"
                      label={{ value: "hoje", fontSize: 11, fill: "var(--texto-suave)" }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="metaAcumulada"
                    name="Meta acumulada"
                    stroke="var(--primaria)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="realizadoAcumulado"
                    name="Realizado acumulado"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {!erro && !dados && carregando && (
        <p style={{ color: "var(--texto-suave)" }}>Carregando...</p>
      )}
    </>
  );
}

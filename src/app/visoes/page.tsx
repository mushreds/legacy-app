"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBRL, formatInt } from "@/lib/format";

type Granularidade = "diario" | "semanal" | "mensal";

interface PontoComparativo {
  chave: string;
  rotulo: string;
  rotuloCompleto: string;
  valor: number;
  pedidos: number;
  valorAnoAnterior: number | null;
  pedidosAnoAnterior: number | null;
  variacaoPercentual: number | null;
}

const ABAS: Array<{ chave: Granularidade; label: string }> = [
  { chave: "diario", label: "Diário" },
  { chave: "semanal", label: "Semanal" },
  { chave: "mensal", label: "Mensal" },
];

const JANELAS: Record<Granularidade, Array<{ valor: number; label: string }>> = {
  diario: [
    { valor: 14, label: "14 dias" },
    { valor: 30, label: "30 dias" },
    { valor: 60, label: "60 dias" },
    { valor: 90, label: "90 dias" },
  ],
  semanal: [
    { valor: 8, label: "8 semanas" },
    { valor: 12, label: "12 semanas" },
    { valor: 26, label: "26 semanas" },
    { valor: 52, label: "52 semanas" },
  ],
  mensal: [
    { valor: 6, label: "6 meses" },
    { valor: 12, label: "12 meses" },
    { valor: 24, label: "24 meses" },
  ],
};

const JANELA_PADRAO: Record<Granularidade, number> = { diario: 30, semanal: 12, mensal: 12 };

function formatPercent(p: number | null): string {
  if (p == null) return "—";
  const sinal = p > 0 ? "+" : "";
  return `${sinal}${(p * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

export default function VisoesPage() {
  const [granularidade, setGranularidade] = useState<Granularidade>("diario");
  const [janela, setJanela] = useState(JANELA_PADRAO.diario);
  const [pontos, setPontos] = useState<PontoComparativo[]>([]);
  const [carregando, setCarregando] = useState(true);

  function trocarGranularidade(g: Granularidade) {
    setGranularidade(g);
    setJanela(JANELA_PADRAO[g]);
  }

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch(`/api/visoes?granularidade=${granularidade}&janela=${janela}`);
      const json = await res.json();
      setPontos(json.pontos ?? []);
    } finally {
      setCarregando(false);
    }
  }, [granularidade, janela]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const temAlgumAnoAnterior = pontos.some((p) => p.valorAnoAnterior != null);

  const dadosGrafico = useMemo(
    () =>
      pontos.map((p) => ({
        rotulo: p.rotulo,
        "Este ano": Math.round(p.valor),
        "Ano anterior": p.valorAnoAnterior == null ? undefined : Math.round(p.valorAnoAnterior),
      })),
    [pontos]
  );

  const tituloTabela =
    granularidade === "diario" ? "Dia" : granularidade === "semanal" ? "Semana" : "Mês";

  return (
    <>
      <h1>Visões diária, semanal e mensal</h1>
      <p className="subtitulo">
        Comparativo contra o mesmo período do ano anterior, quando houver dados
        lançados para aquele período.
      </p>

      <div className="barra-filtros">
        <div className="abas-cenario">
          {ABAS.map((a) => (
            <button
              key={a.chave}
              type="button"
              className={`aba-cenario ${granularidade === a.chave ? "ativa" : ""}`}
              onClick={() => trocarGranularidade(a.chave)}
            >
              {a.label}
            </button>
          ))}
        </div>
        <div className="campo-inline">
          <label htmlFor="janela-select">Período</label>
          <select
            id="janela-select"
            value={janela}
            onChange={(e) => setJanela(Number(e.target.value))}
          >
            {JANELAS[granularidade].map((j) => (
              <option key={j.valor} value={j.valor}>
                {j.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="cartao">
        <h2>Valor: este ano vs. ano anterior</h2>
        {!temAlgumAnoAnterior && (
          <p style={{ color: "var(--texto-suave)", marginTop: 0 }}>
            Ainda não há lançamentos do ano anterior nesse período para comparar
            — a barra cinza aparece assim que houver.
          </p>
        )}
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={dadosGrafico} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borda)" />
              <XAxis
                dataKey="rotulo"
                tick={{ fontSize: 11 }}
                interval={Math.max(0, Math.floor(dadosGrafico.length / 12) - 1)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(v: number) => (v / 1000).toLocaleString("pt-BR") + "k"}
                width={48}
              />
              <Tooltip formatter={(valor: number) => formatBRL(valor)} />
              <Legend />
              <Bar dataKey="Este ano" fill="var(--primaria)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Ano anterior" fill="#94a3b8" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 20 }}>
        <h2>Tabela</h2>
        {carregando ? (
          <p style={{ color: "var(--texto-suave)" }}>Carregando...</p>
        ) : (
          <div className="tabela-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tituloTabela}</th>
                  <th>Valor</th>
                  <th>Pedidos</th>
                  <th>Valor ano anterior</th>
                  <th>Variação</th>
                </tr>
              </thead>
              <tbody>
                {[...pontos].reverse().map((p) => (
                  <tr key={p.chave}>
                    <td title={p.rotuloCompleto}>{p.rotulo}</td>
                    <td className="num-grande">{formatBRL(p.valor)}</td>
                    <td>{formatInt(p.pedidos)}</td>
                    <td>
                      {p.valorAnoAnterior == null ? (
                        <span className="sem-dado">—</span>
                      ) : (
                        formatBRL(p.valorAnoAnterior)
                      )}
                    </td>
                    <td
                      className={
                        p.variacaoPercentual == null
                          ? "sem-dado"
                          : p.variacaoPercentual >= 0
                            ? "variacao-pos"
                            : "variacao-neg"
                      }
                    >
                      {formatPercent(p.variacaoPercentual)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

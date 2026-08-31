"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { formatBRL, formatDataBR, formatInt, ontemISO } from "@/lib/format";

interface VendaDiaria {
  data: string;
  pedidosValidos: number;
  valorValidas: number;
  pedidosCancelados: number;
  valorCanceladas: number;
  unidades: number | null;
  fonte: "manual" | "import";
}

interface Mensagem {
  tipo: "ok" | "erro";
  texto: string;
}

export default function LancamentoPage() {
  const [vendas, setVendas] = useState<VendaDiaria[]>([]);
  const [data, setData] = useState(ontemISO());
  const [pedidosValidos, setPedidosValidos] = useState("");
  const [valorValidas, setValorValidas] = useState("");
  const [pedidosCancelados, setPedidosCancelados] = useState("");
  const [valorCanceladas, setValorCanceladas] = useState("");
  const [unidades, setUnidades] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [msgForm, setMsgForm] = useState<Mensagem | null>(null);
  const [msgImport, setMsgImport] = useState<Mensagem | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    const res = await fetch("/api/vendas");
    if (res.ok) setVendas(await res.json());
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  // Aceita "1.234,56" e "1234.56" nos campos de valor.
  function lerValor(s: string): number {
    const limpo = s.trim().replace(/[R$\s]/g, "");
    if (limpo === "") return 0;
    return limpo.includes(",")
      ? Number(limpo.replace(/\./g, "").replace(",", "."))
      : Number(limpo);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setMsgForm(null);

    const corpo = {
      data,
      pedidosValidos: Number(pedidosValidos || 0),
      valorValidas: lerValor(valorValidas),
      pedidosCancelados: Number(pedidosCancelados || 0),
      valorCanceladas: lerValor(valorCanceladas),
      unidades: unidades.trim() === "" ? null : Number(unidades),
    };

    if (
      [corpo.pedidosValidos, corpo.valorValidas, corpo.pedidosCancelados, corpo.valorCanceladas].some(
        (n) => !Number.isFinite(n) || n < 0
      )
    ) {
      setMsgForm({ tipo: "erro", texto: "Confira os números digitados." });
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/vendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsgForm({ tipo: "erro", texto: json.erro ?? "Erro ao salvar" });
      } else {
        setMsgForm({
          tipo: "ok",
          texto: `Dia ${formatDataBR(data)} salvo: ${formatBRL(corpo.valorValidas)} em ${corpo.pedidosValidos} pedidos.`,
        });
        setPedidosValidos("");
        setValorValidas("");
        setPedidosCancelados("");
        setValorCanceladas("");
        setUnidades("");
        void carregar();
      }
    } finally {
      setSalvando(false);
    }
  }

  async function importar(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setMsgImport(null);
    setImportando(true);
    try {
      const form = new FormData();
      form.append("arquivo", arquivo);
      const res = await fetch("/api/import", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) {
        setMsgImport({ tipo: "erro", texto: json.erro ?? "Erro na importação" });
      } else {
        setMsgImport({
          tipo: "ok",
          texto: `Importação concluída: ${json.inseridas} dia(s) novo(s), ${json.atualizadas} atualizado(s) (${formatDataBR(json.periodo.de)} a ${formatDataBR(json.periodo.ate)}).`,
        });
        void carregar();
      }
    } finally {
      setImportando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  return (
    <>
      <h1>Lançamento diário</h1>
      <p className="subtitulo">
        Digite as vendas do dia anterior ou importe o relatório
        &quot;Performance das Vendas&quot; do Upseller. A importação faz upsert
        por data — nunca duplica.
      </p>

      <div className="grade">
        <form className="cartao" onSubmit={salvar}>
          <h2>Lançar dia manualmente</h2>

          <div className="campo">
            <label htmlFor="data">Data</label>
            <input
              id="data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="pv">Pedidos válidos</label>
              <input
                id="pv"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="245"
                value={pedidosValidos}
                onChange={(e) => setPedidosValidos(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="vv">Valor válidas (R$)</label>
              <input
                id="vv"
                inputMode="decimal"
                placeholder="16.500,00"
                value={valorValidas}
                onChange={(e) => setValorValidas(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="linha-campos">
            <div className="campo">
              <label htmlFor="pc">Pedidos cancelados</label>
              <input
                id="pc"
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="8"
                value={pedidosCancelados}
                onChange={(e) => setPedidosCancelados(e.target.value)}
              />
            </div>
            <div className="campo">
              <label htmlFor="vc">Valor canceladas (R$)</label>
              <input
                id="vc"
                inputMode="decimal"
                placeholder="540,00"
                value={valorCanceladas}
                onChange={(e) => setValorCanceladas(e.target.value)}
              />
            </div>
          </div>

          <div className="campo">
            <label htmlFor="un">Unidades (opcional)</label>
            <input
              id="un"
              type="number"
              min="0"
              inputMode="numeric"
              placeholder="300"
              value={unidades}
              onChange={(e) => setUnidades(e.target.value)}
            />
          </div>

          <button type="submit" disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar dia"}
          </button>

          {msgForm && (
            <div className={msgForm.tipo === "ok" ? "aviso-ok" : "aviso-erro"}>
              {msgForm.texto}
            </div>
          )}
        </form>

        <div className="cartao">
          <h2>Importar relatório do Upseller (.xlsx)</h2>
          <p style={{ color: "var(--texto-suave)", marginTop: 0 }}>
            Relatório &quot;Performance das Vendas&quot;. Dias já lançados são
            atualizados com os valores do arquivo.
          </p>
          <input
            ref={inputArquivo}
            type="file"
            accept=".xlsx"
            hidden
            onChange={importar}
          />
          <button
            type="button"
            className="botao-secundario"
            disabled={importando}
            onClick={() => inputArquivo.current?.click()}
          >
            {importando ? "Importando..." : "Escolher arquivo .xlsx"}
          </button>

          {msgImport && (
            <div className={msgImport.tipo === "ok" ? "aviso-ok" : "aviso-erro"}>
              {msgImport.texto}
            </div>
          )}
        </div>
      </div>

      <div className="cartao" style={{ marginTop: 20 }}>
        <h2>Últimos lançamentos</h2>
        {vendas.length === 0 ? (
          <p style={{ color: "var(--texto-suave)" }}>
            Nenhum dia lançado ainda. Comece pelo formulário ou pela importação.
          </p>
        ) : (
          <div className="tabela-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Pedidos válidos</th>
                  <th>Valor válidas</th>
                  <th>Cancelados</th>
                  <th>Valor cancelado</th>
                  <th>Unidades</th>
                  <th>Fonte</th>
                </tr>
              </thead>
              <tbody>
                {vendas.map((v) => (
                  <tr key={v.data}>
                    <td>{formatDataBR(v.data)}</td>
                    <td>{formatInt(v.pedidosValidos)}</td>
                    <td className="num-grande">{formatBRL(v.valorValidas)}</td>
                    <td>{formatInt(v.pedidosCancelados)}</td>
                    <td>{formatBRL(v.valorCanceladas)}</td>
                    <td>{v.unidades == null ? "—" : formatInt(v.unidades)}</td>
                    <td>
                      <span
                        className={
                          v.fonte === "import" ? "tag tag-import" : "tag tag-manual"
                        }
                      >
                        {v.fonte === "import" ? "Import" : "Manual"}
                      </span>
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

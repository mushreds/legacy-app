import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vendas & Metas",
  description: "Acompanhamento diário de vendas contra metas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topo">
          <div className="topo-inner">
            <span className="logo">📈 Vendas &amp; Metas</span>
            <nav>
              <Link href="/lancamento">Lançamento diário</Link>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/visoes">Visões</Link>
              <span className="nav-desativado" title="Fase 4">
                Categorias
              </span>
            </nav>
          </div>
        </header>
        <main className="conteudo">{children}</main>
      </body>
    </html>
  );
}

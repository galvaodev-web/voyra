import { BadgePercent, ShieldCheck } from "lucide-react";
import { Navbar, Footer } from "@/components/layout/navbar";
import { Marketplace } from "@/components/marketplace/marketplace";

export default function Page() {
  return (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">
              <BadgePercent size={14} /> VOYRA MARKETPLACE
            </span>
            <h1>Planeje e compare antes de reservar.</h1>
            <p>
              A Voyra conecta seu planejamento a parceiros de viagem e monetiza por comissão de
              intermediação, com transparência para o viajante.
            </p>
          </div>
        </section>
        <section className="container section">
          <Marketplace />
        </section>
        <section className="container section">
          <div className="card wizard stack">
            <span className="icon-tile"><ShieldCheck /></span>
            <h2>A Voyra organiza. O parceiro confirma a contratação.</h2>
            <p>
              Nesta fase, a Voyra não emite passagens nem mantém saldo do viajante. A contratação
              final acontece no ambiente do parceiro, que confirma preço, regras tarifárias,
              disponibilidade e atendimento pós-venda.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Navbar, Footer } from "@/components/layout/navbar";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams(
    Object.entries(params).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const destination = typeof params.destino === "string" ? params.destino : "";
  return (
    <>
      <Navbar />
      <main id="main">
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">
              <Sparkles size={14} /> DO SONHO AO ROTEIRO
            </span>
            <h1>
              {destination
                ? `${destination} está nos seus planos.`
                : "Vamos planejar sua próxima história?"}
            </h1>
            <p>Em poucos passos, seus destinos, datas e orçamento viram uma viagem organizada.</p>
          </div>
        </section>
        <section className="container section">
          <div className="card wizard stack">
            <span className="icon-tile">
              <Sparkles />
            </span>
            <h2>Um plano com o seu jeito de viajar.</h2>
            <p>
              Escolha de onde sair, para onde ir e o que mais gosta de fazer. Depois, organize cada
              detalhe no seu espaço de viagem.
            </p>
            {[
              "Seu roteiro em uma timeline simples",
              "Gastos, reservas e documentos juntos",
              "Ideias da Voyra AI para inspirar seu dia",
            ].map((t) => (
              <span className="row" key={t}>
                <Check size={17} color="#006b67" />
                {t}
              </span>
            ))}
            <Link href={`/app/viagens/nova?${query}`} className="button button-primary">
              Começar meu planejamento <ArrowRight size={17} />
            </Link>
            <small className="muted">
              Entre na sua conta ou explore a demonstração para continuar.
            </small>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

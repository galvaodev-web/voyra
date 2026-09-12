import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Compass,
  Globe2,
  Route,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Wallet,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout/navbar";
import { photos } from "@/data/mock-data";
import { HomeHero } from "./home-hero";
import { BudgetDiscovery } from "./budget-discovery";
import { HomeAI } from "./home-ai";
export function Home() {
  return (
    <>
      <Navbar />
      <main id="main">
        <HomeHero />
        <div className="container trust-strip">
          <span>
            <Globe2 /> O mundo no seu ritmo
          </span>
          <span>
            <Sparkles /> Roteiros com inteligência
          </span>
          <span>
            <Wallet /> Seu orçamento sob controle
          </span>
          <span>
            <ShieldCheck /> Tudo seguro, em um só lugar
          </span>
        </div>
        <BudgetDiscovery />
        <HomeAI />
        <section className="container section feature-section">
          <div className="center-heading">
            <span className="eyebrow">DO PRIMEIRO PLANO À ÚLTIMA LEMBRANÇA</span>
            <h2>A única bagagem extra que você precisa.</h2>
            <p>Tudo se conecta. Você só precisa aproveitar o caminho.</p>
          </div>
          <div className="feature-grid">
            {[
              {
                icon: Route,
                title: "Seu roteiro, do seu jeito",
                text: "Organize cada dia com liberdade. Lugares, horários e experiências em uma visão simples.",
              },
              {
                icon: Ticket,
                title: "Tudo à mão com Voyra Pass",
                text: "Passagens, reservas e ingressos juntos. Chega de procurar aquele e-mail na fila.",
              },
              {
                icon: Wallet,
                title: "Mais viagem, menos contas",
                text: "Acompanhe seus gastos e divida as despesas com quem está nessa com você.",
              },
              {
                icon: Compass,
                title: "Viva o agora. De verdade.",
                text: "Ative o Modo Viagem e veja o que importa: seu próximo destino e o melhor do dia.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div className="feature-card" key={title}>
                <span className="icon-tile">
                  <Icon size={23} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="container community-banner">
          <div>
            <span className="eyebrow">INSPIRAÇÃO DE QUEM JÁ FOI</span>
            <h2>
              Histórias reais.
              <br />
              Seu próximo roteiro.
            </h2>
            <p>
              Descubra caminhos compartilhados por outros viajantes
              <br />e encontre inspiração para fazer os seus.
            </p>
            <Link className="button button-secondary" href="/roteiros">
              Explorar roteiros <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="community-photo">
            <Image src={photos.japan} alt="Templo japonês cercado por natureza" fill sizes="50vw" />
            <div>
              <span className="badge">ESCOLHA DA COMUNIDADE</span>
              <h3>Um Japão além do óbvio.</h3>
              <span>
                <Star size={14} fill="currentColor" /> 4,9 · 10 dias inesquecíveis
              </span>
            </div>
          </div>
        </section>
        <section className="final-cta container">
          <span className="eyebrow">O MELHOR PLANO É COMEÇAR</span>
          <h2>Seu próximo capítulo está lá fora.</h2>
          <p>A gente cuida dos detalhes. Você coleciona as histórias.</p>
          <Link className="button button-primary" href="/cadastro">
            Começar minha próxima viagem <ArrowRight size={18} />
          </Link>
          <small>Grátis para começar. Sem cartão de crédito.</small>
        </section>
      </main>
      <Footer />
    </>
  );
}

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
  Ticket,
  Wallet,
} from "lucide-react";
import { Navbar, Footer } from "@/components/layout/navbar";
import { photos } from "@/data/mock-data";
import { HomeHero } from "./home-hero";
import { BudgetDiscovery } from "./budget-discovery";
import { HomeOrganizer } from "./home-organizer";
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
            <Sparkles /> Roteiros do seu jeito
          </span>
          <span>
            <Wallet /> Seu orçamento sob controle
          </span>
          <span>
            <ShieldCheck /> Seus documentos organizados
          </span>
        </div>
        <BudgetDiscovery />
        <HomeOrganizer />
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
                title: "Encontre sua próxima estadia",
                text: "Busque hospedagem na Booking.com e adicione a confirmação da reserva à sua viagem.",
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
            <span className="eyebrow">NOVOS CAMINHOS PARA EXPLORAR</span>
            <h2>
              Ideias para partir.
              <br />
              Seu próximo roteiro.
            </h2>
            <p>
              Explore ideias de destinos e roteiros
              <br />e dê a eles o seu jeito de viajar.
            </p>
            <Link className="button button-secondary" href="/roteiros">
              Explorar roteiros <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="community-photo">
            <Image src={photos.japan} alt="Templo japonês cercado por natureza" fill sizes="50vw" />
            <div>
              <span className="badge">INSPIRE SUA PRÓXIMA VIAGEM</span>
              <h3>Um Japão além do óbvio.</h3>
              <span>Cultura, natureza e novos caminhos</span>
            </div>
          </div>
        </section>
        <section className="container section faq-section">
          <div className="center-heading">
            <span className="eyebrow">ANTES DE FAZER AS MALAS</span>
            <h2>Como funciona a Voyra?</h2>
          </div>
          {[
            [
              "Por onde começo?",
              "Crie sua viagem com destino e datas. Depois, adicione atividades ao roteiro, registre gastos e guarde as confirmações das suas reservas.",
            ],
            [
              "Posso reservar hotéis por aqui?",
              "O botão de hospedagem abre a Booking.com em outra aba. A busca, o pagamento e as condições da reserva são tratados lá. Depois, você pode cadastrar a confirmação manualmente no Voyra.",
            ],
            [
              "Meus acompanhantes podem editar a viagem?",
              "Nesta versão, os participantes ajudam a organizar nomes e dividir despesas. Eles não recebem convite de acesso e a edição fica na conta que criou a viagem.",
            ],
            [
              "A Voyra monta o roteiro automaticamente?",
              "Nesta versão, você monta e edita o roteiro. O chat de IA, o clima e o mapa ilustrativo são demonstrações identificadas na interface.",
            ],
          ].map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
        <section className="final-cta container">
          <span className="eyebrow">O MELHOR PLANO É COMEÇAR</span>
          <h2>Seu próximo capítulo está lá fora.</h2>
          <p>Organize os detalhes. Abra espaço para as histórias.</p>
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

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Route, Ticket, Wallet } from "lucide-react";
import { photos } from "@/data/mock-data";

export function HomeOrganizer() {
  return (
    <section className="container ai-section">
      <div className="ai-copy">
        <span className="eyebrow">
          <Route size={15} /> DO PLANO À VIAGEM
        </span>
        <h2>
          Menos coisas espalhadas.
          <br />
          Mais tempo para viajar.
        </h2>
        <p>
          Seu roteiro, suas reservas e suas contas no mesmo lugar. Monte cada dia e encontre seus
          planos quando precisar.
        </p>
        <div className="ai-checks">
          <span>
            <Check /> Organize atividades por dia e horário
          </span>
          <span>
            <Check /> Acompanhe gastos e o orçamento disponível
          </span>
          <span>
            <Check /> Guarde passagens, ingressos e reservas
          </span>
        </div>
        <Link href="/planejar" className="button button-primary">
          Começar meu planejamento <ArrowRight size={16} />
        </Link>
      </div>
      <div className="ai-demo stack">
        <div className="row between">
          <strong>Seu próximo destino</strong>
          <span className="badge">Exemplo de organização</span>
        </div>
        <div className="mini-itinerary">
          <Image src={photos.italy} width={68} height={72} alt="Coliseu em Roma" />
          <div>
            <small>ROMA · DIA 01</small>
            <strong>Uma cidade para descobrir</strong>
            <span>História, passeios e uma pausa para o café</span>
          </div>
        </div>
        {[
          {
            icon: Route,
            title: "09:00 · Explorar o centro histórico",
            text: "Atividades organizadas no seu roteiro",
          },
          {
            icon: Ticket,
            title: "Reserva do hotel à mão",
            text: "Adicione a confirmação ao Voyra Pass",
          },
          {
            icon: Wallet,
            title: "Cada gasto no seu lugar",
            text: "Registre valores e acompanhe o total",
          },
        ].map(({ icon: Icon, title, text }) => (
          <div className="row" key={title}>
            <span className="icon-tile">
              <Icon size={20} />
            </span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Play, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui";
import { photos } from "@/data/mock-data";
import { travelAI } from "@/lib/ai";
export function HomeAI() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showTour, setShowTour] = useState(false);
  async function askAI() {
    setThinking(true);
    setAnswer(await travelAI.reply(prompt));
    setThinking(false);
  }
  return (
    <>
      <section className="container ai-section">
        <div className="ai-copy">
          <span className="eyebrow">
            <Sparkles size={15} /> SEU NOVO COMPANHEIRO DE VIAGEM
          </span>
          <h2>
            Você sonha.
            <br />A Voyra AI planeja.
          </h2>
          <p>
            Conte como você quer viajar e receba ideias de um roteiro pensado para você. Mais do que
            lugares, experiências que combinam com o seu jeito.
          </p>
          <div className="ai-checks">
            <span>
              <Check /> Roteiros personalizados para o seu estilo
            </span>
            <span>
              <Check /> Sugestões que respeitam seu orçamento
            </span>
            <span>
              <Check /> Novas ideias quando os planos mudam
            </span>
          </div>
          <button onClick={() => setShowTour(true)} className="text-link">
            Conheça a Voyra AI <ArrowRight size={17} />
          </button>
        </div>
        <div className="ai-demo">
          <div className="row between">
            <span className="row">
              <span className="ai-icon">
                <Sparkles size={20} />
              </span>
              <strong>Voyra AI</strong>
            </span>
            <span className="badge">Demonstração</span>
          </div>
          <div className="chat-bubble user-bubble">
            Quero viajar 8 dias para a Itália, gosto de história e gastronomia e tenho R$ 8.000. 🇮🇹
          </div>
          <div className="demo-response">
            <span className="ai-spark">
              <Sparkles size={19} />
            </span>
            <div>
              <strong>A Itália tem tudo a ver com você!</strong>
              <p>Que tal começar com o melhor de Roma?</p>
              <div className="mini-itinerary">
                <Image src={photos.italy} width={68} height={72} alt="Coliseu em Roma" />
                <div>
                  <small>DIA 01 · ROMA</small>
                  <strong>História em cada esquina</strong>
                  <span>Coliseu · Fórum Romano · Trastevere</span>
                </div>
                <ArrowUpRight size={16} />
              </div>
            </div>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void askAI();
            }}
            className="ai-prompt"
          >
            <input
              aria-label="Conte sua ideia à Voyra AI"
              placeholder="Qual é a viagem dos seus sonhos?"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              required
            />
            <button aria-label="Criar roteiro com IA" disabled={thinking}>
              <ArrowUpRight size={20} />
            </button>
          </form>
          {answer && (
            <p className="ai-answer" role="status">
              {answer}
              <Link href="/planejar" className="text-link">
                Criar minha viagem <ArrowRight size={15} />
              </Link>
            </p>
          )}
          {thinking && <p role="status">Pensando na sua próxima viagem…</p>}
        </div>
      </section>{" "}
      <Modal
        open={showTour}
        onClose={() => setShowTour(false)}
        title="Conheça sua companheira de viagem"
      >
        <div className="stack">
          <span className="icon-tile">
            <Play />
          </span>
          <p>
            A Voyra AI usa os dados da sua viagem para demonstrar sugestões de roteiro, economia e
            alternativas para dias de chuva.
          </p>
          <p>
            Nesta versão, as respostas são simuladas. Nenhuma reserva é feita e seu roteiro só muda
            quando você o edita.
          </p>
          <Link href="/planejar" className="button button-primary">
            Criar roteiro com IA <Sparkles size={17} />
          </Link>
        </div>
      </Modal>
    </>
  );
}

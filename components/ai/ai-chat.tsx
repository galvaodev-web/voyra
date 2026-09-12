"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Sparkles, X } from "lucide-react";
import { travelAI } from "@/lib/ai";
import type { Trip } from "@/types";
export function AIChat({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([
    {
      role: "assistant",
      text: `Olá! Vamos cuidar dos planos da sua viagem ${trip.name}? Posso sugerir alternativas para chuva, economia e tempo livre.`,
    },
  ]);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy]);
  async function send(text: string) {
    if (!text.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text }]);
    setBusy(true);
    try {
      const answer = await travelAI.reply(text, trip);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Não consegui responder agora. Tente novamente." },
      ]);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button
        className="ai-chat-launcher"
        aria-expanded={open}
        aria-controls="voyra-ai-chat"
        onClick={() => setOpen(!open)}
      >
        <Sparkles size={18} />
        Voyra AI{open && <X size={14} />}
      </button>
      {open && (
        <section id="voyra-ai-chat" className="ai-chat-panel" aria-label="Voyra AI">
          <div className="ai-chat-header">
            <span className="row">
              <span className="ai-icon">
                <Sparkles size={19} />
              </span>
              <span>
                <strong>Sua companheira de viagem</strong>
                <small>Voyra AI · respostas simuladas</small>
              </span>
            </span>
            <button className="icon-button" aria-label="Fechar chat" onClick={() => setOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <div className="chat-messages" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role === "user" ? "user" : ""}`}>
                {m.text}
              </div>
            ))}
            {busy && <p className="small-text">Pensando em boas possibilidades…</p>}
            <div ref={bottom} />
          </div>
          <div className="chat-suggestions">
            {["Quero gastar menos hoje", "E se chover?", "Tenho 2 horas livres"].map((q) => (
              <button key={q} disabled={busy} onClick={() => void send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            className="ai-prompt"
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Como posso ajudar?"
              aria-label="Mensagem para Voyra AI"
              maxLength={1500}
            />
            <button disabled={busy || !input.trim()} aria-label="Enviar mensagem">
              <ArrowUpRight size={19} />
            </button>
          </form>
        </section>
      )}
    </>
  );
}

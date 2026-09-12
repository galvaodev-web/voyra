"use client";
import Link from "next/link";
import { useState } from "react";
import {
  Clock,
  Footprints,
  Sun,
  Ticket,
  Navigation,
  CircleHelp,
  ArrowRight,
  Languages,
  ShieldPlus,
} from "lucide-react";
import { Badge, Button, Card, Modal } from "@/components/ui";
import type { Trip } from "@/types";
import { expenseBRL, money, tripDays } from "@/utils/format";
import { travelAI } from "@/lib/ai";
export function TravelMode({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const base = `/app/viagens/${trip.id}`;
  const isExample = trip.id === "italia-2027";
  const activity = isExample
    ? trip.activities.find((a) => a.name === "Coliseu")
    : [...trip.activities].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))[0];
  const later = trip.activities.find(
    (a) => activity && a.day === activity.day && a.time > activity.time,
  );
  const available =
    trip.budget - trip.expenses.reduce((n, e) => n + expenseBRL(e.amount, e.currency), 0);
  async function help(question: string) {
    setBusy(true);
    setAnswer(await travelAI.reply(question, trip));
    setBusy(false);
  }
  return (
    <div className="trip-mode">
      <div className="row between">
        <h1 style={{ fontSize: 27 }}>{trip.name}</h1>
        <Badge>
          <span className="status-dot" style={{ background: "#006b67" }} />
          Modo Viagem ativo
        </Badge>
      </div>
      <p className="small-text muted" style={{ marginTop: 12 }}>
        Prévia demonstrativa do seu dia · horários, distância e clima simulados.
      </p>
      <section className="mode-now">
        <div className="row between" style={{ marginTop: 0 }}>
          <div>
            <span className="eyebrow">AGORA · PRÉVIA</span>
            <div className="mode-clock">09:35</div>
          </div>
          <div className="row" style={{ margin: 0 }}>
            <Sun size={28} />
            <span style={{ fontSize: 25 }}>24°C</span>
          </div>
        </div>
        <p style={{ fontSize: 11, marginTop: 26 }}>PRÓXIMO COMPROMISSO</p>
        <h2>{activity?.name ?? "Um dia de possibilidades"}</h2>
        <div className="row" style={{ fontSize: 12, marginTop: 12 }}>
          <Clock size={15} />
          {activity?.time ?? "Sem atividades"}
          {isExample && (
            <>
              <Footprints size={15} style={{ marginLeft: 10 }} />
              18 min de caminhada
            </>
          )}
        </div>
        <div className="row">
          <Link href={`${base}/documentos`} className="button button-secondary">
            <Ticket size={16} />
            Abrir ingresso
          </Link>
          <Link href={`${base}/mapa`} className="button button-secondary">
            <Navigation size={16} />
            Ver rota
          </Link>
        </div>
      </section>
      {later && (
        <Card>
          <div className="row between">
            <div>
              <span className="eyebrow">DEPOIS · {later.time}</span>
              <h3>{later.name}</h3>
              <p className="small-text" style={{ marginTop: 7 }}>
                {later.location}
              </p>
            </div>
            <Link
              href={`${base}/roteiro`}
              className="icon-button"
              aria-label="Ver roteiro completo"
            >
              <ArrowRight />
            </Link>
          </div>
        </Card>
      )}
      <Card className="mode-budget">
        <span>
          Você pode gastar hoje
          <br />
          <small className="muted">
            {isExample
              ? "Sugestão ilustrativa de orçamento diário"
              : "Saldo dividido pelos dias da viagem"}
          </small>
        </span>
        <strong>
          {isExample ? "€82" : money(Math.max(0, available) / tripDays(trip.start, trip.end))}
        </strong>
      </Card>
      <div className="quick-links">
        <Link href={`${base}/tradutor`}>
          <Languages />
          Tradutor Voyra
        </Link>
        <Link href={`${base}/emergencia`}>
          <ShieldPlus />
          Emergência
        </Link>
      </div>
      <Button
        className="mode-help"
        onClick={() => {
          setAnswer("");
          setOpen(true);
        }}
      >
        <CircleHelp size={20} />
        Preciso de ajuda
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Como podemos ajudar?">
        <div className="help-options">
          {[
            "Estou atrasado",
            "Quero comer perto",
            "Preciso reorganizar meu dia",
            "Quero gastar menos",
          ].map((q) => (
            <button disabled={busy} key={q} onClick={() => void help(q)}>
              {q}
            </button>
          ))}
          <Link href={`${base}/emergencia`} onClick={() => setOpen(false)}>
            Preciso de um hospital
          </Link>
          <Link href={`${base}/documentos`} onClick={() => setOpen(false)}>
            Perdi minha reserva
          </Link>
          <Link href={`${base}/mapa`} onClick={() => setOpen(false)}>
            Como chego ao próximo local?
          </Link>
        </div>
        {busy && (
          <p role="status" style={{ marginTop: 20 }}>
            Preparando uma sugestão…
          </p>
        )}
        {answer && (
          <p className="ai-answer" role="status">
            {answer}
          </p>
        )}
      </Modal>
    </div>
  );
}

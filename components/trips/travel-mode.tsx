"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  Ticket,
  Navigation,
  CircleHelp,
  ArrowRight,
  Languages,
  ShieldPlus,
  MapPin,
} from "lucide-react";
import { Badge, Button, Card, Modal } from "@/components/ui";
import { WeatherCard } from "@/components/trips/weather-card";
import type { Activity, Trip } from "@/types";
import { expenseBRL, money, tripDays } from "@/utils/format";
import { travelAI } from "@/lib/ai";

function localDate(now: Date) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayNumber(start: string, current: string) {
  return (
    Math.floor(
      (new Date(`${current}T12:00:00`).getTime() - new Date(`${start}T12:00:00`).getTime()) /
        86_400_000,
    ) + 1
  );
}

function nextActivities(trip: Trip, now: Date) {
  const today = localDate(now);
  const time = now.toTimeString().slice(0, 5);
  const sorted = [...trip.activities].sort(
    (a, b) => a.day - b.day || a.time.localeCompare(b.time) || (a.order ?? 0) - (b.order ?? 0),
  );
  if (today < trip.start) return sorted;
  if (today > trip.end) return [];
  const currentDay = dayNumber(trip.start, today);
  return sorted.filter(
    (activity) =>
      activity.day > currentDay || (activity.day === currentDay && activity.time >= time),
  );
}

export function TravelMode({ trip }: { trip: Trip }) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const base = `/app/viagens/${trip.id}`;

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const upcoming = useMemo(() => (now ? nextActivities(trip, now) : []), [now, trip]);
  const activity: Activity | undefined = upcoming[0];
  const later: Activity | undefined = upcoming[1];
  const today = now ? localDate(now) : trip.start;
  const phase =
    today < trip.start ? "Viagem futura" : today > trip.end ? "Viagem concluída" : "Em viagem";
  const spent = trip.expenses
    .filter((expense) => expense.status === "ACTUAL")
    .reduce(
      (total, expense) =>
        total + expenseBRL(expense.amount, expense.currency, expense.exchangeRate),
      0,
    );
  const available = Math.max(0, trip.budget - spent);
  const remainingDays =
    today < trip.start
      ? tripDays(trip.start, trip.end)
      : today > trip.end
        ? 1
        : Math.max(1, tripDays(today, trip.end));

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
          {phase}
        </Badge>
      </div>
      <p className="small-text muted" style={{ marginTop: 12 }}>
        Agenda salva na viagem · horário deste dispositivo.
      </p>
      <section className="mode-now">
        <div className="row between" style={{ marginTop: 0 }}>
          <div>
            <span className="eyebrow">AGORA</span>
            <div className="mode-clock">
              {now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) ?? "--:--"}
            </div>
          </div>
          <Clock size={30} />
        </div>
        <p style={{ fontSize: 11, marginTop: 26 }}>{activity ? "PRÓXIMO COMPROMISSO" : "AGENDA"}</p>
        <h2>{activity?.name ?? "Nenhuma atividade futura"}</h2>
        <div className="row" style={{ fontSize: 12, marginTop: 12 }}>
          {activity ? (
            <>
              <Clock size={15} /> Dia {activity.day} · {activity.time}
              <MapPin size={15} style={{ marginLeft: 10 }} /> {activity.location}
            </>
          ) : (
            "Revise o roteiro para adicionar seu próximo compromisso."
          )}
        </div>
        <div className="row">
          <Link href={`${base}/documentos`} className="button button-secondary">
            <Ticket size={16} />
            Abrir documentos
          </Link>
          <Link href={`${base}/mapa`} className="button button-secondary">
            <Navigation size={16} />
            Ver mapa
          </Link>
        </div>
      </section>
      {later && (
        <Card>
          <div className="row between">
            <div>
              <span className="eyebrow">
                DEPOIS · DIA {later.day} · {later.time}
              </span>
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
          Média disponível por dia
          <br />
          <small className="muted">
            Saldo real dividido por {remainingDays} dia(s) restante(s)
          </small>
        </span>
        <strong>{money(available / remainingDays)}</strong>
      </Card>
      <WeatherCard city={trip.destination} tripId={trip.id} />
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
          ].map((question) => (
            <button disabled={busy} key={question} onClick={() => void help(question)}>
              {question}
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

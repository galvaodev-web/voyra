import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Users,
  Wallet,
  Ticket,
  Route,
  BookOpen,
  Navigation,
  ArrowRight,
} from "lucide-react";
import { Avatar, Card } from "@/components/ui";
import { WeatherCard } from "@/components/trips/weather-card";
import type { Trip } from "@/types";
import { expenseBRL, money, tripDays } from "@/utils/format";
export function BudgetStats({ trip }: { trip: Trip }) {
  const spent = trip.expenses.reduce((n, e) => n + expenseBRL(e.amount, e.currency), 0);
  return (
    <div className="stats-grid">
      {[
        { label: "Orçamento total", value: trip.budget },
        { label: "Gasto previsto", value: spent },
        { label: "Disponível", value: trip.budget - spent },
      ].map((s) => (
        <Card className="stat-card" key={s.label}>
          <span className="icon-tile">
            <Wallet size={20} />
          </span>
          <div>
            <small>{s.label}</small>
            <strong style={{ color: s.value < 0 ? "#b93c35" : undefined }}>{money(s.value)}</strong>
          </div>
        </Card>
      ))}
    </div>
  );
}
export function TripOverview({ trip }: { trip: Trip }) {
  const base = `/app/viagens/${trip.id}`;
  const next = [...trip.activities].sort(
    (a, b) => a.day - b.day || a.time.localeCompare(b.time),
  )[0];
  return (
    <>
      <BudgetStats trip={trip} />
      <div className="trip-overview-grid">
        <div className="stack">
          <Card>
            <div className="row between">
              <h2 style={{ fontSize: 22 }}>Seu próximo capítulo</h2>
              <span className="icon-tile">
                <MapPin size={22} />
              </span>
            </div>
            <p style={{ marginTop: 14, fontSize: 12 }}>
              De {trip.origin} a {trip.destination}. Uma viagem para descobrir, desacelerar e viver
              boas histórias.
            </p>
            <div className="trip-meta">
              <span>
                <CalendarDays />
                {tripDays(trip.start, trip.end)} dias
              </span>
              <span>
                <Users />
                {trip.travelers} viajantes
              </span>
              <span>
                <MapPin />
                {trip.destination}
              </span>
            </div>
            <div className="quick-links">
              {[
                { title: "Organizar roteiro", slug: "roteiro", icon: Route },
                { title: "Abrir Voyra Pass", slug: "documentos", icon: Ticket },
                { title: "Registrar memórias", slug: "diario", icon: BookOpen },
                { title: "Ativar Modo Viagem", slug: "modo-viagem", icon: Navigation },
              ].map(({ title, slug, icon: Icon }) => (
                <Link key={slug} href={`${base}/${slug}`}>
                  <Icon />
                  {title}
                </Link>
              ))}
            </div>
          </Card>
          <Card>
            <div className="row between">
              <h3>Boa companhia, boas histórias.</h3>
              <Link href={`${base}/participantes`} className="text-link">
                <ArrowRight size={18} />
                <span className="sr-only">Ver participantes</span>
              </Link>
            </div>
            <div className="member-stack" style={{ marginTop: 20 }}>
              {trip.members.slice(0, 5).map((m) => (
                <Avatar key={m.id} name={m.name} />
              ))}
              <span>
                {trip.members.length}{" "}
                {trip.members.length === 1 ? "pessoa no planejamento" : "pessoas no planejamento"}
              </span>
            </div>
          </Card>
        </div>
        <div className="stack">
          <WeatherCard city={trip.destination} tripId={trip.id} />
          <Card>
            <span className="eyebrow">PRIMEIRO NO ROTEIRO</span>
            <h3>{next?.name ?? "Um dia cheio de possibilidades"}</h3>
            <p style={{ fontSize: 12, margin: "12px 0 18px" }}>
              {next
                ? `Dia ${next.day} · ${next.time} · ${next.duration}`
                : "Adicione uma atividade para começar a dar forma à sua viagem."}
            </p>
            <Link href={`${base}/roteiro`} className="text-link">
              Ver meu roteiro <ArrowRight size={15} />
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}

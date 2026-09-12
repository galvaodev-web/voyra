"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus, Luggage, MapPin, Sparkles, Wallet } from "lucide-react";
import { useVoyra } from "@/hooks/use-voyra";
import { TripCard } from "@/components/trips/trip-card";
import { WeatherCard } from "@/components/trips/weather-card";
import { Card, EmptyState, Input, Select } from "@/components/ui";
import { money } from "@/utils/format";
export function Dashboard({ tripsOnly = false }: { tripsOnly?: boolean }) {
  const { data } = useVoyra();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todas");
  const trips = data.trips.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) &&
      (status === "Todas" || status === t.status),
  );
  return (
    <>
      <div className="app-welcome">
        <div>
          <span className="eyebrow">SEU MUNDO, BEM ORGANIZADO</span>
          <h1>{tripsOnly ? "Minhas viagens" : `Olá, ${data.profile.name.split(" ")[0]} 👋`}</h1>
          <p>
            {tripsOnly
              ? "Cada plano é o começo de uma boa história."
              : "Um novo destino, uma nova história. Para onde vamos agora?"}
          </p>
        </div>
        <Link href="/app/viagens/nova" className="button button-primary">
          <Plus size={17} /> Nova viagem
        </Link>
      </div>
      {!tripsOnly && (
        <div className="stats-grid">
          {[
            {
              icon: Luggage,
              label: "Viagens nos planos",
              value: String(data.trips.length).padStart(2, "0"),
            },
            {
              icon: MapPin,
              label: "Destinos para descobrir",
              value: String(new Set(data.trips.map((t) => t.destination)).size).padStart(2, "0"),
            },
            {
              icon: Wallet,
              label: "Orçamento planejado",
              value: money(data.trips.reduce((n, t) => n + t.budget, 0)),
            },
          ].map(({ icon: Icon, label, value }) => (
            <Card key={label} className="stat-card">
              <span className="icon-tile">
                <Icon size={21} />
              </span>
              <div>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            </Card>
          ))}
        </div>
      )}
      {tripsOnly ? (
        <div className="page-toolbar">
          <Input
            label="Buscar viagem"
            placeholder="Nome da viagem"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            {["Todas", "Planejando", "Em viagem", "Concluída"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </Select>
        </div>
      ) : (
        <div className="section-row">
          <h2>Suas próximas aventuras</h2>
          <Link href="/app/viagens" className="text-link">
            Ver todas <ArrowRight size={15} />
          </Link>
        </div>
      )}
      {trips.length ? (
        <div className="trip-grid">
          {(tripsOnly ? trips : trips.slice(0, 3)).map((t) => (
            <TripCard key={t.id} trip={t} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            query || status !== "Todas"
              ? "Nenhuma viagem encontrada"
              : "Sua primeira aventura começa aqui"
          }
          description="Crie uma viagem e reúna todos os detalhes em um só lugar."
        >
          <Link href="/app/viagens/nova" className="button button-primary">
            <Plus size={17} /> Nova viagem
          </Link>
        </EmptyState>
      )}
      {!tripsOnly && (
        <div className="dashboard-bottom">
          <Card className="dashboard-ai">
            <span className="eyebrow">
              <Sparkles size={15} /> VOYRA AI
            </span>
            <h2>
              Menos tempo planejando.
              <br />
              Mais tempo sonhando.
            </h2>
            <p>Conte como você quer viajar. A gente ajuda você a descobrir por onde começar.</p>
            <Link href="/app/viagens/nova" className="button button-primary">
              Criar minha próxima viagem <ArrowRight size={16} />
            </Link>
          </Card>
          <WeatherCard city={trips[0]?.destination ?? "Roma"} tripId={trips[0]?.id} />
        </div>
      )}
    </>
  );
}

"use client";
import Image from "next/image";
import Link from "next/link";
import { useVoyra } from "@/hooks/use-voyra";
import { Badge, EmptyState } from "@/components/ui";
import {
  LayoutGrid,
  Route,
  Map,
  Wallet,
  Ticket,
  Users,
  Navigation,
  Settings,
  BookOpen,
  Share2,
  Languages,
  ShieldPlus,
  CalendarDays,
  MapPin,
  Hotel,
} from "lucide-react";
import { dateLabel, cn } from "@/utils/format";
import { TripOverview } from "@/components/trips/overview";
import { Itinerary } from "@/components/trips/itinerary";
import { Expenses } from "@/components/expenses/expenses";
import { Documents } from "@/components/documents/documents";
import { TripMap } from "@/components/maps/trip-map";
import { Participants } from "@/components/trips/participants";
import { TravelMode } from "@/components/trips/travel-mode";
import { Translator, Emergency } from "@/components/trips/travel-tools";
import { Diary, PublishTrip } from "@/components/trips/diary";
import { TripSettings } from "@/components/trips/trip-settings";
import { AIChat } from "@/components/ai/ai-chat";
const items = [
  { slug: "", label: "Visão geral", icon: LayoutGrid },
  { slug: "roteiro", label: "Roteiro", icon: Route },
  { slug: "mapa", label: "Mapa", icon: Map },
  { slug: "gastos", label: "Gastos", icon: Wallet },
  { slug: "reservas", label: "Reservas", icon: Hotel },
  { slug: "documentos", label: "Voyra Pass", icon: Ticket },
  { slug: "participantes", label: "Participantes", icon: Users },
  { slug: "modo-viagem", label: "Modo Viagem", icon: Navigation },
  { slug: "diario", label: "Diário", icon: BookOpen },
  { slug: "publicar", label: "Publicar", icon: Share2 },
  { slug: "tradutor", label: "Tradutor", icon: Languages },
  { slug: "emergencia", label: "Emergência", icon: ShieldPlus },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];
export const tripSections = items.map((i) => i.slug);
export function TripWorkspace({ id, section }: { id: string; section: string }) {
  const { data } = useVoyra();
  const trip = data.trips.find((t) => t.id === id);
  if (!trip)
    return (
      <EmptyState
        title="Essa viagem não está nos seus planos"
        description="Ela pode não existir ou pertencer a outra conta."
      >
        <Link className="button button-primary" href="/app/viagens">
          Ver minhas viagens
        </Link>
      </EmptyState>
    );
  const base = `/app/viagens/${id}`;
  return (
    <>
      {section !== "modo-viagem" && (
        <div className="trip-cover">
          <Image
            src={trip.image}
            alt={trip.destination}
            fill
            priority
            sizes="(max-width:640px) 100vw, 80vw"
          />
          <div className="trip-cover-content">
            <div>
              <h1>{trip.name}</h1>
              <p>
                <span className="row">
                  <CalendarDays size={14} />
                  {dateLabel(trip.start)} a {dateLabel(trip.end)} de {trip.start.slice(0, 4)}
                </span>
                <span className="row">
                  <MapPin size={14} />
                  {trip.destination}
                  {trip.country ? `, ${trip.country}` : ""}
                </span>
              </p>
            </div>
            <Badge>{trip.status}</Badge>
          </div>
        </div>
      )}
      <nav className="trip-nav" aria-label="Áreas da viagem">
        {items.map(({ slug, label, icon: Icon }) => (
          <Link
            key={slug}
            className={cn(section === slug && "active")}
            href={`${base}${slug ? `/${slug}` : ""}`}
          >
            <Icon />
            {label}
          </Link>
        ))}
      </nav>
      {section === "" && <TripOverview trip={trip} />}
      {section === "roteiro" && <Itinerary trip={trip} />}
      {section === "gastos" && <Expenses trip={trip} />}
      {(section === "documentos" || section === "reservas") && (
        <Documents trip={trip} bookingsOnly={section === "reservas"} />
      )}
      {section === "mapa" && <TripMap trip={trip} />}
      {section === "participantes" && <Participants trip={trip} />}
      {section === "modo-viagem" && <TravelMode trip={trip} />}
      {section === "tradutor" && <Translator />}
      {section === "emergencia" && <Emergency trip={trip} />}
      {section === "diario" && <Diary trip={trip} />}
      {section === "publicar" && <PublishTrip trip={trip} />}
      {section === "configuracoes" && <TripSettings trip={trip} />}
      <AIChat key={trip.id} trip={trip} />
    </>
  );
}

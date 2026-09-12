import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui";
import type { Trip } from "@/types";
import { dateLabel, money } from "@/utils/format";
export function TripCard({ trip }: { trip: Trip }) {
  return (
    <article className="trip-card">
      <Link
        href={`/app/viagens/${trip.id}`}
        className="trip-card-photo"
        style={{ display: "block" }}
      >
        <Image src={trip.image} alt={trip.destination} fill sizes="(max-width:640px) 90vw, 30vw" />
        <Badge>{trip.status}</Badge>
      </Link>
      <div className="trip-card-info">
        <div className="row between">
          <h3>{trip.name}</h3>
          <ArrowUpRight size={17} color="#84958f" />
        </div>
        <p>
          <CalendarDays size={13} />
          {dateLabel(trip.start)} – {dateLabel(trip.end)} de {trip.start.slice(0, 4)}
        </p>
        <div className="row between">
          <small>Orçamento da viagem</small>
          <strong>{money(trip.budget)}</strong>
        </div>
        <div className="row between" style={{ marginTop: 16 }}>
          <small>Planejamento</small>
          <small>{trip.progress}%</small>
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-valuenow={trip.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso do planejamento"
        >
          <span style={{ width: `${trip.progress}%` }} />
        </div>
        <Link className="button button-secondary" href={`/app/viagens/${trip.id}`}>
          Abrir viagem <ArrowRightIcon />
        </Link>
      </div>
    </article>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={15} />;
}

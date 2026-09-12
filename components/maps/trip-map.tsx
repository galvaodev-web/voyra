"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUpRight, Map } from "lucide-react";
import { navigationUrl, romeLocations, type MapLocation } from "@/lib/maps";
import type { Trip } from "@/types";
import { cn } from "@/utils/format";
import { EmptyState } from "@/components/ui";
import Link from "next/link";
export function TripMap({ trip }: { trip: Trip }) {
  const params = useSearchParams();
  const locations: MapLocation[] =
    trip.id === "italia-2027"
      ? romeLocations
      : trip.activities.map((a, i) => ({
          id: i + 1,
          name: a.name,
          category: a.category,
          x: 20 + ((i * 19) % 65),
          y: 20 + ((i * 23) % 60),
          query: a.location,
        }));
  const initial =
    locations.find((l) => l.name === params.get("local"))?.id ?? locations[0]?.id ?? 1;
  const [selected, setSelected] = useState(initial);
  const place = locations.find((l) => l.id === selected) ?? locations[0];
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Seus planos, no mapa.</h1>
          <p>Uma visão do que faz parte do seu caminho.</p>
        </div>
      </div>
      {!place ? (
        <EmptyState
          title="Adicione lugares ao seu caminho"
          description="As atividades do roteiro aparecerão neste mapa ilustrativo."
        >
          <Link className="button button-primary" href={`/app/viagens/${trip.id}/roteiro`}>
            Organizar roteiro
          </Link>
        </EmptyState>
      ) : (
        <div className="map-layout">
          <aside className="map-places">
            <h3>{trip.destination}</h3>
            <p>{locations.length} lugares nos seus planos</p>
            <div className="map-places-list">
              {locations.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={cn("map-place", selected === p.id && "selected")}
                >
                  <span>{p.id}</span>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.category}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <div className="map-canvas">
            <span className="map-label row">
              <Map size={13} />
              Mapa ilustrativo · sem geolocalização
            </span>
            <svg viewBox="0 0 700 550" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <pattern
                  id="blocks"
                  width="100"
                  height="90"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(-12)"
                >
                  <rect width="100" height="90" fill="#eef0e8" />
                  <rect x="8" y="8" width="84" height="72" rx="12" fill="#e1e5d9" />
                  <path d="M0 0H100M0 0V90" stroke="white" strokeWidth="10" />
                </pattern>
              </defs>
              <rect width="700" height="550" fill="url(#blocks)" />
              <path
                d="M150 -30C370 100 100 230 290 350S350 500 250 600"
                stroke="#aecdd0"
                strokeWidth="40"
                fill="none"
              />
              <path
                d="M-30 340 730 180M50 -30 500 580M-20 75 720 470"
                stroke="#fff"
                strokeWidth="15"
              />
              <path d="M-30 340 730 180M50 -30 500 580" stroke="#dfc79c" strokeWidth="3" />
              <ellipse cx="560" cy="90" rx="92" ry="60" fill="#cbdcbb" />
              <ellipse cx="590" cy="410" rx="78" ry="82" fill="#cbdcbb" />
              <path
                d="M190 340 360 110 410 285 520 355"
                stroke="#4c9984"
                strokeWidth="3"
                fill="none"
                strokeDasharray="6 7"
              />
            </svg>
            {locations.map((p) => (
              <button
                key={p.id}
                aria-label={p.name}
                title={p.name}
                className={cn("map-pin", selected === p.id && "selected")}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                onClick={() => setSelected(p.id)}
              >
                <span>{p.id}</span>
              </button>
            ))}
            <div className="map-detail">
              <div>
                <strong>{place.name}</strong>
                <p>
                  {place.category} · {trip.destination}
                </p>
              </div>
              <a
                href={navigationUrl(place.query)}
                target="_blank"
                rel="noreferrer"
                className="button button-primary"
              >
                Abrir no Google Maps
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </div>
      )}
      <p className="estimate-note">
        Posições e caminhos são ilustrativos. Confirme a rota no serviço de mapas externo antes de
        sair.
      </p>
    </>
  );
}

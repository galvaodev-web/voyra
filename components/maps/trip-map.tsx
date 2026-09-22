"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, Map, RefreshCw } from "lucide-react";
import { navigationUrl, type MapLocation, type TripMapResult } from "@/lib/maps";
import type { Trip } from "@/types";
import { cn } from "@/utils/format";
import { Badge, Button, EmptyState } from "@/components/ui";

export function TripMap({ trip }: { trip: Trip }) {
  const params = useSearchParams();
  const requestedLocal = params.get("local");
  const [result, setResult] = useState<TripMapResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fallbackLocations = useMemo(
    () =>
      trip.activities
        .filter((activity) => activity.location.trim())
        .slice(0, 9)
        .map((activity, index) => ({
          id: index + 1,
          name: activity.name,
          category: activity.category,
          query: [activity.location, trip.destination, trip.country].filter(Boolean).join(", "),
        })),
    [trip.activities, trip.country, trip.destination],
  );
  const [loading, setLoading] = useState(fallbackLocations.length > 0);
  const [selected, setSelected] = useState<number | null>(() => {
    const requested = fallbackLocations.find((location) => location.name === requestedLocal);
    return requested?.id ?? fallbackLocations[0]?.id ?? null;
  });

  const loadMap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/maps?tripId=${encodeURIComponent(trip.id)}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as TripMapResult & { error?: string };
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o mapa.");
      setResult(payload);
      const requested = payload.locations.find((location) => location.name === requestedLocal);
      setSelected(requested?.id ?? payload.locations[0]?.id ?? null);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof Error ? cause.message : "Não foi possível carregar o mapa.");
    } finally {
      setLoading(false);
    }
  }, [requestedLocal, trip.id]);

  useEffect(() => {
    if (!trip.activities.some((activity) => activity.location.trim())) return;
    const timer = window.setTimeout(() => void loadMap(), 0);
    return () => window.clearTimeout(timer);
  }, [loadMap, trip.activities]);

  const place: MapLocation | undefined =
    result?.locations.find((location) => location.id === selected) ?? result?.locations[0];
  const listed = result?.locations ?? fallbackLocations;

  return (
    <>
      <div className="page-title">
        <div>
          <h1>Seus planos, no mapa.</h1>
          <p>Locais encontrados a partir do roteiro salvo.</p>
        </div>
        <Badge className="neutral">{result ? "Mapbox" : "Mapa externo"}</Badge>
      </div>
      {!fallbackLocations.length ? (
        <EmptyState
          title="Adicione lugares ao seu caminho"
          description="As atividades com um local informado aparecerão aqui."
        >
          <Link className="button button-primary" href={`/app/viagens/${trip.id}/roteiro`}>
            Organizar roteiro
          </Link>
        </EmptyState>
      ) : (
        <div className="map-layout">
          <aside className="map-places">
            <h3>{trip.destination}</h3>
            <p>{listed.length} lugares nos seus planos</p>
            <div className="map-places-list">
              {listed.map((location) => (
                <button
                  key={location.id}
                  onClick={() => setSelected(location.id)}
                  className={cn("map-place", selected === location.id && "selected")}
                >
                  <span>{location.id}</span>
                  <span>
                    <strong>{location.name}</strong>
                    <small>{location.category}</small>
                  </span>
                </button>
              ))}
            </div>
          </aside>
          <div className={cn("map-canvas", !result && "map-unavailable")}>
            {result ? (
              // The private API returns the provider image as a data URL, keeping its token server-side.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.image} alt={`Mapa de ${trip.destination} com locais do roteiro`} />
            ) : (
              <div className="map-fallback">
                <Map size={34} />
                <strong>
                  {loading ? "Localizando seus planos..." : "Mapa interno indisponível"}
                </strong>
                <p>{error ?? "A integração de mapas não está configurada neste ambiente."}</p>
                {fallbackLocations.find((location) => location.id === selected) && (
                  <a
                    href={navigationUrl(
                      fallbackLocations.find((location) => location.id === selected)!.query,
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="button button-primary"
                  >
                    Abrir local no Google Maps
                    <ArrowUpRight size={14} />
                  </a>
                )}
                {!loading && (
                  <Button variant="secondary" onClick={() => void loadMap()}>
                    <RefreshCw size={16} />
                    Tentar novamente
                  </Button>
                )}
              </div>
            )}
            {place && (
              <div className="map-detail">
                <div>
                  <strong>{place.name}</strong>
                  <p>{place.matchedName}</p>
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
            )}
          </div>
        </div>
      )}
      {result && (
        <p className="estimate-note">
          Localização fornecida pelo Mapbox em{" "}
          {new Date(result.generatedAt).toLocaleString("pt-BR")}. Confirme horários e acesso antes
          de sair.
        </p>
      )}
    </>
  );
}

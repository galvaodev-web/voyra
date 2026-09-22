"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloudRain, Sun, ArrowRight } from "lucide-react";
import { Badge, Card } from "@/components/ui";

type Forecast = {
  city: string;
  temperature: number;
  condition: string;
  tomorrowRainChance: number;
  source: "WEATHERAPI" | "DEMO";
  observedAt: string;
};

export function WeatherCard({ city = "Roma", tripId }: { city?: string; tripId?: string }) {
  const [forecast, setForecast] = useState<Forecast | null>(
    process.env.NEXT_PUBLIC_STATIC_DEMO === "true"
      ? {
          city,
          temperature: 24,
          condition: "Céu limpo",
          tomorrowRainChance: 70,
          source: "DEMO",
          observedAt: new Date().toISOString(),
        }
      : null,
  );
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") return;
    let active = true;
    void fetch(`/api/weather?city=${encodeURIComponent(city)}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("WEATHER_UNAVAILABLE");
        return (await response.json()) as Forecast;
      })
      .then((data) => {
        if (active) setForecast(data);
      })
      .catch(() => {
        if (active) setUnavailable(true);
      });
    return () => {
      active = false;
    };
  }, [city]);

  return (
    <Card className="weather-card">
      <div className="row between">
        <h3>O tempo em {city}</h3>
        <Badge className="neutral">
          {forecast?.source === "WEATHERAPI"
            ? "WeatherAPI"
            : forecast?.source === "DEMO"
              ? "Demonstração"
              : "Indisponível"}
        </Badge>
      </div>
      {forecast ? (
        <>
          <div className="weather-temp">
            <div>
              <strong>{Math.round(forecast.temperature)}°</strong>
              <small>{forecast.condition}</small>
            </div>
            <Sun />
          </div>
          <div className="notice">
            <CloudRain size={18} />
            <span>Chance de chuva amanhã: {forecast.tomorrowRainChance}%.</span>
          </div>
          <small>Consultado em {new Date(forecast.observedAt).toLocaleString("pt-BR")}.</small>
        </>
      ) : (
        <div className="notice warning">
          {unavailable
            ? "Previsão indisponível neste ambiente."
            : "Consultando o provider de clima..."}
        </div>
      )}
      {forecast && forecast.tomorrowRainChance >= 40 && (
        <Link
          className="text-link"
          href={tripId ? `/app/viagens/${tripId}/roteiro?clima=chuva` : "/app/viagens"}
        >
          Revisar atividades ao ar livre <ArrowRight size={14} />
        </Link>
      )}
    </Card>
  );
}

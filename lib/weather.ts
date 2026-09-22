import "server-only";

import { HttpError } from "@/lib/server/http";

type WeatherApiPayload = {
  location?: { name?: string; localtime_epoch?: number };
  current?: { temp_c?: number; condition?: { text?: string }; last_updated_epoch?: number };
  forecast?: { forecastday?: Array<{ day?: { daily_chance_of_rain?: number } }> };
};

export async function weatherForecast(city: string, fetcher: typeof fetch = fetch) {
  const key = process.env.WEATHER_API_KEY;
  if (!key) throw new HttpError(503, "O provider de clima ainda não está configurado.");
  const url = new URL("https://api.weatherapi.com/v1/forecast.json");
  url.searchParams.set("key", key);
  url.searchParams.set("q", city);
  url.searchParams.set("days", "2");
  url.searchParams.set("aqi", "no");
  url.searchParams.set("alerts", "no");
  url.searchParams.set("lang", "pt");
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok) throw new HttpError(502, "A previsão do tempo está indisponível.");
  const payload = (await response.json()) as WeatherApiPayload;
  const temperature = payload.current?.temp_c;
  const condition = payload.current?.condition?.text?.trim();
  if (typeof temperature !== "number" || !condition)
    throw new HttpError(502, "O provider de clima retornou dados inválidos.");
  const observedEpoch = payload.current?.last_updated_epoch ?? payload.location?.localtime_epoch;
  return {
    city: payload.location?.name?.trim() || city,
    temperature,
    condition,
    tomorrowRainChance: Math.min(
      100,
      Math.max(0, Number(payload.forecast?.forecastday?.[1]?.day?.daily_chance_of_rain ?? 0)),
    ),
    source: "WEATHERAPI" as const,
    observedAt: observedEpoch
      ? new Date(observedEpoch * 1000).toISOString()
      : new Date().toISOString(),
  };
}

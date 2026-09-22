import "server-only";

import { HttpError } from "@/lib/server/http";
import type { MapLocation, TripMapResult } from "@/lib/maps";

type MapActivity = {
  id: string;
  name: string;
  category: string;
  location: string;
};

type SearchBoxPayload = {
  features?: Array<{
    geometry?: { coordinates?: unknown };
    properties?: { name?: unknown; place_formatted?: unknown };
  }>;
};

function validCoordinates(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === "number" &&
    Number.isFinite(value[0]) &&
    typeof value[1] === "number" &&
    Number.isFinite(value[1])
  );
}

async function searchLocation(
  activity: MapActivity,
  destination: string,
  country: string,
  token: string,
  fetcher: typeof fetch,
) {
  const query = [activity.location || activity.name, destination, country]
    .filter(Boolean)
    .join(", ");
  const url = new URL("https://api.mapbox.com/search/searchbox/v1/forward");
  url.searchParams.set("q", query.slice(0, 256));
  url.searchParams.set("language", "pt");
  url.searchParams.set("limit", "1");
  url.searchParams.set("near", [destination, country].filter(Boolean).join(", ").slice(0, 256));
  url.searchParams.set("access_token", token);
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as SearchBoxPayload;
  const feature = payload.features?.[0];
  if (!feature || !validCoordinates(feature.geometry?.coordinates)) return null;
  const [longitude, latitude] = feature.geometry.coordinates;
  const properties = feature.properties;
  const matchedName = [properties?.name, properties?.place_formatted]
    .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    .join(", ");
  return { longitude, latitude, matchedName: matchedName || query };
}

export async function buildTripMap(
  input: { destination: string; country: string; activities: MapActivity[] },
  fetcher: typeof fetch = fetch,
): Promise<TripMapResult> {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) throw new HttpError(503, "O mapa ainda não está configurado.");

  const candidates = input.activities
    .filter((activity) => activity.name.trim() && activity.location.trim())
    .slice(0, 9);
  if (!candidates.length) throw new HttpError(422, "Adicione locais ao roteiro para gerar o mapa.");

  const resolved = await Promise.all(
    candidates.map((activity) =>
      searchLocation(activity, input.destination, input.country, token, fetcher),
    ),
  );
  const locations: MapLocation[] = resolved.flatMap((point, index) =>
    point
      ? [
          {
            id: index + 1,
            activityId: candidates[index].id,
            name: candidates[index].name,
            category: candidates[index].category,
            query: [candidates[index].location, input.destination, input.country]
              .filter(Boolean)
              .join(", "),
            matchedName: point.matchedName,
            longitude: point.longitude,
            latitude: point.latitude,
          },
        ]
      : [],
  );
  if (!locations.length)
    throw new HttpError(502, "Nenhum local do roteiro pôde ser encontrado no mapa.");

  const overlay = locations
    .map(
      (location) =>
        `pin-s-${location.id}+006b67(${location.longitude.toFixed(6)},${location.latitude.toFixed(6)})`,
    )
    .join(",");
  const imageUrl = new URL(
    `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/auto/1000x640@2x`,
  );
  imageUrl.searchParams.set("padding", "72");
  imageUrl.searchParams.set("access_token", token);
  const imageResponse = await fetcher(imageUrl, {
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  const contentType = imageResponse.headers.get("content-type") ?? "";
  if (!imageResponse.ok || !contentType.startsWith("image/"))
    throw new HttpError(502, "O mapa está temporariamente indisponível.");
  const image = `data:${contentType};base64,${Buffer.from(await imageResponse.arrayBuffer()).toString("base64")}`;

  return { locations, image, source: "MAPBOX", generatedAt: new Date().toISOString() };
}

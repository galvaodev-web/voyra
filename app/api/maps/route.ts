import { z } from "zod";
import { apiError, HttpError, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { buildTripMap } from "@/lib/server/mapbox";

export async function GET(request: Request) {
  try {
    if (!process.env.MAPBOX_ACCESS_TOKEN)
      throw new HttpError(503, "O mapa ainda não está configurado.");
    const tripId = z.string().uuid().parse(new URL(request.url).searchParams.get("tripId"));
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "trip-map", {
      userId: user.id,
      maximum: 12,
      windowSeconds: 60,
    });
    const result = await client
      .from("trips")
      .select("destination,data")
      .eq("id", tripId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new HttpError(404, "Viagem não encontrada.");
    const aggregate = (result.data.data ?? {}) as Record<string, unknown>;
    const activities = Array.isArray(aggregate.activities)
      ? aggregate.activities.slice(0, 100).flatMap((value) => {
          if (!value || typeof value !== "object") return [];
          const activity = value as Record<string, unknown>;
          if (
            typeof activity.id !== "string" ||
            typeof activity.name !== "string" ||
            typeof activity.location !== "string"
          )
            return [];
          return [
            {
              id: activity.id.slice(0, 100),
              name: activity.name.slice(0, 200),
              category:
                typeof activity.category === "string" ? activity.category.slice(0, 100) : "Local",
              location: activity.location.slice(0, 256),
            },
          ];
        })
      : [];
    return Response.json(
      await buildTripMap({
        destination: result.data.destination,
        country: typeof aggregate.country === "string" ? aggregate.country.slice(0, 120) : "",
        activities,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

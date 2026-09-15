import { z } from "zod";
import { apiError, HttpError, jsonBody } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requestContext, structuredLog } from "@/lib/server/logger";
import { trackServerEvent } from "@/lib/analytics/server";

const schema = z.object({
  tripId: z.string().uuid(),
  consent: z.literal(true),
  analyticsConsent: z.boolean().default(false),
});

export async function POST(request: Request) {
  const context = requestContext(request, "/social/published-trips");
  try {
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Confirme a publicação da viagem.");
    const { client, user } = await requireBearerUser(request);
    context.userId = user.id;
    await enforceRateLimit(request, "social-trip-publish", {
      userId: user.id,
      maximum: 10,
      windowSeconds: 60,
    });
    const trip = await client
      .from("trips")
      .select("id,data")
      .eq("id", parsed.data.tripId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (trip.error) throw trip.error;
    if (!trip.data) throw new HttpError(404, "Viagem não encontrada.");

    const aggregate = (trip.data.data ?? {}) as { tips?: unknown };
    const tips = typeof aggregate.tips === "string" ? aggregate.tips.trim() : "";
    if (tips.length < 10)
      throw new HttpError(
        422,
        "Antes de publicar, adicione no Voyra Travel pelo menos uma dica para outros viajantes.",
      );

    const result = await client.rpc("publish_trip", {
      target_trip: parsed.data.tripId,
      public_tips: tips,
    });
    if (result.error) throw result.error;

    const route = await client
      .from("published_routes")
      .select("id,title,destination,days,updated_at")
      .eq("id", result.data)
      .single();
    if (route.error) throw route.error;
    await trackServerEvent(
      {
        name: "trip_shared_to_social",
        userId: user.id,
        tripId: parsed.data.tripId,
        consented: parsed.data.analyticsConsent,
      },
      context,
    );
    structuredLog("info", "trip_shared_to_social", context, { tripId: parsed.data.tripId });
    return Response.json(route.data, { status: 201 });
  } catch (error) {
    structuredLog("error", "trip_share_to_social_failed", context, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError(error);
  }
}

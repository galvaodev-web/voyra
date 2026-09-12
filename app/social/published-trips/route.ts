import { z } from "zod";
import { apiError, HttpError, jsonBody } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";

const schema = z.object({
  tripId: z.string().uuid(),
  consent: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Confirme a publicação da viagem.");
    const { client, user } = await requireBearerUser(request);
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
    return Response.json(route.data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

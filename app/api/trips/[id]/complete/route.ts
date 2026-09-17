import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { apiError, HttpError, jsonBody, requireSameOrigin } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requestContext, structuredLog } from "@/lib/server/logger";
import { trackServerEvent } from "@/lib/analytics/server";

const inputSchema = z.object({ analyticsConsent: z.boolean().default(false) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = requestContext(request, "/api/trips/:id/complete");
  try {
    requireSameOrigin(request);
    const tripId = z.string().uuid().parse((await params).id);
    const input = inputSchema.parse(await jsonBody(request));
    const client = await createClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user) throw new HttpError(401, "Entre novamente para concluir a viagem.");
    context.userId = user.id;
    await enforceRateLimit(request, "trip-completion", {
      userId: user.id,
      maximum: 10,
      windowSeconds: 3600,
    });
    const completed = await client.rpc("complete_trip", { target_trip: tripId });
    if (completed.error) {
      if (completed.error.message.includes("TRIP_HAS_NOT_ENDED"))
        throw new HttpError(409, "A viagem só pode ser concluída depois da data final.");
      if (completed.error.message.includes("TRIP_ACTIVITY_REQUIRED"))
        throw new HttpError(409, "Adicione ao menos uma atividade antes de concluir a viagem.");
      if (completed.error.message.includes("TRIP_NOT_FOUND"))
        throw new HttpError(404, "Viagem não encontrada.");
      throw completed.error;
    }
    const [trip, tokens] = await Promise.all([
      client.from("trips").select("revision,completed_at").eq("id", tripId).single(),
      client
        .from("travel_tokens")
        .select("public_id,share_slug,token_type,destination,country_name,cities,travel_year,start_date,end_date,days,verified_place_count,serial_number,achievement_code,rarity,verification,issued_at")
        .eq("trip_id", tripId)
        .eq("status", "ACTIVE")
        .order("issued_at"),
    ]);
    if (trip.error || tokens.error) throw trip.error ?? tokens.error;
    await trackServerEvent(
      {
        name: "trip_completed",
        userId: user.id,
        tripId,
        consented: input.analyticsConsent,
      },
      context,
    );
    structuredLog("info", "trip_completed", context, { tripId });
    return Response.json(
      {
        completedAt: trip.data.completed_at,
        revision: trip.data.revision,
        tokens: tokens.data ?? [],
      },
      { headers: { "x-request-id": context.requestId } },
    );
  } catch (error) {
    structuredLog("error", "trip_completion_failed", context, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError(error);
  }
}

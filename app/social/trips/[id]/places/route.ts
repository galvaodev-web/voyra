import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, HttpError, jsonBody } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requestContext, structuredLog } from "@/lib/server/logger";
import { trackServerEvent } from "@/lib/analytics/server";

const inputSchema = z.object({
  postId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(200),
  analyticsConsent: z.boolean().default(false),
});

const postSchema = z
  .object({
    id: z.string().uuid(),
    place_id: z.string().uuid().nullable(),
    place_name: z.string().min(2).max(120).nullable(),
    category: z.string().max(80).optional(),
  })
  .passthrough();

type ImportedActivity = {
  id: string;
  day: number;
  time: string;
  name: string;
  category: string;
  duration: string;
  cost: number;
  location: string;
  image: string;
  source?: { kind: "voyra-social"; postId?: string; routeId?: string };
};

type TripData = Record<string, unknown> & {
  activities?: ImportedActivity[];
  image?: string;
  progress?: number;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = requestContext(request, "/social/trips/:id/places");
  try {
    const { id: rawTripId } = await params;
    const tripId = z.string().uuid().parse(rawTripId);
    const input = inputSchema.safeParse(await jsonBody(request));
    if (!input.success) throw new HttpError(400, "Dados da descoberta inválidos.");
    if (input.data.idempotencyKey !== `${tripId}:${input.data.postId}`)
      throw new HttpError(400, "Chave de idempotência inválida.");

    const { client, user } = await requireBearerUser(request);
    context.userId = user.id;
    await enforceRateLimit(request, "social-place-import", {
      userId: user.id,
      maximum: 30,
      windowSeconds: 60,
    });
    const detail = await client
      .schema("social")
      .rpc("post_detail", { target_id: input.data.postId });
    if (detail.error || !detail.data) throw new HttpError(404, "Publicação indisponível.");
    const parsedPost = postSchema.safeParse(detail.data);
    if (!parsedPost.success || !parsedPost.data.place_name)
      throw new HttpError(422, "Esta publicação não possui um lugar que possa ir para o roteiro.");

    let place: { address: string | null; category: string | null } | null = null;
    if (parsedPost.data.place_id) {
      const result = await client
        .schema("social")
        .from("places")
        .select("address,category")
        .eq("id", parsedPost.data.place_id)
        .maybeSingle();
      if (!result.error) place = result.data;
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { data: trip, error: tripError } = await client
        .from("trips")
        .select("id,data,revision")
        .eq("id", tripId)
        .eq("owner_id", user.id)
        .maybeSingle();
      if (tripError) throw tripError;
      if (!trip) throw new HttpError(404, "Viagem não encontrada.");

      const current = (trip.data ?? {}) as TripData;
      const activities = Array.isArray(current.activities) ? current.activities : [];
      const duplicate = activities.find(
        (activity) =>
          activity.source?.kind === "voyra-social" && activity.source.postId === parsedPost.data.id,
      );
      if (duplicate)
        return Response.json({
          added: false,
          duplicate: true,
          tripId,
          activityId: duplicate.id,
        });

      const activity: ImportedActivity = {
        id: randomUUID(),
        day: 1,
        time: "09:00",
        name: parsedPost.data.place_name,
        category: place?.category || parsedPost.data.category || "Passeio",
        duration: "1 hora",
        cost: 0,
        location: place?.address || parsedPost.data.place_name,
        image:
          typeof current.image === "string" && current.image
            ? current.image
            : "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80",
        source: { kind: "voyra-social", postId: parsedPost.data.id },
      };
      const progress = typeof current.progress === "number" ? Math.max(current.progress, 35) : 35;
      const nextData: TripData = {
        ...current,
        activities: [...activities, activity],
        progress,
      };
      const updated = await client
        .from("trips")
        .update({ data: nextData })
        .eq("id", tripId)
        .eq("owner_id", user.id)
        .eq("revision", trip.revision)
        .select("revision")
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (updated.data) {
        await trackServerEvent(
          {
            name: "post_imported_to_trip",
            userId: user.id,
            tripId,
            consented: input.data.analyticsConsent,
            properties: { source: "post", sourceId: parsedPost.data.id },
          },
          context,
        );
        structuredLog("info", "social_place_imported", context, { tripId });
        return Response.json({ added: true, duplicate: false, tripId, activityId: activity.id });
      }
    }

    throw new HttpError(409, "A viagem mudou enquanto o lugar era adicionado. Tente novamente.");
  } catch (error) {
    structuredLog("error", "social_place_import_failed", context, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError(error);
  }
}

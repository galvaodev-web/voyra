import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, HttpError, jsonBody } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { requestContext, structuredLog } from "@/lib/server/logger";
import { trackServerEvent } from "@/lib/analytics/server";

const inputSchema = z.object({
  routeId: z.string().uuid(),
  analyticsConsent: z.boolean().default(false),
});
const activitySchema = z.object({
  day: z.number().int().min(1).max(366),
  time: z.string().max(5),
  name: z.string().min(1).max(200),
  category: z.string().max(80),
  duration: z.string().max(80),
  location: z.string().max(200),
});

function stableTripId(userId: string, routeId: string) {
  const bytes = Buffer.from(
    createHash("sha256").update(`${userId}:${routeId}`).digest().subarray(0, 16),
  );
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export async function POST(request: Request) {
  const context = requestContext(request, "/social/import-route");
  try {
    const parsed = inputSchema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Roteiro inválido.");
    const { client, user } = await requireBearerUser(request);
    context.userId = user.id;
    await enforceRateLimit(request, "social-route-import", {
      userId: user.id,
      maximum: 20,
      windowSeconds: 60,
    });

    const routeResult = await client
      .from("published_routes")
      .select("id,title,destination,days,tips,activities,published")
      .eq("id", parsed.data.routeId)
      .maybeSingle();
    if (routeResult.error) throw routeResult.error;
    if (!routeResult.data?.published) throw new HttpError(404, "Este roteiro não está disponível.");

    const publicActivities = z
      .array(activitySchema)
      .max(1000)
      .safeParse(routeResult.data.activities);
    if (!publicActivities.success)
      throw new HttpError(422, "O roteiro publicado não pode ser importado.");

    const tripId = stableTripId(user.id, routeResult.data.id);
    const existing = await client
      .from("trips")
      .select("id")
      .eq("id", tripId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return Response.json({ id: tripId, imported: false, duplicate: true });

    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + Math.max(0, routeResult.data.days - 1));
    const startDate = start.toISOString().slice(0, 10);
    const endDate = end.toISOString().slice(0, 10);
    const image =
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80";
    const activities = publicActivities.data.map((activity) => ({
      ...activity,
      id: randomUUID(),
      cost: 0,
      image,
      source: { kind: "voyra-social" as const, routeId: routeResult.data!.id },
    }));
    const data = {
      id: tripId,
      name: `${routeResult.data.title} — meu roteiro`,
      origin: "",
      destination: routeResult.data.destination,
      country: "",
      start: startDate,
      end: endDate,
      travelers: 1,
      budget: 0,
      styles: [],
      image,
      status: "Planejando",
      progress: 25,
      activities,
      expenses: [],
      documents: [],
      members: [],
      notes: [],
      published: false,
      tips: routeResult.data.tips,
      includeCover: false,
      importedFromRoute: routeResult.data.id,
    };
    const inserted = await client.from("trips").insert({
      id: tripId,
      owner_id: user.id,
      name: data.name,
      destination: data.destination,
      start_date: startDate,
      end_date: endDate,
      budget: 0,
      data,
    });
    if (inserted.error) {
      if (inserted.error.code === "23505")
        return Response.json({ id: tripId, imported: false, duplicate: true });
      throw inserted.error;
    }
    await trackServerEvent(
      {
        name: "post_imported_to_trip",
        userId: user.id,
        tripId,
        consented: parsed.data.analyticsConsent,
        properties: { source: "route", sourceId: routeResult.data.id },
      },
      context,
    );
    structuredLog("info", "social_route_imported", context, { tripId });
    return Response.json({ id: tripId, imported: true, duplicate: false }, { status: 201 });
  } catch (error) {
    structuredLog("error", "social_route_import_failed", context, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return apiError(error);
  }
}

import { z } from "zod";
import { apiError, HttpError } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const tripId = z.string().uuid().parse(rawId);
    const { client, user } = await requireBearerUser(request);
    const result = await client
      .from("trips")
      .select("id,name,destination,start_date,end_date,data")
      .eq("id", tripId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new HttpError(404, "Viagem não encontrada.");

    const data = (result.data.data ?? {}) as {
      status?: unknown;
      country?: unknown;
      activities?: unknown;
    };
    const today = new Date().toISOString().slice(0, 10);
    if (data.status !== "Concluída" || result.data.end_date > today)
      throw new HttpError(409, "Conclua a viagem no Voyra Travel após a data final para liberar o Passport.");

    const route = await client
      .from("published_routes")
      .select("id")
      .eq("trip_id", tripId)
      .eq("published", true)
      .maybeSingle();
    if (route.error) throw route.error;

    const start = new Date(`${result.data.start_date}T00:00:00Z`);
    const end = new Date(`${result.data.end_date}T00:00:00Z`);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const activities = Array.isArray(data.activities) ? data.activities : [];

    return Response.json({
      trip_id: result.data.id,
      name: result.data.name,
      destination: result.data.destination,
      country: typeof data.country === "string" ? data.country : "",
      start_date: result.data.start_date,
      end_date: result.data.end_date,
      days,
      place_count: activities.length,
      public_route_id: route.data?.id ?? null,
    });
  } catch (error) {
    return apiError(error);
  }
}

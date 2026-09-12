import { apiError } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";

export async function GET(request: Request) {
  try {
    const { client, user } = await requireBearerUser(request);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from("trips")
      .select("id,name,destination,start_date,end_date")
      .eq("owner_id", user.id)
      .gte("end_date", today)
      .order("start_date", { ascending: true });
    if (error) throw error;
    return Response.json(
      (data ?? []).map((trip) => ({
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        start_date: trip.start_date,
      })),
    );
  } catch (error) {
    return apiError(error);
  }
}

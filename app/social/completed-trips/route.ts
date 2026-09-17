import { apiError } from "@/lib/server/http";
import { requireBearerUser } from "@/lib/supabase/bearer";

export async function GET(request: Request) {
  try {
    const { client, user } = await requireBearerUser(request);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await client
      .from("trips")
      .select("id,name,destination,end_date,completion_status")
      .eq("owner_id", user.id)
      .eq("completion_status", "COMPLETED")
      .lte("end_date", today)
      .order("end_date", { ascending: false })
      .limit(100);
    if (error) throw error;
    return Response.json(
      (data ?? []).map((trip) => ({
          id: trip.id,
          name: trip.name,
          destination: trip.destination,
          end_date: trip.end_date,
        })),
    );
  } catch (error) {
    return apiError(error);
  }
}

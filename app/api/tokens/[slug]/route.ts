import { z } from "zod";
import { adminClient } from "@/lib/supabase/admin";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { apiError, HttpError } from "@/lib/server/http";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await enforceRateLimit(request, "public-token", { maximum: 120, windowSeconds: 60 });
    const slug = z.string().regex(/^[a-f0-9]{32}$/).parse((await params).slug);
    const result = await adminClient()
      .from("travel_tokens")
      .select("public_id,share_slug,token_type,destination,country_name,cities,travel_year,start_date,end_date,days,verified_place_count,serial_number,achievement_code,rarity,verification,public_recap_id,issued_at")
      .eq("share_slug", slug)
      .eq("status", "ACTIVE")
      .eq("visible", true)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new HttpError(404, "Travel Token não encontrado.");
    return Response.json(result.data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    return apiError(error);
  }
}

import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicRouteColumns, publicRouteSchema } from "@/lib/public-routes";
export function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
export async function readPublicRoute(id: string) {
  const client = publicClient();
  if (!client) return null;
  const { data, error } = await client
    .from("published_routes")
    .select(publicRouteColumns)
    .eq("id", id)
    .eq("published", true)
    .maybeSingle();
  if (error) throw error;
  return data ? publicRouteSchema.parse(data) : null;
}

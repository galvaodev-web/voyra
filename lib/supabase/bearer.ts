import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { HttpError } from "@/lib/server/http";

export async function requireBearerUser(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new HttpError(503, "Contas reais ainda não estão disponíveis.");

  const header = request.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new HttpError(401, "Autenticação necessária.");
  const token = header.slice(7).trim();
  if (!token) throw new HttpError(401, "Autenticação necessária.");

  const client = createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);
  if (error || !user) throw new HttpError(401, "Sessão inválida ou expirada.");

  return { client, user, token };
}

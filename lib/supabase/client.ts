import { createBrowserClient } from "@supabase/ssr";
export const isSupabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const demoEnabled = !isSupabaseConfigured && process.env.NEXT_PUBLIC_DEMO_ENABLED !== "false";
export function createClient() {
  if (!isSupabaseConfigured) throw new Error("Configure o Supabase para conectar sua conta.");
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

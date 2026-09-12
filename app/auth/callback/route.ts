import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/utils/format";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error)
      return new NextResponse(null, {
        status: 303,
        headers: { Location: safeNext(url.searchParams.get("next")), "Cache-Control": "no-store" },
      });
  }
  // Relative redirects retain the browser's origin behind proxies and local bind addresses.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: "/login?error=callback", "Cache-Control": "no-store" },
  });
}

import { NextResponse } from "next/server";
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  if (
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    process.env.NEXT_PUBLIC_DEMO_ENABLED === "false"
  )
    return NextResponse.json({ error: "Demonstração indisponível" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set("voyra-demo", "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: request.headers.get("origin")?.startsWith("https://") ?? false,
    path: "/",
    maxAge: 86400,
  });
  return response;
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.delete("voyra-demo");
  return response;
}

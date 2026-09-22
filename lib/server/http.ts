import "server-only";
import { ZodError } from "zod";
import { createClient } from "@/lib/supabase/server";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function siteOrigin() {
  const value = process.env.SITE_URL;
  if (!value) throw new HttpError(503, "O serviço ainda não está disponível.");
  const url = new URL(value);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost"))
    throw new HttpError(503, "O endereço do serviço não está configurado.");
  return url.origin;
}
export function requireSameOrigin(request: Request) {
  if (request.headers.get("origin") !== siteOrigin()) throw new HttpError(403, "Origem inválida.");
}
export async function requireUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    throw new HttpError(503, "Contas reais ainda não estão disponíveis.");
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new HttpError(401, "Entre na sua conta para continuar.");
  return { client, user };
}
export async function optionalUser() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return null;
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user ? { client, user } : null;
}
export async function jsonBody(request: Request, limit = 8192): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Envie os dados da solicitação.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new HttpError(413, "Solicitação muito grande.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError)
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  // Never include tokens, payment payloads or private trip data in responses/logs.
  console.error("Voyra API operation failed", error instanceof Error ? error.name : "UnknownError");
  return Response.json({ error: "Não foi possível concluir. Tente novamente." }, { status: 500 });
}

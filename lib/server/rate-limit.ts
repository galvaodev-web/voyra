import "server-only";
import { createHmac } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/server/http";

type MemoryBucket = { hits: number; expiresAt: number };
const localBuckets = new Map<string, MemoryBucket>();

function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function identifierHash(value: string) {
  const secret = process.env.RATE_LIMIT_SECRET;
  if (!secret) return value;
  return createHmac("sha256", secret).update(value).digest("hex");
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  options: { userId?: string; maximum: number; windowSeconds: number },
) {
  const rawIdentifier = options.userId ? `user:${options.userId}` : `ip:${clientAddress(request)}`;
  const identifier = identifierHash(rawIdentifier);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );

  let allowed = false;
  if (configured) {
    if (!process.env.RATE_LIMIT_SECRET)
      throw new HttpError(503, "A protecao contra abuso nao esta configurada.");
    const { data, error } = await adminClient().rpc("consume_rate_limit", {
      target_scope: scope,
      target_identifier_hash: identifier,
      maximum_hits: options.maximum,
      window_seconds: options.windowSeconds,
    });
    if (error) throw error;
    allowed = data === true;
  } else {
    const key = `${scope}:${identifier}`;
    const now = Date.now();
    const current = localBuckets.get(key);
    const bucket =
      !current || current.expiresAt <= now
        ? { hits: 1, expiresAt: now + options.windowSeconds * 1000 }
        : { ...current, hits: current.hits + 1 };
    localBuckets.set(key, bucket);
    allowed = bucket.hits <= options.maximum;
  }

  if (!allowed)
    throw new HttpError(429, "Muitas buscas em pouco tempo. Aguarde e tente novamente.");
}

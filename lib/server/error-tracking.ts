import "server-only";

import { randomUUID } from "node:crypto";

const safeKeys = new Set(["errorName", "databaseCode", "provider", "vertical", "status"]);

export function captureServerError(
  event: string,
  context: { requestId: string; route: string },
  fields: Record<string, string | number | boolean | null | undefined>,
) {
  const configured = process.env.SENTRY_DSN;
  if (!configured) return;
  try {
    const dsn = new URL(configured);
    const projectId = dsn.pathname.split("/").filter(Boolean).at(-1);
    if (dsn.protocol !== "https:" || !dsn.username || !projectId) return;
    const endpoint = new URL(`/api/${projectId}/store/`, dsn.origin);
    endpoint.searchParams.set("sentry_key", dsn.username);
    endpoint.searchParams.set("sentry_version", "7");
    const extra = Object.fromEntries(
      Object.entries(fields)
        .filter(([key, value]) => safeKeys.has(key) && value != null)
        .map(([key, value]) => [key, String(value).slice(0, 120)]),
    );
    void fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: randomUUID().replaceAll("-", ""),
        timestamp: Date.now() / 1000,
        platform: "node",
        level: "error",
        message: event.slice(0, 120),
        tags: { route: context.route.slice(0, 160) },
        extra: { requestId: context.requestId, ...extra },
      }),
      signal: AbortSignal.timeout(2_000),
    }).catch(() => undefined);
  } catch {
    // Observability must never break the user request.
  }
}

import "server-only";
import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";
type LogValue = string | number | boolean | null | undefined;

export type RequestContext = {
  requestId: string;
  route: string;
  userId?: string;
};

export function requestContext(request: Request, route: string): RequestContext {
  const incoming = request.headers.get("x-request-id") ?? "";
  return {
    requestId: /^[a-zA-Z0-9._:-]{8,128}$/.test(incoming) ? incoming : randomUUID(),
    route,
  };
}

export function structuredLog(
  level: LogLevel,
  event: string,
  context: RequestContext,
  fields: Record<string, LogValue> = {},
) {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: context.requestId,
    route: context.route,
    userId: context.userId,
    ...fields,
  });
  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.info(payload);
}

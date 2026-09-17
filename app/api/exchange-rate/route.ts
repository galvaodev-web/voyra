import { z } from "zod";
import { exchangeRate } from "@/lib/exchange-rate";
import { apiError } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  try {
    await enforceRateLimit(request, "exchange-rate", { maximum: 60, windowSeconds: 60 });
    const url = new URL(request.url);
    const input = z.object({
      base: z.enum(["BRL", "EUR", "USD"]),
      quote: z.enum(["BRL", "EUR", "USD"]).default("BRL"),
    }).parse({
      base: url.searchParams.get("base")?.toUpperCase(),
      quote: url.searchParams.get("quote")?.toUpperCase() || "BRL",
    });
    return Response.json(await exchangeRate(input.base, input.quote), {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (error) {
    return apiError(error);
  }
}

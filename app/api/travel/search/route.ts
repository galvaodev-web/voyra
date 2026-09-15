import { apiError, HttpError, jsonBody, optionalUser, requireSameOrigin } from "@/lib/server/http";
import { requestContext, structuredLog } from "@/lib/server/logger";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { trackServerEvent } from "@/lib/analytics/server";
import { travelSearchSchema } from "@/lib/travel/contracts";
import { VoyraPriceEngine } from "@/lib/travel/price-engine";
import { persistTravelSearch } from "@/lib/travel/search-repository";

const engine = new VoyraPriceEngine();

export async function POST(request: Request) {
  const context = requestContext(request, "/api/travel/search");
  try {
    requireSameOrigin(request);
    const parsed = travelSearchSchema.safeParse(await jsonBody(request, 16_384));
    if (!parsed.success) throw new HttpError(400, "Preencha os dados da busca corretamente.");

    const session = await optionalUser();
    if (session) context.userId = session.user.id;
    await enforceRateLimit(request, "travel-search", {
      userId: session?.user.id,
      maximum: session ? 30 : 10,
      windowSeconds: 60,
    });

    const result = await engine.search(parsed.data);
    const searchId = session
      ? await persistTravelSearch(
          session.user.id,
          parsed.data,
          result.options.length,
          result.providerResults,
        )
      : null;

    await trackServerEvent(
      {
        name: "search_created",
        userId: session?.user.id,
        searchId: searchId ?? undefined,
        campaign: parsed.data.campaign,
        consented: parsed.data.analyticsConsent,
        properties: {
          resultCount: result.options.length,
          priceType: result.options.some((option) => option.priceType === "LIVE")
            ? "MIXED"
            : "ESTIMATED",
        },
      },
      context,
    );
    structuredLog("info", "travel_search_completed", context, {
      persisted: Boolean(searchId),
      resultCount: result.options.length,
      providerCount: result.providerResults.length,
    });

    return Response.json(
      {
        searchId,
        persisted: Boolean(searchId),
        generatedAt: new Date().toISOString(),
        options: result.options,
        providers: result.providerResults,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Request-Id": context.requestId,
        },
      },
    );
  } catch (error) {
    structuredLog("error", "travel_search_failed", context, {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    const response = apiError(error);
    response.headers.set("X-Request-Id", context.requestId);
    return response;
  }
}

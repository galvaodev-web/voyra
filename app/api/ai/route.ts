import { z } from "zod";
import { generateTravelReply, type TravelAIContext } from "@/lib/server/openai";
import { apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";

const inputSchema = z.object({
  message: z.string().trim().min(2).max(1500),
  tripId: z.string().uuid(),
});

export async function GET() {
  return Response.json({
    available: Boolean(process.env.OPENAI_API_KEY),
    mode: process.env.OPENAI_API_KEY ? "live" : "unavailable",
  });
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY)
      throw new HttpError(503, "A Voyra AI ainda não está configurada.");
    requireSameOrigin(request);
    const input = inputSchema.safeParse(await jsonBody(request, 4096));
    if (!input.success) throw new HttpError(400, "Revise sua mensagem e tente novamente.");
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "voyra-ai", {
      userId: user.id,
      maximum: 12,
      windowSeconds: 60,
    });
    const result = await client
      .from("trips")
      .select("destination,start_date,end_date,budget,data")
      .eq("id", input.data.tripId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new HttpError(404, "Viagem não encontrada.");
    const aggregate = (result.data.data ?? {}) as { styles?: unknown; activities?: unknown };
    const activities = Array.isArray(aggregate.activities)
      ? aggregate.activities.slice(0, 200).flatMap((activity) => {
          if (!activity || typeof activity !== "object") return [];
          const item = activity as Record<string, unknown>;
          return [
            {
              day: typeof item.day === "number" ? item.day : 1,
              time: typeof item.time === "string" ? item.time.slice(0, 5) : "",
              name: typeof item.name === "string" ? item.name.slice(0, 200) : "",
              location: typeof item.location === "string" ? item.location.slice(0, 200) : "",
            },
          ];
        })
      : [];
    const context: TravelAIContext = {
      destination: result.data.destination,
      start: result.data.start_date,
      end: result.data.end_date,
      budget: Number(result.data.budget),
      styles: Array.isArray(aggregate.styles)
        ? aggregate.styles
            .filter((value): value is string => typeof value === "string")
            .slice(0, 20)
        : [],
      activities,
    };
    return Response.json(
      { reply: await generateTravelReply(input.data.message, context) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

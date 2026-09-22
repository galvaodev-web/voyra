import { z } from "zod";
import { apiError, HttpError, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { weatherForecast } from "@/lib/weather";

export async function GET(request: Request) {
  try {
    if (!process.env.WEATHER_API_KEY)
      throw new HttpError(503, "O provider de clima ainda não está configurado.");
    const city = z
      .string()
      .trim()
      .min(2)
      .max(120)
      .parse(new URL(request.url).searchParams.get("city"));
    const { user } = await requireUser();
    await enforceRateLimit(request, "weather", {
      userId: user.id,
      maximum: 30,
      windowSeconds: 60,
    });
    return Response.json(await weatherForecast(city), {
      headers: { "Cache-Control": "private, max-age=600" },
    });
  } catch (error) {
    return apiError(error);
  }
}

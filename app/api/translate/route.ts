import { z } from "zod";
import { translateText } from "@/lib/server/openai";
import { apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";

const languages = [
  "Português",
  "Inglês",
  "Espanhol",
  "Italiano",
  "Francês",
  "Alemão",
  "Japonês",
  "Coreano",
  "Mandarim",
] as const;

const inputSchema = z.object({
  text: z.string().trim().min(1).max(1500),
  sourceLanguage: z.enum(languages),
  targetLanguage: z.enum(languages),
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
      throw new HttpError(503, "O tradutor ainda não está configurado.");
    requireSameOrigin(request);
    const input = inputSchema.parse(await jsonBody(request, 4096));
    if (input.sourceLanguage === input.targetLanguage)
      throw new HttpError(400, "Escolha idiomas diferentes.");
    const { user } = await requireUser();
    await enforceRateLimit(request, "translate", {
      userId: user.id,
      maximum: 20,
      windowSeconds: 60,
    });
    return Response.json(
      {
        translation: await translateText(input.text, input.sourceLanguage, input.targetLanguage),
        source: "OPENAI",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

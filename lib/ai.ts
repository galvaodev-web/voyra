import type { Trip } from "@/types";

type AIStatus = { available: boolean; mode: "live" | "demo" | "unavailable" };

function demoReply(message: string, trip?: Trip) {
  const city = trip?.destination ?? "seu destino";
  const text = message.toLowerCase();
  if (/chov|chuva|reorganiz|atras|tarde/.test(text))
    return `Para seu dia em ${city}, a demonstração sugere priorizar uma atividade coberta e reservar tempo entre os compromissos. Nada foi alterado automaticamente.`;
  if (/gast|barat|orçamento/.test(text))
    return `Para economizar em ${city}, a demonstração sugere combinar passeios gratuitos com uma refeição em mercado local. Confira valores reais antes de reservar.`;
  return `Esta é uma resposta demonstrativa para ${city}. Na aplicação hospedada, a Voyra AI só fica disponível quando o provider server-side está configurado.`;
}

async function responseError(response: Response) {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? "A Voyra AI está indisponível no momento.";
}

export const travelAI = {
  async status(): Promise<AIStatus> {
    if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") return { available: true, mode: "demo" };
    try {
      const response = await fetch("/api/ai", { cache: "no-store" });
      if (!response.ok) return { available: false, mode: "unavailable" };
      return (await response.json()) as AIStatus;
    } catch {
      return { available: false, mode: "unavailable" };
    }
  },
  async reply(message: string, trip?: Trip): Promise<string> {
    if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") return demoReply(message, trip);
    if (!trip) throw new Error("Abra uma viagem para conversar com a Voyra AI.");
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, tripId: trip.id }),
    });
    if (!response.ok) throw new Error(await responseError(response));
    const body = (await response.json()) as { reply?: string };
    if (!body.reply) throw new Error("A Voyra AI não retornou uma resposta.");
    return body.reply;
  },
};

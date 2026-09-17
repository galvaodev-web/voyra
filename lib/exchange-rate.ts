import "server-only";

import { adminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/server/http";

const supported = new Set(["BRL", "EUR", "USD"]);
const fallback: Record<string, number> = {
  EUR: Number(process.env.EXCHANGE_FALLBACK_EUR_BRL || 6),
  USD: Number(process.env.EXCHANGE_FALLBACK_USD_BRL || 5.2),
};

export type ExchangeRate = {
  base: string;
  quote: string;
  rate: number;
  source: "FRANKFURTER" | "FALLBACK";
  observedAt: string | null;
  expiresAt: string | null;
};

export async function exchangeRate(base: string, quote: string): Promise<ExchangeRate> {
  base = base.toUpperCase();
  quote = quote.toUpperCase();
  if (!supported.has(base) || !supported.has(quote))
    throw new HttpError(422, "Moeda não suportada.");
  if (base === quote)
    return { base, quote, rate: 1, source: "FRANKFURTER", observedAt: new Date().toISOString(), expiresAt: null };

  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (configured) {
    const cached = await adminClient()
      .from("exchange_rates")
      .select("rate,provider,observed_at,expires_at")
      .eq("base_currency", base)
      .eq("quote_currency", quote)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (cached.data)
      return {
        base,
        quote,
        rate: Number(cached.data.rate),
        source: cached.data.provider === "FRANKFURTER" ? "FRANKFURTER" : "FALLBACK",
        observedAt: cached.data.observed_at,
        expiresAt: cached.data.expires_at,
      };
  }

  try {
    const url = new URL("https://api.frankfurter.app/latest");
    url.searchParams.set("from", base);
    url.searchParams.set("to", quote);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4_000),
      next: { revalidate: 21_600 },
    });
    if (!response.ok) throw new Error("EXCHANGE_PROVIDER_UNAVAILABLE");
    const payload = (await response.json()) as { date?: string; rates?: Record<string, number> };
    const rate = payload.rates?.[quote];
    if (!rate || !Number.isFinite(rate) || rate <= 0) throw new Error("INVALID_EXCHANGE_RATE");
    const observedAt = payload.date ? new Date(`${payload.date}T00:00:00Z`).toISOString() : new Date().toISOString();
    const expiresAt = new Date(Date.now() + 21_600_000).toISOString();
    if (configured) {
      await adminClient().from("exchange_rates").upsert({
        base_currency: base,
        quote_currency: quote,
        rate,
        provider: "FRANKFURTER",
        observed_at: observedAt,
        expires_at: expiresAt,
      });
    }
    return { base, quote, rate, source: "FRANKFURTER", observedAt, expiresAt };
  } catch {
    const direct = quote === "BRL" ? fallback[base] : undefined;
    if (!direct || !Number.isFinite(direct) || direct <= 0)
      throw new HttpError(503, "Cotação indisponível no momento.");
    return { base, quote, rate: direct, source: "FALLBACK", observedAt: null, expiresAt: null };
  }
}

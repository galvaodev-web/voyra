import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  let database: "ok" | "unavailable" | "demo" = configured ? "unavailable" : "demo";
  if (configured) {
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const result = await client.from("profiles").select("id").limit(1);
    database = result.error ? "unavailable" : "ok";
  }
  const healthy = database !== "unavailable";
  return Response.json(
    {
      status: healthy ? "ok" : "degraded",
      service: "voyra-travel",
      timestamp: new Date().toISOString(),
      dependencies: {
        database,
        livePricingProviders:
          process.env.FLIGHT_PROVIDER_API_KEY || process.env.HOTEL_PROVIDER_API_KEY
            ? "configured"
            : "unavailable",
        exchangeRates: "frankfurter-with-explicit-fallback",
        priceAlertEmail:
          process.env.RESEND_API_KEY && process.env.ALERT_EMAIL_FROM
            ? "configured"
            : "unconfigured",
        marketplace: process.env.SKYSCANNER_MEDIA_PARTNER_ID ? "configured" : "unconfigured",
        ai: process.env.OPENAI_API_KEY ? "configured" : "unconfigured",
        maps: process.env.MAPBOX_ACCESS_TOKEN ? "configured" : "unconfigured",
        weather: process.env.WEATHER_API_KEY ? "configured" : "unconfigured",
        errorTracking: process.env.SENTRY_DSN ? "configured" : "unconfigured",
      },
    },
    {
      status: healthy ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

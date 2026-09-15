export const dynamic = "force-dynamic";

export async function GET() {
  const databaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return Response.json(
    {
      status: "ok",
      service: "voyra-travel",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: databaseConfigured ? "configured" : "demo",
        livePricingProviders: "unconfigured",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

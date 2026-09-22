import { loadEnvConfig } from "@next/env";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
loadEnvConfig(process.cwd());
const billingEnabled = process.env.NEXT_PUBLIC_BILLING_ENABLED === "true";
const required = [
  "SITE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  ...(billingEnabled
    ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PLUS", "STRIPE_PRICE_CREATOR"]
    : []),
  "CRON_SECRET",
  "RATE_LIMIT_SECRET",
  "OPENAI_API_KEY",
  "MAPBOX_ACCESS_TOKEN",
  "WEATHER_API_KEY",
  "NEXT_PUBLIC_TERMS_URL",
  "NEXT_PUBLIC_PRIVACY_URL",
  "NEXT_PUBLIC_SUPPORT_EMAIL",
];
async function main() {
  const problems: string[] = [];
  if (!["true", "false"].includes(process.env.NEXT_PUBLIC_BILLING_ENABLED ?? ""))
    problems.push(
      "Defina NEXT_PUBLIC_BILLING_ENABLED=false para abrir contas Free, ou true para ativar assinaturas.",
    );
  const bookingAffiliate = process.env.NEXT_PUBLIC_BOOKING_AFFILIATE_URL?.trim();
  if (bookingAffiliate) {
    try {
      const url = new URL(bookingAffiliate);
      if (url.protocol !== "https:" || url.username || url.password) throw new Error();
    } catch {
      problems.push(
        "NEXT_PUBLIC_BOOKING_AFFILIATE_URL deve ser o link público HTTPS aprovado pela Booking.com/CJ, sem credenciais.",
      );
    }
  }
  for (const name of required) if (!process.env[name]?.trim()) problems.push(`Ausente: ${name}`);
  if (process.env.NEXT_PUBLIC_DEMO_ENABLED !== "false")
    problems.push("Defina NEXT_PUBLIC_DEMO_ENABLED=false para lançamento.");
  for (const name of [
    "SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_TERMS_URL",
    "NEXT_PUBLIC_PRIVACY_URL",
  ]) {
    if (!process.env[name]) continue;
    try {
      const url = new URL(process.env[name]!);
      if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost")
        throw new Error();
    } catch {
      problems.push(`${name} deve ser uma URL HTTPS pública válida.`);
    }
  }
  if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32)
    problems.push("CRON_SECRET deve ter pelo menos 32 caracteres aleatórios.");
  if (process.env.RATE_LIMIT_SECRET && process.env.RATE_LIMIT_SECRET.length < 32)
    problems.push("RATE_LIMIT_SECRET deve ter pelo menos 32 caracteres aleatórios.");
  if (
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.NEXT_PUBLIC_SUPPORT_EMAIL)
  )
    problems.push("NEXT_PUBLIC_SUPPORT_EMAIL inválido.");
  if (
    billingEnabled &&
    process.env.STRIPE_SECRET_KEY &&
    !process.env.STRIPE_SECRET_KEY.startsWith("sk_live_")
  )
    problems.push("O lançamento público requer chave Stripe live. Use test apenas na homologação.");
  if (process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_"))
    problems.push("STRIPE_WEBHOOK_SECRET inválido.");
  if (
    process.env.STRIPE_PRICE_PLUS &&
    process.env.STRIPE_PRICE_PLUS === process.env.STRIPE_PRICE_CREATOR
  )
    problems.push("Plus e Creator devem usar preços distintos.");
  if (
    process.env.SKYSCANNER_MEDIA_PARTNER_ID &&
    !/^[A-Za-z0-9_-]{3,128}$/.test(process.env.SKYSCANNER_MEDIA_PARTNER_ID)
  )
    problems.push("SKYSCANNER_MEDIA_PARTNER_ID inválido.");
  if (problems.length) {
    console.error(problems.join("\n"));
    process.exitCode = 1;
    return;
  }
  if (process.argv.includes("--remote")) {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    );
    for (const table of [
      "profiles",
      "trips",
      "billing_customers",
      "subscriptions",
      "billing_events",
      "checkout_attempts",
      "published_routes",
      "storage_cleanup",
      "partner_referrals",
      "commission_events",
      "travel_searches",
      "search_preferences",
      "provider_results",
      "offers",
      "price_snapshots",
      "price_alerts",
      "notification_preferences",
      "analytics_events",
      "provider_health",
      "api_rate_limits",
      "travel_tokens",
      "account_deletion_jobs",
      "exchange_rates",
      "price_alert_matches",
    ]) {
      const { error } = await db.from(table).select("*", { count: "exact", head: true }).limit(0);
      if (error)
        throw new Error(
          `Não foi possível verificar a tabela ${table}. Aplique o schema e todas as migrations de produção.`,
        );
    }
    if (!billingEnabled) {
      console.log(
        "Tabelas verificadas por leitura. Lançamento Free: novas assinaturas desativadas. Valide cadastro, e-mail, recuperação de senha e Storage no ambiente hospedado.",
      );
      return;
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    for (const [name, cents] of [
      ["STRIPE_PRICE_PLUS", 2490],
      ["STRIPE_PRICE_CREATOR", 4990],
    ] as const) {
      const price = await stripe.prices.retrieve(process.env[name]!);
      if (
        !price.livemode ||
        !price.active ||
        price.unit_amount !== cents ||
        price.currency !== "brl" ||
        price.recurring?.interval !== "month" ||
        price.recurring.interval_count !== 1
      )
        throw new Error(`Preço incompatível: ${name}.`);
    }
    const portal = await stripe.billingPortal.configurations.list({
      active: true,
      limit: 10,
    });
    if (!portal.data.some((p) => p.is_default && p.features.subscription_cancel.enabled))
      throw new Error("Ative o portal padrão do Stripe com cancelamento de assinatura.");
    const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
    const endpoint = endpoints.data.find(
      (e) =>
        e.url === `${new URL(process.env.SITE_URL!).origin}/api/billing/webhook` &&
        e.status === "enabled",
    );
    const events = [
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
    ];
    if (
      !endpoint ||
      !events.every(
        (e) =>
          endpoint.enabled_events.includes("*") ||
          endpoint.enabled_events.some((event) => event === e),
      )
    )
      throw new Error("Configure o webhook Stripe e os cinco eventos descritos em docs/LAUNCH.md.");
    console.log(
      "Conexões verificadas por leitura: tabelas, marketplace, preços, portal e webhook. Valide os fluxos ponta a ponta antes de abrir ao público.",
    );
  }
  console.log("Configuração de lançamento validada. Nenhum segredo foi impresso.");
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha na verificação.");
  process.exitCode = 1;
});

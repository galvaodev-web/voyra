import assert from "node:assert/strict";
import Stripe from "stripe";
import { POST as webhook } from "../app/api/billing/webhook/route";
import { effectivePlan } from "../lib/billing/plans";
import { safeNext } from "../utils/format";

async function main() {
  // Explicit fake credentials and intercepted transport: no external request or charge.
  process.env.STRIPE_SECRET_KEY = "sk_test_voyra_local_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_voyra_local_test";
  process.env.STRIPE_PRICE_PLUS = "price_plus";
  process.env.STRIPE_PRICE_CREATOR = "price_creator";
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://voyra-test.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "local-test-only";
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const savedFetch = globalThis.fetch;
  let rpc: Record<string, unknown> | null = null;
  let rpcCount = 0;
  let stripeCount = 0;
  let subscriptionStatus = "active";
  let price = "price_creator";
  let failDatabase = false;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === "https://api.stripe.com/v1/subscriptions/sub_test") {
      stripeCount++;
      return Response.json({
        id: "sub_test",
        object: "subscription",
        customer: "cus_test",
        status: subscriptionStatus,
        cancel_at_period_end: false,
        items: { data: [{ price: { id: price }, current_period_end: 4070908800 }] },
      });
    }
    if (url === "https://voyra-test.supabase.co/rest/v1/rpc/apply_subscription_event") {
      rpcCount++;
      rpc = JSON.parse(String(init?.body));
      return failDatabase
        ? Response.json({ message: "simulated database failure" }, { status: 500 })
        : new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected network request in isolated test: ${new URL(url).hostname}`);
  };
  function request(payload: string, signature?: string) {
    return new Request("http://localhost/api/billing/webhook", {
      method: "POST",
      body: payload,
      headers: signature ? { "stripe-signature": signature } : {},
    });
  }
  function signed(event: Record<string, unknown>) {
    const payload = JSON.stringify(event);
    const signature = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET!,
    });
    return request(payload, signature);
  }
  try {
    const event = {
      id: "evt_test",
      type: "customer.subscription.updated",
      data: { object: { id: "sub_test", status: "canceled" } },
    };
    assert.equal((await webhook(request(JSON.stringify(event)))).status, 400);
    assert.equal((await webhook(request(JSON.stringify(event), "t=1,v1=forged"))).status, 400);
    assert.equal(rpcCount, 0, "Unverified events never update permissions");
    assert.equal((await webhook(signed(event))).status, 200);
    assert.equal(stripeCount, 1);
    assert.equal(rpcCount, 1);
    assert.equal(rpc!["subscription_plan"], "creator");
    assert.equal(
      rpc!["subscription_status"],
      "active",
      "Current Stripe state overrides an outdated delivered object",
    );
    assert.equal(rpc!["event_id"], "evt_test");
    assert.equal(rpc!["stripe_customer"], "cus_test");
    subscriptionStatus = "canceled";
    await webhook(signed({ ...event, id: "evt_cancel" }));
    assert.equal(rpc!["subscription_status"], "canceled");
    price = "price_unrecognized";
    await webhook(signed({ ...event, id: "evt_unknown_price" }));
    assert.equal(rpc!["subscription_plan"], "free", "Unknown prices cannot grant a paid plan");
    const before = rpcCount;
    await webhook(
      signed({ id: "evt_irrelevant", type: "payment_intent.created", data: { object: {} } }),
    );
    assert.equal(rpcCount, before);
    failDatabase = true;
    assert.equal(
      (await webhook(signed({ ...event, id: "evt_retry" }))).status,
      500,
      "Persistence errors must be retried by Stripe",
    );
    assert.equal(
      effectivePlan({ plan: "creator", status: "active", current_period_end: "2000-01-01" }),
      "free",
    );
    assert.equal(
      effectivePlan({ plan: "creator", status: "past_due", current_period_end: "2099-01-01" }),
      "free",
    );
    for (const path of [
      "https://evil.example",
      "//evil.example",
      "/application",
      "/app\\evil",
      "/app/\n",
    ])
      assert.equal(safeNext(path), "/app/dashboard");
    assert.equal(safeNext("/app/configuracoes"), "/app/configuracoes");
    console.log(
      "Cobrança validada sem rede: assinatura de webhook, estado atual do Stripe, preços desconhecidos, falha de persistência e permissões expiradas. Redirecionamentos também validados.",
    );
  } finally {
    globalThis.fetch = savedFetch;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

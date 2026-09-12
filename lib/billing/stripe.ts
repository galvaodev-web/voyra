import "server-only";
import Stripe from "stripe";
import type { User } from "@supabase/supabase-js";
import { adminClient } from "@/lib/supabase/admin";
import { HttpError } from "@/lib/server/http";
import type { PaidPlan } from "./plans";
export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new HttpError(503, "Assinaturas ainda não estão disponíveis.");
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    maxNetworkRetries: 2,
    timeout: 15000,
    httpClient: Stripe.createFetchHttpClient(),
  });
}
export function priceId(plan: PaidPlan) {
  const id = plan === "plus" ? process.env.STRIPE_PRICE_PLUS : process.env.STRIPE_PRICE_CREATOR;
  if (!id) throw new HttpError(503, "Este plano ainda não está disponível.");
  return id;
}
export async function billingCustomer(user: User) {
  const db = adminClient();
  const { data, error } = await db
    .from("billing_customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data.customer_id as string;
  const customer = await stripeClient().customers.create(
    { email: user.email, metadata: { user_id: user.id } },
    { idempotencyKey: `voyra-customer-${user.id}` },
  );
  const saved = await db
    .from("billing_customers")
    .upsert(
      { user_id: user.id, customer_id: customer.id },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  if (saved.error) throw saved.error;
  const actual = await db
    .from("billing_customers")
    .select("customer_id")
    .eq("user_id", user.id)
    .single();
  if (actual.error) throw actual.error;
  return actual.data.customer_id as string;
}
export async function syncSubscription(subscriptionId: string, eventId: string) {
  // Retrieve current Stripe state instead of trusting delivery order or browser redirects.
  const observedAt = new Date().toISOString();
  const subscription = await stripeClient().subscriptions.retrieve(subscriptionId);
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = subscription.items.data[0];
  const plan =
    item?.price.id === process.env.STRIPE_PRICE_CREATOR
      ? "creator"
      : item?.price.id === process.env.STRIPE_PRICE_PLUS
        ? "plus"
        : "free";
  const { error } = await adminClient().rpc("apply_subscription_event", {
    event_id: eventId,
    subscription_id: subscription.id,
    stripe_customer: customerId,
    subscription_plan: plan,
    subscription_status: subscription.status,
    period_end: new Date((item?.current_period_end ?? 0) * 1000).toISOString(),
    cancel_at_end: subscription.cancel_at_period_end,
    observed_at: observedAt,
  });
  if (error) throw error;
}

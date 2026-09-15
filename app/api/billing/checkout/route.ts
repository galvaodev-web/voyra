import { z } from "zod";
import {
  apiError,
  HttpError,
  jsonBody,
  requireSameOrigin,
  requireUser,
  siteOrigin,
} from "@/lib/server/http";
import { billingCustomer, priceId, stripeClient } from "@/lib/billing/stripe";
import { adminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { user } = await requireUser();
    if (process.env.NEXT_PUBLIC_BILLING_ENABLED !== "true")
      throw new HttpError(
        503,
        "Novas assinaturas ainda não estão disponíveis. Você pode usar o plano Free.",
      );
    const input = z
      .object({ plan: z.enum(["plus", "creator"]) })
      .safeParse(await jsonBody(request));
    if (!input.success) throw new HttpError(400, "Escolha um plano válido.");
    const stripe = stripeClient();
    const price = await stripe.prices.retrieve(priceId(input.data.plan));
    const expectedAmount = input.data.plan === "plus" ? 2490 : 4990;
    if (
      !price.active ||
      price.currency !== "brl" ||
      price.unit_amount !== expectedAmount ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    )
      throw new HttpError(503, "Este plano está em atualização. Tente novamente mais tarde.");
    const customer = await billingCustomer(user);
    const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
    if (subscriptions.data.some((s) => !["canceled", "incomplete_expired"].includes(s.status))) {
      const portal = await stripe.billingPortal.sessions.create({
        customer,
        return_url: `${siteOrigin()}/app/configuracoes`,
      });
      return Response.json({ url: portal.url });
    }
    // Reuse an open checkout, including when the user clicks from another tab.
    const open = await stripe.checkout.sessions.list({ customer, status: "open", limit: 10 });
    const existing = open.data.find((s) => s.mode === "subscription");
    if (existing?.url) {
      if (existing.metadata?.plan !== input.data.plan)
        throw new HttpError(
          409,
          "Você já iniciou a assinatura de outro plano. Conclua ou aguarde uma hora para mudar.",
        );
      return Response.json({ url: existing.url });
    }
    const attempt = await adminClient()
      .rpc("checkout_attempt", {
        account: user.id,
        selected_plan: input.data.plan,
      })
      .single();
    if (attempt.error) throw attempt.error;
    const checkoutAttempt = z
      .object({ id: z.uuid(), plan: z.enum(["plus", "creator"]), created_at: z.string() })
      .parse(attempt.data);
    if (checkoutAttempt.plan !== input.data.plan)
      throw new HttpError(
        409,
        "Outra assinatura está sendo iniciada. Aguarde alguns minutos antes de mudar de plano.",
      );
    const session = await stripe.checkout.sessions.create(
      {
        customer,
        mode: "subscription",
        client_reference_id: user.id,
        metadata: { plan: input.data.plan },
        line_items: [{ price: price.id, quantity: 1 }],
        subscription_data: { metadata: { user_id: user.id } },
        success_url: `${siteOrigin()}/app/configuracoes?checkout=success`,
        cancel_url: `${siteOrigin()}/app/configuracoes?checkout=canceled`,
        expires_at: Math.floor(Date.parse(checkoutAttempt.created_at) / 1000) + 3600,
      },
      { idempotencyKey: `voyra-checkout-${checkoutAttempt.id}` },
    );
    return Response.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}

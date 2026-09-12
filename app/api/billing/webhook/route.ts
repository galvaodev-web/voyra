import Stripe from "stripe";
import { stripeClient, syncSubscription } from "@/lib/billing/stripe";
import { apiError } from "@/lib/server/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Assinatura ausente." }, { status: 400 });
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY)
    return Response.json({ error: "Serviço indisponível." }, { status: 503 });
  let event: Stripe.Event;
  try {
    const body = await request.text();
    if (body.length > 1024 * 1024) return new Response(null, { status: 413 });
    event = stripeClient().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch {
    return Response.json({ error: "Assinatura inválida." }, { status: 400 });
  }
  try {
    if (
      [
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ].includes(event.type)
    ) {
      await syncSubscription((event.data.object as Stripe.Subscription).id, event.id);
    } else if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription)
        await syncSubscription(
          typeof session.subscription === "string" ? session.subscription : session.subscription.id,
          event.id,
        );
    }
    return Response.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}

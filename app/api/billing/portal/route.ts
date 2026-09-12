import { apiError, HttpError, requireSameOrigin, requireUser, siteOrigin } from "@/lib/server/http";
import { stripeClient } from "@/lib/billing/stripe";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { client, user } = await requireUser();
    const { data, error } = await client
      .from("billing_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new HttpError(404, "Você ainda não tem uma assinatura.");
    const session = await stripeClient().billingPortal.sessions.create({
      customer: data.customer_id,
      return_url: `${siteOrigin()}/app/configuracoes`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}

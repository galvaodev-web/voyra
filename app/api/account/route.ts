import { z } from "zod";
import { apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/http";
import { adminClient } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/billing/stripe";
import { removeAccountFiles } from "@/lib/server/storage-cleanup";
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { user, client } = await requireUser();
    const input = z
      .object({ confirmation: z.literal("EXCLUIR") })
      .safeParse(await jsonBody(request));
    if (!input.success) throw new HttpError(400, "Digite EXCLUIR para confirmar.");
    const admin = adminClient();
    const customer = await admin
      .from("billing_customers")
      .select("customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (customer.error) throw customer.error;
    if (customer.data) {
      const stripe = stripeClient();
      const existing = await stripe.customers.retrieve(customer.data.customer_id);
      // Stripe cancels active subscriptions immediately when deleting the customer.
      if (!existing.deleted) await stripe.customers.del(existing.id);
    }
    // Files must be removed before Supabase Auth can delete their owner.
    await removeAccountFiles(user.id);
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    await client.auth.signOut({ scope: "local" });
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

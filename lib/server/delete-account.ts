import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/billing/stripe";
import { removeAccountFiles } from "@/lib/server/storage-cleanup";

export async function deleteVoyraAccount(userId: string) {
  const admin = adminClient();
  const customer = await admin
    .from("billing_customers")
    .select("customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (customer.error) throw customer.error;
  if (customer.data) {
    const stripe = stripeClient();
    const existing = await stripe.customers.retrieve(customer.data.customer_id);
    if (!existing.deleted) await stripe.customers.del(existing.id);
  }
  await removeAccountFiles(userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;
}

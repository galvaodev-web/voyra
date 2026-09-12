import { apiError, requireUser } from "@/lib/server/http";
import { effectivePlan, type Plan } from "@/lib/billing/plans";
export async function GET() {
  try {
    const { client, user } = await requireUser();
    const { data, error } = await client
      .from("subscriptions")
      .select("plan,status,current_period_end,cancel_at_period_end")
      .eq("user_id", user.id)
      .order("current_period_end", { ascending: false });
    if (error) throw error;
    const rows = data as {
      plan: Plan;
      status: string;
      current_period_end: string;
      cancel_at_period_end: boolean;
    }[];
    const subscription =
      rows.find((r) => effectivePlan(r) === "creator") ??
      rows.find((r) => effectivePlan(r) === "plus") ??
      rows[0] ??
      null;
    return Response.json(
      { plan: effectivePlan(subscription), subscription },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

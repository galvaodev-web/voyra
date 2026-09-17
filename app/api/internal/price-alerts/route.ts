import { timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/server/http";
import { structuredLog } from "@/lib/server/logger";

type Match = {
  alert_id: string;
  user_id: string;
  snapshot_id: number;
  destination: string;
  matched_price: number;
  currency: string;
};

function authorized(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  return Boolean(
    expected &&
      Buffer.byteLength(received) === Buffer.byteLength(`Bearer ${expected}`) &&
      timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`)),
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) return new Response(null, { status: 401 });
  const context = { requestId: request.headers.get("x-request-id") || crypto.randomUUID(), route: "/api/internal/price-alerts" };
  try {
    const db = adminClient();
    const result = await db.rpc("process_due_price_alerts", { maximum_matches: 100 });
    if (result.error) throw result.error;
    const matches = (result.data ?? []) as Match[];
    if (!matches.length) return Response.json({ matched: 0, emailsSent: 0 });

    const userIds = [...new Set(matches.map((match) => match.user_id))];
    const preferences = await db
      .from("notification_preferences")
      .select("user_id,price_alert_email")
      .in("user_id", userIds);
    if (preferences.error) throw preferences.error;
    const emailEnabled = new Set(
      (preferences.data ?? []).filter((item) => item.price_alert_email).map((item) => item.user_id),
    );
    let emailsSent = 0;
    for (const match of matches) {
      if (!emailEnabled.has(match.user_id)) continue;
      const matchRow = await db
        .from("price_alert_matches")
        .select("id")
        .eq("alert_id", match.alert_id)
        .eq("snapshot_id", match.snapshot_id)
        .single();
      if (matchRow.error) continue;
      if (!process.env.RESEND_API_KEY || !process.env.ALERT_EMAIL_FROM) {
        await db.from("price_alert_matches").update({ email_status: "NOT_CONFIGURED" }).eq("id", matchRow.data.id);
        continue;
      }
      try {
        const account = await db.auth.admin.getUserById(match.user_id);
        const email = account.data.user?.email;
        if (!email) throw new Error("EMAIL_UNAVAILABLE");
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.ALERT_EMAIL_FROM,
            to: [email],
            subject: `Preço encontrado para ${match.destination}`,
            text: `Uma oferta ao vivo chegou a ${match.currency} ${Number(match.matched_price).toFixed(2)}. Abra a Voyra para revisar a oferta antes de reservar.`,
          }),
          signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) throw new Error("EMAIL_PROVIDER_ERROR");
        await db.from("price_alert_matches").update({ email_status: "SENT" }).eq("id", matchRow.data.id);
        emailsSent += 1;
      } catch {
        await db.from("price_alert_matches").update({ email_status: "FAILED" }).eq("id", matchRow.data.id);
      }
    }
    structuredLog("info", "price_alerts_processed", context, { matched: matches.length, emailsSent });
    return Response.json({ matched: matches.length, emailsSent }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    structuredLog("error", "price_alerts_failed", context, { errorName: error instanceof Error ? error.name : "UnknownError" });
    return apiError(error);
  }
}

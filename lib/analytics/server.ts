import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import type { RequestContext } from "@/lib/server/logger";
import { structuredLog } from "@/lib/server/logger";

export type AnalyticsEventName =
  | "user_signed_up"
  | "trip_created"
  | "trip_completed"
  | "search_created"
  | "destination_viewed"
  | "offer_viewed"
  | "offer_clicked"
  | "booking_redirect"
  | "conversion"
  | "route_generated"
  | "post_imported_to_trip"
  | "trip_shared_to_social"
  | "subscription_started"
  | "subscription_cancelled";

type AnalyticsEvent = {
  name: AnalyticsEventName;
  userId?: string;
  searchId?: string;
  tripId?: string;
  offerId?: string;
  campaign?: string;
  consented: boolean;
  properties?: Record<string, string | number | boolean | null>;
};

export async function trackServerEvent(event: AnalyticsEvent, context: RequestContext) {
  if (!event.consented) return;
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return;

  const { error } = await adminClient()
    .from("analytics_events")
    .insert({
      name: event.name,
      user_id: event.userId,
      search_id: event.searchId,
      trip_id: event.tripId,
      offer_id: event.offerId,
      campaign: event.campaign,
      consented: true,
      properties: event.properties ?? {},
    });
  if (error) {
    structuredLog("warn", "analytics_write_failed", context, {
      eventName: event.name,
      databaseCode: error.code,
    });
    return;
  }
  if (process.env.POSTHOG_API_KEY) {
    try {
      const host = new URL(process.env.POSTHOG_HOST || "https://us.i.posthog.com");
      if (host.protocol !== "https:") throw new Error("INVALID_POSTHOG_HOST");
      await fetch(new URL("/capture/", host), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: process.env.POSTHOG_API_KEY,
          event: event.name,
          distinct_id: event.userId || context.requestId,
          properties: {
            ...event.properties,
            searchId: event.searchId,
            tripId: event.tripId,
            offerId: event.offerId,
            campaign: event.campaign,
          },
        }),
        signal: AbortSignal.timeout(2_000),
      });
    } catch {
      structuredLog("warn", "analytics_provider_failed", context, { eventName: event.name });
    }
  }
}

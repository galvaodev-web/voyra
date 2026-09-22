import { apiError, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";

export async function GET(request: Request) {
  try {
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "account-export", {
      userId: user.id,
      maximum: 5,
      windowSeconds: 3600,
    });
    const [
      profile,
      trips,
      favorites,
      notifications,
      tokens,
      routes,
      searches,
      alerts,
      subscription,
    ] = await Promise.all([
      client
        .from("profiles")
        .select("name,city,avatar_url,saved_routes,created_at,updated_at")
        .eq("id", user.id)
        .maybeSingle(),
      client
        .from("trips")
        .select(
          "id,name,destination,start_date,end_date,budget,data,completion_status,completed_at,created_at,updated_at",
        )
        .order("created_at"),
      client.from("favorites").select("destination_id,created_at").order("created_at"),
      client.from("notifications").select("title,body,read_at,created_at").order("created_at"),
      client
        .from("travel_tokens")
        .select(
          "public_id,share_slug,token_type,destination,country_code,country_name,cities,travel_year,start_date,end_date,days,verified_place_count,serial_number,achievement_code,rarity,verification,visible,status,issued_at",
        )
        .order("issued_at"),
      client
        .from("published_routes")
        .select("id,trip_id,title,destination,author,days,tips,activities,published,updated_at")
        .eq("owner_id", user.id)
        .order("updated_at"),
      client
        .from("travel_searches")
        .select(
          "id,origin,destination,start_date,end_date,flexible_days,travelers,duration_days,max_budget,currency,preferences,sort_mode,status,result_count,created_at,updated_at",
        )
        .order("created_at"),
      client
        .from("price_alerts")
        .select(
          "id,origin,destination,start_date,end_date,target_price,currency,active,last_notified_at,created_at,updated_at",
        )
        .order("created_at"),
      client
        .from("subscriptions")
        .select("plan,status,current_period_end,cancel_at_period_end,updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    const failed = [
      profile,
      trips,
      favorites,
      notifications,
      tokens,
      routes,
      searches,
      alerts,
      subscription,
    ].find((result) => result.error);
    if (failed?.error) throw failed.error;
    return Response.json(
      {
        exportedAt: new Date().toISOString(),
        scope: "voyra-travel",
        account: {
          id: user.id,
          email: user.email ?? null,
          createdAt: user.created_at,
          updatedAt: user.updated_at,
        },
        profile: profile.data,
        trips: trips.data ?? [],
        favorites: favorites.data ?? [],
        notifications: notifications.data ?? [],
        travelTokens: tokens.data ?? [],
        publishedRoutes: routes.data ?? [],
        travelSearches: searches.data ?? [],
        priceAlerts: alerts.data ?? [],
        subscription: subscription.data,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": 'attachment; filename="meus-dados-voyra.json"',
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}

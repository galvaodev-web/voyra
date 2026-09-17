import { createClient } from "@/lib/supabase/client";
import type { AppData, Trip } from "@/types";
export async function loadRemote(): Promise<AppData> {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user)
    return {
      trips: [],
      favorites: [],
      savedRoutes: [],
      profile: { name: "Viajante", email: "", city: "" },
    };
  const [trips, profile, favorites] = await Promise.all([
    client.from("trips").select("id,data,revision,completion_status,completed_at"),
    client.from("profiles").select("name, city, saved_routes").eq("id", user.id).maybeSingle(),
    client.from("favorites").select("destination_id").eq("user_id", user.id),
  ]);
  for (const result of [trips, profile, favorites])
    if (result.error) throw new Error(result.error.message);
  return {
    trips: (trips.data ?? []).map((row) => ({
      ...(row.data as Trip),
      id: row.id,
      revision: row.revision,
      completedAt:
        row.completion_status === "COMPLETED" ? (row.completed_at ?? undefined) : undefined,
    })),
    favorites: (favorites.data ?? []).map((row) => row.destination_id),
    savedRoutes: profile.data?.saved_routes ?? [],
    profile: {
      name: profile.data?.name ?? user.user_metadata?.name ?? "Viajante",
      email: user.email ?? "",
      city: profile.data?.city ?? "",
    },
  };
}
export async function saveRemoteTrip(trip: Trip) {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Entre novamente para salvar.");
  const values = {
    id: trip.id,
    owner_id: user.id,
    name: trip.name,
    destination: trip.destination,
    start_date: trip.start,
    end_date: trip.end,
    budget: trip.budget,
    data: trip,
  };
  const result =
    trip.revision === undefined
      ? await client.from("trips").insert(values).select("revision").single()
      : await client
          .from("trips")
          .update(values)
          .eq("id", trip.id)
          .eq("revision", trip.revision)
          .select("revision")
          .maybeSingle();
  const { error, data } = result;
  if (error) throw new Error(error.message);
  if (!data)
    throw new Error(
      "Esta viagem foi alterada em outra aba. Recarregue a página antes de salvar novamente.",
    );
  return { ...trip, revision: data.revision as number };
}
export async function deleteRemoteTrip(trip: Trip) {
  const { data, error } = await createClient()
    .from("trips")
    .delete()
    .eq("id", trip.id)
    .eq("revision", trip.revision ?? 0)
    .select("id");
  if (error) throw new Error(error.message);
  if (!data?.length)
    throw new Error("A viagem foi alterada. Recarregue a página antes de excluir.");
}
export async function saveRemotePreferences(data: AppData) {
  const client = createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw new Error("Entre novamente para salvar.");
  const { error } = await client.rpc("save_preferences", {
    profile_name: data.profile.name,
    profile_city: data.profile.city,
    route_ids: data.savedRoutes,
    destination_ids: data.favorites,
  });
  if (error) throw new Error(error.message);
}

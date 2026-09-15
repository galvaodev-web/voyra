import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import type { ProviderSearchResult, TravelSearchInput } from "@/lib/travel/contracts";

export async function persistTravelSearch(
  userId: string,
  input: TravelSearchInput,
  resultCount: number,
  providers: ProviderSearchResult[],
) {
  const searchId = randomUUID();
  const status = providers.some((provider) => provider.status !== "SUCCESS")
    ? "PARTIAL"
    : "COMPLETED";
  const offers = providers.flatMap((provider) => provider.offers);
  const { data, error } = await adminClient().rpc("persist_travel_search", {
    account: userId,
    search_identifier: searchId,
    search_payload: { ...input, status, resultCount },
    provider_payload: providers,
    offer_payload: offers,
  });
  if (error) throw error;
  return String(data);
}

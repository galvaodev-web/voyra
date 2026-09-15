import type { Destination } from "@/types";
import { destinations } from "@/data/mock-data";
import type {
  NormalizedTravelOption,
  PriceBreakdown,
  TravelSearchInput,
} from "@/lib/travel/contracts";

const weights = {
  flight: 0.38,
  hotel: 0.3,
  food: 0.16,
  transport: 0.08,
  activities: 0.08,
} as const;

function money(value: number) {
  return Math.max(0, Math.round(value));
}

function breakdown(total: number): PriceBreakdown {
  const flight = money(total * weights.flight);
  const hotel = money(total * weights.hotel);
  const food = money(total * weights.food);
  const transport = money(total * weights.transport);
  return {
    flight,
    hotel,
    food,
    transport,
    activities: money(total - flight - hotel - food - transport),
  };
}

function estimateDestination(
  destination: Destination,
  input: TravelSearchInput,
): NormalizedTravelOption {
  const perPerson = money((destination.price / destination.days) * input.durationDays);
  const total = money(perPerson * input.travelers);
  const tags = ["Preço estimado"];
  if (total <= input.maxBudget) tags.unshift("Dentro do orçamento");

  return {
    destinationId: destination.id,
    destination: destination.city,
    country: destination.country,
    region: destination.region,
    image: destination.image,
    durationDays: input.durationDays,
    travelers: input.travelers,
    totalEstimatedPrice: total,
    pricePerPerson: perPerson,
    breakdown: breakdown(total),
    currency: input.currency,
    confidence: 0.35,
    priceType: "ESTIMATED",
    pricingBasis: "VOYRA_CATALOG_V1",
    tags,
    popularity: Number.parseFloat(destination.rating.replace(",", ".")),
    providerOffers: [],
  };
}

export function estimateCatalog(input: TravelSearchInput) {
  return destinations
    .filter(
      (destination) =>
        (!input.destination ||
          destination.city.localeCompare(input.destination, "pt-BR", { sensitivity: "base" }) ===
            0) &&
        (!input.region || input.region === "Todos" || destination.region === input.region),
    )
    .map((destination) => estimateDestination(destination, input));
}

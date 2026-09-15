import { estimateCatalog } from "@/lib/travel/estimate-catalog";
import { ProviderAggregator } from "@/lib/travel/provider-aggregator";
import type {
  NormalizedTravelOption,
  ProviderOffer,
  TravelProvider,
  TravelSearchInput,
} from "@/lib/travel/contracts";

function attachLiveOffers(options: NormalizedTravelOption[], offers: ProviderOffer[]) {
  return options.map((option) => {
    const matches = offers.filter(
      (offer) => offer.destinationId === option.destinationId && offer.currency === option.currency,
    );
    if (!matches.length) return option;

    const livePackage = matches.find((offer) => offer.kind === "PACKAGE" && offer.breakdown);
    const liveFlight = matches.find((offer) => offer.kind === "FLIGHT");
    const liveHotel = matches.find((offer) => offer.kind === "HOTEL");
    const next = {
      ...option,
      providerOffers: matches,
      breakdown: livePackage?.breakdown ?? {
        ...option.breakdown,
        flight: liveFlight?.amount ?? option.breakdown.flight,
        hotel: liveHotel?.amount ?? option.breakdown.hotel,
      },
    };
    next.totalEstimatedPrice = livePackage
      ? livePackage.amount
      : Object.values(next.breakdown).reduce((sum, value) => sum + value, 0);
    next.pricePerPerson = Math.round(next.totalEstimatedPrice / next.travelers);
    if (livePackage) {
      next.priceType = "LIVE";
      next.confidence = 0.9;
      next.pricingBasis = "LIVE_PACKAGE";
      next.tags = next.tags.filter((tag) => tag !== "Preço estimado");
      next.tags.push("Preço ao vivo");
    } else {
      next.confidence = Math.max(next.confidence, 0.6);
      next.tags.push("Componentes ao vivo");
    }
    return next;
  });
}

function rank(options: NormalizedTravelOption[], input: TravelSearchInput) {
  const sorted = [...options];
  sorted.sort((left, right) => {
    switch (input.sort) {
      case "PRICE_PER_PERSON":
        return left.pricePerPerson - right.pricePerPerson;
      case "FLIGHT_PRICE":
        return left.breakdown.flight - right.breakdown.flight;
      case "HOTEL_PRICE":
        return left.breakdown.hotel - right.breakdown.hotel;
      case "POPULARITY":
        return right.popularity - left.popularity;
      case "VOYRA_AI":
      case "VALUE": {
        const leftScore = left.popularity / Math.max(left.pricePerPerson, 1);
        const rightScore = right.popularity / Math.max(right.pricePerPerson, 1);
        return rightScore - leftScore;
      }
      case "TOTAL_PRICE":
      default:
        return left.totalEstimatedPrice - right.totalEstimatedPrice;
    }
  });
  const cheapest = options.reduce<NormalizedTravelOption | null>(
    (best, option) =>
      !best || option.totalEstimatedPrice < best.totalEstimatedPrice ? option : best,
    null,
  );
  const bestValue = options.reduce<NormalizedTravelOption | null>((best, option) => {
    if (!best) return option;
    return option.popularity / Math.max(option.pricePerPerson, 1) >
      best.popularity / Math.max(best.pricePerPerson, 1)
      ? option
      : best;
  }, null);
  return sorted.map((option) => ({
    ...option,
    tags: [
      ...(option.destinationId === cheapest?.destinationId ? ["Mais barato"] : []),
      ...(option.destinationId === bestValue?.destinationId ? ["Melhor custo-benefício"] : []),
      ...option.tags,
    ],
  }));
}

export class VoyraPriceEngine {
  private readonly aggregator: ProviderAggregator;

  constructor(providers: TravelProvider[] = []) {
    this.aggregator = new ProviderAggregator(providers);
  }

  async search(input: TravelSearchInput) {
    const providerResults = await this.aggregator.search(input);
    const liveOffers = providerResults.flatMap((result) => result.offers);
    const options = rank(
      attachLiveOffers(estimateCatalog(input), liveOffers).filter(
        (option) => option.totalEstimatedPrice <= input.maxBudget,
      ),
      input,
    );
    return { options, providerResults };
  }
}

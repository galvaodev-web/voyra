import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const travelSearchSchema = z
  .object({
    origin: z.string().trim().min(2).max(120),
    destination: z.string().trim().min(2).max(120).optional(),
    startDate: isoDate.optional(),
    endDate: isoDate.optional(),
    flexibleDays: z.number().int().min(0).max(30).default(0),
    travelers: z.number().int().min(1).max(20),
    durationDays: z.number().int().min(1).max(90),
    maxBudget: z.number().positive().max(10_000_000),
    month: z.number().int().min(1).max(12).optional(),
    category: z.string().trim().max(80).optional(),
    preferences: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
    region: z.string().trim().max(80).optional(),
    currency: z.string().length(3).toUpperCase().default("BRL"),
    analyticsConsent: z.boolean().default(false),
    campaign: z.string().trim().max(120).optional(),
    sort: z
      .enum([
        "TOTAL_PRICE",
        "PRICE_PER_PERSON",
        "VALUE",
        "FLIGHT_PRICE",
        "HOTEL_PRICE",
        "POPULARITY",
        "VOYRA_AI",
      ])
      .default("VALUE"),
  })
  .superRefine((value, context) => {
    if (value.startDate && value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "A data final deve ser igual ou posterior a data inicial.",
      });
    }
  });

export type TravelSearchInput = z.infer<typeof travelSearchSchema>;
export type PriceType = "ESTIMATED" | "LIVE";
export type ProviderKind =
  | "PACKAGE"
  | "FLIGHT"
  | "HOTEL"
  | "ACTIVITY"
  | "CAR_RENTAL"
  | "INSURANCE"
  | "WEATHER"
  | "EXCHANGE_RATE";

export type ProviderOffer = {
  provider: string;
  externalId: string;
  kind: ProviderKind;
  destinationId: string;
  amount: number;
  currency: string;
  affiliateUrl?: string;
  commissionModel?: string;
  expiresAt?: string;
  observedAt: string;
  breakdown?: PriceBreakdown;
};

export type ProviderSearchResult = {
  provider: string;
  kind: ProviderKind;
  status: "SUCCESS" | "DEGRADED" | "UNAVAILABLE";
  latencyMs: number;
  offers: ProviderOffer[];
  errorCode?: string;
};

export interface TravelProvider {
  readonly name: string;
  readonly kind: ProviderKind;
  search(input: TravelSearchInput, signal: AbortSignal): Promise<ProviderOffer[]>;
  health?(): Promise<"HEALTHY" | "DEGRADED" | "UNAVAILABLE">;
}

export interface FlightProvider extends TravelProvider {
  readonly kind: "FLIGHT";
}
export interface PackageProvider extends TravelProvider {
  readonly kind: "PACKAGE";
}
export interface HotelProvider extends TravelProvider {
  readonly kind: "HOTEL";
}
export interface ActivitiesProvider extends TravelProvider {
  readonly kind: "ACTIVITY";
}
export interface CarRentalProvider extends TravelProvider {
  readonly kind: "CAR_RENTAL";
}
export interface InsuranceProvider extends TravelProvider {
  readonly kind: "INSURANCE";
}
export interface WeatherProviderAdapter extends TravelProvider {
  readonly kind: "WEATHER";
}
export interface ExchangeRateProvider extends TravelProvider {
  readonly kind: "EXCHANGE_RATE";
}

export type PriceBreakdown = {
  flight: number;
  hotel: number;
  food: number;
  transport: number;
  activities: number;
};

export type NormalizedTravelOption = {
  destinationId: string;
  destination: string;
  country: string;
  region: string;
  image: string;
  durationDays: number;
  travelers: number;
  totalEstimatedPrice: number;
  pricePerPerson: number;
  breakdown: PriceBreakdown;
  currency: string;
  confidence: number;
  priceType: PriceType;
  pricingBasis: string;
  tags: string[];
  popularity: number;
  providerOffers: ProviderOffer[];
};

export type TravelSearchResponse = {
  searchId: string | null;
  persisted: boolean;
  generatedAt: string;
  options: NormalizedTravelOption[];
  providers: ProviderSearchResult[];
};

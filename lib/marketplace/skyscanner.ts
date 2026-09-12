import "server-only";
import { HttpError } from "@/lib/server/http";

function partnerId() {
  const value = process.env.SKYSCANNER_MEDIA_PARTNER_ID?.trim();
  if (!value) throw new HttpError(503, "A intermediação de viagens ainda não foi ativada.");
  return value;
}

function trackingId(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 255);
}

function base(vertical: "flights" | "hotels", page: string, referralId: string) {
  const url = new URL(`https://skyscanner.net/g/referrals/v1/${vertical}/${page}`);
  url.searchParams.set("mediaPartnerId", partnerId());
  url.searchParams.set("market", "BR");
  url.searchParams.set("locale", "pt-BR");
  url.searchParams.set("currency", "BRL");
  url.searchParams.set("subid2", trackingId(referralId));
  return url;
}

export type FlightReferral = {
  origin: string;
  destination: string;
  outboundDate: string;
  inboundDate?: string;
  adults: number;
  cabinclass: "economy" | "premiumeconomy" | "business" | "first";
};

export function flightReferral(input: FlightReferral, referralId: string) {
  const url = base("flights", "day-view", referralId);
  url.searchParams.set("origin", input.origin.toUpperCase());
  url.searchParams.set("destination", input.destination.toUpperCase());
  url.searchParams.set("outboundDate", input.outboundDate);
  if (input.inboundDate) url.searchParams.set("inboundDate", input.inboundDate);
  url.searchParams.set("adultsv2", String(input.adults));
  url.searchParams.set("cabinclass", input.cabinclass);
  return url.toString();
}

export type HotelReferral = {
  destinationCode: string;
  checkin: string;
  checkout: string;
  adults: number;
  rooms: number;
};

export function hotelReferral(input: HotelReferral, referralId: string) {
  const url = base("hotels", "home-view", referralId);
  url.searchParams.set("skyscanner_node_code", input.destinationCode.toUpperCase());
  url.searchParams.set("checkin", input.checkin);
  url.searchParams.set("checkout", input.checkout);
  url.searchParams.set("adults", String(input.adults));
  url.searchParams.set("rooms", String(input.rooms));
  return url.toString();
}

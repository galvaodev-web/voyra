import assert from "node:assert/strict";
import { test } from "node:test";
import { travelSearchSchema, type TravelProvider } from "@/lib/travel/contracts";
import { VoyraPriceEngine } from "@/lib/travel/price-engine";
import { ProviderAggregator } from "@/lib/travel/provider-aggregator";
import { POST as searchRoute } from "@/app/api/travel/search/route";

const input = travelSearchSchema.parse({
  origin: "Brasilia",
  travelers: 2,
  durationDays: 7,
  maxBudget: 10_000,
  sort: "TOTAL_PRICE",
});

test("estimated catalog never presents estimates as live offers", async () => {
  const result = await new VoyraPriceEngine().search(input);
  assert.ok(result.options.length > 0);
  assert.ok(result.options.every((option) => option.priceType === "ESTIMATED"));
  assert.ok(result.options.every((option) => option.providerOffers.length === 0));
  assert.ok(result.options.every((option) => option.totalEstimatedPrice <= input.maxBudget));
  assert.deepEqual(
    result.options.map((option) => option.totalEstimatedPrice),
    [...result.options].map((option) => option.totalEstimatedPrice).sort((a, b) => a - b),
  );
});

test("live components do not mislabel an estimated trip total", async () => {
  const observedAt = new Date().toISOString();
  const flight: TravelProvider = {
    name: "flight-test",
    kind: "FLIGHT",
    async search() {
      return [
        {
          provider: this.name,
          externalId: "flight-1",
          kind: this.kind,
          destinationId: "buenos-aires",
          amount: 1_500,
          currency: "BRL",
          observedAt,
        },
      ];
    },
  };
  const flightOnly = await new VoyraPriceEngine([flight]).search(input);
  assert.equal(
    flightOnly.options.find((option) => option.destinationId === "buenos-aires")?.priceType,
    "ESTIMATED",
  );

  const hotel: TravelProvider = {
    name: "hotel-test",
    kind: "HOTEL",
    async search() {
      return [
        {
          provider: this.name,
          externalId: "hotel-1",
          kind: this.kind,
          destinationId: "buenos-aires",
          amount: 1_200,
          currency: "BRL",
          observedAt,
        },
      ];
    },
  };
  const complete = await new VoyraPriceEngine([flight, hotel]).search(input);
  const option = complete.options.find((item) => item.destinationId === "buenos-aires");
  assert.equal(option?.priceType, "ESTIMATED");
  assert.equal(option?.breakdown.flight, 1_500);
  assert.equal(option?.breakdown.hotel, 1_200);
  assert.ok(option?.tags.includes("Componentes ao vivo"));
});

test("a complete live package may label the total as live", async () => {
  const packageProvider: TravelProvider = {
    name: "package-test",
    kind: "PACKAGE",
    async search() {
      return [
        {
          provider: this.name,
          externalId: "package-1",
          kind: this.kind,
          destinationId: "buenos-aires",
          amount: 4_100,
          currency: "BRL",
          observedAt: new Date().toISOString(),
          breakdown: {
            flight: 1_500,
            hotel: 1_200,
            food: 700,
            transport: 300,
            activities: 400,
          },
        },
      ];
    },
  };
  const result = await new VoyraPriceEngine([packageProvider]).search(input);
  const option = result.options.find((item) => item.destinationId === "buenos-aires");
  assert.equal(option?.priceType, "LIVE");
  assert.equal(option?.totalEstimatedPrice, 4_100);
});

test("provider failures degrade independently", async () => {
  const healthy: TravelProvider = {
    name: "healthy",
    kind: "FLIGHT",
    async search() {
      return [];
    },
  };
  const failing: TravelProvider = {
    name: "failing",
    kind: "HOTEL",
    async search() {
      throw new Error("unavailable");
    },
  };
  const results = await new ProviderAggregator([healthy, failing], { retries: 0 }).search(input);
  assert.equal(results.find((result) => result.provider === "healthy")?.status, "SUCCESS");
  assert.equal(results.find((result) => result.provider === "failing")?.status, "UNAVAILABLE");
});

test("invalid date ranges are rejected at the boundary", () => {
  const parsed = travelSearchSchema.safeParse({
    ...input,
    startDate: "2027-11-10",
    endDate: "2027-11-01",
  });
  assert.equal(parsed.success, false);
});

test("travel search API validates and returns explicit estimates", async () => {
  process.env.SITE_URL = "http://localhost:3000";
  const response = await searchRoute(
    new Request("http://localhost:3000/api/travel/search", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({
        origin: "Brasilia",
        travelers: 2,
        durationDays: 7,
        maxBudget: 10_000,
      }),
    }),
  );
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.persisted, false);
  assert.ok(payload.options.length > 0);
  assert.ok(
    payload.options.every((option: { priceType: string }) => option.priceType === "ESTIMATED"),
  );
  assert.ok(response.headers.get("x-request-id"));
});

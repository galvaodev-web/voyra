import assert from "node:assert/strict";
import test from "node:test";
import { generateTravelReply, translateText, type TravelAIContext } from "@/lib/server/openai";
import { weatherForecast } from "@/lib/weather";
import { validateTravelFile } from "@/lib/server/file-validation";
import { buildTripMap } from "@/lib/server/mapbox";

const context: TravelAIContext = {
  destination: "Lisboa",
  start: "2027-05-10",
  end: "2027-05-17",
  budget: 8000,
  styles: ["Cultura"],
  activities: [{ day: 1, time: "10:00", name: "Alfama", location: "Lisboa" }],
};

test("OpenAI provider keeps requests server-side and disables response storage", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_API_KEY = "test-only-key";
  process.env.OPENAI_MODEL = "test-model";
  let body: Record<string, unknown> | undefined;
  try {
    const reply = await generateTravelReply(
      "Organize meu primeiro dia",
      context,
      async (input, init) => {
        assert.equal(String(input), "https://api.openai.com/v1/responses");
        assert.equal(new Headers(init?.headers).get("authorization"), "Bearer test-only-key");
        body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return Response.json({ output_text: "Comece por Alfama." });
      },
    );
    assert.equal(reply, "Comece por Alfama.");
    assert.equal(body?.store, false);
    assert.equal(body?.model, "test-model");
    assert.doesNotMatch(JSON.stringify(body), /documents|expenses|members|reservations/i);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }
});

test("OpenAI provider fails clearly when its credential is absent", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    await assert.rejects(generateTravelReply("Ajude", context), /ainda não está configurada/i);
  } finally {
    if (previousKey !== undefined) process.env.OPENAI_API_KEY = previousKey;
  }
});

test("translation uses the server-side Responses API without storing the response", async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "translation-test-key";
  try {
    const translated = await translateText(
      "Onde fica a estação?",
      "Português",
      "Italiano",
      async (_input, init) => {
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
        assert.equal(body.store, false);
        assert.match(String(body.input), /Onde fica a estação/);
        return Response.json({ output_text: "Dove si trova la stazione?" });
      },
    );
    assert.equal(translated, "Dove si trova la stazione?");
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test("weather provider returns source, observation time and rain probability", async () => {
  const previousKey = process.env.WEATHER_API_KEY;
  process.env.WEATHER_API_KEY = "weather-test-key";
  try {
    const result = await weatherForecast("Lisboa", async (input) => {
      const url = new URL(String(input));
      assert.equal(url.hostname, "api.weatherapi.com");
      assert.equal(url.searchParams.get("key"), "weather-test-key");
      assert.equal(url.searchParams.get("q"), "Lisboa");
      return Response.json({
        location: { name: "Lisbon" },
        current: {
          temp_c: 21.5,
          condition: { text: "Parcialmente nublado" },
          last_updated_epoch: 1_800_000_000,
        },
        forecast: { forecastday: [{ day: {} }, { day: { daily_chance_of_rain: 42 } }] },
      });
    });
    assert.deepEqual(result, {
      city: "Lisbon",
      temperature: 21.5,
      condition: "Parcialmente nublado",
      tomorrowRainChance: 42,
      source: "WEATHERAPI",
      observedAt: new Date(1_800_000_000 * 1000).toISOString(),
    });
  } finally {
    if (previousKey === undefined) delete process.env.WEATHER_API_KEY;
    else process.env.WEATHER_API_KEY = previousKey;
  }
});

test("document validation checks extension and binary signature", async () => {
  const png = new File(
    [Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])],
    "ticket.png",
    { type: "image/png" },
  );
  assert.equal(await validateTravelFile(png), "png");
  const disguised = new File(["not a pdf"], "passport.pdf", { type: "application/pdf" });
  await assert.rejects(validateTravelFile(disguised), /conteúdo do arquivo/i);
  const wrongExtension = new File([Uint8Array.from([0xff, 0xd8, 0xff, 0x00])], "photo.png", {
    type: "image/jpeg",
  });
  await assert.rejects(validateTravelFile(wrongExtension), /extensão do arquivo/i);
});

test("Mapbox provider geocodes itinerary places and returns a real provider image", async () => {
  const previousToken = process.env.MAPBOX_ACCESS_TOKEN;
  process.env.MAPBOX_ACCESS_TOKEN = "mapbox-test-token";
  const requested: string[] = [];
  try {
    const result = await buildTripMap(
      {
        destination: "Roma",
        country: "Itália",
        activities: [
          { id: "activity-1", name: "Coliseu", category: "História", location: "Coliseu" },
        ],
      },
      async (input) => {
        const url = String(input);
        requested.push(url);
        if (url.includes("/search/searchbox/v1/forward"))
          return Response.json({
            features: [
              {
                geometry: { coordinates: [12.4924, 41.8902] },
                properties: { name: "Colosseo", place_formatted: "Roma, Itália" },
              },
            ],
          });
        return new Response(Uint8Array.from([137, 80, 78, 71]), {
          headers: { "Content-Type": "image/png" },
        });
      },
    );
    assert.equal(result.source, "MAPBOX");
    assert.equal(result.locations[0].longitude, 12.4924);
    assert.equal(result.locations[0].matchedName, "Colosseo, Roma, Itália");
    assert.match(result.image, /^data:image\/png;base64,/);
    assert.equal(requested.length, 2);
    assert.ok(requested.every((url) => url.includes("access_token=mapbox-test-token")));
  } finally {
    if (previousToken === undefined) delete process.env.MAPBOX_ACCESS_TOKEN;
    else process.env.MAPBOX_ACCESS_TOKEN = previousToken;
  }
});

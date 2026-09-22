export type IntegrationName = "openai" | "mapbox" | "stripe" | "weather" | "flights" | "bookings";
export type IntegrationStatus = {
  name: IntegrationName;
  status: "mock" | "planned" | "affiliate" | "implemented";
  serverOnly: boolean;
};
export const integrations: IntegrationStatus[] = [
  { name: "openai", status: "implemented", serverOnly: true },
  { name: "mapbox", status: "implemented", serverOnly: true },
  { name: "stripe", status: "implemented", serverOnly: true },
  { name: "weather", status: "implemented", serverOnly: true },
  { name: "flights", status: "affiliate", serverOnly: true },
  { name: "bookings", status: "affiliate", serverOnly: true },
];

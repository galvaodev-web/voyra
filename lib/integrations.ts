export type IntegrationName = "openai" | "mapbox" | "stripe" | "weather" | "flights" | "bookings";
export type IntegrationStatus = {
  name: IntegrationName;
  status: "mock" | "planned" | "implemented";
  serverOnly: boolean;
};
export const integrations: IntegrationStatus[] = [
  { name: "openai", status: "mock", serverOnly: true },
  { name: "mapbox", status: "mock", serverOnly: false },
  { name: "stripe", status: "implemented", serverOnly: true },
  { name: "weather", status: "mock", serverOnly: true },
  { name: "flights", status: "planned", serverOnly: true },
  { name: "bookings", status: "planned", serverOnly: true },
];
export interface WeatherProvider {
  forecast(city: string): Promise<{
    city: string;
    temperature: number;
    condition: string;
    tomorrowRain: boolean;
    simulated: boolean;
  }>;
}
export const weatherProvider: WeatherProvider = {
  async forecast(city) {
    return { city, temperature: 24, condition: "Céu limpo", tomorrowRain: true, simulated: true };
  },
};

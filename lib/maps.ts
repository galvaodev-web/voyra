export interface MapLocation {
  id: number;
  name: string;
  category: string;
  x: number;
  y: number;
  query: string;
}
export const romeLocations: MapLocation[] = [
  {
    id: 1,
    name: "Hotel Ponte Sisto",
    category: "Hospedagem",
    x: 27,
    y: 62,
    query: "Hotel Ponte Sisto Roma",
  },
  { id: 2, name: "Coliseu", category: "História", x: 74, y: 65, query: "Coliseu Roma" },
  { id: 3, name: "Fórum Romano", category: "História", x: 59, y: 52, query: "Forum Romano Roma" },
  {
    id: 4,
    name: "Fontana di Trevi",
    category: "Passeio",
    x: 50,
    y: 20,
    query: "Fontana di Trevi Roma",
  },
  { id: 5, name: "Trastevere", category: "Gastronomia", x: 20, y: 80, query: "Trastevere Roma" },
];
export const navigationUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
export interface MapProvider {
  name: string;
  enabled: boolean;
}
export const mapProvider: MapProvider = { name: "illustrative", enabled: false };

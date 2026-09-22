export type MapLocation = {
  id: number;
  activityId: string;
  name: string;
  category: string;
  query: string;
  matchedName: string;
  longitude: number;
  latitude: number;
};

export type TripMapResult = {
  locations: MapLocation[];
  image: string;
  source: "MAPBOX";
  generatedAt: string;
};

export const navigationUrl = (query: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

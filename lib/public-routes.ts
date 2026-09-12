import { z } from "zod";
export const publicRouteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  destination: z.string(),
  author: z.string(),
  days: z.number(),
  tips: z.string(),
  updated_at: z.string(),
  activities: z.array(
    z.object({
      day: z.number(),
      time: z.string().nullable(),
      name: z.string().nullable(),
      category: z.string().nullable(),
      duration: z.string().nullable(),
      location: z.string().nullable(),
    }),
  ),
});
export type PublicRoute = z.infer<typeof publicRouteSchema>;
export const publicRouteColumns = "id,title,destination,author,days,tips,activities,updated_at";

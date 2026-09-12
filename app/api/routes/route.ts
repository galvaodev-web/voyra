import { publicClient } from "@/lib/server/public-routes";
import { publicRouteColumns, publicRouteSchema } from "@/lib/public-routes";
import { apiError } from "@/lib/server/http";
export async function GET(request: Request) {
  try {
    const client = publicClient();
    if (!client) return Response.json({ routes: [], hasMore: false });
    const params = new URL(request.url).searchParams;
    const page = Math.max(0, Math.min(1000, Number(params.get("page")) || 0));
    const query = (params.get("q") ?? "").slice(0, 100).replace(/[%_\\]/g, "");
    let lookup = client
      .from("published_routes")
      .select(publicRouteColumns)
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .order("id")
      .range(Math.floor(page) * 12, Math.floor(page) * 12 + 12);
    if (query) lookup = lookup.ilike("title", `%${query}%`);
    const { data, error } = await lookup;
    if (error) throw error;
    return Response.json(
      {
        routes: publicRouteSchema.array().parse(data?.slice(0, 12)),
        hasMore: (data?.length ?? 0) > 12,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

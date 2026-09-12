import { timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { apiError } from "@/lib/server/http";
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  if (
    !expected ||
    Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))
  )
    return new Response(null, { status: 401 });
  try {
    const db = adminClient();
    const { data, error } = await db
      .from("storage_cleanup")
      .select("path")
      .order("created_at")
      .limit(100);
    if (error) throw error;
    if (!data?.length) return Response.json({ removed: 0 });
    const paths = data.map((row) => row.path as string);
    const removed = await db.storage.from("travel-documents").remove(paths);
    if (removed.error) throw removed.error;
    const cleared = await db.from("storage_cleanup").delete().in("path", paths);
    if (cleared.error) throw cleared.error;
    return Response.json({ removed: paths.length }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

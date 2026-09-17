import { timingSafeEqual } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { processDeletionJob } from "@/lib/server/delete-account";
import { apiError } from "@/lib/server/http";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const received = request.headers.get("authorization") ?? "";
  if (
    !expected ||
    Buffer.byteLength(received) !== Buffer.byteLength(`Bearer ${expected}`) ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(`Bearer ${expected}`))
  ) return new Response(null, { status: 401 });
  try {
    const jobs = await adminClient()
      .from("account_deletion_jobs")
      .select("user_id")
      .in("status", ["PENDING", "FAILED", "RUNNING"])
      .lt("attempts", 10)
      .order("updated_at")
      .limit(20);
    if (jobs.error) throw jobs.error;
    let completed = 0;
    for (const job of jobs.data ?? []) {
      try {
        await processDeletionJob(job.user_id);
        completed += 1;
      } catch {
        // The durable job retains a sanitized failure code for the next run.
      }
    }
    return Response.json({ inspected: jobs.data?.length ?? 0, completed });
  } catch (error) {
    return apiError(error);
  }
}

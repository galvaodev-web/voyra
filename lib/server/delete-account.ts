import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { stripeClient } from "@/lib/billing/stripe";

type StorageMap = Record<string, string[]>;
const buckets = ["travel-documents", "social-images", "social-videos", "avatars"] as const;

async function listFiles(bucketName: string, prefix: string, depth = 0): Promise<string[]> {
  if (depth > 8 || prefix.includes("..")) throw new Error("INVALID_STORAGE_PREFIX");
  const bucket = adminClient().storage.from(bucketName);
  const files: string[] = [];
  let offset = 0;
  while (true) {
    const result = await bucket.list(prefix, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (result.error) throw result.error;
    if (!result.data?.length) break;
    for (const entry of result.data) {
      if (entry.name.includes("/") || entry.name === "." || entry.name === "..")
        throw new Error("INVALID_STORAGE_OBJECT");
      const path = `${prefix.replace(/\/$/, "")}/${entry.name}`;
      if (entry.id) files.push(path);
      else files.push(...(await listFiles(bucketName, path, depth + 1)));
    }
    if (result.data.length < 100) break;
    offset += result.data.length;
  }
  return files;
}

async function prepareDeletionJob(userId: string) {
  const db = adminClient();
  const [customer, socialProfile] = await Promise.all([
    db.from("billing_customers").select("customer_id").eq("user_id", userId).maybeSingle(),
    db.schema("social").from("profiles").select("avatar_url,cover_url").eq("id", userId).maybeSingle(),
  ]);
  if (customer.error) throw customer.error;
  const storagePaths: StorageMap = {};
  for (const bucket of buckets) storagePaths[bucket] = await listFiles(bucket, userId);
  for (const path of [socialProfile.data?.avatar_url, socialProfile.data?.cover_url]) {
    if (typeof path === "string" && path.startsWith(`${userId}/`)) {
      storagePaths.avatars = Array.from(new Set([...storagePaths.avatars, path]));
    }
  }
  const saved = await db.from("account_deletion_jobs").upsert(
    {
      user_id: userId,
      status: "PENDING",
      storage_paths: storagePaths,
      stripe_customer_id: customer.data?.customer_id ?? null,
      last_error_code: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (saved.error) throw saved.error;
}

export async function processDeletionJob(userId: string) {
  const db = adminClient();
  const job = await db
    .from("account_deletion_jobs")
    .select("storage_paths,stripe_customer_id,attempts,status")
    .eq("user_id", userId)
    .single();
  if (job.error) throw job.error;
  if (job.data.status === "COMPLETE") return;
  const running = await db.from("account_deletion_jobs").update({
    status: "RUNNING",
    attempts: job.data.attempts + 1,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId);
  if (running.error) throw running.error;
  try {
    if (job.data.stripe_customer_id) {
      const stripe = stripeClient();
      const customer = await stripe.customers.retrieve(job.data.stripe_customer_id);
      if (!customer.deleted) await stripe.customers.del(customer.id);
    }
    const paths = (job.data.storage_paths ?? {}) as StorageMap;
    for (const [bucket, items] of Object.entries(paths)) {
      for (let start = 0; start < items.length; start += 100) {
        const removed = await db.storage.from(bucket).remove(items.slice(start, start + 100));
        if (removed.error) throw removed.error;
      }
    }
    const deleted = await db.auth.admin.deleteUser(userId);
    if (deleted.error && !deleted.error.message.toLowerCase().includes("not found"))
      throw deleted.error;
    const completed = await db.from("account_deletion_jobs").update({
      status: "COMPLETE",
      last_error_code: null,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    if (completed.error) throw completed.error;
  } catch (error) {
    await db.from("account_deletion_jobs").update({
      status: "FAILED",
      last_error_code: error instanceof Error ? error.name.slice(0, 80) : "UNKNOWN",
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);
    throw error;
  }
}

export async function deleteVoyraAccount(userId: string) {
  await prepareDeletionJob(userId);
  await processDeletionJob(userId);
}

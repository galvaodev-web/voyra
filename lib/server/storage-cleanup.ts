import "server-only";
import { adminClient } from "@/lib/supabase/admin";
export async function removeAccountFiles(userId: string) {
  const bucket = adminClient().storage.from("travel-documents");
  async function clean(prefix: string, depth: number) {
    if (depth > 5 || !prefix.startsWith(`${userId}/`)) throw new Error("Invalid storage prefix");
    // Remove a page at a time; don't skip objects as deletion changes pagination.
    while (true) {
      const { data, error } = await bucket.list(prefix, {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      if (!data?.length) return;
      const paths: string[] = [];
      for (const entry of data) {
        if (entry.name.includes("/") || entry.name === "." || entry.name === "..")
          throw new Error("Invalid storage object");
        const path = `${prefix.replace(/\/$/, "")}/${entry.name}`;
        if (entry.id) paths.push(path);
        else await clean(`${path}/`, depth + 1);
      }
      if (paths.length) {
        const removed = await bucket.remove(paths);
        if (removed.error) throw removed.error;
      }
    }
  }
  await clean(`${userId}/`, 0);
}

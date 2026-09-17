import { z } from "zod";
import { apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/http";

export async function GET() {
  try {
    const { client } = await requireUser();
    const result = await client
      .from("notifications")
      .select("id,title,body,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (result.error) throw result.error;
    return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { client } = await requireUser();
    const input = z.object({ id: z.string().uuid() }).safeParse(await jsonBody(request));
    if (!input.success) throw new HttpError(422, "Notificação inválida.");
    const result = await client.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", input.data.id).select("id");
    if (result.error) throw result.error;
    if (!result.data?.length) throw new HttpError(404, "Notificação não encontrada.");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, HttpError, requireSameOrigin, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { validateTravelFile } from "@/lib/server/file-validation";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 3 * 1024 * 1024 + 64 * 1024)
      throw new HttpError(413, "O arquivo deve ter no máximo 3 MB.");
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "document-upload", {
      userId: user.id,
      maximum: 20,
      windowSeconds: 60,
    });
    const form = await request.formData();
    const tripId = z.string().uuid().safeParse(form.get("tripId"));
    const file = form.get("file");
    if (!tripId.success || !(file instanceof File))
      throw new HttpError(400, "Envie uma viagem e um arquivo válidos.");
    const trip = await client
      .from("trips")
      .select("id")
      .eq("id", tripId.data)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (trip.error) throw trip.error;
    if (!trip.data) throw new HttpError(404, "Viagem não encontrada.");
    const extension = await validateTravelFile(file);
    const path = `${user.id}/${tripId.data}/${randomUUID()}.${extension}`;
    const uploaded = await client.storage.from("travel-documents").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploaded.error) throw uploaded.error;
    return Response.json({ path }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

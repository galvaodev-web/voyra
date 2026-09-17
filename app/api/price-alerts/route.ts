import { z } from "zod";
import { apiError, HttpError, jsonBody, requireSameOrigin, requireUser } from "@/lib/server/http";
import { enforceRateLimit } from "@/lib/server/rate-limit";

const idSchema = z.string().uuid();
const values = z.object({
  origin: z.string().trim().min(2).max(120),
  destination: z.string().trim().min(2).max(120),
  targetPrice: z.number().positive().max(10_000_000),
  currency: z.string().length(3).toUpperCase().default("BRL"),
  startDate: z.string().date().nullable().optional(),
  endDate: z.string().date().nullable().optional(),
  active: z.boolean().default(true),
}).refine((value) => !value.startDate || !value.endDate || value.endDate >= value.startDate, {
  message: "A data final deve ser posterior à inicial.",
});

export async function GET(request: Request) {
  try {
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "price-alerts-read", { userId: user.id, maximum: 60, windowSeconds: 60 });
    const result = await client
      .from("price_alerts")
      .select("id,origin,destination,target_price,currency,start_date,end_date,active,last_notified_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (result.error) throw result.error;
    return Response.json(result.data, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "price-alerts-write", { userId: user.id, maximum: 20, windowSeconds: 60 });
    const parsed = values.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(422, parsed.error.issues[0]?.message || "Alerta inválido.");
    const input = parsed.data;
    const result = await client.from("price_alerts").insert({
      user_id: user.id,
      origin: input.origin,
      destination: input.destination,
      target_price: input.targetPrice,
      currency: input.currency,
      start_date: input.startDate ?? null,
      end_date: input.endDate ?? null,
      active: input.active,
    }).select("*").single();
    if (result.error) throw result.error;
    return Response.json(result.data, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "price-alerts-write", { userId: user.id, maximum: 20, windowSeconds: 60 });
    const schema = z.object({ id: idSchema }).and(values.partial());
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(422, "Alteração de alerta inválida.");
    const { id, ...patch } = parsed.data;
    const databasePatch = {
      ...(patch.origin !== undefined && { origin: patch.origin }),
      ...(patch.destination !== undefined && { destination: patch.destination }),
      ...(patch.targetPrice !== undefined && { target_price: patch.targetPrice }),
      ...(patch.currency !== undefined && { currency: patch.currency }),
      ...(patch.startDate !== undefined && { start_date: patch.startDate }),
      ...(patch.endDate !== undefined && { end_date: patch.endDate }),
      ...(patch.active !== undefined && { active: patch.active }),
    };
    if (!Object.keys(databasePatch).length) throw new HttpError(422, "Nenhuma alteração enviada.");
    const result = await client.from("price_alerts").update(databasePatch).eq("id", id).select("*").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) throw new HttpError(404, "Alerta não encontrado.");
    return Response.json(result.data);
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const { client, user } = await requireUser();
    await enforceRateLimit(request, "price-alerts-write", { userId: user.id, maximum: 20, windowSeconds: 60 });
    const parsed = z.object({ id: idSchema }).safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(422, "Alerta inválido.");
    const result = await client.from("price_alerts").delete().eq("id", parsed.data.id).select("id");
    if (result.error) throw result.error;
    if (!result.data?.length) throw new HttpError(404, "Alerta não encontrado.");
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}

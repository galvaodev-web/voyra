import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, HttpError, jsonBody, requireSameOrigin } from "@/lib/server/http";
import { createClient } from "@/lib/supabase/server";
import { adminClient } from "@/lib/supabase/admin";
import { flightReferral, hotelReferral } from "@/lib/marketplace/skyscanner";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const flightSchema = z.object({
  vertical: z.literal("flights"),
  origin: z.string().trim().regex(/^[a-zA-Z]{3}$/),
  destination: z.string().trim().regex(/^[a-zA-Z]{3}$/),
  outboundDate: date,
  inboundDate: date.optional(),
  adults: z.number().int().min(1).max(9),
  cabinclass: z.enum(["economy", "premiumeconomy", "business", "first"]),
});
const hotelSchema = z.object({
  vertical: z.literal("hotels"),
  destinationCode: z.string().trim().regex(/^[a-zA-Z0-9-]{2,32}$/),
  checkin: date,
  checkout: date,
  adults: z.number().int().min(1).max(20),
  rooms: z.number().int().min(1).max(10),
});
const schema = z.discriminatedUnion("vertical", [flightSchema, hotelSchema]);

function validDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const parsed = schema.safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Preencha os dados da busca corretamente.");
    const input = parsed.data;
    const dateValues = input.vertical === "flights"
      ? [input.outboundDate, ...(input.inboundDate ? [input.inboundDate] : [])]
      : [input.checkin, input.checkout];
    if (!dateValues.every(validDate)) throw new HttpError(400, "Use datas válidas.");
    if (input.vertical === "flights") {
      if (input.origin.toUpperCase() === input.destination.toUpperCase())
        throw new HttpError(400, "Origem e destino precisam ser diferentes.");
      if (input.inboundDate && input.inboundDate < input.outboundDate)
        throw new HttpError(400, "A volta não pode ser anterior à ida.");
    } else {
      if (input.checkout <= input.checkin)
        throw new HttpError(400, "O check-out precisa ser depois do check-in.");
      if (input.rooms > input.adults)
        throw new HttpError(400, "O número de quartos não pode superar o de adultos.");
    }

    const referralId = randomUUID();
    const subid = referralId.replaceAll("-", "");
    const url =
      input.vertical === "flights"
        ? flightReferral(input, subid)
        : hotelReferral(input, subid);

    let userId: string | null = null;
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      const client = await createClient();
      const { data } = await client.auth.getUser();
      userId = data.user?.id ?? null;
    }

    const { error } = await adminClient().from("partner_referrals").insert({
      id: referralId,
      user_id: userId,
      partner: "skyscanner",
      vertical: input.vertical,
      subid,
      search: input,
      status: "CLICKED",
    });
    if (error) throw error;

    return Response.json({
      referralId,
      url,
      disclosure:
        "A reserva é concluída com o parceiro. A Voyra pode receber comissão pela indicação, sem alterar o preço exibido pelo parceiro.",
    });
  } catch (error) {
    return apiError(error);
  }
}

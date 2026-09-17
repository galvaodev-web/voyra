import { z } from "zod";
import { apiError, HttpError, jsonBody } from "@/lib/server/http";
import { deleteVoyraAccount } from "@/lib/server/delete-account";
import { requireBearerUser } from "@/lib/supabase/bearer";

export async function DELETE(request: Request) {
  try {
    const { user } = await requireBearerUser(request);
    const parsed = z
      .object({ confirmation: z.literal("EXCLUIR") })
      .safeParse(await jsonBody(request));
    if (!parsed.success) throw new HttpError(400, "Digite EXCLUIR para confirmar.");
    await deleteVoyraAccount(user.id);
    return Response.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}

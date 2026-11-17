import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const res = await prisma.hotelReservation.findFirst({ where: { id, companyId: user.companyId } });
  if (!res) throw createError({ statusCode: 404, statusMessage: "Réservation introuvable" });
  if (res.status === "CHECKED_IN") {
    throw createError({ statusCode: 400, statusMessage: "Impossible de supprimer une réservation en cours de séjour" });
  }

  await prisma.hotelReservation.delete({ where: { id } });
  return { ok: true };
});

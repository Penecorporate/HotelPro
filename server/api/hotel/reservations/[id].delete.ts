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

  const [payments, services] = await Promise.all([
    prisma.hotelPayment.count({ where: { reservationId: id } }),
    prisma.hotelService.count({ where: { reservationId: id } }),
  ]);
  if (payments > 0) {
    throw createError({ statusCode: 400, statusMessage: "Réservation avec des encaissements : annulez-la plutôt que de la supprimer" });
  }
  if (services > 0) {
    throw createError({ statusCode: 400, statusMessage: "Réservation avec des consommations : supprimez-les d'abord" });
  }

  await prisma.hotelReservation.delete({ where: { id } });
  return { ok: true };
});

import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const room = await prisma.hotelRoom.findFirst({ where: { id, companyId: user.companyId } });
  if (!room) throw createError({ statusCode: 404, statusMessage: "Chambre introuvable" });

  const count = await prisma.hotelReservation.count({ where: { roomId: id } });
  if (count > 0) throw createError({ statusCode: 400, statusMessage: "Chambre utilisée par des réservations" });

  await prisma.hotelRoom.delete({ where: { id } });
  return { ok: true };
});

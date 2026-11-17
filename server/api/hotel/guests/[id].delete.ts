import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const guest = await prisma.hotelGuest.findFirst({ where: { id, companyId: user.companyId } });
  if (!guest) throw createError({ statusCode: 404, statusMessage: "Client introuvable" });

  const [res, docs] = await Promise.all([
    prisma.hotelReservation.count({ where: { guestId: id } }),
    prisma.hotelDocument.count({ where: { guestId: id } }),
  ]);
  if (res > 0) throw createError({ statusCode: 400, statusMessage: "Client lié à des réservations" });
  if (docs > 0) throw createError({ statusCode: 400, statusMessage: "Client lié à des documents" });

  await prisma.hotelGuest.delete({ where: { id } });
  return { ok: true };
});

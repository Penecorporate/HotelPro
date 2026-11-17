import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel-documents");
  const guestId = getQuery(event).guestId ? Number(getQuery(event).guestId) : undefined;
  return prisma.hotelDocument.findMany({
    where: { companyId: user.companyId, ...(guestId ? { guestId } : {}) },
    include: {
      guest: { select: { id: true, firstName: true, lastName: true } },
      reservation: { select: { id: true, checkIn: true, room: { select: { number: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });
});

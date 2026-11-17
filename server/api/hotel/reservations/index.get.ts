import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  return prisma.hotelReservation.findMany({
    where: { companyId: user.companyId },
    include: {
      room: { select: { id: true, number: true, type: true } },
      guest: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { checkIn: "desc" },
  });
});

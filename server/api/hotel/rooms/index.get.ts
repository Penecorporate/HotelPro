import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  return prisma.hotelRoom.findMany({
    where: { companyId: user.companyId },
    include: { _count: { select: { reservations: true } } },
    orderBy: { number: "asc" },
  });
});

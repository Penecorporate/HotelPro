import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const guestId = getQuery(event).guestId ? Number(getQuery(event).guestId) : undefined;
  return prisma.hotelService.findMany({
    where: { companyId: user.companyId, ...(guestId ? { guestId } : {}) },
    include: { reservation: { select: { id: true, room: { select: { number: true } } } } },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
});

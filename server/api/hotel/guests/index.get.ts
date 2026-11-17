import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { guestStats } from "~/server/utils/hotelReservation";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const guests = await prisma.hotelGuest.findMany({
    where: { companyId: user.companyId },
    include: { _count: { select: { reservations: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const stats = await guestStats(user.companyId, guests.map((g) => g.id));
  return guests.map((g) => ({ ...g, ...stats.get(g.id)! }));
});

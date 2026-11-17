import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const q = getQuery(event);
  const reservationId = q.reservationId ? Number(q.reservationId) : undefined;
  const guestId = q.guestId ? Number(q.guestId) : undefined;
  return prisma.hotelPayment.findMany({
    where: {
      companyId: user.companyId,
      ...(reservationId ? { reservationId } : {}),
      ...(guestId ? { reservation: { guestId } } : {}),
    },
    include: {
      reservation: {
        select: { id: true, guest: { select: { firstName: true, lastName: true } }, room: { select: { number: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
});

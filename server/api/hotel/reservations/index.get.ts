import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const rows = await prisma.hotelReservation.findMany({
    where: { companyId: user.companyId },
    include: {
      room: { select: { id: true, number: true, type: true } },
      guest: { select: { id: true, firstName: true, lastName: true } },
      services: { select: { quantity: true, unitPrice: true } },
    },
    orderBy: { checkIn: "desc" },
  });
  return rows.map(({ services, ...r }) => {
    const servicesTotal = services.reduce((s, x) => s + x.quantity * Number(x.unitPrice), 0);
    const total = Number(r.totalPrice) + servicesTotal;
    return { ...r, servicesTotal, grandTotal: total, balance: Math.max(0, total - Number(r.paidAmount)) };
  });
});

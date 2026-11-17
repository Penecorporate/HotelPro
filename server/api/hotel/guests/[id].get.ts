import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { guestStats } from "~/server/utils/hotelReservation";

// Guest file ("dossier"): identity + loyalty + stays + consumptions + incidents.
// Documents and payments are fetched separately by the page.
export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const guest = await prisma.hotelGuest.findFirst({
    where: { id, companyId: user.companyId },
    include: {
      reservations: {
        include: {
          room: { select: { id: true, number: true, type: true } },
          services: { select: { quantity: true, unitPrice: true } },
        },
        orderBy: { checkIn: "desc" },
      },
    },
  });
  if (!guest) throw createError({ statusCode: 404, statusMessage: "Client introuvable" });

  const stats = (await guestStats(user.companyId, [id])).get(id)!;
  const reservations = guest.reservations.map(({ services, ...r }) => {
    const servicesTotal = services.reduce((s, x) => s + x.quantity * Number(x.unitPrice), 0);
    const grandTotal = Number(r.totalPrice) + servicesTotal;
    return { ...r, servicesTotal, grandTotal, balance: Math.max(0, grandTotal - Number(r.paidAmount)) };
  });
  const billable = reservations.filter((r) => r.status !== "CANCELLED");
  return {
    ...guest,
    reservations,
    ...stats,
    totalBilled: billable.reduce((s, r) => s + r.grandTotal, 0),
    totalDue: billable.reduce((s, r) => s + r.balance, 0),
  };
});

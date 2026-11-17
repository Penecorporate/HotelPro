import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { syncPaidAmount } from "~/server/utils/hotelReservation";

// Cancels (deletes) a payment entry — e.g. a keying mistake.
export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const payment = await prisma.hotelPayment.findFirst({ where: { id, companyId: user.companyId } });
  if (!payment) throw createError({ statusCode: 404, statusMessage: "Encaissement introuvable" });

  await prisma.hotelPayment.delete({ where: { id } });
  await syncPaidAmount(payment.reservationId);
  return { ok: true };
});

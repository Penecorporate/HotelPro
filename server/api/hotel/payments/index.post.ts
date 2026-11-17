import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { reservationBalance, syncPaidAmount } from "~/server/utils/hotelReservation";

const schema = z.object({
  reservationId: z.number().int().positive(),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "WAVE", "ORANGE_MONEY"]),
  reference: z.string().trim().nullable().optional(),
  note: z.string().trim().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const body = await readValidatedBody(event, schema.parse);

  const res = await prisma.hotelReservation.findFirst({ where: { id: body.reservationId, companyId: user.companyId } });
  if (!res) throw createError({ statusCode: 404, statusMessage: "Réservation introuvable" });
  if (res.status === "CANCELLED") {
    throw createError({ statusCode: 400, statusMessage: "Réservation annulée : encaissement impossible" });
  }

  const { balance } = await reservationBalance(res.id);
  if (body.amount > balance) {
    throw createError({ statusCode: 400, statusMessage: `Le montant dépasse le reste à payer (${balance})` });
  }

  const payment = await prisma.hotelPayment.create({
    data: {
      companyId: user.companyId,
      reservationId: res.id,
      amount: body.amount,
      method: body.method,
      reference: body.reference || null,
      note: body.note || null,
      createdById: user.id,
    },
  });
  await syncPaidAmount(res.id);
  // A pending reservation that receives money is confirmed.
  if (res.status === "PENDING") {
    await prisma.hotelReservation.update({ where: { id: res.id }, data: { status: "CONFIRMED" } });
  }
  return payment;
});

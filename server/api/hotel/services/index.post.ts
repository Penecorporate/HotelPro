import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

const schema = z.object({
  reservationId: z.number().int().positive(),
  label: z.string().trim().min(1),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const body = await readValidatedBody(event, schema.parse);

  const res = await prisma.hotelReservation.findFirst({ where: { id: body.reservationId, companyId: user.companyId } });
  if (!res) throw createError({ statusCode: 404, statusMessage: "Réservation introuvable" });
  if (res.status === "CANCELLED") {
    throw createError({ statusCode: 400, statusMessage: "Réservation annulée" });
  }

  return prisma.hotelService.create({
    data: { ...body, date: parseDay(body.date), guestId: res.guestId, companyId: user.companyId },
  });
});

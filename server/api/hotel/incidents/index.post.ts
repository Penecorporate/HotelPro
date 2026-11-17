import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

const schema = z.object({
  guestId: z.number().int().positive(),
  reservationId: z.number().int().positive().nullable().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH"]).default("LOW"),
  title: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  resolved: z.boolean().default(false),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const body = await readValidatedBody(event, schema.parse);

  if (!(await prisma.hotelGuest.findFirst({ where: { id: body.guestId, companyId: user.companyId } }))) {
    throw createError({ statusCode: 404, statusMessage: "Client introuvable" });
  }
  if (
    body.reservationId &&
    !(await prisma.hotelReservation.findFirst({
      where: { id: body.reservationId, companyId: user.companyId, guestId: body.guestId },
    }))
  ) {
    throw createError({ statusCode: 404, statusMessage: "Réservation introuvable pour ce client" });
  }
  return prisma.hotelIncident.create({
    data: { ...body, date: parseDay(body.date), companyId: user.companyId, createdById: user.id },
  });
});

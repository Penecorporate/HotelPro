import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

const schema = z
  .object({
    reservationId: z.number().int().positive().nullable(),
    severity: z.enum(["LOW", "MEDIUM", "HIGH"]),
    title: z.string().trim().min(1),
    description: z.string().trim().nullable(),
    resolved: z.boolean(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));
  const body = await readValidatedBody(event, schema.parse);

  const inc = await prisma.hotelIncident.findFirst({ where: { id, companyId: user.companyId } });
  if (!inc) throw createError({ statusCode: 404, statusMessage: "Incident introuvable" });
  if (
    body.reservationId &&
    !(await prisma.hotelReservation.findFirst({
      where: { id: body.reservationId, companyId: user.companyId, guestId: inc.guestId },
    }))
  ) {
    throw createError({ statusCode: 404, statusMessage: "Réservation introuvable pour ce client" });
  }
  return prisma.hotelIncident.update({
    where: { id },
    data: { ...body, ...(body.date ? { date: parseDay(body.date) } : {}) },
  });
});

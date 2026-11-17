import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

const schema = z
  .object({
    title: z.string().trim().min(1),
    type: z.string().trim().min(1),
    guestId: z.number().int().positive().nullable(),
    reservationId: z.number().int().positive().nullable(),
    fileUrl: z.string().startsWith("/api/hotel/documents/file/").nullable(),
    fileName: z.string().trim().nullable(),
    notes: z.string().trim().nullable(),
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel-documents");
  const id = Number(getRouterParam(event, "id"));
  const data = await readValidatedBody(event, schema.parse);

  const doc = await prisma.hotelDocument.findFirst({ where: { id, companyId: user.companyId } });
  if (!doc) throw createError({ statusCode: 404, statusMessage: "Document introuvable" });

  if (data.guestId && !(await prisma.hotelGuest.findFirst({ where: { id: data.guestId, companyId: user.companyId } }))) {
    throw createError({ statusCode: 404, statusMessage: "Client introuvable" });
  }
  if (
    data.reservationId &&
    !(await prisma.hotelReservation.findFirst({ where: { id: data.reservationId, companyId: user.companyId } }))
  ) {
    throw createError({ statusCode: 404, statusMessage: "Réservation introuvable" });
  }
  return prisma.hotelDocument.update({ where: { id }, data });
});

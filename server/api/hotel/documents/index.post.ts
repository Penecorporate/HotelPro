import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

const schema = z.object({
  title: z.string().trim().min(1),
  type: z.string().trim().min(1).default("Autre"),
  guestId: z.number().int().positive().nullable().optional(),
  reservationId: z.number().int().positive().nullable().optional(),
  fileUrl: z.string().startsWith("/api/hotel/documents/file/").nullable().optional(),
  fileName: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel-documents");
  const data = await readValidatedBody(event, schema.parse);

  if (data.guestId && !(await prisma.hotelGuest.findFirst({ where: { id: data.guestId, companyId: user.companyId } }))) {
    throw createError({ statusCode: 404, statusMessage: "Client introuvable" });
  }
  if (
    data.reservationId &&
    !(await prisma.hotelReservation.findFirst({ where: { id: data.reservationId, companyId: user.companyId } }))
  ) {
    throw createError({ statusCode: 404, statusMessage: "Réservation introuvable" });
  }
  return prisma.hotelDocument.create({ data: { ...data, companyId: user.companyId } });
});

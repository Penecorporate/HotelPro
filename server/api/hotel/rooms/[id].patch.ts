import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

const schema = z
  .object({
    number: z.string().trim().min(1),
    type: z.string().trim().min(1),
    floor: z.number().int().nullable(),
    capacity: z.number().int().min(1),
    pricePerNight: z.number().min(0),
    status: z.enum(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"]),
    description: z.string().trim().nullable(),
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));
  const data = await readValidatedBody(event, schema.parse);

  const room = await prisma.hotelRoom.findFirst({ where: { id, companyId: user.companyId } });
  if (!room) throw createError({ statusCode: 404, statusMessage: "Chambre introuvable" });

  if (data.number && data.number !== room.number) {
    const dup = await prisma.hotelRoom.findUnique({
      where: { companyId_number: { companyId: user.companyId, number: data.number } },
    });
    if (dup) throw createError({ statusCode: 400, statusMessage: "Ce numéro de chambre existe déjà" });
  }
  return prisma.hotelRoom.update({ where: { id }, data });
});

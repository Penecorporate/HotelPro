import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

const roomSchema = z.object({
  number: z.string().trim().min(1),
  type: z.string().trim().min(1).default("Standard"),
  floor: z.number().int().nullable().optional(),
  capacity: z.number().int().min(1).default(2),
  pricePerNight: z.number().min(0).default(0),
  status: z.enum(["AVAILABLE", "OCCUPIED", "CLEANING", "MAINTENANCE"]).default("AVAILABLE"),
  description: z.string().trim().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const data = await readValidatedBody(event, roomSchema.parse);

  const exists = await prisma.hotelRoom.findUnique({
    where: { companyId_number: { companyId: user.companyId, number: data.number } },
  });
  if (exists) throw createError({ statusCode: 400, statusMessage: "Ce numéro de chambre existe déjà" });

  return prisma.hotelRoom.create({ data: { ...data, companyId: user.companyId } });
});

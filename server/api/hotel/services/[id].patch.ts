import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

const schema = z
  .object({
    label: z.string().trim().min(1),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .partial();

// The reservation of a consumption is fixed once created (delete and re-add to move it).
export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));
  const body = await readValidatedBody(event, schema.parse);

  const svc = await prisma.hotelService.findFirst({ where: { id, companyId: user.companyId } });
  if (!svc) throw createError({ statusCode: 404, statusMessage: "Consommation introuvable" });

  return prisma.hotelService.update({
    where: { id },
    data: { ...body, ...(body.date ? { date: parseDay(body.date) } : {}) },
  });
});

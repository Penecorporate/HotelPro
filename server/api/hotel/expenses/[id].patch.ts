import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

const schema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    category: z.string().trim().min(1),
    description: z.string().trim().min(1),
    amount: z.number().positive(),
    method: z.enum(["CASH", "CARD", "WAVE", "ORANGE_MONEY"]),
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));
  const body = await readValidatedBody(event, schema.parse);

  const exp = await prisma.hotelExpense.findFirst({ where: { id, companyId: user.companyId } });
  if (!exp) throw createError({ statusCode: 404, statusMessage: "Dépense introuvable" });

  return prisma.hotelExpense.update({
    where: { id },
    data: { ...body, ...(body.date ? { date: parseDay(body.date) } : {}) },
  });
});

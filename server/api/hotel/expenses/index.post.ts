import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().trim().min(1),
  description: z.string().trim().min(1),
  amount: z.number().positive(),
  method: z.enum(["CASH", "CARD", "WAVE", "ORANGE_MONEY"]).default("CASH"),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const body = await readValidatedBody(event, schema.parse);
  return prisma.hotelExpense.create({
    data: { ...body, date: parseDay(body.date), companyId: user.companyId, createdById: user.id },
  });
});

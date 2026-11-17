import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const exp = await prisma.hotelExpense.findFirst({ where: { id, companyId: user.companyId } });
  if (!exp) throw createError({ statusCode: 404, statusMessage: "Dépense introuvable" });

  await prisma.hotelExpense.delete({ where: { id } });
  return { ok: true };
});

import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  return prisma.hotelExpense.findMany({
    where: { companyId: user.companyId },
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });
});

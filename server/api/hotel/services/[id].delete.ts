import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const svc = await prisma.hotelService.findFirst({ where: { id, companyId: user.companyId } });
  if (!svc) throw createError({ statusCode: 404, statusMessage: "Consommation introuvable" });

  await prisma.hotelService.delete({ where: { id } });
  return { ok: true };
});

import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));

  const inc = await prisma.hotelIncident.findFirst({ where: { id, companyId: user.companyId } });
  if (!inc) throw createError({ statusCode: 404, statusMessage: "Incident introuvable" });

  await prisma.hotelIncident.delete({ where: { id } });
  return { ok: true };
});

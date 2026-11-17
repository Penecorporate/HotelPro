import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireRole } from "~/server/utils/authz";
import { logAudit } from "~/server/utils/audit";
import { APP_MODULES } from "~/lib/appModules";

const bodySchema = z.object({ modules: z.array(z.enum(APP_MODULES)) });

// Only Direction (OWNER) links users to modules. Replaces the user's whole
// set of links in one call (send the full list, not a diff).
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ["OWNER"]);
  const id = Number(getRouterParam(event, "id"));
  const { modules } = await readValidatedBody(event, bodySchema.parse);

  const target = await prisma.user.findFirst({ where: { id, companyId: user.companyId } });
  if (!target) throw createError({ statusCode: 404, statusMessage: "Utilisateur introuvable" });

  const unique = [...new Set(modules)];
  await prisma.$transaction([
    prisma.userModule.deleteMany({ where: { userId: id } }),
    prisma.userModule.createMany({ data: unique.map((module) => ({ userId: id, module })) }),
  ]);

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: "USER_MODULES_SET",
    entity: "User",
    entityId: id,
    newValue: { modules: unique },
  });

  return { modules: unique };
});

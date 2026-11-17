import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireRole } from "~/server/utils/authz";
import { logAudit } from "~/server/utils/audit";
import { isAppModule } from "~/lib/appModules";

const bodySchema = z.object({ active: z.boolean() });

// Only the super admin (OWNER/Direction) can switch a module on or off.
// Deactivating keeps every user link and role permission intact, so
// reactivating restores access exactly as it was.
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ["OWNER"]);
  const module = getRouterParam(event, "module") ?? "";
  if (!isAppModule(module)) throw createError({ statusCode: 404, statusMessage: "Module introuvable" });
  const { active } = await readValidatedBody(event, bodySchema.parse);

  const row = await prisma.companyModule.upsert({
    where: { companyId_module: { companyId: user.companyId, module } },
    update: { active, ...(active ? { activatedAt: new Date(), activatedById: user.id } : {}) },
    create: {
      companyId: user.companyId,
      module,
      active,
      activatedAt: active ? new Date() : null,
      activatedById: active ? user.id : null,
    },
  });

  await logAudit({
    companyId: user.companyId,
    userId: user.id,
    action: active ? "MODULE_ACTIVATED" : "MODULE_DEACTIVATED",
    entity: "CompanyModule",
    entityId: row.id,
    newValue: { module, active },
  });

  return { module, active: row.active };
});

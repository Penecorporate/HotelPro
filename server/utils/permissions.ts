import type { H3Event } from "h3";
import type { User } from "#auth-utils";
import { prisma } from "./prisma";
import { requireUser } from "./authz";
import { GATEABLE_MODULES, type GateableModule } from "~/lib/permissionModules";
import { GATEABLE_TO_APP_MODULE } from "~/lib/appModules";
import { canUseAppModule } from "./appModules";

export { GATEABLE_MODULES };
export type { GateableModule };

export async function hasModuleAccess(user: User, module: GateableModule): Promise<boolean> {
  // Modules belonging to an optional app module (e.g. "hotel") must first be
  // activated for the company and linked to the user — see lib/appModules.ts.
  const appModule = GATEABLE_TO_APP_MODULE[module];
  if (appModule && !(await canUseAppModule(user, appModule))) return false;

  // OWNER always has full access — never needs a RolePermission row.
  if (user.role === "OWNER") return true;

  const row = await prisma.rolePermission.findUnique({
    where: {
      companyId_role_module: {
        companyId: user.companyId,
        role: user.role,
        module,
      },
    },
  });
  return row !== null;
}

export async function requireModuleAccess(event: H3Event, module: GateableModule): Promise<User> {
  const user = await requireUser(event);
  if (!(await hasModuleAccess(user, module))) {
    throw createError({ statusCode: 403, statusMessage: "Accès refusé" });
  }
  return user;
}

import type { H3Event } from "h3";
import type { User } from "#auth-utils";
import { prisma } from "./prisma";
import { requireUser } from "./authz";
import { APP_MODULES, type AppModule } from "~/lib/appModules";

export async function isCompanyModuleActive(companyId: number, module: AppModule): Promise<boolean> {
  const row = await prisma.companyModule.findUnique({
    where: { companyId_module: { companyId, module } },
    select: { active: true },
  });
  return row?.active === true;
}

/** Gates 1 + 2: module active for the company, and (non-OWNER) user linked to it. */
export async function canUseAppModule(user: User, module: AppModule): Promise<boolean> {
  if (!(await isCompanyModuleActive(user.companyId, module))) return false;
  if (user.role === "OWNER") return true;

  const link = await prisma.userModule.findUnique({
    where: { userId_module: { userId: user.id, module } },
    select: { id: true },
  });
  return link !== null;
}

/** App modules the current user can open (drives the sidebar and route guard). */
export async function listUsableAppModules(user: User): Promise<AppModule[]> {
  const active = await prisma.companyModule.findMany({
    where: { companyId: user.companyId, active: true },
    select: { module: true },
  });
  const activeSet = new Set(active.map((r) => r.module));

  let linked: Set<string>;
  if (user.role === "OWNER") {
    linked = new Set(APP_MODULES);
  } else {
    const links = await prisma.userModule.findMany({ where: { userId: user.id }, select: { module: true } });
    linked = new Set(links.map((l) => l.module));
  }

  return APP_MODULES.filter((m) => activeSet.has(m) && linked.has(m));
}

export async function requireAppModule(event: H3Event, module: AppModule): Promise<User> {
  const user = await requireUser(event);
  if (!(await canUseAppModule(user, module))) {
    throw createError({ statusCode: 403, statusMessage: "Module non disponible pour ce compte" });
  }
  return user;
}

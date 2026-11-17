import { prisma } from "~/server/utils/prisma";
import { requireRole } from "~/server/utils/authz";
import { APP_MODULES, APP_MODULE_LABELS } from "~/lib/appModules";

// Direction-only: state of every optional module for the company, plus how
// many users are linked to each (shown next to the on/off switch).
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, ["OWNER"]);

  const rows = await prisma.companyModule.findMany({ where: { companyId: user.companyId } });
  const links = await prisma.userModule.groupBy({
    by: ["module"],
    where: { user: { companyId: user.companyId } },
    _count: { _all: true },
  });

  return APP_MODULES.map((module) => {
    const row = rows.find((r) => r.module === module);
    return {
      module,
      label: APP_MODULE_LABELS[module],
      active: row?.active ?? false,
      activatedAt: row?.activatedAt ?? null,
      userCount: links.find((l) => l.module === module)?._count._all ?? 0,
    };
  });
});

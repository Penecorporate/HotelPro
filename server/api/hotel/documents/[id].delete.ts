import { unlink } from "node:fs/promises";
import path from "node:path";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel-documents");
  const id = Number(getRouterParam(event, "id"));

  const doc = await prisma.hotelDocument.findFirst({ where: { id, companyId: user.companyId } });
  if (!doc) throw createError({ statusCode: 404, statusMessage: "Document introuvable" });

  await prisma.hotelDocument.delete({ where: { id } });
  if (doc.fileUrl) {
    const filename = path.basename(doc.fileUrl);
    await unlink(
      path.join(process.cwd(), "storage", "uploads", "hotel", String(user.companyId), filename)
    ).catch(() => {});
  }
  return { ok: true };
});

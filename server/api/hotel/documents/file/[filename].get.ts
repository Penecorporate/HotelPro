import { readFile } from "node:fs/promises";
import path from "node:path";
import { requireModuleAccess } from "~/server/utils/permissions";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel-documents");
  const filename = getRouterParam(event, "filename") ?? "";
  const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()];
  if (!contentType || filename.includes("/") || filename.includes("\\")) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  try {
    const data = await readFile(
      path.join(process.cwd(), "storage", "uploads", "hotel", String(user.companyId), filename)
    );
    setHeader(event, "Content-Type", contentType);
    setHeader(event, "Cache-Control", "private, max-age=3600");
    return data;
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
});

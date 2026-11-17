import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasModuleAccess } from "~/server/utils/permissions";
import { requireUser } from "~/server/utils/authz";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

// Files are private: readable by anyone who can open the hotel module
// (guest ID scans) or the hotel documents.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  if (!(await hasModuleAccess(user, "hotel-documents")) && !(await hasModuleAccess(user, "hotel"))) {
    throw createError({ statusCode: 403, statusMessage: "Accès refusé" });
  }
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

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireModuleAccess } from "~/server/utils/permissions";

const ALLOWED_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_SIZE = 5 * 1024 * 1024;

// File attached to a guest record (e.g. scan of the ID). Same private storage
// as hotel documents, but only needs the base "hotel" permission.
export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const parts = await readMultipartFormData(event);
  const file = parts?.find((p) => p.name === "file");
  if (!file || !file.data?.length) throw createError({ statusCode: 400, statusMessage: "Aucun fichier reçu" });

  const extension = ALLOWED_MIME[file.type || ""];
  if (!extension) {
    throw createError({ statusCode: 400, statusMessage: "Format non supporté (pdf, jpg, png ou webp)" });
  }
  if (file.data.length > MAX_SIZE) {
    throw createError({ statusCode: 400, statusMessage: "Fichier trop volumineux (5 Mo max)" });
  }

  const dir = path.join(process.cwd(), "storage", "uploads", "hotel", String(user.companyId));
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}${extension}`;
  await writeFile(path.join(dir, filename), file.data);

  return { url: `/api/hotel/documents/file/${filename}`, fileName: file.filename ?? filename };
});

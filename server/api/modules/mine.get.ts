import { requireUser } from "~/server/utils/authz";
import { listUsableAppModules } from "~/server/utils/appModules";

// Any authenticated user: the app modules (e.g. "hotel") they can actually
// open right now — active for the company AND linked to them. Used by the
// sidebar and middleware/auth.global.ts. Fine-grained rights inside the
// module are still checked per endpoint via requireModuleAccess.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  return { modules: await listUsableAppModules(user) };
});

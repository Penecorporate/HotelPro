import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

const opt = z.string().trim().nullable();
const schema = z
  .object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    phone: opt,
    email: z.string().trim().email().nullable().or(z.literal("")),
    nationality: opt,
    idType: opt,
    idNumber: opt,
    address: opt,
    notes: opt,
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));
  const data = await readValidatedBody(event, schema.parse);

  const guest = await prisma.hotelGuest.findFirst({ where: { id, companyId: user.companyId } });
  if (!guest) throw createError({ statusCode: 404, statusMessage: "Client introuvable" });

  if (data.email === "") data.email = null;
  return prisma.hotelGuest.update({ where: { id }, data });
});

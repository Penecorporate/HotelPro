import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";

const opt = z.string().trim().nullable().optional();
const schema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: opt,
  email: z.string().trim().email().nullable().optional().or(z.literal("")),
  nationality: opt,
  idType: opt,
  idNumber: opt,
  address: opt,
  notes: opt,
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const data = await readValidatedBody(event, schema.parse);
  return prisma.hotelGuest.create({ data: { ...data, email: data.email || null, companyId: user.companyId } });
});

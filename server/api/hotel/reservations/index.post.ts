import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { assertRoomFree, parseDay, syncRoomStatus } from "~/server/utils/hotelReservation";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z.object({
  roomId: z.number().int().positive(),
  guestId: z.number().int().positive(),
  checkIn: day,
  checkOut: day,
  adults: z.number().int().min(1).default(1),
  children: z.number().int().min(0).default(0),
  status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]).default("CONFIRMED"),
  totalPrice: z.number().min(0).nullable().optional(),
  paidAmount: z.number().min(0).default(0),
  notes: z.string().trim().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const body = await readValidatedBody(event, schema.parse);

  const checkIn = parseDay(body.checkIn);
  const checkOut = parseDay(body.checkOut);
  if (checkOut <= checkIn) {
    throw createError({ statusCode: 400, statusMessage: "La date de départ doit suivre la date d'arrivée" });
  }

  const [room, guest] = await Promise.all([
    prisma.hotelRoom.findFirst({ where: { id: body.roomId, companyId: user.companyId } }),
    prisma.hotelGuest.findFirst({ where: { id: body.guestId, companyId: user.companyId } }),
  ]);
  if (!room) throw createError({ statusCode: 404, statusMessage: "Chambre introuvable" });
  if (!guest) throw createError({ statusCode: 404, statusMessage: "Client introuvable" });
  if (body.adults + body.children > room.capacity) {
    throw createError({ statusCode: 400, statusMessage: `Capacité de la chambre dépassée (${room.capacity})` });
  }
  if (body.status !== "CANCELLED") await assertRoomFree(room.id, checkIn, checkOut);

  const nights = Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
  const totalPrice = body.totalPrice ?? nights * Number(room.pricePerNight);

  const created = await prisma.hotelReservation.create({
    data: {
      companyId: user.companyId,
      roomId: room.id,
      guestId: guest.id,
      checkIn,
      checkOut,
      adults: body.adults,
      children: body.children,
      status: body.status,
      totalPrice,
      paidAmount: body.paidAmount,
      notes: body.notes ?? null,
      createdById: user.id,
    },
  });
  await syncRoomStatus(room.id, body.status);
  return created;
});

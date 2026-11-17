import { z } from "zod";
import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { assertRoomFree, parseDay, syncRoomStatus } from "~/server/utils/hotelReservation";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const schema = z
  .object({
    roomId: z.number().int().positive(),
    guestId: z.number().int().positive(),
    checkIn: day,
    checkOut: day,
    adults: z.number().int().min(1),
    children: z.number().int().min(0),
    status: z.enum(["PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"]),
    totalPrice: z.number().min(0).nullable(),
    paidAmount: z.number().min(0),
    notes: z.string().trim().nullable(),
  })
  .partial();

export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const id = Number(getRouterParam(event, "id"));
  const body = await readValidatedBody(event, schema.parse);

  const current = await prisma.hotelReservation.findFirst({ where: { id, companyId: user.companyId } });
  if (!current) throw createError({ statusCode: 404, statusMessage: "Réservation introuvable" });

  const roomId = body.roomId ?? current.roomId;
  const checkIn = body.checkIn ? parseDay(body.checkIn) : current.checkIn;
  const checkOut = body.checkOut ? parseDay(body.checkOut) : current.checkOut;
  const status = body.status ?? current.status;
  if (checkOut <= checkIn) {
    throw createError({ statusCode: 400, statusMessage: "La date de départ doit suivre la date d'arrivée" });
  }

  const room = await prisma.hotelRoom.findFirst({ where: { id: roomId, companyId: user.companyId } });
  if (!room) throw createError({ statusCode: 404, statusMessage: "Chambre introuvable" });
  if (body.guestId) {
    const guest = await prisma.hotelGuest.findFirst({ where: { id: body.guestId, companyId: user.companyId } });
    if (!guest) throw createError({ statusCode: 404, statusMessage: "Client introuvable" });
  }
  if ((body.adults ?? current.adults) + (body.children ?? current.children) > room.capacity) {
    throw createError({ statusCode: 400, statusMessage: `Capacité de la chambre dépassée (${room.capacity})` });
  }
  if (status !== "CANCELLED") await assertRoomFree(roomId, checkIn, checkOut, id);

  const updated = await prisma.hotelReservation.update({
    where: { id },
    data: {
      ...body,
      roomId,
      checkIn,
      checkOut,
      status,
      // Blank total = recompute from the (possibly new) room price and dates.
      totalPrice:
        body.totalPrice ?? Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000) * Number(room.pricePerNight),
    },
  });
  if (body.status && body.status !== current.status) await syncRoomStatus(roomId, status);
  return updated;
});

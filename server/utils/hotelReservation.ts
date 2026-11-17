import { prisma } from "./prisma";

export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Throws 400 if the room already has a non-cancelled reservation overlapping [checkIn, checkOut). */
export async function assertRoomFree(roomId: number, checkIn: Date, checkOut: Date, excludeId?: number) {
  const clash = await prisma.hotelReservation.findFirst({
    where: {
      roomId,
      status: { not: "CANCELLED" },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  if (clash) {
    throw createError({ statusCode: 400, statusMessage: "Chambre déjà réservée sur cette période" });
  }
}

/** Keep the room status in step with check-in / check-out. */
export async function syncRoomStatus(roomId: number, status: string) {
  if (status === "CHECKED_IN") {
    await prisma.hotelRoom.update({ where: { id: roomId }, data: { status: "OCCUPIED" } });
  } else if (status === "CHECKED_OUT") {
    await prisma.hotelRoom.update({ where: { id: roomId }, data: { status: "CLEANING" } });
  }
}

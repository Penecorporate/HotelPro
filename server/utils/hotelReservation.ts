import { prisma } from "./prisma";

export function parseDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000);
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

/** Recompute HotelReservation.paidAmount from its payments. Returns the new paid total. */
export async function syncPaidAmount(reservationId: number): Promise<number> {
  const agg = await prisma.hotelPayment.aggregate({ where: { reservationId }, _sum: { amount: true } });
  const paid = Number(agg._sum.amount ?? 0);
  await prisma.hotelReservation.update({ where: { id: reservationId }, data: { paidAmount: paid } });
  return paid;
}

/** Stay amount + consumptions − payments for one reservation. */
export async function reservationBalance(reservationId: number) {
  const res = await prisma.hotelReservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { services: { select: { quantity: true, unitPrice: true } } },
  });
  const servicesTotal = res.services.reduce((s, x) => s + x.quantity * Number(x.unitPrice), 0);
  const total = Number(res.totalPrice) + servicesTotal;
  const paid = Number(res.paidAmount);
  return { stay: Number(res.totalPrice), servicesTotal, total, paid, balance: Math.max(0, total - paid) };
}

export type GuestTier = "NEW" | "REGULAR" | "VIP";

/** Loyalty: based on completed/ongoing stays and amount spent. */
export function guestTier(stays: number, spent: number): GuestTier {
  if (stays >= 5 || spent >= 500000) return "VIP";
  if (stays >= 2) return "REGULAR";
  return "NEW";
}

/** Per-guest loyalty stats for a set of guests (stays, spent, open incidents, tier). */
export async function guestStats(companyId: number, guestIds: number[]) {
  const [stays, spent, incidents] = await Promise.all([
    prisma.hotelReservation.groupBy({
      by: ["guestId"],
      where: { companyId, guestId: { in: guestIds }, status: { in: ["CHECKED_IN", "CHECKED_OUT"] } },
      _count: { _all: true },
    }),
    prisma.hotelReservation.groupBy({
      by: ["guestId"],
      where: { companyId, guestId: { in: guestIds }, status: { not: "CANCELLED" } },
      _sum: { paidAmount: true },
    }),
    prisma.hotelIncident.groupBy({
      by: ["guestId"],
      where: { companyId, guestId: { in: guestIds }, resolved: false },
      _count: { _all: true },
    }),
  ]);
  const map = new Map<number, { stays: number; spent: number; openIncidents: number; tier: GuestTier }>();
  for (const id of guestIds) map.set(id, { stays: 0, spent: 0, openIncidents: 0, tier: "NEW" });
  for (const s of stays) map.get(s.guestId)!.stays = s._count._all;
  for (const s of spent) map.get(s.guestId)!.spent = Number(s._sum.paidAmount ?? 0);
  for (const s of incidents) map.get(s.guestId)!.openIncidents = s._count._all;
  for (const v of map.values()) v.tier = guestTier(v.stays, v.spent);
  return map;
}

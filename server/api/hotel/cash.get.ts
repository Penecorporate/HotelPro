import { prisma } from "~/server/utils/prisma";
import { requireModuleAccess } from "~/server/utils/permissions";
import { parseDay } from "~/server/utils/hotelReservation";

// Hotel cash book: every payment received (IN) and every expense (OUT) between
// two dates, newest first, with totals overall and per payment method.
export default defineEventHandler(async (event) => {
  const user = await requireModuleAccess(event, "hotel");
  const q = getQuery(event);
  const dayRe = /^\d{4}-\d{2}-\d{2}$/;
  const from = typeof q.from === "string" && dayRe.test(q.from) ? parseDay(q.from) : undefined;
  const to = typeof q.to === "string" && dayRe.test(q.to) ? new Date(parseDay(q.to).getTime() + 86400000) : undefined;
  const method = ["CASH", "CARD", "WAVE", "ORANGE_MONEY"].includes(String(q.method)) ? (q.method as any) : undefined;

  const [payments, expenses] = await Promise.all([
    prisma.hotelPayment.findMany({
      where: {
        companyId: user.companyId,
        ...(method ? { method } : {}),
        ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
      },
      include: {
        reservation: {
          select: { id: true, guest: { select: { firstName: true, lastName: true } }, room: { select: { number: true } } },
        },
      },
    }),
    prisma.hotelExpense.findMany({
      where: {
        companyId: user.companyId,
        ...(method ? { method } : {}),
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lt: to } : {}) } } : {}),
      },
    }),
  ]);

  const transactions = [
    ...payments.map((p) => ({
      key: `P${p.id}`,
      type: "IN" as const,
      date: p.createdAt.toISOString(),
      label: `Encaissement — ${p.reservation.guest.lastName} ${p.reservation.guest.firstName} (ch. ${p.reservation.room.number})`,
      category: "Séjour",
      method: p.method,
      reference: p.reference,
      amount: Number(p.amount),
    })),
    ...expenses.map((e) => ({
      key: `E${e.id}`,
      type: "OUT" as const,
      date: e.date.toISOString(),
      label: e.description,
      category: e.category,
      method: e.method,
      reference: null,
      amount: Number(e.amount),
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const byMethod: Record<string, { in: number; out: number }> = {};
  let totalIn = 0;
  let totalOut = 0;
  for (const t of transactions) {
    const m = (byMethod[t.method] ??= { in: 0, out: 0 });
    if (t.type === "IN") {
      m.in += t.amount;
      totalIn += t.amount;
    } else {
      m.out += t.amount;
      totalOut += t.amount;
    }
  }
  return { transactions, totalIn, totalOut, balance: totalIn - totalOut, byMethod };
});

// Hotel demo data — Côte d'Ivoire (Abidjan & environs), amounts in FCFA.
// Idempotent: does nothing if the company already has hotel rooms.
// Run standalone:  npm run db:seed:hotel   (also called by prisma/seed.ts)
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

type Prisma = PrismaClient;
type Method = "CASH" | "CARD" | "WAVE" | "ORANGE_MONEY";

const day = (offset: number): Date => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() + offset * 86400000);
};
const at = (offset: number, hour = 10): Date => new Date(day(offset).getTime() + hour * 3600000);

const ROOMS = [
  { number: "101", type: "Standard", floor: 1, capacity: 2, price: 25000, description: "Lit double, ventilateur, TV, salle d'eau" },
  { number: "102", type: "Standard", floor: 1, capacity: 2, price: 25000, description: "Lit double, climatisation, Wi-Fi" },
  { number: "103", type: "Twin", floor: 1, capacity: 2, price: 30000, description: "Deux lits simples, climatisation" },
  { number: "201", type: "Double", floor: 2, capacity: 2, price: 35000, description: "Grand lit, climatisation, minibar, vue sur la lagune" },
  { number: "202", type: "Double", floor: 2, capacity: 3, price: 40000, description: "Grand lit + lit d'appoint, balcon" },
  { number: "203", type: "Familiale", floor: 2, capacity: 4, price: 55000, description: "Deux chambres communicantes, idéale en famille" },
  { number: "301", type: "Suite", floor: 3, capacity: 3, price: 75000, description: "Salon séparé, climatisation, baignoire" },
  { number: "302", type: "VIP", floor: 3, capacity: 2, price: 120000, description: "Suite présidentielle, terrasse, service en chambre 24h/24" },
];

// firstName, lastName, phone, email, nationality, idType, idNumber, address
const GUESTS = [
  ["Yao", "Kouassi", "+225 07 08 12 34 56", "yao.kouassi@gmail.com", "Ivoirienne", "Carte d'identité", "CI0012345678", "Cocody Angré, Abidjan"],
  ["Aminata", "Koné", "+225 05 44 21 09 87", "aminata.kone@yahoo.fr", "Ivoirienne", "Carte d'identité", "CI0098765432", "Marcory Zone 4, Abidjan"],
  ["Ibrahim", "Traoré", "+225 01 02 33 45 61", "ibrahim.traore@outlook.com", "Malienne", "Passeport", "ML17A04512", "Bamako, Mali"],
  ["Marie-Claire", "N'Guessan", "+225 07 59 30 11 22", "mc.nguessan@gmail.com", "Ivoirienne", "Carte d'identité", "CI0045671234", "Plateau, Abidjan"],
  ["Seydou", "Bamba", "+225 05 05 67 89 10", null, "Ivoirienne", "Carte d'identité", "CI0033221100", "Yopougon Niangon, Abidjan"],
  ["Fatoumata", "Ouattara", "+225 07 77 88 99 00", "fatou.ouattara@gmail.com", "Burkinabè", "Passeport", "BF08K77123", "Ouagadougou, Burkina Faso"],
  ["Jean-Marc", "Kouamé", "+225 01 40 50 60 70", "jm.kouame@sifca.ci", "Ivoirienne", "Carte d'identité", "CI0067894321", "Riviera Palmeraie, Abidjan"],
  ["Aïcha", "Diallo", "+225 05 11 22 33 44", "aicha.diallo@gmail.com", "Guinéenne", "Passeport", "GN22B11890", "Conakry, Guinée"],
  ["Désiré", "Aka Brou", "+225 07 20 30 40 50", null, "Ivoirienne", "Permis de conduire", "PC2019-004512", "Bouaké, Quartier Commerce"],
  ["Adjoua", "Tanoh", "+225 05 66 55 44 33", "adjoua.tanoh@gmail.com", "Ivoirienne", "Carte d'identité", "CI0054321098", "San-Pédro, Bardot"],
  ["Mamadou", "Coulibaly", "+225 01 23 45 67 89", "m.coulibaly@orange.ci", "Ivoirienne", "Carte d'identité", "CI0076543210", "Korhogo, Quartier Soba"],
  ["Philippe", "Martin", "+33 6 12 34 56 78", "p.martin@free.fr", "Française", "Passeport", "FR19AB45678", "Lyon, France"],
] as const;

// guest index, room number, checkIn offset, nights, status, rate override?, deposit, depositMethod, notes
const STAYS: [number, string, number, number, string, number | null, number, Method, string | null][] = [
  // Past stays (completed) — loyal / VIP clients accumulate several
  [0, "201", -120, 2, "CHECKED_OUT", null, 70000, "ORANGE_MONEY", "Séjour professionnel"],
  [0, "201", -75, 3, "CHECKED_OUT", null, 105000, "WAVE", null],
  [0, "202", -30, 2, "CHECKED_OUT", 38000, 76000, "CASH", "Tarif fidélité appliqué"],
  [6, "301", -100, 4, "CHECKED_OUT", null, 300000, "CARD", "Cadre SIFCA — facture entreprise"],
  [6, "302", -60, 2, "CHECKED_OUT", null, 240000, "CARD", null],
  [6, "301", -35, 3, "CHECKED_OUT", null, 225000, "CARD", null],
  [6, "302", -20, 2, "CHECKED_OUT", 110000, 220000, "CARD", "Remise VIP"],
  [6, "301", -10, 2, "CHECKED_OUT", null, 150000, "ORANGE_MONEY", null],
  [3, "102", -50, 2, "CHECKED_OUT", null, 50000, "CASH", null],
  [3, "103", -15, 3, "CHECKED_OUT", null, 90000, "WAVE", null],
  [1, "101", -40, 1, "CHECKED_OUT", null, 25000, "WAVE", null],
  [4, "101", -25, 2, "CHECKED_OUT", null, 50000, "CASH", "Départ tardif accordé"],
  [7, "203", -45, 3, "CHECKED_OUT", null, 165000, "CASH", null],
  [11, "202", -18, 4, "CHECKED_OUT", null, 160000, "CARD", "Voyage d'affaires depuis la France"],
  // Cancelled
  [8, "103", -12, 2, "CANCELLED", null, 0, "CASH", "Annulation — désistement du client"],
  // Currently in house
  [2, "102", -2, 4, "CHECKED_IN", null, 50000, "ORANGE_MONEY", "Commerçant en transit — dédouanement au Port d'Abidjan"],
  [5, "203", -1, 3, "CHECKED_IN", null, 100000, "WAVE", "Famille en visite à Abidjan"],
  [9, "103", 0, 2, "CHECKED_IN", null, 60000, "CASH", null],
  // Upcoming
  [1, "201", 0, 1, "CONFIRMED", null, 35000, "WAVE", "Arrivée prévue en fin d'après-midi"],
  [10, "202", 2, 3, "CONFIRMED", null, 40000, "ORANGE_MONEY", "Délégation du CHR de Korhogo"],
  [0, "302", 5, 2, "CONFIRMED", 105000, 100000, "CARD", "Anniversaire — décoration de la suite demandée"],
  [8, "101", 7, 2, "PENDING", null, 0, "CASH", "En attente de confirmation de l'acompte"],
  [3, "301", 12, 3, "CONFIRMED", null, 75000, "WAVE", null],
];

// stay index (0-based in STAYS), label, qty, unit price, day offset from check-in
const SERVICES: [number, string, number, number, number][] = [
  [15, "Petit-déjeuner continental", 4, 3500, 0],
  [15, "Blanchisserie (chemises)", 3, 1500, 1],
  [15, "Taxi aéroport FHB", 1, 15000, 0],
  [16, "Petit-déjeuner continental", 6, 3500, 0],
  [16, "Poulet braisé-attiéké (restaurant)", 4, 5500, 0],
  [16, "Jus de gingembre (gnamakoudji)", 4, 1000, 0],
  [17, "Eau minérale (minibar)", 2, 500, 0],
  [5, "Dîner — kedjenou de poulet", 2, 7500, 1],
  [5, "Blanchisserie express", 3, 2500, 1],
  [7, "Navette aéroport FHB", 1, 15000, 0],
  [3, "Salle de réunion (demi-journée)", 1, 45000, 1],
  [2, "Petit-déjeuner continental", 2, 3500, 0],
  [13, "Taxi Plateau – Aéroport", 1, 12000, 0],
  [13, "Dîner — poisson braisé", 2, 8000, 1],
  [12, "Petit-déjeuner continental", 6, 3500, 0],
];

// guest index, stay index (or null), severity, title, description, offset, resolved
const INCIDENTS: [number, number | null, "LOW" | "MEDIUM" | "HIGH", string, string | null, number, boolean][] = [
  [4, 11, "LOW", "Serviette de bain manquante", "Une serviette non restituée au départ — facturée 3 000 FCFA.", -23, true],
  [4, 11, "MEDIUM", "Nuisance sonore", "Plainte du voisin de chambre 102 : musique après 23h.", -24, true],
  [8, 14, "MEDIUM", "Annulation tardive", "Annulation la veille de l'arrivée sans prévenir ; acompte non versé.", -13, false],
  [2, 15, "HIGH", "Retard de paiement", "Solde non réglé à la date convenue, relance à effectuer avant le départ.", -1, false],
  [7, 12, "LOW", "Climatiseur endommagé", "Télécommande cassée dans la chambre 203, remplacée par la maintenance.", -43, true],
];

const EXPENSES: [number, string, string, number, Method][] = [
  [-28, "Électricité (CIE)", "Facture CIE — septembre", 385000, "ORANGE_MONEY"],
  [-27, "Eau (SODECI)", "Facture SODECI — septembre", 92000, "WAVE"],
  [-26, "Internet / Téléphone", "Abonnement fibre Orange Business", 75000, "ORANGE_MONEY"],
  [-25, "Salaires & primes", "Primes équipe ménage et réception", 250000, "CASH"],
  [-21, "Entretien & ménage", "Achat produits d'entretien et linge de lit", 128000, "CASH"],
  [-18, "Maintenance & réparations", "Réparation climatiseur chambre 203", 65000, "CASH"],
  [-14, "Restauration & approvisionnement", "Marché de Treichville — petit-déjeuner, fruits, attiéké", 54000, "CASH"],
  [-9, "Blanchisserie", "Prestataire blanchisserie — draps et nappes", 48000, "WAVE"],
  [-6, "Transport", "Carburant navette aéroport", 40000, "CASH"],
  [-3, "Maintenance & réparations", "Plomberie — fuite salle d'eau 101", 35000, "CASH"],
  [-2, "Marketing", "Publicité Facebook & Jumia Travel (commission)", 60000, "CARD"],
  [-1, "Restauration & approvisionnement", "Achat boissons minibar (Solibra, eau Awa)", 72000, "CASH"],
];

export async function seedHotel(prisma: Prisma, companyId: number, userId?: number): Promise<boolean> {
  if ((await prisma.hotelRoom.count({ where: { companyId } })) > 0) {
    console.log("Hôtel : des chambres existent déjà — seed démo ignoré.");
    return false;
  }

  const rooms = new Map<string, { id: number; price: number }>();
  for (const r of ROOMS) {
    const room = await prisma.hotelRoom.create({
      data: {
        companyId,
        number: r.number,
        type: r.type,
        floor: r.floor,
        capacity: r.capacity,
        pricePerNight: r.price,
        description: r.description,
        status: "AVAILABLE",
      },
    });
    rooms.set(r.number, { id: room.id, price: r.price });
  }

  const guestIds: number[] = [];
  for (const [firstName, lastName, phone, email, nationality, idType, idNumber, address] of GUESTS) {
    const g = await prisma.hotelGuest.create({
      data: { companyId, firstName, lastName, phone, email, nationality, idType, idNumber, address },
    });
    guestIds.push(g.id);
  }

  const reservationIds: number[] = [];
  for (const [gi, roomNo, offset, nights, status, rate, deposit, method, notes] of STAYS) {
    const room = rooms.get(roomNo)!;
    const nightlyRate = rate ?? room.price;
    const totalPrice = nightlyRate * nights;
    const res = await prisma.hotelReservation.create({
      data: {
        companyId,
        roomId: room.id,
        guestId: guestIds[gi],
        checkIn: day(offset),
        checkOut: day(offset + nights),
        adults: 1 + (nights % 2),
        children: roomNo === "203" ? 2 : 0,
        status: status as any,
        nightlyRate,
        totalPrice,
        notes,
        createdById: userId,
      },
    });
    reservationIds.push(res.id);

    if (deposit > 0) {
      await prisma.hotelPayment.create({
        data: {
          companyId,
          reservationId: res.id,
          amount: Math.min(deposit, totalPrice),
          method,
          reference: method === "WAVE" || method === "ORANGE_MONEY" ? `TX${100000 + res.id * 37}` : null,
          note: "Acompte à la réservation",
          createdById: userId,
          createdAt: at(offset - (status === "CHECKED_OUT" ? 3 : 0)),
        },
      });
    }
  }

  // Consumptions
  for (const [si, label, quantity, unitPrice, off] of SERVICES) {
    const stay = STAYS[si];
    await prisma.hotelService.create({
      data: {
        companyId,
        reservationId: reservationIds[si],
        guestId: guestIds[stay[0]],
        label,
        quantity,
        unitPrice,
        date: day(stay[2] + off),
      },
    });
  }

  // Settle the balance of completed stays (stay + consumptions), in a mix of methods
  const methods: Method[] = ["CASH", "WAVE", "ORANGE_MONEY", "CARD"];
  for (let i = 0; i < STAYS.length; i++) {
    const [, roomNo, offset, nights, status, rate, deposit] = STAYS[i];
    if (status !== "CHECKED_OUT") continue;
    const stayTotal = (rate ?? rooms.get(roomNo)!.price) * nights;
    const services = SERVICES.filter((s) => s[0] === i).reduce((s, x) => s + x[2] * x[3], 0);
    const balance = stayTotal + services - Math.min(deposit, stayTotal);
    if (balance > 0) {
      const method = methods[i % methods.length];
      await prisma.hotelPayment.create({
        data: {
          companyId,
          reservationId: reservationIds[i],
          amount: balance,
          method,
          reference: method === "WAVE" || method === "ORANGE_MONEY" ? `TX${200000 + i * 53}` : null,
          note: "Solde au départ",
          createdById: userId,
          createdAt: at(offset + nights, 11),
        },
      });
    }
  }
  // One in-house guest has already paid part of the balance
  await prisma.hotelPayment.create({
    data: {
      companyId,
      reservationId: reservationIds[16],
      amount: 60000,
      method: "ORANGE_MONEY",
      reference: "TX348821",
      note: "Complément pendant le séjour",
      createdById: userId,
      createdAt: at(0, 9),
    },
  });

  // Keep paidAmount in sync with payments and set room statuses
  for (const id of reservationIds) {
    const agg = await prisma.hotelPayment.aggregate({ where: { reservationId: id }, _sum: { amount: true } });
    await prisma.hotelReservation.update({ where: { id }, data: { paidAmount: agg._sum.amount ?? 0 } });
  }
  for (const [, roomNo, , , status] of STAYS) {
    if (status === "CHECKED_IN") {
      await prisma.hotelRoom.update({ where: { id: rooms.get(roomNo)!.id }, data: { status: "OCCUPIED" } });
    }
  }
  await prisma.hotelRoom.update({ where: { id: rooms.get("301")!.id }, data: { status: "CLEANING" } });
  await prisma.hotelRoom.update({ where: { id: rooms.get("302")!.id }, data: { status: "MAINTENANCE" } });

  for (const [gi, si, severity, title, description, off, resolved] of INCIDENTS) {
    await prisma.hotelIncident.create({
      data: {
        companyId,
        guestId: guestIds[gi],
        reservationId: si === null ? null : reservationIds[si],
        severity,
        title,
        description,
        date: day(off),
        resolved,
        createdById: userId,
      },
    });
  }

  for (const [off, category, description, amount, method] of EXPENSES) {
    await prisma.hotelExpense.create({
      data: { companyId, date: day(off), category, description, amount, method, createdById: userId },
    });
  }

  console.log(
    `Hôtel (Côte d'Ivoire) : ${ROOMS.length} chambres, ${GUESTS.length} clients, ${STAYS.length} réservations, ` +
      `${SERVICES.length} consommations, ${INCIDENTS.length} incidents, ${EXPENSES.length} dépenses.`
  );
  return true;
}

// Standalone execution: `tsx prisma/seed-hotel.ts`
if (process.argv[1]?.endsWith("seed-hotel.ts")) {
  const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });
  (async () => {
    const company = await prisma.company.findFirst({ orderBy: { id: "asc" } });
    if (!company) throw new Error("Aucune entreprise : lancez d'abord `npm run db:seed`.");
    const owner = await prisma.user.findFirst({ where: { companyId: company.id, role: "OWNER" } });
    await seedHotel(prisma, company.id, owner?.id);
  })()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

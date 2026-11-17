<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { escapeHtml, fmtDate, PAYMENT_METHODS, RESERVATION_STATUS, statusBadge, todayIso } from "~/lib/hotel";
import type { HotelField, HotelRowAction } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const { data: rooms } = await useFetch<any[]>("/api/hotel/rooms");
const { data: guests } = await useFetch<any[]>("/api/hotel/guests");
const { data: company } = await useFetch<any>("/api/company");
const currency = computed(() => company.value?.currency ?? "FCFA");

const help = [
  "Cliquez sur « + Ajouter » pour créer une réservation : choisissez le client et la chambre.",
  "Le tarif par nuit se remplit tout seul avec le prix de la chambre ; vous pouvez le modifier (remise, tarif négocié).",
  "Le montant du séjour se calcule automatiquement (nuits × tarif) et reste modifiable.",
  "Vous pouvez encaisser un acompte dès la création, avec le mode de paiement (Espèces, Wave, Orange Money, Carte).",
  "Le bouton portefeuille d'une ligne ouvre l'encaissement ; le bouton dossier ouvre la fiche du client.",
  "« En séjour » met la chambre en Occupée ; « Terminée » la met en Nettoyage.",
];

function nights(form: Record<string, any>): number {
  if (!form.checkIn || !form.checkOut) return 0;
  const n = Math.round((Date.parse(form.checkOut) - Date.parse(form.checkIn)) / 86400000);
  return n > 0 ? n : 0;
}

const fields = computed<HotelField[]>(() => [
  {
    key: "guestId",
    label: "Client",
    type: "select",
    required: true,
    options: [
      { value: null, label: "— Choisir un client —" },
      ...(guests.value ?? []).map((g) => ({ value: g.id, label: `${g.lastName} ${g.firstName}` })),
    ],
  },
  {
    key: "roomId",
    label: "Chambre",
    type: "select",
    required: true,
    options: [
      { value: null, label: "— Choisir une chambre —" },
      ...(rooms.value ?? []).map((r) => ({
        value: r.id,
        label: `${r.number} — ${r.type} (${r.capacity} pers.) — ${formatAmount(r.pricePerNight)} ${currency.value}`,
      })),
    ],
  },
  {
    key: "status",
    label: "Statut",
    type: "select",
    required: true,
    options: Object.entries(RESERVATION_STATUS).map(([value, s]) => ({ value, label: s.label })),
  },
  { key: "checkIn", label: "Arrivée", type: "date", required: true },
  { key: "checkOut", label: "Départ", type: "date", required: true },
  { key: "_nights", label: "Durée", type: "static", compute: (f) => `${nights(f)} nuit(s)` },
  { key: "adults", label: "Adultes", type: "number", required: true, min: 1, step: 1 },
  { key: "children", label: "Enfants", type: "number", required: true, min: 0, step: 1 },
  {
    key: "nightlyRate",
    label: `Tarif par nuit (${currency.value})`,
    type: "number",
    min: 0,
    step: 1,
    hint: "Rempli avec le prix de la chambre — modifiable.",
  },
  {
    key: "totalPrice",
    label: `Montant du séjour (${currency.value})`,
    type: "number",
    min: 0,
    step: 1,
    hint: "Nuits × tarif — modifiable. Vide = recalcul automatique.",
  },
  {
    key: "deposit",
    label: `Acompte encaissé (${currency.value})`,
    type: "number",
    min: 0,
    step: 1,
    createOnly: true,
    hint: "Optionnel. Le solde s'encaisse ensuite depuis « Encaissement ».",
  },
  {
    key: "depositMethod",
    label: "Mode de paiement de l'acompte",
    type: "select",
    createOnly: true,
    options: Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label })),
  },
  { key: "notes", label: "Notes", type: "textarea" },
]);

function autofill(form: Record<string, any>, key: string) {
  if (key === "roomId") {
    const r = (rooms.value ?? []).find((x) => x.id === form.roomId);
    if (r) form.nightlyRate = Number(r.pricePerNight);
  }
  if (key === "checkIn" && form.checkIn && (!form.checkOut || form.checkOut <= form.checkIn)) {
    form.checkOut = new Date(Date.parse(form.checkIn) + 86400000).toISOString().slice(0, 10);
  }
  if (["roomId", "nightlyRate", "checkIn", "checkOut"].includes(key)) {
    const n = nights(form);
    if (n > 0 && form.nightlyRate !== "" && form.nightlyRate !== null) form.totalPrice = n * Number(form.nightlyRate);
  }
}

const rowActions: HotelRowAction[] = [
  {
    icon: "fa-wallet",
    title: "Encaisser",
    cls: "text-success bg-successlight hover:bg-success hover:text-white",
    show: (r) => r.status !== "CANCELLED" && Number(r.balance) > 0,
    onClick: (r) => navigateTo(`/hotel/encaissement?reservation=${r.id}`),
  },
  {
    icon: "fa-folder-open",
    title: "Dossier du client",
    cls: "text-body bg-light hover:bg-body hover:text-white",
    onClick: (r) => navigateTo(`/hotel/clients/${r.guest.id}`),
  },
];

const money = (v: any, t: string) => (t === "display" ? formatAmount(v) : Number(v));
const columns = [
  {
    data: null,
    render: (_d: any, t: string, row: any) => {
      const n = `${row.guest.lastName} ${row.guest.firstName}`;
      return t === "display" ? escapeHtml(n) : n;
    },
  },
  { data: "room.number", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "checkIn", render: (v: string, t: string) => (t === "display" ? fmtDate(v) : v) },
  { data: "checkOut", className: "max-sm:hidden", render: (v: string, t: string) => (t === "display" ? fmtDate(v) : v) },
  { data: "status", render: (v: string, t: string) => (t === "display" ? statusBadge(RESERVATION_STATUS, v) : v) },
  { data: "grandTotal", className: "max-md:hidden", render: money },
  { data: "paidAmount", className: "max-lg:hidden", render: money },
  {
    data: "balance",
    render: (v: any, t: string) =>
      t === "display"
        ? Number(v) > 0
          ? `<span class="font-semibold text-warning">${formatAmount(v)}</span>`
          : `<span class="text-success"><i class="fa fa-check mr-1"></i>Soldé</span>`
        : Number(v),
  },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Réservations" name="Hôtel" :help="help" help-title="Réservations" />
    <HotelCrud
      title="Réservations"
      singular="réservation"
      feminine
      size="xl"
      endpoint="/api/hotel/reservations"
      table-id="hotelReservationsTable"
      :fields="fields"
      :columns="columns"
      :headers="['Client', 'Chambre', 'Arrivée', 'Départ', 'Statut', `Total (${currency})`, 'Encaissé', 'Reste']"
      :defaults="() => ({ adults: 1, children: 0, status: 'CONFIRMED', checkIn: todayIso(), checkOut: todayIso(1), deposit: '', depositMethod: 'CASH', nightlyRate: '', totalPrice: '' })"
      :autofill="autofill"
      :row-actions="rowActions"
      :order="[2, 'desc']"
      @changed="() => refreshNuxtData()"
    />
  </div>
</template>

<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { escapeHtml, RESERVATION_STATUS, statusBadge } from "~/lib/hotel";
import type { HotelField } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const { data: rooms } = await useFetch<any[]>("/api/hotel/rooms");
const { data: guests } = await useFetch<any[]>("/api/hotel/guests");

const fields = computed<HotelField[]>(() => [
  {
    key: "guestId",
    label: "Client",
    type: "select",
    required: true,
    options: (guests.value ?? []).map((g) => ({ value: g.id, label: `${g.lastName} ${g.firstName}` })),
  },
  {
    key: "roomId",
    label: "Chambre",
    type: "select",
    required: true,
    options: (rooms.value ?? []).map((r) => ({
      value: r.id,
      label: `${r.number} — ${r.type} (${r.capacity} pers.)`,
    })),
  },
  { key: "checkIn", label: "Arrivée", type: "date", required: true },
  { key: "checkOut", label: "Départ", type: "date", required: true },
  { key: "adults", label: "Adultes", type: "number", required: true, min: 1, step: 1 },
  { key: "children", label: "Enfants", type: "number", required: true, min: 0, step: 1 },
  {
    key: "status",
    label: "Statut",
    type: "select",
    required: true,
    options: Object.entries(RESERVATION_STATUS).map(([value, s]) => ({ value, label: s.label })),
  },
  { key: "totalPrice", label: "Total (vide = calcul auto)", type: "number", min: 0, step: 0.01 },
  { key: "paidAmount", label: "Montant payé", type: "number", required: true, min: 0, step: 0.01 },
  { key: "notes", label: "Notes", type: "textarea" },
]);

const day = (v: string, t: string) => (t === "display" ? String(v).slice(0, 10).split("-").reverse().join("/") : v);
const columns = [
  {
    data: null,
    render: (_d: any, t: string, row: any) => {
      const n = `${row.guest.lastName} ${row.guest.firstName}`;
      return t === "display" ? escapeHtml(n) : n;
    },
  },
  { data: "room.number", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "checkIn", render: day },
  { data: "checkOut", className: "max-sm:hidden", render: day },
  { data: "status", render: (v: string, t: string) => (t === "display" ? statusBadge(RESERVATION_STATUS, v) : v) },
  {
    data: "totalPrice",
    className: "max-md:hidden",
    render: (v: any, t: string, row: any) =>
      t === "display" ? `${formatAmount(row.paidAmount)} / ${formatAmount(v)}` : Number(v),
  },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Réservations" name="Hôtel" />
    <HotelCrud
      title="Réservations"
      singular="réservation"
      feminine
      endpoint="/api/hotel/reservations"
      table-id="hotelReservationsTable"
      :fields="fields"
      :columns="columns"
      :headers="['Client', 'Chambre', 'Arrivée', 'Départ', 'Statut', 'Payé / Total']"
      :defaults="() => ({ adults: 1, children: 0, paidAmount: 0, status: 'CONFIRMED' })"
      @changed="() => refreshNuxtData('/api/hotel/rooms')"
    />
  </div>
</template>

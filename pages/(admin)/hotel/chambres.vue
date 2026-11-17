<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { escapeHtml, ROOM_STATUS, ROOM_TYPES, statusBadge, toOptions } from "~/lib/hotel";
import type { HotelField } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const fields: HotelField[] = [
  { key: "number", label: "Numéro", required: true },
  { key: "type", label: "Type", type: "select", required: true, options: toOptions(ROOM_TYPES) },
  { key: "floor", label: "Étage", type: "number", step: 1 },
  { key: "capacity", label: "Capacité (personnes)", type: "number", required: true, min: 1, step: 1 },
  { key: "pricePerNight", label: "Prix par nuit", type: "number", required: true, min: 0, step: 0.01 },
  {
    key: "status",
    label: "Statut",
    type: "select",
    required: true,
    options: Object.entries(ROOM_STATUS).map(([value, s]) => ({ value, label: s.label })),
  },
  { key: "description", label: "Description", type: "textarea" },
];

const columns = [
  { data: "number", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "type", className: "max-sm:hidden", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "floor", className: "max-sm:hidden", defaultContent: "—" },
  { data: "capacity", className: "max-sm:hidden" },
  { data: "pricePerNight", render: (v: any, t: string) => (t === "display" ? formatAmount(v) : Number(v)) },
  { data: "status", render: (v: string, t: string) => (t === "display" ? statusBadge(ROOM_STATUS, v) : v) },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Chambres" name="Hôtel" />
    <HotelCrud
      title="Chambres"
      singular="chambre"
      feminine
      endpoint="/api/hotel/rooms"
      table-id="hotelRoomsTable"
      :fields="fields"
      :columns="columns"
      :headers="['Numéro', 'Type', 'Étage', 'Capacité', 'Prix / nuit', 'Statut']"
      :defaults="() => ({ type: 'Standard', capacity: 2, pricePerNight: 0, status: 'AVAILABLE' })"
    />
  </div>
</template>

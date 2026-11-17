<script lang="ts" setup>
import { DOCUMENT_TYPES, escapeHtml, toOptions } from "~/lib/hotel";
import type { HotelField } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const { data: guests } = await useFetch<any[]>("/api/hotel/guests");
const { data: reservations } = await useFetch<any[]>("/api/hotel/reservations");

const fields = computed<HotelField[]>(() => [
  { key: "title", label: "Titre", required: true },
  { key: "type", label: "Type", type: "select", required: true, options: toOptions(DOCUMENT_TYPES) },
  {
    key: "guestId",
    label: "Client",
    type: "select",
    options: [
      { value: null, label: "—" },
      ...(guests.value ?? []).map((g) => ({ value: g.id, label: `${g.lastName} ${g.firstName}` })),
    ],
  },
  {
    key: "reservationId",
    label: "Réservation",
    type: "select",
    options: [
      { value: null, label: "—" },
      ...(reservations.value ?? []).map((r) => ({
        value: r.id,
        label: `#${r.id} — ${r.guest.lastName} (ch. ${r.room.number}, ${String(r.checkIn).slice(0, 10)})`,
      })),
    ],
  },
  {
    key: "fileUrl",
    label: "Fichier (pdf, jpg, png, webp — 5 Mo max)",
    type: "file",
    upload: "/api/hotel/documents/upload",
    fileNameKey: "fileName",
    full: true,
  },
  { key: "notes", label: "Notes", type: "textarea" },
]);

const text = (v: any, t: string) => (t === "display" ? escapeHtml(v ?? "—") : (v ?? ""));
const columns = [
  { data: "title", render: text },
  { data: "type", className: "max-sm:hidden", render: text },
  {
    data: null,
    className: "max-sm:hidden",
    render: (_d: any, t: string, row: any) => {
      const n = row.guest ? `${row.guest.lastName} ${row.guest.firstName}` : "—";
      return t === "display" ? escapeHtml(n) : n;
    },
  },
  {
    data: "fileUrl",
    orderable: false,
    render: (v: string | null, t: string) =>
      t === "display"
        ? v
          ? `<a href="${escapeHtml(v)}" target="_blank" class="text-primary"><i class="fa fa-paperclip mr-1"></i>Ouvrir</a>`
          : "—"
        : (v ?? ""),
  },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Documents" name="Hôtel" />
    <HotelCrud
      title="Documents"
      singular="document"
      endpoint="/api/hotel/documents"
      table-id="hotelDocumentsTable"
      :fields="fields"
      :columns="columns"
      :headers="['Titre', 'Type', 'Client', 'Fichier']"
      :defaults="() => ({ type: 'Autre' })"
    />
  </div>
</template>

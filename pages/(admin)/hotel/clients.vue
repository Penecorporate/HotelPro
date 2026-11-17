<script lang="ts" setup>
import { escapeHtml, ID_TYPES, toOptions } from "~/lib/hotel";
import type { HotelField } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const fields: HotelField[] = [
  { key: "lastName", label: "Nom", required: true },
  { key: "firstName", label: "Prénom", required: true },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "Email", type: "text" },
  { key: "nationality", label: "Nationalité" },
  { key: "idType", label: "Type de pièce", type: "select", options: [{ value: null, label: "—" }, ...toOptions(ID_TYPES)] },
  { key: "idNumber", label: "N° de pièce" },
  { key: "address", label: "Adresse" },
  { key: "notes", label: "Notes", type: "textarea" },
];

const text = (v: any, t: string) => (t === "display" ? escapeHtml(v ?? "—") : (v ?? ""));
const columns = [
  { data: "lastName", render: text },
  { data: "firstName", render: text },
  { data: "phone", className: "max-sm:hidden", render: text },
  { data: "email", className: "max-md:hidden", render: text },
  { data: "nationality", className: "max-md:hidden", render: text },
  { data: "_count.reservations", defaultContent: 0, className: "max-sm:hidden" },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Clients" name="Hôtel" />
    <HotelCrud
      title="Clients"
      singular="client"
      endpoint="/api/hotel/guests"
      table-id="hotelGuestsTable"
      :fields="fields"
      :columns="columns"
      :headers="['Nom', 'Prénom', 'Téléphone', 'Email', 'Nationalité', 'Séjours']"
    />
  </div>
</template>

<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { escapeHtml, ID_TYPES, tierBadge, toOptions } from "~/lib/hotel";
import type { HotelField, HotelRowAction } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const help = [
  "Chaque client a une fiche (dossier) : cliquez sur l'icône dossier d'une ligne pour l'ouvrir.",
  "Le dossier regroupe les séjours, les consommations, les incidents, les paiements et les documents du client.",
  "Le badge de fidélité est automatique : Nouveau, Fidèle (2 séjours ou plus), VIP (5 séjours ou 500 000 FCFA dépensés).",
  "Vous pouvez joindre dès maintenant le scan de la pièce d'identité (pdf, jpg, png ; 5 Mo max).",
  "Un client avec des incidents non résolus est signalé par une alerte rouge.",
];

const fields: HotelField[] = [
  { key: "lastName", label: "Nom", required: true },
  { key: "firstName", label: "Prénom", required: true },
  { key: "nationality", label: "Nationalité" },
  { key: "phone", label: "Téléphone", hint: "Ex. +225 07 00 00 00 00" },
  { key: "email", label: "Email", type: "text" },
  { key: "address", label: "Adresse / Ville" },
  { key: "idType", label: "Type de pièce", type: "select", options: [{ value: null, label: "—" }, ...toOptions(ID_TYPES)] },
  { key: "idNumber", label: "N° de pièce" },
  {
    key: "idFileUrl",
    label: "Pièce jointe (scan pièce d'identité)",
    type: "file",
    upload: "/api/hotel/guests/upload",
    fileNameKey: "idFileName",
  },
  { key: "notes", label: "Notes / préférences", type: "textarea" },
];

const rowActions: HotelRowAction[] = [
  {
    icon: "fa-folder-open",
    title: "Ouvrir le dossier",
    cls: "text-success bg-successlight hover:bg-success hover:text-white",
    onClick: (r) => navigateTo(`/hotel/clients/${r.id}`),
  },
];

const text = (v: any, t: string) => (t === "display" ? escapeHtml(v ?? "—") : (v ?? ""));
const columns = [
  {
    data: "lastName",
    render: (v: string, t: string, row: any) =>
      t === "display"
        ? `${escapeHtml(v)} ${escapeHtml(row.firstName)}${
            row.openIncidents > 0
              ? ` <span class="ml-1 rounded-full bg-dangerlight px-2 py-0.5 text-2xs font-semibold text-danger" title="Incidents non résolus"><i class="fa fa-triangle-exclamation mr-1"></i>${row.openIncidents}</span>`
              : ""
          }`
        : `${v} ${row.firstName}`,
  },
  { data: "phone", className: "max-sm:hidden", render: text },
  { data: "nationality", className: "max-md:hidden", render: text },
  { data: "tier", render: (v: string, t: string) => (t === "display" ? tierBadge(v) : v) },
  { data: "stays", className: "max-sm:hidden", defaultContent: 0 },
  { data: "spent", className: "max-md:hidden", render: (v: any, t: string) => (t === "display" ? formatAmount(v) : Number(v)) },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Clients" name="Hôtel" :help="help" help-title="Clients" />
    <HotelCrud
      title="Clients"
      singular="client"
      size="xl"
      endpoint="/api/hotel/guests"
      table-id="hotelGuestsTable"
      :fields="fields"
      :columns="columns"
      :headers="['Client', 'Téléphone', 'Nationalité', 'Fidélité', 'Séjours', 'Total payé']"
      :row-actions="rowActions"
    />
  </div>
</template>

<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { EXPENSE_CATEGORIES, escapeHtml, fmtDate, PAYMENT_METHODS, todayIso, toOptions } from "~/lib/hotel";
import type { HotelField } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const { data: company } = await useFetch<any>("/api/company");
const currency = computed(() => company.value?.currency ?? "FCFA");

const help = [
  "Enregistrez ici toutes les dépenses de l'hôtel : électricité (CIE), eau (SODECI), internet, salaires, entretien, maintenance…",
  "Choisissez la catégorie et le mode de paiement utilisé : la dépense est automatiquement reportée en sortie dans la Caisse.",
  "Utilisez la barre de recherche du tableau pour retrouver une dépense par libellé ou catégorie.",
  "Une dépense saisie par erreur peut être modifiée ou supprimée avec les boutons de la ligne.",
];

const fields = computed<HotelField[]>(() => [
  { key: "date", label: "Date", type: "date", required: true },
  { key: "category", label: "Catégorie", type: "select", required: true, options: toOptions(EXPENSE_CATEGORIES) },
  { key: "amount", label: `Montant (${currency.value})`, type: "number", required: true, min: 1, step: 1 },
  { key: "description", label: "Libellé", required: true, span: 2, hint: "Ex. Facture CIE octobre, Achat produits d'entretien" },
  {
    key: "method",
    label: "Payé avec",
    type: "select",
    required: true,
    options: Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label })),
  },
]);

const columns = [
  { data: "date", render: (v: string, t: string) => (t === "display" ? fmtDate(v) : v) },
  { data: "category", className: "max-sm:hidden", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "description", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "method", className: "max-md:hidden", render: (v: string, t: string) => (t === "display" ? PAYMENT_METHODS[v] : v) },
  { data: "amount", render: (v: any, t: string) => (t === "display" ? `<span class="font-semibold text-danger">${formatAmount(v)}</span>` : Number(v)) },
];
</script>

<template>
  <div class="content-body">
    <CommonNav title="Dépenses" name="Hôtel" :help="help" help-title="Dépenses de l'hôtel" />
    <HotelCrud
      title="Dépenses de l'hôtel"
      singular="dépense"
      feminine
      size="xl"
      endpoint="/api/hotel/expenses"
      table-id="hotelExpensesTable"
      :fields="fields"
      :columns="columns"
      :headers="['Date', 'Catégorie', 'Libellé', 'Mode', `Montant (${currency})`]"
      :defaults="() => ({ date: todayIso(), method: 'CASH', category: 'Autre' })"
      :order="[0, 'desc']"
    />
  </div>
</template>

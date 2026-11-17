<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { fmtDate, PAYMENT_METHODS, todayIso } from "~/lib/hotel";

definePageMeta({ layout: "home" });

const help = [
  "La caisse de l'hôtel garde l'historique de toutes les transactions : entrées (encaissements des clients) et sorties (dépenses).",
  "Filtrez par période et par mode de paiement pour voir le total des entrées, des sorties et le solde.",
  "Le détail par mode de paiement permet de rapprocher votre caisse espèces, Wave, Orange Money et carte.",
  "Pour encaisser un client, allez dans « Encaissement » ; pour enregistrer une sortie d'argent, allez dans « Dépenses ».",
];

const from = ref(todayIso(-29));
const to = ref(todayIso());
const method = ref("");

const { data, refresh, pending } = await useFetch<any>("/api/hotel/cash", {
  query: computed(() => ({ from: from.value, to: to.value, method: method.value || undefined })),
});
const { data: company } = await useFetch<any>("/api/company");
const currency = computed(() => company.value?.currency ?? "FCFA");

const type = ref<"" | "IN" | "OUT">("");
const rows = computed(() => (data.value?.transactions ?? []).filter((t: any) => !type.value || t.type === type.value));

function setRange(days: number) {
  to.value = todayIso();
  from.value = todayIso(-days);
}
</script>

<template>
  <div class="content-body">
    <CommonNav title="Caisse" name="Hôtel" :help="help" help-title="Caisse de l'hôtel" />
    <div class="container">
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="card !h-auto p-5"><p class="text-body text-sm"><i class="fa fa-arrow-down mr-1 text-success"></i>Entrées</p><p class="text-xl font-bold text-success">{{ formatAmount(data?.totalIn ?? 0) }} {{ currency }}</p></div>
        <div class="card !h-auto p-5"><p class="text-body text-sm"><i class="fa fa-arrow-up mr-1 text-danger"></i>Sorties (dépenses)</p><p class="text-xl font-bold text-danger">{{ formatAmount(data?.totalOut ?? 0) }} {{ currency }}</p></div>
        <div class="card !h-auto p-5"><p class="text-body text-sm"><i class="fa fa-scale-balanced mr-1"></i>Solde</p><p class="text-xl font-bold" :class="(data?.balance ?? 0) >= 0 ? 'text-primary' : 'text-danger'">{{ formatAmount(data?.balance ?? 0) }} {{ currency }}</p></div>
      </div>

      <div class="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="(label, key) in PAYMENT_METHODS" :key="key" class="card !h-auto p-4">
          <p class="mb-1 font-semibold">{{ label }}</p>
          <p class="text-2xs text-body">Entrées : <span class="font-semibold text-success">{{ formatAmount(data?.byMethod?.[key]?.in ?? 0) }}</span></p>
          <p class="text-2xs text-body">Sorties : <span class="font-semibold text-danger">{{ formatAmount(data?.byMethod?.[key]?.out ?? 0) }}</span></p>
        </div>
      </div>

      <div class="card !h-auto">
        <div class="flex flex-wrap items-end gap-3 border-b border-border py-4 px-5">
          <h4 class="mr-auto text-base">Historique des transactions</h4>
          <div class="flex gap-1.5">
            <button type="button" class="btn btn-sm border border-border" @click="setRange(0)">Aujourd'hui</button>
            <button type="button" class="btn btn-sm border border-border" @click="setRange(6)">7 jours</button>
            <button type="button" class="btn btn-sm border border-border" @click="setRange(29)">30 jours</button>
          </div>
          <div><label class="mb-1 block text-2xs text-body">Du</label><input v-model="from" type="date" class="h-10 rounded-lg border border-border bg-transparent px-3" /></div>
          <div><label class="mb-1 block text-2xs text-body">Au</label><input v-model="to" type="date" class="h-10 rounded-lg border border-border bg-transparent px-3" /></div>
          <div>
            <label class="mb-1 block text-2xs text-body">Mode</label>
            <select v-model="method" class="h-10 rounded-lg border border-border bg-transparent px-3">
              <option value="">Tous</option>
              <option v-for="(label, key) in PAYMENT_METHODS" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 block text-2xs text-body">Type</label>
            <select v-model="type" class="h-10 rounded-lg border border-border bg-transparent px-3">
              <option value="">Tout</option>
              <option value="IN">Entrées</option>
              <option value="OUT">Sorties</option>
            </select>
          </div>
        </div>
        <div class="overflow-x-auto p-5" :class="pending ? 'opacity-50' : ''">
          <table class="w-full text-left text-2sm">
            <thead>
              <tr class="border-b border-border text-body">
                <th class="py-2">Date</th><th>Libellé</th><th class="max-md:hidden">Catégorie</th><th>Mode</th><th class="max-lg:hidden">Référence</th><th class="text-end">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!rows.length"><td colspan="6" class="py-4 text-body">Aucune transaction sur cette période.</td></tr>
              <tr v-for="t in rows" :key="t.key" class="border-b border-border last:border-0">
                <td class="py-2.5 whitespace-nowrap">{{ fmtDate(t.date) }}</td>
                <td>
                  <i class="fa mr-1.5" :class="t.type === 'IN' ? 'fa-arrow-down text-success' : 'fa-arrow-up text-danger'"></i>{{ t.label }}
                </td>
                <td class="max-md:hidden">{{ t.category }}</td>
                <td>{{ PAYMENT_METHODS[t.method] }}</td>
                <td class="max-lg:hidden">{{ t.reference || "—" }}</td>
                <td class="text-end font-semibold whitespace-nowrap" :class="t.type === 'IN' ? 'text-success' : 'text-danger'">
                  {{ t.type === "IN" ? "+" : "−" }} {{ formatAmount(t.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

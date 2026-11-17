<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import {
  DOCUMENT_TYPES,
  escapeHtml,
  fmtDate,
  GUEST_TIER,
  INCIDENT_SEVERITY,
  PAYMENT_METHODS,
  RESERVATION_STATUS,
  statusBadge,
  tierBadge,
  todayIso,
  toOptions,
} from "~/lib/hotel";
import type { HotelField } from "~/components/HotelCrud.vue";

definePageMeta({ layout: "home" });

const route = useRoute();
const guestId = Number(route.params.id);

const { data: guest, refresh } = await useFetch<any>(`/api/hotel/guests/${guestId}`);
if (!guest.value) throw createError({ statusCode: 404, statusMessage: "Client introuvable" });
const { data: payments, refresh: refreshPayments } = await useFetch<any[]>("/api/hotel/payments", { query: { guestId } });
const { error: docsError } = await useFetch("/api/hotel/documents", { query: { guestId } });
const { data: company } = await useFetch<any>("/api/company");
const currency = computed(() => company.value?.currency ?? "FCFA");

const help = [
  "Ce dossier regroupe tout l'historique du client : séjours, consommations, incidents, paiements et documents.",
  "Le badge de fidélité est calculé automatiquement d'après le nombre de séjours et le montant payé.",
  "Onglet Consommations : ajoutez minibar, blanchisserie, taxi, restaurant… ils s'ajoutent au solde de la réservation.",
  "Onglet Incidents : signalez un problème (dégât, retard de paiement, nuisance…) avec sa gravité ; marquez-le « Résolu » une fois réglé.",
  "Onglet Documents : joignez des fichiers (contrat, facture, pièce d'identité).",
  "Pour encaisser un solde, utilisez le bouton « Encaisser » d'un séjour.",
];

type Tab = "stays" | "services" | "incidents" | "payments" | "documents";
const tab = ref<Tab>("stays");
const tabs = computed(() =>
  [
    { key: "stays", label: "Séjours", icon: "fa-calendar-check", count: guest.value.reservations.length },
    { key: "services", label: "Consommations", icon: "fa-bell-concierge" },
    { key: "incidents", label: "Incidents", icon: "fa-triangle-exclamation", count: guest.value.openIncidents },
    { key: "payments", label: "Paiements", icon: "fa-wallet", count: payments.value?.length },
    ...(docsError.value ? [] : [{ key: "documents", label: "Documents", icon: "fa-folder" }]),
  ] as { key: Tab; label: string; icon: string; count?: number }[]
);

const reservationOptions = computed(() =>
  guest.value.reservations.map((r: any) => ({
    value: r.id,
    label: `#${r.id} — ch. ${r.room.number} (${fmtDate(r.checkIn)} → ${fmtDate(r.checkOut)})`,
  }))
);

const serviceFields = computed<HotelField[]>(() => [
  {
    key: "reservationId",
    label: "Séjour concerné",
    type: "select",
    required: true,
    options: [{ value: null, label: "— Choisir un séjour —" }, ...reservationOptions.value],
    span: 2,
  },
  { key: "label", label: "Service / consommation", required: true, hint: "Ex. Petit-déjeuner, Blanchisserie, Taxi aéroport, Jus de gingembre" },
  { key: "quantity", label: "Quantité", type: "number", required: true, min: 1, step: 1 },
  { key: "unitPrice", label: `Prix unitaire (${currency.value})`, type: "number", required: true, min: 0, step: 1 },
  { key: "date", label: "Date", type: "date", required: true },
]);
const serviceColumns = [
  { data: "date", render: (v: string, t: string) => (t === "display" ? fmtDate(v) : v) },
  { data: "label", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "quantity" },
  { data: "unitPrice", render: (v: any, t: string) => (t === "display" ? formatAmount(v) : Number(v)) },
  {
    data: null,
    render: (_d: any, t: string, r: any) => (t === "display" ? formatAmount(r.quantity * r.unitPrice) : r.quantity * r.unitPrice),
  },
  { data: "reservation.room.number", className: "max-sm:hidden", render: (v: string) => `Ch. ${v}` },
];

const incidentFields = computed<HotelField[]>(() => [
  { key: "title", label: "Incident", required: true, span: 2, hint: "Ex. Climatiseur endommagé, Retard de paiement, Nuisance sonore" },
  {
    key: "severity",
    label: "Gravité",
    type: "select",
    required: true,
    options: Object.entries(INCIDENT_SEVERITY).map(([value, s]) => ({ value, label: s.label })),
  },
  { key: "date", label: "Date", type: "date", required: true },
  {
    key: "reservationId",
    label: "Séjour concerné",
    type: "select",
    options: [{ value: null, label: "— Aucun —" }, ...reservationOptions.value],
  },
  {
    key: "resolved",
    label: "Statut",
    type: "select",
    required: true,
    options: [
      { value: false as any, label: "Ouvert (à suivre)" },
      { value: true as any, label: "Résolu" },
    ],
  },
  { key: "description", label: "Détails", type: "textarea" },
]);
const incidentColumns = [
  { data: "date", render: (v: string, t: string) => (t === "display" ? fmtDate(v) : v) },
  { data: "title", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "severity", render: (v: string, t: string) => (t === "display" ? statusBadge(INCIDENT_SEVERITY, v) : v) },
  {
    data: "resolved",
    render: (v: boolean, t: string) =>
      t === "display"
        ? v
          ? '<span class="text-success"><i class="fa fa-check mr-1"></i>Résolu</span>'
          : '<span class="font-semibold text-danger">Ouvert</span>'
        : v,
  },
];

const documentFields = computed<HotelField[]>(() => [
  { key: "title", label: "Titre", required: true },
  { key: "type", label: "Type", type: "select", required: true, options: toOptions(DOCUMENT_TYPES) },
  {
    key: "reservationId",
    label: "Séjour (optionnel)",
    type: "select",
    options: [{ value: null, label: "—" }, ...reservationOptions.value],
  },
  { key: "fileUrl", label: "Fichier (pdf, jpg, png, webp — 5 Mo max)", type: "file", upload: "/api/hotel/documents/upload", fileNameKey: "fileName", span: 3 },
  { key: "notes", label: "Notes", type: "textarea" },
]);
const documentColumns = [
  { data: "title", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "type", className: "max-sm:hidden", render: (v: string, t: string) => (t === "display" ? escapeHtml(v) : v) },
  { data: "createdAt", render: (v: string, t: string) => (t === "display" ? fmtDate(v) : v) },
  {
    data: "fileUrl",
    orderable: false,
    render: (v: string | null, t: string) =>
      t === "display" ? (v ? `<a href="${escapeHtml(v)}" target="_blank" class="text-primary"><i class="fa fa-paperclip mr-1"></i>Ouvrir</a>` : "—") : (v ?? ""),
  },
];

const tierInfo = computed(() => GUEST_TIER[guest.value.tier] ?? GUEST_TIER.NEW);
const nextTier = computed(() => {
  if (guest.value.tier === "VIP") return "Client VIP : le meilleur niveau de fidélité.";
  if (guest.value.tier === "REGULAR") return `Encore ${Math.max(0, 5 - guest.value.stays)} séjour(s) pour devenir VIP.`;
  return `Encore ${Math.max(0, 2 - guest.value.stays)} séjour(s) pour devenir client fidèle.`;
});

async function refreshAll() {
  await Promise.all([refresh(), refreshPayments()]);
}
</script>

<template>
  <div class="content-body">
    <CommonNav :title="`Dossier — ${guest.lastName} ${guest.firstName}`" name="Hôtel" :help="help" help-title="Dossier client" />
    <div class="container">
      <NuxtLink to="/hotel/clients" class="mb-4 inline-block text-primary"><i class="fa fa-arrow-left mr-1.5"></i>Retour aux clients</NuxtLink>

      <div
        v-if="guest.openIncidents > 0"
        class="mb-4 flex items-center gap-3 rounded-xl bg-dangerlight px-4 py-3 text-danger"
      >
        <i class="fa fa-triangle-exclamation text-lg"></i>
        <span class="font-semibold">{{ guest.openIncidents }} incident(s) non résolu(s) sur ce client.</span>
        <button type="button" class="ml-auto underline" @click="tab = 'incidents'">Voir</button>
      </div>

      <div class="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="card !h-auto p-5 lg:col-span-2">
          <div class="mb-3 flex flex-wrap items-center gap-3">
            <span class="flex size-14 items-center justify-center rounded-full bg-primarylight text-xl font-bold text-primary">
              {{ guest.firstName[0] }}{{ guest.lastName[0] }}
            </span>
            <div>
              <h4 class="text-lg font-bold">{{ guest.lastName }} {{ guest.firstName }}</h4>
              <span v-html="tierBadge(guest.tier)"></span>
              <span class="ml-2 text-2xs text-body">{{ nextTier }}</span>
            </div>
          </div>
          <dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-2sm sm:grid-cols-2">
            <div><dt class="text-2xs text-body">Téléphone</dt><dd>{{ guest.phone || "—" }}</dd></div>
            <div><dt class="text-2xs text-body">Email</dt><dd>{{ guest.email || "—" }}</dd></div>
            <div><dt class="text-2xs text-body">Nationalité</dt><dd>{{ guest.nationality || "—" }}</dd></div>
            <div><dt class="text-2xs text-body">Adresse</dt><dd>{{ guest.address || "—" }}</dd></div>
            <div><dt class="text-2xs text-body">Pièce d'identité</dt><dd>{{ guest.idType || "—" }} {{ guest.idNumber }}</dd></div>
            <div>
              <dt class="text-2xs text-body">Pièce jointe</dt>
              <dd>
                <a v-if="guest.idFileUrl" :href="guest.idFileUrl" target="_blank" class="text-primary">
                  <i class="fa fa-paperclip mr-1"></i>{{ guest.idFileName || "Ouvrir" }}
                </a>
                <span v-else>—</span>
              </dd>
            </div>
            <div class="sm:col-span-2"><dt class="text-2xs text-body">Notes</dt><dd>{{ guest.notes || "—" }}</dd></div>
          </dl>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="card !h-auto p-4"><p class="text-2xs text-body">Séjours</p><p class="text-xl font-bold">{{ guest.stays }}</p></div>
          <div class="card !h-auto p-4"><p class="text-2xs text-body">Total payé</p><p class="text-lg font-bold text-success">{{ formatAmount(guest.spent) }}</p></div>
          <div class="card !h-auto p-4"><p class="text-2xs text-body">Total facturé</p><p class="text-lg font-bold">{{ formatAmount(guest.totalBilled) }}</p></div>
          <div class="card !h-auto p-4"><p class="text-2xs text-body">Reste dû</p><p class="text-lg font-bold" :class="guest.totalDue > 0 ? 'text-warning' : 'text-success'">{{ formatAmount(guest.totalDue) }}</p></div>
        </div>
      </div>

      <div class="mb-4 flex flex-wrap gap-2">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          class="rounded-full px-4 py-2 text-2sm font-semibold"
          :class="tab === t.key ? 'bg-primary text-white' : 'bg-card text-body hover:bg-primarylight'"
          @click="tab = t.key"
        >
          <i class="fa mr-1.5" :class="t.icon"></i>{{ t.label }}
          <span v-if="t.count" class="ml-1 rounded-full bg-black/10 px-1.5 text-2xs">{{ t.count }}</span>
        </button>
      </div>

      <div v-show="tab === 'stays'" class="card !h-auto">
        <div class="overflow-x-auto p-5">
          <table class="w-full text-left text-2sm">
            <thead>
              <tr class="border-b border-border text-body">
                <th class="py-2">Chambre</th><th>Arrivée</th><th>Départ</th><th>Statut</th>
                <th class="text-end">Total</th><th class="text-end">Encaissé</th><th class="text-end">Reste</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!guest.reservations.length"><td colspan="8" class="py-4 text-body">Aucun séjour.</td></tr>
              <tr v-for="r in guest.reservations" :key="r.id" class="border-b border-border last:border-0">
                <td class="py-2">{{ r.room.number }} <span class="text-body">({{ r.room.type }})</span></td>
                <td>{{ fmtDate(r.checkIn) }}</td>
                <td>{{ fmtDate(r.checkOut) }}</td>
                <td><span v-html="statusBadge(RESERVATION_STATUS, r.status)"></span></td>
                <td class="text-end">{{ formatAmount(r.grandTotal) }}</td>
                <td class="text-end">{{ formatAmount(r.paidAmount) }}</td>
                <td class="text-end font-semibold" :class="r.balance > 0 ? 'text-warning' : 'text-success'">{{ formatAmount(r.balance) }}</td>
                <td class="text-end">
                  <NuxtLink
                    v-if="r.balance > 0 && r.status !== 'CANCELLED'"
                    :to="`/hotel/encaissement?reservation=${r.id}`"
                    class="btn btn-sm bg-success text-white"
                  >
                    <i class="fa fa-wallet mr-1"></i>Encaisser
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-show="tab === 'services'">
        <HotelCrud
          embedded
          title="Consommations & services"
          singular="consommation"
          feminine
          size="xl"
          endpoint="/api/hotel/services"
          table-id="hotelServicesTable"
          :query="{ guestId }"
          :fields="serviceFields"
          :columns="serviceColumns"
          :headers="['Date', 'Service', 'Qté', 'Prix unitaire', 'Total', 'Chambre']"
          :defaults="() => ({ quantity: 1, unitPrice: '', date: todayIso(), reservationId: guest.reservations.find((r: any) => r.status === 'CHECKED_IN')?.id ?? null })"
          :order="[0, 'desc']"
          @changed="refreshAll"
        />
      </div>

      <div v-show="tab === 'incidents'">
        <HotelCrud
          embedded
          title="Incidents & signalements"
          singular="incident"
          size="xl"
          endpoint="/api/hotel/incidents"
          table-id="hotelIncidentsTable"
          :query="{ guestId }"
          :fixed="{ guestId }"
          :fields="incidentFields"
          :columns="incidentColumns"
          :headers="['Date', 'Incident', 'Gravité', 'Statut']"
          :defaults="() => ({ severity: 'LOW', date: todayIso(), resolved: false, reservationId: null })"
          :order="[0, 'desc']"
          @changed="refreshAll"
        />
      </div>

      <div v-show="tab === 'payments'" class="card !h-auto">
        <div class="overflow-x-auto p-5">
          <table class="w-full text-left text-2sm">
            <thead>
              <tr class="border-b border-border text-body">
                <th class="py-2">Date</th><th>Chambre</th><th>Mode</th><th>Référence</th><th class="text-end">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!payments?.length"><td colspan="5" class="py-4 text-body">Aucun paiement.</td></tr>
              <tr v-for="p in payments" :key="p.id" class="border-b border-border last:border-0">
                <td class="py-2">{{ fmtDate(p.createdAt) }}</td>
                <td>{{ p.reservation.room.number }}</td>
                <td>{{ PAYMENT_METHODS[p.method] }}</td>
                <td>{{ p.reference || "—" }}</td>
                <td class="text-end font-semibold text-success">{{ formatAmount(p.amount) }} {{ currency }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="!docsError" v-show="tab === 'documents'">
        <HotelCrud
          embedded
          title="Documents du client"
          singular="document"
          size="xl"
          endpoint="/api/hotel/documents"
          table-id="hotelGuestDocsTable"
          :query="{ guestId }"
          :fixed="{ guestId }"
          :fields="documentFields"
          :columns="documentColumns"
          :headers="['Titre', 'Type', 'Ajouté le', 'Fichier']"
          :defaults="() => ({ type: 'Pièce d\'identité', reservationId: null })"
          :order="[2, 'desc']"
        />
      </div>
    </div>
  </div>
</template>

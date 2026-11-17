<script lang="ts" setup>
import { formatAmount } from "~/lib/format";
import { fmtDate, PAYMENT_METHODS, RESERVATION_STATUS, statusBadge } from "~/lib/hotel";

definePageMeta({ layout: "home" });

const route = useRoute();
const toast = useToast();
const { confirmDanger } = useConfirm();

const { data: reservations, refresh: refreshRes } = await useFetch<any[]>("/api/hotel/reservations");
const { data: payments, refresh: refreshPay } = await useFetch<any[]>("/api/hotel/payments");
const { data: company } = await useFetch<any>("/api/company");
const currency = computed(() => company.value?.currency ?? "FCFA");

const help = [
  "Cette page liste les réservations qui ont un reste à payer (séjour + consommations − déjà encaissé).",
  "Cliquez sur « Encaisser » : le même écran que la caisse du restaurant s'ouvre avec le choix du mode de paiement (Espèces, Wave, Orange Money, Carte).",
  "Le montant est pré-rempli avec le solde ; modifiez-le pour un paiement partiel ou un acompte.",
  "Pour un paiement mobile ou carte, saisissez la référence de la transaction.",
  "Chaque encaissement apparaît automatiquement dans la Caisse. Une erreur de saisie se corrige en supprimant la ligne dans « Derniers encaissements ».",
];

const search = ref("");
const due = computed(() =>
  (reservations.value ?? [])
    .filter((r) => r.status !== "CANCELLED" && Number(r.balance) > 0)
    .filter((r) => {
      const q = search.value.trim().toLowerCase();
      if (!q) return true;
      return `${r.guest.lastName} ${r.guest.firstName} ${r.room.number} ${r.id}`.toLowerCase().includes(q);
    })
);

const todayStr = new Date().toISOString().slice(0, 10);
const stats = computed(() => ({
  toCollect: (reservations.value ?? [])
    .filter((r) => r.status !== "CANCELLED")
    .reduce((s, r) => s + Number(r.balance), 0),
  today: (payments.value ?? [])
    .filter((p) => String(p.createdAt).slice(0, 10) === todayStr)
    .reduce((s, p) => s + Number(p.amount), 0),
  pending: (reservations.value ?? []).filter((r) => r.status !== "CANCELLED" && Number(r.balance) > 0).length,
}));

const target = ref<any>(null);
const loading = ref(false);

function open(r: any) {
  target.value = r;
}

onMounted(() => {
  const id = Number(route.query.reservation);
  if (id) {
    const r = (reservations.value ?? []).find((x) => x.id === id);
    if (r && Number(r.balance) > 0) target.value = r;
    else if (r) toast.success("Cette réservation est déjà soldée.");
  }
});

async function confirm(p: { method: string; amount: number; reference: string | null }) {
  loading.value = true;
  try {
    await $fetch("/api/hotel/payments", {
      method: "POST",
      body: { reservationId: target.value.id, amount: p.amount, method: p.method, reference: p.reference },
    });
    toast.success(`Encaissement de ${formatAmount(p.amount)} ${currency.value} enregistré.`);
    target.value = null;
    await Promise.all([refreshRes(), refreshPay()]);
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || "Erreur");
  } finally {
    loading.value = false;
  }
}

async function cancelPayment(p: any) {
  const ok = await confirmDanger({
    title: "Annuler cet encaissement ?",
    text: `${formatAmount(p.amount)} ${currency.value} seront retirés de la caisse et du solde payé.`,
    confirmText: "Annuler l'encaissement",
  });
  if (!ok) return;
  try {
    await $fetch(`/api/hotel/payments/${p.id}`, { method: "DELETE" });
    toast.success("Encaissement annulé.");
    await Promise.all([refreshRes(), refreshPay()]);
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || "Erreur");
  }
}
</script>

<template>
  <div class="content-body">
    <CommonNav title="Encaissement" name="Hôtel" :help="help" help-title="Encaissement" />
    <div class="container">
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="card !h-auto p-5"><p class="text-body text-sm">Reste à encaisser</p><p class="text-xl font-bold text-warning">{{ formatAmount(stats.toCollect) }} {{ currency }}</p></div>
        <div class="card !h-auto p-5"><p class="text-body text-sm">Encaissé aujourd'hui</p><p class="text-xl font-bold text-success">{{ formatAmount(stats.today) }} {{ currency }}</p></div>
        <div class="card !h-auto p-5"><p class="text-body text-sm">Réservations à solder</p><p class="text-xl font-bold">{{ stats.pending }}</p></div>
      </div>

      <div class="card !h-auto mb-6">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 px-5">
          <h4 class="text-base">Réservations à encaisser</h4>
          <input
            v-model="search"
            type="search"
            placeholder="Rechercher client, chambre, n°…"
            class="h-10 w-full rounded-lg border border-border bg-transparent px-3 focus:border-primary sm:w-72"
          />
        </div>
        <div class="overflow-x-auto p-5">
          <table class="w-full text-left text-2sm">
            <thead>
              <tr class="border-b border-border text-body">
                <th class="py-2">Client</th><th>Chambre</th><th class="max-sm:hidden">Séjour</th><th>Statut</th>
                <th class="text-end max-md:hidden">Total</th><th class="text-end max-md:hidden">Encaissé</th><th class="text-end">Reste</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!due.length"><td colspan="8" class="py-4 text-body">Aucune réservation à encaisser.</td></tr>
              <tr v-for="r in due" :key="r.id" class="border-b border-border last:border-0">
                <td class="py-2.5">
                  <NuxtLink :to="`/hotel/clients/${r.guest.id}`" class="text-primary">{{ r.guest.lastName }} {{ r.guest.firstName }}</NuxtLink>
                </td>
                <td>{{ r.room.number }}</td>
                <td class="max-sm:hidden">{{ fmtDate(r.checkIn) }} → {{ fmtDate(r.checkOut) }}</td>
                <td><span v-html="statusBadge(RESERVATION_STATUS, r.status)"></span></td>
                <td class="text-end max-md:hidden">{{ formatAmount(r.grandTotal) }}</td>
                <td class="text-end max-md:hidden">{{ formatAmount(r.paidAmount) }}</td>
                <td class="text-end font-bold text-warning">{{ formatAmount(r.balance) }}</td>
                <td class="text-end">
                  <button type="button" class="btn btn-sm bg-success text-white" @click="open(r)">
                    <i class="fa fa-wallet mr-1"></i>Encaisser
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="card !h-auto">
        <div class="border-b border-border py-4 px-5"><h4 class="text-base">Derniers encaissements</h4></div>
        <div class="overflow-x-auto p-5">
          <table class="w-full text-left text-2sm">
            <thead>
              <tr class="border-b border-border text-body">
                <th class="py-2">Date</th><th>Client</th><th>Chambre</th><th>Mode</th><th class="max-sm:hidden">Référence</th>
                <th class="text-end">Montant</th><th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="!payments?.length"><td colspan="7" class="py-4 text-body">Aucun encaissement.</td></tr>
              <tr v-for="p in (payments ?? []).slice(0, 15)" :key="p.id" class="border-b border-border last:border-0">
                <td class="py-2">{{ fmtDate(p.createdAt) }}</td>
                <td>{{ p.reservation.guest.lastName }} {{ p.reservation.guest.firstName }}</td>
                <td>{{ p.reservation.room.number }}</td>
                <td>{{ PAYMENT_METHODS[p.method] }}</td>
                <td class="max-sm:hidden">{{ p.reference || "—" }}</td>
                <td class="text-end font-semibold text-success">{{ formatAmount(p.amount) }}</td>
                <td class="text-end">
                  <button type="button" class="row-action-btn text-danger bg-dangerlight hover:bg-danger hover:text-white" title="Annuler l'encaissement" @click="cancelPayment(p)">
                    <i class="fa fa-rotate-left"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <HotelPaymentModal
      v-if="target"
      :title="`${target.guest.lastName} ${target.guest.firstName} — ch. ${target.room.number}`"
      :total="Number(target.grandTotal)"
      :paid="Number(target.paidAmount)"
      :balance="Number(target.balance)"
      :currency="currency"
      :loading="loading"
      @confirm="confirm"
      @close="target = null"
    />
  </div>
</template>

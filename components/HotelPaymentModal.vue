<script lang="ts" setup>
// Payment collection modal for hotel reservations — same look & method
// picker as the POS (components/pos/PaymentModal.vue) but the amount is
// editable (partial payment / acompte) and capped at the remaining balance.
import { formatAmount } from "~/lib/format";

type Method = "CASH" | "CARD" | "WAVE" | "ORANGE_MONEY";

const props = defineProps<{
  title: string; // "Marie Kouassi — ch. 204"
  total: number; // grand total of the stay
  paid: number;
  balance: number;
  currency: string;
  loading: boolean;
}>();
const emit = defineEmits<{
  confirm: [payload: { method: Method; amount: number; reference: string | null }];
  close: [];
}>();

const ICON_CASH = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="22" fill="#2FB344"/><rect x="18" y="34" width="64" height="36" rx="6" fill="white" fill-opacity="0.15"/><rect x="18" y="34" width="64" height="36" rx="6" stroke="white" stroke-width="4"/><circle cx="50" cy="52" r="10" stroke="white" stroke-width="4"/><path d="M28 42v20M72 42v20" stroke="white" stroke-width="4" stroke-linecap="round"/></svg>`;
const ICON_CARD = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="22" fill="#182B6B"/><rect x="16" y="30" width="68" height="44" rx="7" stroke="white" stroke-width="4"/><path d="M16 44h68" stroke="white" stroke-width="4"/><rect x="24" y="56" width="18" height="7" rx="2" fill="white"/></svg>`;

const methods: { value: Method; label: string; iconSvg?: string }[] = [
  { value: "CASH", label: "Espèces", iconSvg: ICON_CASH },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "CARD", label: "Carte bancaire", iconSvg: ICON_CARD },
];

const method = ref<Method>("CASH");
const amountInput = ref<string>(String(Math.round(props.balance)));
const reference = ref("");

const amount = computed(() => Number(amountInput.value || 0));
const remaining = computed(() => Math.max(0, props.balance - amount.value));
const valid = computed(() => amount.value > 0 && amount.value <= props.balance);

function pressKey(key: string) {
  if (key === "C") amountInput.value = "";
  else if (key === "back") amountInput.value = amountInput.value.slice(0, -1);
  else if (amountInput.value.length < 9) amountInput.value = (amountInput.value === "0" ? "" : amountInput.value) + key;
}
function setAmount(v: number) {
  amountInput.value = String(Math.round(v));
}

function confirm() {
  if (!valid.value) return;
  emit("confirm", { method: method.value, amount: amount.value, reference: reference.value.trim() || null });
}
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
    <div class="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card">
      <div class="flex shrink-0 items-center justify-between bg-primary px-6 py-4 text-white">
        <div class="flex items-center gap-3">
          <span class="flex size-10 items-center justify-center rounded-xl bg-white/15 text-lg">
            <i class="fa fa-wallet"></i>
          </span>
          <div>
            <p class="font-bold leading-tight text-white">Encaissement</p>
            <p class="text-2xs text-white/80">{{ title }}</p>
          </div>
        </div>
        <button type="button" class="flex size-9 items-center justify-center text-2xl leading-none text-white/90 hover:text-white" @click="emit('close')">
          &times;
        </button>
      </div>

      <div class="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto p-6 sm:grid-cols-2">
        <div class="grid grid-cols-3 gap-3 rounded-xl bg-bodybg px-4 py-3.5 sm:col-span-2">
          <div>
            <p class="text-2xs text-body">Total séjour + services</p>
            <p class="font-bold">{{ formatAmount(total) }} {{ currency }}</p>
          </div>
          <div>
            <p class="text-2xs text-body">Déjà encaissé</p>
            <p class="font-bold text-success">{{ formatAmount(paid) }} {{ currency }}</p>
          </div>
          <div>
            <p class="text-2xs text-body">Reste à payer</p>
            <p class="text-lg font-bold text-primary">{{ formatAmount(balance) }} {{ currency }}</p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-2xs font-semibold uppercase text-body">Mode de paiement</p>
          <div class="flex flex-col gap-2">
            <button
              v-for="m in methods"
              :key="m.value"
              type="button"
              class="flex items-center gap-3 rounded-xl border p-3 text-left font-semibold duration-150"
              :class="method === m.value ? 'border-primary bg-primarylight text-primary' : 'border-border hover:border-primary'"
              @click="method = m.value"
            >
              <span class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg" :class="m.value === 'ORANGE_MONEY' ? 'bg-white p-1.5' : ''">
                <img v-if="m.value === 'WAVE'" src="~/assets/images/payment/wave.jpg" alt="Wave" class="h-full w-full object-cover" />
                <img v-else-if="m.value === 'ORANGE_MONEY'" src="~/assets/images/payment/orange-money.svg" alt="Orange Money" class="h-full w-full object-contain" />
                <span v-else v-html="m.iconSvg"></span>
              </span>
              {{ m.label }}
            </button>
          </div>
          <div v-if="method !== 'CASH'" class="mt-3">
            <label class="mb-1 text-2xs text-body">Référence de la transaction (optionnel)</label>
            <input
              v-model="reference"
              type="text"
              maxlength="100"
              class="h-10 w-full rounded-lg border border-border bg-transparent px-3 focus:border-primary"
              placeholder="N° de transaction Wave / OM / carte"
            />
          </div>
        </div>

        <div>
          <p class="mb-2 text-2xs font-semibold uppercase text-body">Montant à encaisser</p>
          <div class="mb-2 flex h-12 items-center rounded-lg border border-border bg-card px-3">
            <input v-model="amountInput" inputmode="numeric" class="w-full bg-transparent text-lg font-bold outline-none" @input="amountInput = amountInput.replace(/\D/g, '')" />
            <span class="text-2xs text-body">{{ currency }}</span>
          </div>
          <div class="mb-3 flex gap-2">
            <button type="button" class="flex-1 rounded-lg bg-bodybg py-1.5 text-2xs font-semibold hover:bg-primarylight" @click="setAmount(balance)">Solde total</button>
            <button type="button" class="flex-1 rounded-lg bg-bodybg py-1.5 text-2xs font-semibold hover:bg-primarylight" @click="setAmount(balance / 2)">50 %</button>
          </div>
          <p v-if="amount > balance" class="mb-2 text-2xs text-danger">Le montant dépasse le reste à payer.</p>
          <div class="mb-3 rounded-xl border border-border p-3 text-2sm">
            <div class="flex justify-between py-1">
              <span class="text-body">Montant encaissé</span>
              <span class="font-semibold">{{ formatAmount(amount) }} {{ currency }}</span>
            </div>
            <div class="mt-1 flex justify-between border-t border-border py-1.5">
              <span class="font-semibold">Reste après encaissement</span>
              <span class="font-bold" :class="remaining === 0 ? 'text-success' : 'text-warning'">{{ formatAmount(remaining) }} {{ currency }}</span>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1.5">
            <button v-for="key in ['1', '2', '3', '4', '5', '6', '7', '8', '9']" :key="key" type="button" class="h-11 rounded-lg bg-bodybg font-semibold hover:bg-primarylight active:scale-95" @click="pressKey(key)">{{ key }}</button>
            <button type="button" class="h-11 rounded-lg bg-dangerlight font-semibold text-danger active:scale-95" @click="pressKey('C')">C</button>
            <button type="button" class="h-11 rounded-lg bg-bodybg font-semibold hover:bg-primarylight active:scale-95" @click="pressKey('0')">0</button>
            <button type="button" class="h-11 rounded-lg bg-bodybg font-semibold hover:bg-primarylight active:scale-95" @click="pressKey('back')"><i class="fa fa-backspace"></i></button>
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-border p-5">
        <button type="button" class="btn w-full bg-primary text-white hover:bg-primaryhover disabled:opacity-50" :disabled="!valid || loading" @click="confirm">
          <i class="fa fa-check mr-1.5"></i>{{ loading ? "Validation..." : "Encaisser" }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.flex.size-9.shrink-0 :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}
</style>

<script lang="ts" setup>
import { formatAmount } from "~/lib/format";

definePageMeta({ layout: "home" });

const { data: rooms } = await useFetch<any[]>("/api/hotel/rooms");
const { data: reservations } = await useFetch<any[]>("/api/hotel/reservations");

const today = new Date().toISOString().slice(0, 10);
const day = (v: string) => String(v).slice(0, 10);

const stats = computed(() => {
  const r = rooms.value ?? [];
  const res = reservations.value ?? [];
  const occupied = r.filter((x) => x.status === "OCCUPIED").length;
  return {
    total: r.length,
    available: r.filter((x) => x.status === "AVAILABLE").length,
    occupied,
    rate: r.length ? Math.round((occupied / r.length) * 100) : 0,
    arrivals: res.filter((x) => day(x.checkIn) === today && ["PENDING", "CONFIRMED"].includes(x.status)),
    departures: res.filter((x) => day(x.checkOut) === today && x.status === "CHECKED_IN"),
    unpaid: res
      .filter((x) => x.status !== "CANCELLED")
      .reduce((sum, x) => sum + Math.max(0, Number(x.totalPrice) - Number(x.paidAmount)), 0),
  };
});

const cards = computed(() => [
  { label: "Chambres", value: stats.value.total, icon: "fa-bed" },
  { label: "Disponibles", value: stats.value.available, icon: "fa-door-open" },
  { label: "Occupées", value: stats.value.occupied, icon: "fa-door-closed" },
  { label: "Taux d'occupation", value: `${stats.value.rate} %`, icon: "fa-chart-pie" },
  { label: "Arrivées du jour", value: stats.value.arrivals.length, icon: "fa-right-to-bracket" },
  { label: "Départs du jour", value: stats.value.departures.length, icon: "fa-right-from-bracket" },
]);
</script>

<template>
  <div class="content-body">
    <CommonNav title="Tableau de bord" name="Hôtel" />
    <div class="container">
      <div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div v-for="c in cards" :key="c.label" class="card !h-auto flex items-center gap-4 p-5">
          <span class="flex size-12 items-center justify-center rounded-full bg-primarylight text-primary">
            <i class="fa" :class="c.icon"></i>
          </span>
          <div>
            <p class="text-body text-sm">{{ c.label }}</p>
            <p class="text-xl font-bold">{{ c.value }}</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="card !h-auto">
          <div class="border-b border-border py-4 px-5"><h4 class="text-base">Arrivées du jour</h4></div>
          <ul class="p-5">
            <li v-if="!stats.arrivals.length" class="text-body">Aucune arrivée prévue.</li>
            <li v-for="r in stats.arrivals" :key="r.id" class="flex justify-between border-b border-border py-2 last:border-0">
              <span>{{ r.guest.lastName }} {{ r.guest.firstName }}</span>
              <span class="text-body">Ch. {{ r.room.number }}</span>
            </li>
          </ul>
        </div>
        <div class="card !h-auto">
          <div class="border-b border-border py-4 px-5"><h4 class="text-base">Départs du jour</h4></div>
          <ul class="p-5">
            <li v-if="!stats.departures.length" class="text-body">Aucun départ prévu.</li>
            <li v-for="r in stats.departures" :key="r.id" class="flex justify-between border-b border-border py-2 last:border-0">
              <span>{{ r.guest.lastName }} {{ r.guest.firstName }}</span>
              <span class="text-body">Ch. {{ r.room.number }}</span>
            </li>
          </ul>
        </div>
      </div>

      <p class="mt-4 text-body">Soldes restant à encaisser : <strong>{{ formatAmount(stats.unpaid) }}</strong></p>
    </div>
  </div>
</template>

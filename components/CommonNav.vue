<script lang="ts" setup>
// `help` (optional): short guidance lines shown in an info bubble opened from
// the "i" icon next to the page title.
defineProps<{
  title: string;
  name: string;
  help?: string[];
  helpTitle?: string;
}>();

const open = ref(false);
const root = ref<HTMLElement | null>(null);

function onDocClick(e: MouseEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) open.value = false;
}
onMounted(() => document.addEventListener("click", onDocClick));
onUnmounted(() => document.removeEventListener("click", onDocClick));
</script>

<template>
  <div class="flex items-center justify-between relative z-1 flex-wrap py-2.5 px-5 bg-d-bg border-b border-border">
    <div ref="root" class="relative flex items-center gap-2">
      <h5 class="sm:text-xl text-2sm">{{ title }}</h5>
      <button
        v-if="help?.length"
        type="button"
        class="flex size-7 items-center justify-center rounded-full bg-primarylight text-primary hover:bg-primary hover:text-white"
        title="Aide"
        aria-label="Aide sur cette page"
        @click.stop="open = !open"
      >
        <i class="fa fa-info text-xs"></i>
      </button>
      <div
        v-if="open && help?.length"
        class="absolute left-0 top-full z-50 mt-2 w-80 max-w-[85vw] rounded-xl border border-border bg-card p-4 shadow-lg"
      >
        <div class="mb-2 flex items-center justify-between">
          <p class="font-bold text-primary"><i class="fa fa-circle-info mr-1.5"></i>{{ helpTitle ?? "Comment ça marche ?" }}</p>
          <button type="button" class="text-xl leading-none text-body hover:text-danger" @click="open = false">&times;</button>
        </div>
        <ul class="space-y-1.5 text-2sm text-body">
          <li v-for="(line, i) in help" :key="i" class="flex gap-2">
            <i class="fa fa-check mt-1 shrink-0 text-2xs text-success"></i><span>{{ line }}</span>
          </li>
        </ul>
      </div>
    </div>
    <ul class="flex flex-wrap items-center">
      <li class="breadcrumb-item"><NuxtLink to="/">Home</NuxtLink></li>
      <li class="font-semibold before:content-['>'] before:leading-6 before:pr-2 before:float-left pl-2 text-primary">
        <a href="javascript:void(0);">{{ name }}</a>
      </li>
    </ul>
  </div>
</template>

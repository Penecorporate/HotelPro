<script lang="ts" setup>
// Generic CRUD screen for the Hôtel module (rooms, guests, reservations,
// documents): DataTable list + create/edit modal + delete, driven by a field
// config so the four pages stay tiny. Follows pages/(admin)/categories.
export interface HotelField {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "file";
  required?: boolean;
  options?: { value: string | number | null; label: string }[];
  step?: number;
  min?: number;
  upload?: string; // upload endpoint for type "file"
  fileNameKey?: string; // where to store the uploaded file's original name
  full?: boolean; // span the whole row (default: half width)
}

const props = defineProps<{
  title: string;
  singular: string; // "chambre"
  feminine?: boolean; // "Nouvelle chambre" vs "Nouveau client"
  endpoint: string; // "/api/hotel/rooms"
  tableId: string;
  fields: HotelField[];
  columns: any[]; // DataTables column defs (without the actions column)
  headers: string[]; // <th> labels, same order as columns
  defaults?: () => Record<string, any>;
  data?: any[] | null; // optional externally-managed data (else fetched from endpoint)
}>();
const emit = defineEmits<{ (e: "changed"): void }>();

const DT_LANGUAGE = {
  search: "",
  searchPlaceholder: "Rechercher...",
  lengthMenu: "Afficher _MENU_ lignes",
  info: "Affichage de _START_ à _END_ sur _TOTAL_",
  infoEmpty: "Aucun élément",
  infoFiltered: "(filtré depuis _MAX_)",
  zeroRecords: "Aucun résultat ne correspond à la recherche",
  emptyTable: "Aucun élément.",
  paginate: { previous: "Précédent", next: "Suivant" },
};

const { data: fetched, refresh } = await useFetch<any[]>(props.endpoint);
const rows = computed(() => props.data ?? fetched.value ?? []);
const toast = useToast();
const { confirmDanger } = useConfirm();

const showForm = ref(false);
const editing = ref<any>(null);
const form = reactive<Record<string, any>>({});
const saving = ref(false);
const uploading = ref(false);
const errorMessage = ref("");

function emptyForm() {
  const base: Record<string, any> = {};
  for (const f of props.fields) base[f.key] = f.type === "select" ? null : "";
  return { ...base, ...(props.defaults?.() ?? {}) };
}

function assign(values: Record<string, any>) {
  for (const k of Object.keys(form)) delete form[k];
  Object.assign(form, values);
}

function openCreate() {
  editing.value = null;
  errorMessage.value = "";
  assign(emptyForm());
  showForm.value = true;
}

function openEdit(row: any) {
  editing.value = row;
  errorMessage.value = "";
  const values = emptyForm();
  for (const f of props.fields) {
    let v = row[f.key];
    if (f.type === "date" && v) v = String(v).slice(0, 10);
    if (f.type === "number" && v !== null && v !== undefined) v = Number(v);
    values[f.key] = v ?? (f.type === "select" ? null : "");
  }
  if (props.fields.some((f) => f.type === "file")) {
    for (const f of props.fields) if (f.fileNameKey) values[f.fileNameKey] = row[f.fileNameKey] ?? "";
  }
  assign(values);
  showForm.value = true;
}

function payload() {
  const out: Record<string, any> = {};
  for (const f of props.fields) {
    let v = form[f.key];
    if (f.type === "number") v = v === "" || v === null || v === undefined ? null : Number(v);
    else if (f.type === "select") v = v === "" ? null : v;
    else if (typeof v === "string") v = v.trim() === "" && !f.required ? null : v.trim();
    out[f.key] = v;
    if (f.fileNameKey) out[f.fileNameKey] = form[f.fileNameKey] || null;
  }
  return out;
}

async function onFile(f: HotelField, e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !f.upload) return;
  uploading.value = true;
  errorMessage.value = "";
  try {
    const body = new FormData();
    body.append("file", file);
    const res = await $fetch<{ url: string; fileName: string }>(f.upload, { method: "POST", body });
    form[f.key] = res.url;
    if (f.fileNameKey) form[f.fileNameKey] = res.fileName;
  } catch (err: any) {
    errorMessage.value = err?.data?.statusMessage || "Échec du téléversement";
  } finally {
    uploading.value = false;
    input.value = "";
  }
}

const canSave = computed(() =>
  props.fields.every((f) => !f.required || (form[f.key] !== "" && form[f.key] !== null && form[f.key] !== undefined))
);

async function save() {
  saving.value = true;
  errorMessage.value = "";
  try {
    if (editing.value) {
      await $fetch(`${props.endpoint}/${editing.value.id}`, { method: "PATCH", body: payload() });
    } else {
      await $fetch(props.endpoint, { method: "POST", body: payload() });
    }
    showForm.value = false;
    toast.success(editing.value ? "Modification enregistrée." : "Élément créé.");
    await refresh();
    emit("changed");
  } catch (e: any) {
    errorMessage.value = e?.data?.statusMessage || "Erreur";
  } finally {
    saving.value = false;
  }
}

async function remove(row: any) {
  const ok = await confirmDanger({
    title: `Supprimer cette ${props.singular} ?`.replace("cette client", "ce client"),
    text: "Cette action est irréversible.",
    confirmText: "Supprimer",
  });
  if (!ok) return;
  try {
    await $fetch(`${props.endpoint}/${row.id}`, { method: "DELETE" });
    toast.success("Élément supprimé.");
    await refresh();
    emit("changed");
  } catch (e: any) {
    toast.error(e?.data?.statusMessage || "Erreur");
  }
}

const allColumns = computed(() => [
  ...props.columns,
  {
    data: null,
    orderable: false,
    searchable: false,
    className: "text-end",
    render: (_d: any, type: string) =>
      type !== "display"
        ? ""
        : `<div class="flex justify-end gap-1.5">
        <button type="button" class="js-edit row-action-btn text-primary bg-primarylight hover:bg-primary hover:text-white" title="Modifier"><i class="fa fa-pen"></i></button>
        <button type="button" class="js-delete row-action-btn text-danger bg-dangerlight hover:bg-danger hover:text-white" title="Supprimer"><i class="fa fa-trash"></i></button>
      </div>`,
  },
]);

const tableOptions = {
  order: [[0, "asc"]] as any,
  language: DT_LANGUAGE,
  createdRow: (row: HTMLElement, data: any) => {
    row.querySelector(".js-edit")?.addEventListener("click", () => openEdit(data));
    row.querySelector(".js-delete")?.addEventListener("click", () => remove(data));
  },
};

defineExpose({ openCreate, refresh });
</script>

<template>
  <div class="container">
    <div class="card !h-auto">
      <div class="flex items-center justify-between border-b border-border py-4 px-5">
        <h4 class="text-base">{{ title }}</h4>
        <button type="button" class="btn bg-primary text-white btn-sm" @click="openCreate">+ Ajouter</button>
      </div>
      <div class="p-5">
        <div class="overflow-x-auto">
          <AppDataTable :id="tableId" :data="rows" :columns="allColumns" :options="tableOptions">
            <thead>
              <tr>
                <th v-for="h in headers" :key="h" class="!border-border !font-medium">{{ h }}</th>
                <th class="!border-border !font-medium text-end">Actions</th>
              </tr>
            </thead>
          </AppDataTable>
        </div>
      </div>
    </div>

    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-card p-6">
        <h4 class="mb-4 text-base">
          {{ editing ? "Modifier" : feminine ? "Nouvelle" : "Nouveau" }} {{ singular }}
        </h4>
        <p v-if="errorMessage" class="mb-3 rounded-lg bg-dangerlight px-3 py-2 text-danger text-sm">
          {{ errorMessage }}
        </p>
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <div v-for="f in fields" :key="f.key" :class="f.full || f.type === 'textarea' ? 'sm:col-span-2' : ''">
            <label class="mb-1">{{ f.label }}<span v-if="f.required" class="text-danger"> *</span></label>

            <select
              v-if="f.type === 'select'"
              v-model="form[f.key]"
              class="mb-4 h-11 w-full rounded-lg border border-border bg-transparent px-3 focus:border-primary"
            >
              <option v-for="o in f.options ?? []" :key="String(o.value)" :value="o.value">{{ o.label }}</option>
            </select>

            <textarea
              v-else-if="f.type === 'textarea'"
              v-model="form[f.key]"
              rows="3"
              class="mb-4 w-full rounded-lg border border-border bg-transparent p-3 focus:border-primary"
            />

            <div v-else-if="f.type === 'file'" class="mb-4">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                class="w-full rounded-lg border border-border bg-transparent p-2"
                :disabled="uploading"
                @change="onFile(f, $event)"
              />
              <p v-if="uploading" class="mt-1 text-sm text-body">Téléversement…</p>
              <p v-else-if="form[f.key]" class="mt-1 text-sm text-body">
                <i class="fa fa-paperclip mr-1"></i>{{ (f.fileNameKey && form[f.fileNameKey]) || "Fichier joint" }}
                <a :href="form[f.key]" target="_blank" class="ml-2 text-primary">Ouvrir</a>
              </p>
            </div>

            <input
              v-else
              v-model="form[f.key]"
              :type="f.type ?? 'text'"
              :step="f.step"
              :min="f.min"
              class="mb-4 h-11 w-full rounded-lg border border-border bg-transparent px-3 focus:border-primary"
            />
          </div>
        </div>
        <div class="flex gap-2">
          <button type="button" class="btn flex-1 border border-border" @click="showForm = false">Annuler</button>
          <button
            type="button"
            class="btn flex-1 bg-primary text-white"
            :disabled="saving || uploading || !canSave"
            @click="save"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

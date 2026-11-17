<script lang="ts" setup>
// Generic CRUD screen for the Hôtel module: DataTable list + create/edit modal
// + delete, driven by a field config so every page stays tiny.
// Follows pages/(admin)/categories.
export interface HotelField {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "file" | "static";
  required?: boolean;
  options?: { value: string | number | null; label: string }[];
  step?: number;
  min?: number;
  upload?: string; // upload endpoint for type "file"
  fileNameKey?: string; // where to store the uploaded file's original name
  span?: 1 | 2 | 3; // columns spanned in the wide (xl) grid
  hint?: string; // small helper text under the input
  createOnly?: boolean; // only shown / sent when creating
  compute?: (form: Record<string, any>) => string; // for type "static" (read-only display)
  noSend?: boolean; // never included in the payload
}

export interface HotelRowAction {
  icon: string;
  title: string;
  cls: string; // tailwind colour classes
  onClick: (row: any) => void;
  show?: (row: any) => boolean;
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
  size?: "md" | "xl";
  embedded?: boolean; // no outer container (used inside another page)
  query?: Record<string, any>; // GET filters, e.g. { guestId: 3 }
  fixed?: Record<string, any>; // merged into the payload on create
  autofill?: (form: Record<string, any>, changedKey: string) => void;
  rowActions?: HotelRowAction[];
  order?: [number, "asc" | "desc"];
  noDelete?: boolean;
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

const { data: fetched, refresh } = await useFetch<any[]>(props.endpoint, {
  query: computed(() => props.query ?? {}),
});
const rows = computed(() => fetched.value ?? []);
const toast = useToast();
const { confirmDanger } = useConfirm();

const showForm = ref(false);
const editing = ref<any>(null);
const form = reactive<Record<string, any>>({});
const saving = ref(false);
const uploading = ref(false);
const errorMessage = ref("");
let suppress = false;

const visibleFields = computed(() => props.fields.filter((f) => !f.createOnly || !editing.value));
const wide = computed(() => props.size === "xl");

function emptyForm() {
  const base: Record<string, any> = {};
  for (const f of props.fields) base[f.key] = f.type === "select" ? null : "";
  return { ...base, ...(props.defaults?.() ?? {}) };
}

async function assign(values: Record<string, any>) {
  // Programmatic fills must not trigger the user-driven autofill logic.
  suppress = true;
  for (const k of Object.keys(form)) delete form[k];
  Object.assign(form, values);
  await nextTick();
  suppress = false;
}

// One watcher per field → autofill(form, key) on user changes.
for (const f of props.fields) {
  watch(
    () => form[f.key],
    () => {
      if (!suppress && showForm.value) props.autofill?.(form, f.key);
    }
  );
}

async function openCreate() {
  editing.value = null;
  errorMessage.value = "";
  await assign(emptyForm());
  showForm.value = true;
}

async function openEdit(row: any) {
  editing.value = row;
  errorMessage.value = "";
  const values = emptyForm();
  for (const f of props.fields) {
    if (f.type === "static") continue;
    let v = row[f.key];
    if (f.type === "date" && v) v = String(v).slice(0, 10);
    if (f.type === "number" && v !== null && v !== undefined) v = Number(v);
    values[f.key] = v ?? (f.type === "select" ? null : "");
    if (f.fileNameKey) values[f.fileNameKey] = row[f.fileNameKey] ?? "";
  }
  await assign(values);
  showForm.value = true;
}

function payload() {
  const out: Record<string, any> = {};
  for (const f of visibleFields.value) {
    if (f.type === "static" || f.noSend) continue;
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
  visibleFields.value.every(
    (f) => !f.required || f.type === "static" || (form[f.key] !== "" && form[f.key] !== null && form[f.key] !== undefined)
  )
);

async function save() {
  saving.value = true;
  errorMessage.value = "";
  try {
    if (editing.value) {
      await $fetch(`${props.endpoint}/${editing.value.id}`, { method: "PATCH", body: payload() });
    } else {
      await $fetch(props.endpoint, { method: "POST", body: { ...payload(), ...(props.fixed ?? {}) } });
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
    title: "Supprimer cet élément ?",
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
    render: (_d: any, type: string, row: any) => {
      if (type !== "display") return "";
      const extra = (props.rowActions ?? [])
        .map((a, i) =>
          a.show && !a.show(row)
            ? ""
            : `<button type="button" class="js-act-${i} row-action-btn ${a.cls}" title="${a.title}"><i class="fa ${a.icon}"></i></button>`
        )
        .join("");
      return `<div class="flex justify-end gap-1.5">${extra}
        <button type="button" class="js-edit row-action-btn text-primary bg-primarylight hover:bg-primary hover:text-white" title="Modifier"><i class="fa fa-pen"></i></button>
        ${props.noDelete ? "" : `<button type="button" class="js-delete row-action-btn text-danger bg-dangerlight hover:bg-danger hover:text-white" title="Supprimer"><i class="fa fa-trash"></i></button>`}
      </div>`;
    },
  },
]);

const tableOptions = computed(() => ({
  order: [props.order ?? [0, "asc"]] as any,
  language: DT_LANGUAGE,
  createdRow: (row: HTMLElement, data: any) => {
    row.querySelector(".js-edit")?.addEventListener("click", () => openEdit(data));
    row.querySelector(".js-delete")?.addEventListener("click", () => remove(data));
    (props.rowActions ?? []).forEach((a, i) => {
      row.querySelector(`.js-act-${i}`)?.addEventListener("click", () => a.onClick(data));
    });
  },
}));

const SPAN: Record<number, string> = { 1: "", 2: "lg:col-span-2", 3: "lg:col-span-3" };
function spanClass(f: HotelField) {
  if (!wide.value) return f.type === "textarea" || f.span === 3 ? "sm:col-span-2" : "";
  return f.type === "textarea" ? "sm:col-span-2 lg:col-span-3" : `${f.span === 3 ? "sm:col-span-2" : ""} ${SPAN[f.span ?? 1]}`;
}

defineExpose({ openCreate, refresh });
</script>

<template>
  <component :is="embedded ? 'div' : 'div'" :class="embedded ? '' : 'container'">
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
      <div
        class="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-card"
        :class="wide ? 'max-w-5xl' : 'max-w-2xl'"
      >
        <div class="flex shrink-0 items-center justify-between bg-primary px-6 py-4 text-white">
          <h4 class="text-base font-bold text-white">
            {{ editing ? "Modifier" : feminine ? "Nouvelle" : "Nouveau" }} {{ singular }}
          </h4>
          <button type="button" class="text-2xl leading-none text-white/90 hover:text-white" @click="showForm = false">&times;</button>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-6">
          <p v-if="errorMessage" class="mb-3 rounded-lg bg-dangerlight px-3 py-2 text-danger text-sm">
            {{ errorMessage }}
          </p>
          <div class="grid grid-cols-1 gap-x-5 sm:grid-cols-2" :class="wide ? 'lg:grid-cols-3' : ''">
            <div v-for="f in visibleFields" :key="f.key" :class="spanClass(f)">
              <label class="mb-1">{{ f.label }}<span v-if="f.required" class="text-danger"> *</span></label>

              <div
                v-if="f.type === 'static'"
                class="mb-4 flex h-11 items-center rounded-lg bg-bodybg px-3 font-semibold text-primary"
              >
                {{ f.compute?.(form) ?? "" }}
              </div>

              <select
                v-else-if="f.type === 'select'"
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
              <p v-if="f.hint" class="-mt-3 mb-4 text-2xs text-body">{{ f.hint }}</p>
            </div>
          </div>
        </div>

        <div class="flex shrink-0 gap-2 border-t border-border p-4">
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
  </component>
</template>

// App modules (e.g. "hotel") the current user can open: active for the
// company AND linked to them. Same shared-key pattern as useMyModuleAccess.
export function useMyAppModules() {
  return useFetch<{ modules: string[] }>("/api/modules/mine", { key: "my-app-modules" });
}

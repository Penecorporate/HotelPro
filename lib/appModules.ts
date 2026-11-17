// Optional business modules that Direction (OWNER) can switch on/off per
// company. Shared by server and client (no Node-only imports here).
//
// Three gates must all pass for a non-OWNER to use a module:
//   1. the module is ACTIVE for the company  (CompanyModule, OWNER-only toggle)
//   2. the user is LINKED to the module      (UserModule, OWNER-only)
//   3. the user's role holds the fine-grained permission (RolePermission)
// OWNER only needs gate 1 (a deactivated module is off for everyone).
export const APP_MODULES = ["hotel"] as const;
export type AppModule = (typeof APP_MODULES)[number];

export const APP_MODULE_LABELS: Record<AppModule, string> = {
  hotel: "Hôtel",
};

// Gateable (RolePermission) modules that belong to an app module, so
// requireModuleAccess knows to also enforce gates 1 and 2 for them.
export const GATEABLE_TO_APP_MODULE: Record<string, AppModule> = {
  hotel: "hotel",
  "hotel-documents": "hotel",
};

export function isAppModule(value: string): value is AppModule {
  return (APP_MODULES as readonly string[]).includes(value);
}

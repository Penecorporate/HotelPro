// Shared display helpers/labels for the Hôtel pages.
export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );
}

export const ROOM_STATUS: Record<string, { label: string; cls: string }> = {
  AVAILABLE: { label: "Disponible", cls: "bg-successlight text-success" },
  OCCUPIED: { label: "Occupée", cls: "bg-dangerlight text-danger" },
  CLEANING: { label: "Nettoyage", cls: "bg-warninglight text-warning" },
  MAINTENANCE: { label: "Maintenance", cls: "bg-primarylight text-primary" },
};

export const RESERVATION_STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "En attente", cls: "bg-warninglight text-warning" },
  CONFIRMED: { label: "Confirmée", cls: "bg-primarylight text-primary" },
  CHECKED_IN: { label: "En séjour", cls: "bg-successlight text-success" },
  CHECKED_OUT: { label: "Terminée", cls: "bg-light text-body" },
  CANCELLED: { label: "Annulée", cls: "bg-dangerlight text-danger" },
};

export function statusBadge(map: Record<string, { label: string; cls: string }>, key: string): string {
  const s = map[key] ?? { label: key, cls: "bg-light text-body" };
  return `<span class="rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}">${escapeHtml(s.label)}</span>`;
}

export const ROOM_TYPES = ["Standard", "Double", "Twin", "Suite", "Familiale", "VIP"];
export const ID_TYPES = ["Carte d'identité", "Passeport", "Permis de conduire", "Autre"];
export const DOCUMENT_TYPES = ["Pièce d'identité", "Contrat", "Facture", "Reçu de paiement", "Autre"];

export function toOptions(list: string[]) {
  return list.map((v) => ({ value: v, label: v }));
}

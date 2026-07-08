export const TYPE_LABELS: Record<string, string> = { MEETING: "Toplantı", CALL: "Telefon", EMAIL: "E-posta", NOTE: "Not" };
export const TYPE_COLORS: Record<string, string> = { MEETING: "#6366f1", CALL: "#0ea5e9", EMAIL: "#f59e0b", NOTE: "#94a3b8" };

export const STAGE_LABELS: Record<string, string> = {
  LEAD: "Lead", QUALIFIED: "Nitelikli", PROPOSAL: "Teklif",
  NEGOTIATION: "Müzakere", WON: "Kazanıldı", LOST: "Kaybedildi",
};
export const STAGE_COLORS: Record<string, string> = {
  LEAD: "#64748b", QUALIFIED: "#0ea5e9", PROPOSAL: "#f59e0b",
  NEGOTIATION: "#8b5cf6", WON: "#22c55e", LOST: "#ef4444",
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#64748b", PENDING: "#f59e0b", PAID: "#22c55e", OVERDUE: "#ef4444", CANCELLED: "#94a3b8",
};

export const STATUS_LABELS: Record<string, string> = {
  LEAD: "Aday", PROSPECT: "Potansiyel", ACTIVE: "Aktif Müşteri", PARTNER: "Partner", INACTIVE: "Pasif",
};
export const STATUS_COLORS: Record<string, string> = {
  LEAD: "#64748b", PROSPECT: "#0ea5e9", ACTIVE: "#22c55e", PARTNER: "#8b5cf6", INACTIVE: "#94a3b8",
};

export function formatMoney(amount: number, currency = "₺"): string {
  if (amount >= 1_000_000) return `${currency}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${currency}${(amount / 1_000).toFixed(1)}K`;
  if (amount > 0) return `${currency}${amount.toLocaleString("tr-TR")}`;
  return "—";
}

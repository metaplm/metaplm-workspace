import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 1 Day = 8 Hours conversion
export function daysToHours(days: number): number {
  return days * 8;
}

export function hoursToDays(hours: number): number {
  return hours / 8;
}

export function parseTimeInput(value: string, unit: "hours" | "days"): number {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  return unit === "days" ? daysToHours(num) : num;
}

export function formatHours(hours: number): string {
  if (hours === 0) return "0h";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatCurrency(amount: number, currency: string): string {
  const locale = currency === "TRY" ? "tr-TR" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getDayStatus(hours: number): "empty" | "incomplete" | "optimal" | "overtime" {
  if (hours === 0) return "empty";
  if (hours < 8) return "incomplete";
  if (hours === 8) return "optimal";
  return "overtime";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "optimal": return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
    case "incomplete": return "bg-amber-500/20 text-amber-300 border-amber-500/30";
    case "overtime": return "bg-orange-500/20 text-orange-300 border-orange-500/30";
    default: return "bg-white/5 text-white/30 border-white/10";
  }
}

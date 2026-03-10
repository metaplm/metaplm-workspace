"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, DollarSign, Building2, TrendingUp, FileText, Receipt } from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "CRM", href: null, divider: true },
  { label: "Companies", href: "/crm/companies", icon: Building2 },
  { label: "Contacts", href: "/crm/contacts", icon: Users },
  { label: "Deals", href: "/crm/deals", icon: TrendingUp },
  { label: "Timesheet", href: null, divider: true },
  { label: "Calendar", href: "/timesheet", icon: Clock },
  { label: "Finance", href: null, divider: true },
  { label: "Invoices", href: "/finance/invoices", icon: FileText },
  { label: "Expenses", href: "/finance/expenses", icon: Receipt },
  { label: "Dashboard", href: "/finance", icon: DollarSign },
];

export default function Sidebar() {
  const path = usePathname();

  return (
    <aside className="w-56 flex flex-col border-r shrink-0" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>M</div>
          <div>
            <div className="text-sm font-semibold text-white">MetaPLM</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Workspace</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map((item, i) => {
          if (item.divider) {
            return (
              <div key={i} className="pt-4 pb-1 px-2">
                <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>{item.label}</span>
              </div>
            );
          }
          const Icon = item.icon!;
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href!);
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? "text-white font-medium"
                  : "text-slate-400 hover:text-white"
              }`}
              style={active ? { background: "rgba(99,102,241,0.15)", color: "#a5b4fc" } : {}}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <div className="font-mono">v1.0.0</div>
      </div>
    </aside>
  );
}

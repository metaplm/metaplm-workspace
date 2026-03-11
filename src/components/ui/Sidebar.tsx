"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, DollarSign, Building2, TrendingUp, FileText, Receipt, Activity, BarChart3, SunMoon, Menu, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "CRM", href: null, divider: true },
  { label: "Companies", href: "/crm/companies", icon: Building2 },
  { label: "Contacts", href: "/crm/contacts", icon: Users },
  { label: "Activities", href: "/crm/activities", icon: Activity },
  { label: "Deals", href: "/crm/deals", icon: TrendingUp },
  { label: "Reports", href: "/crm/reports", icon: BarChart3 },
  { label: "Timesheet", href: null, divider: true },
  { label: "Calendar", href: "/timesheet", icon: Clock },
  { label: "Reports", href: "/timesheet/reports", icon: BarChart3 },
  { label: "Finance", href: null, divider: true },
  { label: "Invoices", href: "/finance/invoices", icon: FileText },
  { label: "Expenses", href: "/finance/expenses", icon: Receipt },
  { label: "Dashboard", href: "/finance", icon: DollarSign },
  { label: "Reports", href: "/finance/reports", icon: BarChart3 },
];

export default function Sidebar() {
  const path = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as "dark" | "light" | null;
    const next = saved ?? "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "dark");
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next);
    }
    document.documentElement.setAttribute("data-theme", next === "light" ? "light" : "dark");
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg glass"
        style={{ color: "var(--text)" }}
      >
        {mobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        w-56 flex flex-col border-r shrink-0
        fixed md:relative inset-y-0 left-0 z-40
        transform transition-transform duration-200 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `} style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      {/* Logo */}
      <div className="px-4 py-4 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-10 rounded-lg overflow-hidden shadow-md ring-1 ring-white/10 shrink-0 bg-white/60 p-1">
            <Image src="/metaplm_logo_2.png" alt="MetaPLM" width={56} height={40} className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight leading-tight" style={{ color: "#014670" }}>
              Meta<span style={{ color: "#0284c7" }}>PLM</span>
            </div>
            <div className="text-[10px] tracking-wide uppercase" style={{ color: "var(--muted)" }}>Workspace</div>
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
          const active = path === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? "font-medium"
                  : "hover:opacity-80"
              }`}
              style={active ? { background: "rgba(0,210,211,0.12)", color: "var(--accent2)" } : { color: "var(--muted)" }}
            >
              <Icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t text-xs space-y-3" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
        <button
          className="w-full flex items-center gap-2 justify-center btn-ghost text-xs"
          onClick={toggleTheme}
        >
          <SunMoon size={14} /> {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          className="w-full flex items-center gap-2 justify-center btn-ghost text-xs"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          Logout
        </button>
        <div className="font-mono">v1.0.0</div>
      </div>
    </aside>

    {/* Mobile Overlay */}
    {mobileOpen && (
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-30"
        onClick={() => setMobileOpen(false)}
      />
    )}
    </>
  );
}

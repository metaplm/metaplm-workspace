
"use client";
import Link from "next/link";
import { Building2, Users, TrendingUp, ArrowRight, Activity } from "lucide-react";

export default function CRMPage() {
  return (
    <div className="p-8 space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-semibold text-white">CRM</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Manage your relationships and pipeline</p>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Companies", href: "/crm/companies", icon: Building2, desc: "Manage accounts and scrape company info automatically" },
          { label: "Contacts", href: "/crm/contacts", icon: Users, desc: "Track your people with LinkedIn integration" },
          { label: "Activities", href: "/crm/activities", icon: Activity, desc: "Log meetings, calls and notes — convert them to deals" },
          { label: "Deals", href: "/crm/deals", icon: TrendingUp, desc: "Pipeline management — Won deals become billable projects" },
        ].map(item => (
          <Link key={item.href} href={item.href} className="glass rounded-xl p-6 glass-hover flex flex-col gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
              <item.icon size={18} style={{ color: "#6366f1" }} />
            </div>
            <div>
              <div className="font-medium text-white">{item.label}</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{item.desc}</div>
            </div>
            <div className="flex items-center gap-1 text-xs" style={{ color: "#6366f1" }}>Go to {item.label} <ArrowRight size={12} /></div>
          </Link>
        ))}
      </div>
    </div>
  );
}

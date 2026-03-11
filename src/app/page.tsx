"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { TrendingUp, Clock, DollarSign, AlertTriangle, Activity, CheckCircle } from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/utils";

interface DashData {
  totalPipeline: number;
  dealCount: number;
  monthlyHours: number;
  billableHours: number;
  billableRate: number;
  monthlyExpenses: number;
  overdueInvoices: number;
  expectedIncome: number;
  activityStats: {
    total: number;
    converted: number;
    conversionRate: number;
    upcomingNextActions: number;
  };
  recentActivities: Array<{ id: string; type: string; notes: string; company?: { name: string }; contact?: { firstName: string; lastName: string }; createdAt: string }>;
}

const activityColor: Record<string, string> = {
  MEETING: "#6366f1",
  CALL: "#06b6d4",
  EMAIL: "#f59e0b",
  NOTE: "#64748b",
};

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => { setData(d); setLoading(false); });
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm" style={{ color: "var(--muted)" }}>Loading workspace...</div>
    </div>
  );

  const d = data!;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-in pt-16 md:pt-8">
      {/* Header */}
      <div className="glass rounded-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-12 md:w-20 md:h-14 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/10 shrink-0 bg-white/60 p-1">
              <Image src="/metaplm_logo_2.png" alt="MetaPLM" width={80} height={56} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#014670" }}>
                Meta<span style={{ color: "#0284c7" }}>PLM</span> <span className="font-normal" style={{ color: "var(--text)" }}>Workspace</span>
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Business Intelligence Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-medium" style={{ color: "var(--text)" }}>
                {currentTime.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <div className="text-xs font-mono mt-0.5" style={{ color: "var(--muted)" }}>
                {currentTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Mobile first */}
      <div className="md:hidden glass rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--text)" }}>Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Add Company", href: "/crm/companies", emoji: "🏢" },
            { label: "Log Time", href: "/timesheet", emoji: "⏱️" },
            { label: "New Invoice", href: "/finance/invoices", emoji: "📄" },
            { label: "Add Expense", href: "/finance/expenses", emoji: "💸" },
          ].map((q) => (
            <a key={q.label} href={q.href} className="glass rounded-lg p-3 flex flex-col items-center gap-2 glass-hover transition-all cursor-pointer text-center">
              <span className="text-xl">{q.emoji}</span>
              <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{q.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: "Pipeline Value", value: formatCurrency(d.totalPipeline, "TRY"), sub: `${d.dealCount} active deals`, icon: TrendingUp, color: "#6366f1" },
          { label: "Hours This Month", value: formatHours(d.monthlyHours), sub: `${d.billableRate.toFixed(0)}% billable`, icon: Clock, color: "#06b6d4" },
          { label: "Expected Income", value: formatCurrency(d.expectedIncome, "TRY"), sub: "next 30 days", icon: DollarSign, color: "#10b981" },
          { label: "Overdue Invoices", value: String(d.overdueInvoices), sub: "need attention", icon: AlertTriangle, color: d.overdueInvoices > 0 ? "#ef4444" : "#64748b" },
          { label: "Activity → Deal", value: `${d.activityStats.conversionRate.toFixed(0)}%`, sub: `${d.activityStats.converted}/${d.activityStats.total} converted`, icon: CheckCircle, color: "#a5b4fc" },
        ].map((card) => (
          <div key={card.label} className="glass rounded-xl p-5 glass-hover transition-all">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>{card.label}</div>
                <div className="text-2xl font-semibold text-white font-mono">{card.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{card.sub}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}20` }}>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Activity Funnel Summary */}
      <div className="glass rounded-xl p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-3 md:mb-2 gap-2">
          <span className="text-sm font-semibold text-white">Sales Funnel Snapshot</span>
          <span className="text-xs" style={{ color: "var(--muted)" }}>Upcoming next actions: {d.activityStats.upcomingNextActions}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {[{
            title: "Total Activities",
            value: d.activityStats.total,
            sub: "Meetings, calls, notes",
          }, {
            title: "Converted to Deals",
            value: d.activityStats.converted,
            sub: "Pipeline-ready",
          }, {
            title: "Conversion Rate",
            value: `${d.activityStats.conversionRate.toFixed(1)}%`,
            sub: "Activity → Deal",
          }].map(card => (
            <div key={card.title} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{card.title}</div>
              <div className="text-xl font-semibold text-white mt-1">{card.value}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{card.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Billability Bar */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-white">Billable vs Non-Billable Hours</span>
          <span className="text-sm font-mono" style={{ color: "var(--muted)" }}>{formatHours(d.billableHours)} / {formatHours(d.monthlyHours)}</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.billableRate}%`, background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
        </div>
        <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--muted)" }}>
          <span>Billable {d.billableRate.toFixed(0)}%</span>
          <span>Non-billable {(100 - d.billableRate).toFixed(0)}%</span>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="glass rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Recent Activities</h2>
        {d.recentActivities.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>No activities yet. Start by adding companies in CRM.</div>
        ) : (
          <div className="space-y-3">
            {d.recentActivities.map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: activityColor[act.type] || "#64748b" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: activityColor[act.type] }}>{act.type}</span>
                    {act.company && <span className="text-xs text-white">{act.company.name}</span>}
                    {act.contact && <span className="text-xs" style={{ color: "var(--muted)" }}>{act.contact.firstName} {act.contact.lastName}</span>}
                  </div>
                  {act.notes && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{act.notes}</div>}
                </div>
                <div className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
                  {new Date(act.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions - Desktop only */}
      <div className="hidden md:block glass rounded-xl p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Quick Actions</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Add Company", href: "/crm/companies", emoji: "🏢" },
            { label: "Log Time", href: "/timesheet", emoji: "⏱️" },
            { label: "New Invoice", href: "/finance/invoices", emoji: "📄" },
            { label: "Add Expense", href: "/finance/expenses", emoji: "💸" },
          ].map((q) => (
            <a key={q.label} href={q.href} className="glass rounded-lg p-4 flex flex-col items-center gap-2 glass-hover transition-all cursor-pointer text-center">
              <span className="text-2xl">{q.emoji}</span>
              <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{q.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

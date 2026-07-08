"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { TrendingUp, Clock, DollarSign, AlertTriangle, CheckCircle, CalendarClock, ArrowRight } from "lucide-react";
import { formatCurrency, formatHours } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expense-categories";
import { TYPE_LABELS, TYPE_COLORS, STAGE_LABELS } from "@/components/crm/constants";

interface DashData {
  totalPipeline: number;
  dealCount: number;
  dealFunnel: Array<{ stage: string; count: number; amount: number }>;
  monthlyRevenue: number;
  monthlyExpenses: number;
  netPL: number;
  totalPending: number;
  expectedIncome: number;
  overdueCount: number;
  totalOverdue: number;
  monthlyHours: number;
  billableHours: number;
  billableRate: number;
  topProjects: Array<{ name: string; hours: number; logoUrl?: string; companyName?: string }>;
  topExpenseCategories: Array<{ category: string; amount: number }>;
  activityStats: {
    total: number;
    converted: number;
    conversionRate: number;
    upcomingNextActions: number;
  };
  recentActivities: Array<{ id: string; type: string; notes: string; company?: { name: string }; contacts?: { firstName: string; lastName: string }[]; createdAt: string }>;
  upcomingActions: Array<{ id: string; type: string; notes: string | null; nextActionDate: string; companyName: string | null }>;
}

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/dashboard")
      .then(r => {
        if (!r.ok) throw new Error("dashboard fetch failed");
        return r.json();
      })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm" style={{ color: "var(--muted)" }}>Yükleniyor...</div>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="text-sm" style={{ color: "var(--muted)" }}>Dashboard verileri yüklenemedi.</div>
      <button className="btn-primary text-xs" onClick={load}>Tekrar Dene</button>
    </div>
  );

  const d = data;
  const today = new Date();

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in pt-16 md:pt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-12 rounded-xl overflow-hidden shadow-lg ring-2 ring-white/10 shrink-0 bg-white/60 p-1">
            <Image src="/metaplm_logo_2.png" alt="MetaPLM" width={80} height={56} className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight" style={{ color: "#014670" }}>
              Meta<span style={{ color: "#0284c7" }}>PLM</span> <span className="font-normal" style={{ color: "var(--text)" }}>Workspace</span>
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {today.toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Aktivite Ekle", href: "/crm/activities" },
            { label: "Zaman Kaydet", href: "/timesheet" },
            { label: "Fatura", href: "/finance/invoices" },
            { label: "Gider", href: "/finance/expenses" },
          ].map(q => (
            <Link key={q.href} href={q.href} className="btn-ghost text-xs">{q.label}</Link>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Pipeline Değeri", value: formatCurrency(d.totalPipeline, "TRY"), sub: `${d.dealCount} aktif fırsat`, icon: TrendingUp, color: "#6366f1", href: "/crm/deals" },
          { label: "Aylık Gelir", value: formatCurrency(d.monthlyRevenue, "TRY"), sub: `bekleyen tahsilat ${formatCurrency(d.totalPending, "TRY")}`, icon: DollarSign, color: "#10b981", href: "/finance/invoices" },
          { label: "Aylık Gider", value: formatCurrency(d.monthlyExpenses, "TRY"), sub: "bu ay toplam harcama", icon: AlertTriangle, color: "#f59e0b", href: "/finance/expenses" },
          { label: "Net Kâr/Zarar", value: formatCurrency(d.netPL, "TRY"), sub: "bu ay gelir − gider", icon: CheckCircle, color: d.netPL >= 0 ? "#10b981" : "#ef4444", href: "/finance" },
          { label: "Bu Ay Çalışılan", value: formatHours(d.monthlyHours), sub: `%${d.billableRate.toFixed(0)} faturalanabilir`, icon: Clock, color: "#06b6d4", href: "/timesheet" },
          { label: "Geciken Fatura", value: `${d.overdueCount}`, sub: d.overdueCount > 0 ? formatCurrency(d.totalOverdue, "TRY") : "geciken fatura yok", icon: AlertTriangle, color: d.overdueCount > 0 ? "#ef4444" : "#64748b", href: "/finance/invoices" },
        ].map((card) => (
          <Link key={card.label} href={card.href} className="glass rounded-xl p-5 glass-hover transition-all block">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-medium mb-3" style={{ color: "var(--muted)" }}>{card.label}</div>
                <div className="text-2xl font-semibold font-mono" style={{ color: "var(--text)" }}>{card.value}</div>
                <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{card.sub}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${card.color}20` }}>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Upcoming Actions + Deal Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming next actions */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
              <CalendarClock size={15} style={{ color: "#f59e0b" }} /> Yaklaşan Aksiyonlar
            </h2>
            <Link href="/crm/activities" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
              Tümü ({d.activityStats.upcomingNextActions}) <ArrowRight size={12} />
            </Link>
          </div>
          {(!d.upcomingActions || d.upcomingActions.length === 0) ? (
            <div className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
              Planlanmış aksiyon yok. Aktivitelere &quot;sonraki adım&quot; tarihi ekleyin.
            </div>
          ) : (
            <div className="space-y-3">
              {d.upcomingActions.map(a => (
                <Link key={a.id} href="/crm/activities" className="flex items-start gap-3 group">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_COLORS[a.type] || "#64748b" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: TYPE_COLORS[a.type] || "var(--text)" }}>{TYPE_LABELS[a.type] || a.type}</span>
                      {a.companyName && <span className="text-xs truncate group-hover:underline" style={{ color: "var(--text)" }}>{a.companyName}</span>}
                    </div>
                    {a.notes && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{a.notes}</div>}
                  </div>
                  <div className="text-xs shrink-0 font-medium" style={{ color: "#f59e0b" }}>
                    {new Date(a.nextActionDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Deal Stage Funnel */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pipeline Hunisi</h2>
            <Link href="/crm/deals" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
              {d.dealCount} aktif fırsat <ArrowRight size={12} />
            </Link>
          </div>
          {d.dealCount === 0 ? (
            <div className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>Henüz aktif fırsat yok.</div>
          ) : (
            <div className="space-y-3">
              {d.dealFunnel.map((stage, idx) => {
                const maxAmount = Math.max(...d.dealFunnel.map(s => s.amount), 1);
                const widthPercent = (stage.amount / maxAmount) * 100;
                const colors = ["#64748b", "#6366f1", "#8b5cf6", "#f59e0b"];
                return (
                  <div key={stage.stage}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: "var(--muted)" }}>{STAGE_LABELS[stage.stage] || stage.stage}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium" style={{ color: "var(--text)" }}>{stage.count} fırsat</span>
                        <span className="font-mono" style={{ color: colors[idx] }}>{formatCurrency(stage.amount, "TRY")}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${widthPercent}%`, background: colors[idx] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expense & Timesheet Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Expense Breakdown */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Bu Ayın Giderleri</h2>
            <Link href="/finance/expenses" className="text-xs font-mono hover:underline" style={{ color: "var(--muted)" }}>{formatCurrency(d.monthlyExpenses, "TRY")}</Link>
          </div>
          {d.topExpenseCategories.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: "var(--muted)" }}>Bu ay gider kaydı yok</div>
          ) : (
            <div className="space-y-3">
              {d.topExpenseCategories.map((cat, idx) => {
                const percent = d.monthlyExpenses > 0 ? (cat.amount / d.monthlyExpenses) * 100 : 0;
                const colors = ["#ef4444", "#f59e0b", "#10b981"];
                return (
                  <div key={cat.category}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span style={{ color: "var(--muted)" }}>{EXPENSE_CATEGORY_LABELS[cat.category] || cat.category}</span>
                      <span className="font-mono" style={{ color: "var(--text)" }}>{formatCurrency(cat.amount, "TRY")}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: colors[idx] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Timesheet by Project */}
        <div className="glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Projelere Göre Saatler</h2>
            <Link href="/timesheet/reports" className="text-xs font-mono hover:underline" style={{ color: "var(--muted)" }}>{formatHours(d.monthlyHours)} toplam</Link>
          </div>
          {d.topProjects.length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: "var(--muted)" }}>Bu ay zaman kaydı yok</div>
          ) : (
            <div className="space-y-3">
              {d.topProjects.map((proj, idx) => {
                const percent = d.monthlyHours > 0 ? (proj.hours / d.monthlyHours) * 100 : 0;
                const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];
                return (
                  <div key={proj.name}>
                    <div className="flex items-center justify-between text-xs mb-1 gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {proj.logoUrl ? (
                          <img src={proj.logoUrl} alt={proj.companyName || ""} className="w-4 h-4 rounded object-contain shrink-0" style={{ opacity: 0.85 }} />
                        ) : proj.companyName ? (
                          <div className="w-4 h-4 rounded shrink-0 flex items-center justify-center text-[9px] font-bold" style={{ background: colors[idx] + "33", color: colors[idx] }}>
                            {proj.companyName[0]}
                          </div>
                        ) : null}
                        <span className="truncate" style={{ color: "var(--text)" }}>{proj.name}</span>
                        {proj.companyName && proj.companyName !== proj.name && (
                          <span className="truncate text-[10px] shrink-0" style={{ color: "var(--muted)" }}>{proj.companyName}</span>
                        )}
                      </div>
                      <span className="font-mono shrink-0" style={{ color: "var(--muted)" }}>{formatHours(proj.hours)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface2)" }}>
                      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: colors[idx] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activities */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Son Aktiviteler</h2>
          <Link href="/crm/activities" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
            Tümü <ArrowRight size={12} />
          </Link>
        </div>
        {d.recentActivities.length === 0 ? (
          <div className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>Henüz aktivite yok. CRM&apos;de şirket ekleyerek başlayın.</div>
        ) : (
          <div className="space-y-3">
            {d.recentActivities.slice(0, 5).map((act) => (
              <div key={act.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_COLORS[act.type] || "#64748b" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium" style={{ color: TYPE_COLORS[act.type] }}>{TYPE_LABELS[act.type] || act.type}</span>
                    {act.company && <span className="text-xs" style={{ color: "var(--text)" }}>{act.company.name}</span>}
                    {act.contacts && act.contacts.length > 0 && <span className="text-xs truncate" style={{ color: "var(--muted)" }}>{act.contacts.map(c => `${c.firstName} ${c.lastName}`).join(", ")}</span>}
                  </div>
                  {act.notes && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{act.notes}</div>}
                </div>
                <div className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
                  {new Date(act.createdAt).toLocaleDateString("tr-TR")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

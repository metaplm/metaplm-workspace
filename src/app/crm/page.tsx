"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Users, TrendingUp, ArrowRight, Activity, CalendarClock, Percent } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { TYPE_LABELS, TYPE_COLORS, STAGE_LABELS } from "@/components/crm/constants";

interface CrmData {
  totalPipeline: number;
  dealCount: number;
  dealFunnel: Array<{ stage: string; count: number; amount: number }>;
  activityStats: { total: number; converted: number; conversionRate: number; upcomingNextActions: number };
  recentActivities: Array<{ id: string; type: string; notes: string; company?: { name: string }; createdAt: string }>;
  upcomingActions: Array<{ id: string; type: string; notes: string | null; nextActionDate: string; companyName: string | null }>;
}

const quickNav = [
  { label: "Şirketler", href: "/crm/companies", icon: Building2 },
  { label: "Kişiler", href: "/crm/contacts", icon: Users },
  { label: "Aktiviteler", href: "/crm/activities", icon: Activity },
  { label: "Fırsatlar", href: "/crm/deals", icon: TrendingUp },
];

export default function CRMPage() {
  const [data, setData] = useState<CrmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetch("/api/dashboard")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in pt-16 md:pt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>CRM Genel Bakış</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Pipeline, aksiyonlar ve son aktiviteler</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickNav.map(item => (
            <Link key={item.href} href={item.href} className="btn-ghost text-xs flex items-center gap-1.5">
              <item.icon size={13} /> {item.label}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm py-16 text-center" style={{ color: "var(--muted)" }}>Yükleniyor...</div>
      ) : error || !data ? (
        <div className="flex flex-col items-center py-16 gap-3">
          <div className="text-sm" style={{ color: "var(--muted)" }}>CRM verileri yüklenemedi.</div>
          <button className="btn-primary text-xs" onClick={load}>Tekrar Dene</button>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Pipeline Değeri", value: formatCurrency(data.totalPipeline, "TRY"), icon: TrendingUp, color: "#6366f1", href: "/crm/deals" },
              { label: "Aktif Fırsat", value: `${data.dealCount}`, icon: TrendingUp, color: "#8b5cf6", href: "/crm/deals" },
              { label: "Yaklaşan Aksiyon", value: `${data.activityStats.upcomingNextActions}`, icon: CalendarClock, color: "#f59e0b", href: "/crm/activities" },
              { label: "Aktivite → Fırsat", value: `%${data.activityStats.conversionRate.toFixed(0)}`, icon: Percent, color: "#10b981", href: "/crm/reports" },
            ].map(k => (
              <Link key={k.label} href={k.href} className="glass rounded-xl p-4 glass-hover block">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>{k.label}</div>
                    <div className="text-xl font-semibold font-mono" style={{ color: "var(--text)" }}>{k.value}</div>
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${k.color}20` }}>
                    <k.icon size={15} style={{ color: k.color }} />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Funnel */}
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Pipeline Hunisi</h2>
                <Link href="/crm/deals" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
                  Fırsatlara git <ArrowRight size={12} />
                </Link>
              </div>
              {data.dealCount === 0 ? (
                <div className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>Henüz aktif fırsat yok.</div>
              ) : (
                <div className="space-y-3">
                  {data.dealFunnel.map((stage, idx) => {
                    const maxAmount = Math.max(...data.dealFunnel.map(s => s.amount), 1);
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
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(stage.amount / maxAmount) * 100}%`, background: colors[idx] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Upcoming actions */}
            <div className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
                  <CalendarClock size={15} style={{ color: "#f59e0b" }} /> Yaklaşan Aksiyonlar
                </h2>
                <Link href="/crm/activities" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
                  Tümü <ArrowRight size={12} />
                </Link>
              </div>
              {(!data.upcomingActions || data.upcomingActions.length === 0) ? (
                <div className="text-xs text-center py-6" style={{ color: "var(--muted)" }}>
                  Planlanmış aksiyon yok. Aktivitelere &quot;sonraki adım&quot; tarihi ekleyin.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.upcomingActions.map(a => (
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
          </div>

          {/* Recent activities */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Son Aktiviteler</h2>
              <Link href="/crm/activities" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
                Tümü <ArrowRight size={12} />
              </Link>
            </div>
            {data.recentActivities.length === 0 ? (
              <div className="text-sm py-8 text-center" style={{ color: "var(--muted)" }}>Henüz aktivite yok.</div>
            ) : (
              <div className="space-y-3">
                {data.recentActivities.slice(0, 5).map(act => (
                  <div key={act.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TYPE_COLORS[act.type] || "#64748b" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: TYPE_COLORS[act.type] }}>{TYPE_LABELS[act.type] || act.type}</span>
                        {act.company && <span className="text-xs" style={{ color: "var(--text)" }}>{act.company.name}</span>}
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
        </>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expense-categories";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate?: string;
  issuedDate: string;
  deal?: { id: string; title: string; company?: { name: string } };
}
interface Expense {
  id: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  description?: string;
}

const INVOICE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak", PENDING: "Bekliyor", PAID: "Ödendi", OVERDUE: "Gecikti", CANCELLED: "İptal",
};

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetch("/api/invoices").then(r => { if (!r.ok) throw new Error(); return r.json(); }),
      fetch("/api/expenses").then(r => { if (!r.ok) throw new Error(); return r.json(); }),
    ])
      .then(([inv, exp]) => {
        setInvoices(Array.isArray(inv) ? inv : []);
        setExpenses(Array.isArray(exp) ? exp : []);
        setLoading(false);
      })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("tr-TR", { month: "short" }), month: d.getMonth(), year: d.getFullYear() };
  });

  const cashFlowData = months.map(({ label, month, year }) => {
    const income = invoices
      .filter(i => i.status === "PAID" && new Date(i.issuedDate).getMonth() === month && new Date(i.issuedDate).getFullYear() === year)
      .reduce((s, i) => s + i.amount, 0);
    const expense = expenses
      .filter(e => new Date(e.date).getMonth() === month && new Date(e.date).getFullYear() === year)
      .reduce((s, e) => s + e.amount, 0);
    return { label, income, expense, net: income - expense };
  });

  const categoryBreakdown = Object.entries(
    expenses.reduce((acc, e) => {
      const cat = e.category || "GENEL";
      acc[cat] = (acc[cat] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];

  const isThisMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  };
  const monthlyIncome = invoices.filter(i => i.status === "PAID" && isThisMonth(i.issuedDate)).reduce((s, i) => s + i.amount, 0);
  const monthlyExpense = expenses.filter(e => isThisMonth(e.date)).reduce((s, e) => s + e.amount, 0);
  const pendingRevenue = invoices.filter(i => ["PENDING", "DRAFT"].includes(i.status)).reduce((s, i) => s + i.amount, 0);

  const openInvoices = invoices
    .filter(i => !["PAID", "CANCELLED"].includes(i.status))
    .sort((a, b) => new Date(a.dueDate || a.issuedDate).getTime() - new Date(b.dueDate || b.issuedDate).getTime())
    .slice(0, 5);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass rounded-lg p-3 text-xs">
        <div className="font-semibold mb-2" style={{ color: "var(--text)" }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: "var(--muted)" }}>{p.name}:</span>
            <span className="font-mono" style={{ color: "var(--text)" }}>{formatCurrency(p.value, "TRY")}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-sm" style={{ color: "var(--muted)" }}>Yükleniyor...</div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <div className="text-sm" style={{ color: "var(--muted)" }}>Finans verileri yüklenemedi.</div>
      <button className="btn-primary text-xs" onClick={load}>Tekrar Dene</button>
    </div>
  );

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in pt-16 md:pt-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Finans Genel Bakış</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Bu ayın kâr/zarar özeti ve nakit akışı</p>
        </div>
        <Link href="/finance/reports" className="btn-ghost text-xs flex items-center gap-1">
          Detaylı Raporlar <ArrowRight size={12} />
        </Link>
      </div>

      {/* KPIs — bu ay */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          { label: "Bu Ay Gelir", value: formatCurrency(monthlyIncome, "TRY"), color: "#34d399", href: "/finance/invoices" },
          { label: "Bu Ay Gider", value: formatCurrency(monthlyExpense, "TRY"), color: "#f87171", href: "/finance/expenses" },
          { label: "Bu Ay Net", value: formatCurrency(monthlyIncome - monthlyExpense, "TRY"), color: monthlyIncome - monthlyExpense >= 0 ? "#34d399" : "#f87171", href: "/finance/reports" },
          { label: "Bekleyen Tahsilat", value: formatCurrency(pendingRevenue, "TRY"), color: "#fbbf24", href: "/finance/invoices" },
        ].map(k => (
          <Link key={k.label} href={k.href} className="glass rounded-xl p-4 glass-hover block">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{k.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: k.color }}>{k.value}</div>
          </Link>
        ))}
      </div>

      {/* Cash Flow: gelir/gider barları + net çizgisi tek grafikte */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Son 6 Ay Nakit Akışı</h2>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={cashFlowData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₺${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="income" name="Gelir" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Gider" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
            <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Açık faturalar */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>Açık Faturalar</h2>
            <Link href="/finance/invoices" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#6366f1" }}>
              Tümü <ArrowRight size={12} />
            </Link>
          </div>
          {openInvoices.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm" style={{ color: "var(--muted)" }}>Açık fatura yok</div>
          ) : (
            <div className="space-y-2">
              {openInvoices.map(inv => {
                const overdue = inv.dueDate && new Date(inv.dueDate) < now;
                return (
                  <Link key={inv.id} href="/finance/invoices" className="flex items-center justify-between gap-3 py-1.5 group">
                    <div className="min-w-0">
                      <div className="text-xs truncate group-hover:underline" style={{ color: "var(--text)" }}>
                        {inv.deal?.company?.name || inv.deal?.title || "—"}
                      </div>
                      <div className="text-[11px]" style={{ color: overdue ? "#ef4444" : "var(--muted)" }}>
                        {overdue ? "Gecikti" : INVOICE_STATUS_LABELS[inv.status] || inv.status}
                        {inv.dueDate && ` · vade ${new Date(inv.dueDate).toLocaleDateString("tr-TR")}`}
                      </div>
                    </div>
                    <span className="font-mono text-xs shrink-0" style={{ color: overdue ? "#ef4444" : "var(--text)" }}>
                      {formatCurrency(inv.amount, "TRY")}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Kategoriye göre gider */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text)" }}>Kategoriye Göre Gider</h2>
          {categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--muted)" }}>Henüz gider kaydı yok</div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={0}>
                    {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {categoryBreakdown.map((t, i) => (
                  <div key={t.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: "var(--muted)" }}>{EXPENSE_CATEGORY_LABELS[t.name] || t.name}</span>
                    </div>
                    <span className="font-mono" style={{ color: "var(--text)" }}>{formatCurrency(t.value, "TRY")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

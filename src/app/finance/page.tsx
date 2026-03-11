"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

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
  deal?: { id: string; title: string; company?: { name: string } };
}

export default function FinanceDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetch("/api/invoices").then(r => r.json()).then(setInvoices);
    fetch("/api/expenses").then(r => r.json()).then(setExpenses);
  }, []);

  const now = new Date();
  const thirtyDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { label: d.toLocaleString("default", { month: "short" }), month: d.getMonth(), year: d.getFullYear() };
  });

  const cashFlowData = thirtyDays.map(({ label, month, year }) => {
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
      const cat = e.category || 'GENEL';
      acc[cat] = (acc[cat] || 0) + e.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);

  const CATEGORY_LABELS: Record<string, string> = {
    ARAC: 'Araç', YEMEK: 'Yemek', MUHASEBE: 'Muhasebe',
    DEMIRBAS: 'Demirbaş', GENEL: 'Genel', VERGI: 'Vergi', KIRA: 'Kira',
  };

  const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];

  const totalIncome = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;
  const pendingRevenue = invoices.filter(i => ["PENDING", "DRAFT"].includes(i.status)).reduce((s, i) => s + i.amount, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="glass rounded-lg p-3 text-xs">
        <div className="font-semibold mb-2 text-white">{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span style={{ color: "var(--muted)" }}>{p.name}:</span>
            <span className="font-mono text-white">{formatCurrency(p.value, "TRY")}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <div>
        <h1 className="text-xl font-semibold text-white">Financial Dashboard</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>P&L overview and cash flow projection</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: formatCurrency(totalIncome, "TRY"), color: "#34d399" },
          { label: "Total Expenses", value: formatCurrency(totalExpenses, "TRY"), color: "#f87171" },
          { label: "Net Profit", value: formatCurrency(netProfit, "TRY"), color: netProfit >= 0 ? "#34d399" : "#f87171" },
          { label: "Pending Revenue", value: formatCurrency(pendingRevenue, "TRY"), color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} className="glass rounded-xl p-4">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{k.label}</div>
            <div className="text-xl font-semibold font-mono" style={{ color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Cash Flow Chart */}
      <div className="glass rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">6-Month Cash Flow</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={cashFlowData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₺${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="income" name="Income" fill="#6366f1" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Net P&L Line Chart */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Net P&L Trend</h2>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cashFlowData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Tag */}
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Expense by Category</h2>
          {categoryBreakdown.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--muted)" }}>No expenses yet</div>
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
                      <span style={{ color: "var(--muted)" }}>{CATEGORY_LABELS[t.name] || t.name}</span>
                    </div>
                    <span className="font-mono text-white">{formatCurrency(t.value, "TRY")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* VAT Estimate */}
      <div className="glass rounded-xl p-5" style={{ borderColor: "rgba(245,158,11,0.2)" }}>
        <h2 className="text-sm font-semibold text-white mb-2">Estimated Tax Burden (VAT ~20%)</h2>
        <div className="flex items-center gap-8 text-sm">
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>Output VAT (on revenue)</div>
            <div className="font-mono font-semibold" style={{ color: "#fbbf24" }}>{formatCurrency(totalIncome * 0.2, "TRY")}</div>
          </div>
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>Input VAT (on expenses)</div>
            <div className="font-mono font-semibold" style={{ color: "#34d399" }}>{formatCurrency(totalExpenses * 0.2, "TRY")}</div>
          </div>
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>Net VAT Payable</div>
            <div className="font-mono font-semibold text-white">{formatCurrency((totalIncome - totalExpenses) * 0.2, "TRY")}</div>
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>* Estimate only. Consult your accountant.</div>
        </div>
      </div>
      <div className="glass rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Detailed Finance Reports moved</h3>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Filtreli fatura/gider raporları yeni sayfada.</p>
        </div>
        <Link href="/finance/reports" className="btn-primary text-xs">Go to Reports</Link>
      </div>
    </div>
  );
}

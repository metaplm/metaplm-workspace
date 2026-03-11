"use client";

import { useEffect, useMemo, useState } from "react";
import { downloadCSV } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";

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

const CATEGORY_LABELS: Record<string, string> = {
  ARAC: 'Araç', YEMEK: 'Yemek', MUHASEBE: 'Muhasebe',
  DEMIRBAS: 'Demirbaş', GENEL: 'Genel', VERGI: 'Vergi',
};

type DateRange = { start: string; end: string };

export default function FinanceReportsPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoiceFilters, setInvoiceFilters] = useState({
    status: "ALL",
    company: "",
    minAmount: "",
    dates: defaultRange(),
  });
  const [expenseFilters, setExpenseFilters] = useState({
    category: "ALL",
    minAmount: "",
    dates: defaultRange(),
  });

  useEffect(() => {
    fetch("/api/invoices").then(r => r.json()).then(setInvoices);
    fetch("/api/expenses").then(r => r.json()).then(setExpenses);
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (invoiceFilters.status !== "ALL" && inv.status !== invoiceFilters.status) return false;
      if (invoiceFilters.company && !inv.deal?.company?.name?.toLowerCase().includes(invoiceFilters.company.toLowerCase())) return false;
      if (invoiceFilters.minAmount && inv.amount < Number(invoiceFilters.minAmount)) return false;
      if (!isWithinRange(inv.issuedDate, invoiceFilters.dates)) return false;
      return true;
    });
  }, [invoices, invoiceFilters]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (expenseFilters.category !== "ALL" && exp.category !== expenseFilters.category) return false;
      if (expenseFilters.minAmount && exp.amount < Number(expenseFilters.minAmount)) return false;
      if (!isWithinRange(exp.date, expenseFilters.dates)) return false;
      return true;
    });
  }, [expenses, expenseFilters]);

  const exportInvoices = () => {
    if (!filteredInvoices.length) return;
    downloadCSV(
      `finance-invoices-${invoiceFilters.dates.start}-${invoiceFilters.dates.end}`,
      ["Issued", "Number", "Company", "Amount", "Currency", "Status", "Due"],
      filteredInvoices.map(inv => [
        new Date(inv.issuedDate).toLocaleDateString(),
        inv.id,
        inv.deal?.company?.name || inv.deal?.title || "-",
        inv.amount,
        inv.currency,
        inv.status,
        inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : "-",
      ])
    );
  };

  const exportExpenses = () => {
    if (!filteredExpenses.length) return;
    downloadCSV(
      `finance-expenses-${expenseFilters.dates.start}-${expenseFilters.dates.end}`,
      ["Date", "Description", "Amount", "Currency", "Category", "Project"],
      filteredExpenses.map(exp => [
        new Date(exp.date).toLocaleDateString(),
        exp.description || "-",
        exp.amount,
        exp.currency,
        CATEGORY_LABELS[exp.category] || exp.category,
        exp.deal?.title || "-",
      ])
    );
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Finance Reports</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Filter invoices & expenses, export CSV</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Invoice Report</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Filter billed revenue</p>
              </div>
              <button className="btn-primary text-xs" onClick={exportInvoices} disabled={!filteredInvoices.length}>Export CSV</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label style={{ color: "var(--muted)" }}>From</label>
                <input type="date" value={invoiceFilters.dates.start} onChange={e => setInvoiceFilters(f => ({ ...f, dates: { ...f.dates, start: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>To</label>
                <input type="date" value={invoiceFilters.dates.end} onChange={e => setInvoiceFilters(f => ({ ...f, dates: { ...f.dates, end: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Status</label>
                <select value={invoiceFilters.status} onChange={e => setInvoiceFilters(f => ({ ...f, status: e.target.value }))}>
                  {["ALL", "DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"].map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Company</label>
                <input type="text" placeholder="Search" value={invoiceFilters.company} onChange={e => setInvoiceFilters(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Min Amount</label>
                <input type="number" min={0} value={invoiceFilters.minAmount} onChange={e => setInvoiceFilters(f => ({ ...f, minAmount: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <h4 className="text-sm font-semibold text-white">Invoices ({filteredInvoices.length})</h4>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{formatCurrency(filteredInvoices.reduce((s, i) => s + i.amount, 0), "USD")}</span>
            </div>
            <div className="max-h-72 overflow-auto text-xs">
              <table className="w-full">
                <thead style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
                  <tr>
                    <th className="text-left py-2 px-4">Issued</th>
                    <th className="text-left py-2 px-4">Company</th>
                    <th className="text-left py-2 px-4">Amount</th>
                    <th className="text-left py-2 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-2 px-4 text-white">{new Date(inv.issuedDate).toLocaleDateString()}</td>
                      <td className="py-2 px-4">{inv.deal?.company?.name || inv.deal?.title || "-"}</td>
                      <td className="py-2 px-4 font-mono text-white">{formatCurrency(inv.amount, inv.currency)}</td>
                      <td className="py-2 px-4">{inv.status}</td>
                    </tr>
                  ))}
                  {!filteredInvoices.length && (
                    <tr><td colSpan={4} className="py-6 text-center" style={{ color: "var(--muted)" }}>No invoices for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Expense Report</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Track cash out</p>
              </div>
              <button className="btn-primary text-xs" onClick={exportExpenses} disabled={!filteredExpenses.length}>Export CSV</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label style={{ color: "var(--muted)" }}>From</label>
                <input type="date" value={expenseFilters.dates.start} onChange={e => setExpenseFilters(f => ({ ...f, dates: { ...f.dates, start: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>To</label>
                <input type="date" value={expenseFilters.dates.end} onChange={e => setExpenseFilters(f => ({ ...f, dates: { ...f.dates, end: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Category</label>
                <select value={expenseFilters.category} onChange={e => setExpenseFilters(f => ({ ...f, category: e.target.value }))}>
                  <option value="ALL">All</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Min Amount</label>
                <input type="number" min={0} value={expenseFilters.minAmount} onChange={e => setExpenseFilters(f => ({ ...f, minAmount: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <h4 className="text-sm font-semibold text-white">Expenses ({filteredExpenses.length})</h4>
              <span className="text-xs" style={{ color: "var(--muted)" }}>{formatCurrency(filteredExpenses.reduce((s, e) => s + e.amount, 0), "USD")}</span>
            </div>
            <div className="max-h-72 overflow-auto text-xs">
              <table className="w-full">
                <thead style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
                  <tr>
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Description</th>
                    <th className="text-left py-2 px-4">Amount</th>
                    <th className="text-left py-2 px-4">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-2 px-4 text-white">{new Date(exp.date).toLocaleDateString()}</td>
                      <td className="py-2 px-4">{exp.description || "—"}</td>
                      <td className="py-2 px-4 font-mono text-white">-{formatCurrency(exp.amount, exp.currency)}</td>
                      <td className="py-2 px-4">{CATEGORY_LABELS[exp.category] || exp.category}</td>
                    </tr>
                  ))}
                  {!filteredExpenses.length && (
                    <tr><td colSpan={4} className="py-6 text-center" style={{ color: "var(--muted)" }}>No expenses for this filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultRange(): DateRange {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatISO(first), end: formatISO(last) };
}

function formatISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWithinRange(date: string, range: DateRange) {
  if (!range.start && !range.end) return true;
  const value = new Date(date).getTime();
  const start = range.start ? new Date(range.start).getTime() : -Infinity;
  const end = range.end ? new Date(range.end).getTime() : Infinity;
  return value >= start && value <= end;
}

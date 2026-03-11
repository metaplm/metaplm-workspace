"use client";

import { useEffect, useMemo, useState } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { downloadCSV } from "@/lib/export";
import { formatHours } from "@/lib/utils";

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  category: string;
  billable: boolean;
  notes?: string;
  customerName?: string;
  deal?: { id: string; title: string; company?: { name: string } };
}
interface Category { id: string; name: string; }
interface Deal { id: string; title: string; company?: { name: string } }

type ReportFilters = {
  start: string;
  end: string;
  dealId: string;
  category: string;
  customer: string;
  billable: "all" | "billable" | "nonbillable";
};

export default function TimesheetReportsPage() {
  const [reportEntries, setReportEntries] = useState<TimeEntry[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
      dealId: "",
      category: "",
      customer: "",
      billable: "all",
    };
  });

  useEffect(() => {
    fetch("/api/categories").then(r => r.json()).then(setCategories);
    fetch("/api/deals").then(r => r.json()).then(setDeals);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.start) params.set("start", filters.start);
    if (filters.end) params.set("end", filters.end);
    if (filters.dealId) params.set("dealId", filters.dealId);
    if (filters.category) params.set("category", filters.category);
    if (filters.customer) params.set("customer", filters.customer);
    if (filters.billable === "billable") params.set("billable", "true");
    if (filters.billable === "nonbillable") params.set("billable", "false");

    setReportLoading(true);
    fetch(`/api/timeentries?${params.toString()}`)
      .then(r => r.json())
      .then(setReportEntries)
      .finally(() => setReportLoading(false));
  }, [filters]);

  const totals = useMemo(() => {
    const total = reportEntries.reduce((s, e) => s + e.hours, 0);
    const billable = reportEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
    return { total, billable };
  }, [reportEntries]);

  const exportReport = () => {
    if (!reportEntries.length) return;
    downloadCSV(
      `timesheet-report-${filters.start || "start"}-${filters.end || "end"}`,
      ["Date", "Customer", "Project", "Category", "Billable", "Hours", "Notes"],
      reportEntries.map(entry => [
        format(new Date(entry.date), "yyyy-MM-dd"),
        entry.customerName || entry.deal?.company?.name || "-",
        entry.deal?.title || "No Project",
        entry.category,
        entry.billable ? "Yes" : "No",
        entry.hours,
        entry.notes || "",
      ])
    );
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Timesheet Reports</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Filtrele ve CSV indir</p>
        </div>
        <button className="btn-primary text-xs" onClick={exportReport} disabled={reportLoading || !reportEntries.length}>Export CSV</button>
      </div>

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>From</label>
            <input type="date" value={filters.start} onChange={e => setFilters(f => ({ ...f, start: e.target.value }))} />
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>To</label>
            <input type="date" value={filters.end} onChange={e => setFilters(f => ({ ...f, end: e.target.value }))} />
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Billable</label>
            <select value={filters.billable} onChange={e => setFilters(f => ({ ...f, billable: e.target.value as ReportFilters["billable"] }))}>
              <option value="all">All</option>
              <option value="billable">Billable</option>
              <option value="nonbillable">Non-billable</option>
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Project</label>
            <select value={filters.dealId} onChange={e => setFilters(f => ({ ...f, dealId: e.target.value }))}>
              <option value="">All Deals</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.title}{d.company ? ` (${d.company.name})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Category</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">All</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Customer</label>
            <input type="text" placeholder="Search" value={filters.customer} onChange={e => setFilters(f => ({ ...f, customer: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="text-sm font-semibold text-white">{reportLoading ? "Loading…" : `${reportEntries.length} entries`}</h3>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{format(new Date(filters.start), "MMM d")} – {format(new Date(filters.end), "MMM d")} window</p>
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>{formatHours(totals.total)} total / {formatHours(totals.billable)} billable</div>
        </div>

        <div className="max-h-[420px] overflow-auto text-xs">
          <table className="w-full">
            <thead style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
              <tr>
                <th className="py-2 px-4 text-left font-medium">Date</th>
                <th className="py-2 px-4 text-left font-medium">Customer</th>
                <th className="py-2 px-4 text-left font-medium">Project</th>
                <th className="py-2 px-4 text-left font-medium">Category</th>
                <th className="py-2 px-4 text-right font-medium">Hours</th>
              </tr>
            </thead>
            <tbody>
              {reportEntries.map(entry => (
                <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-2 px-4 text-white">{format(new Date(entry.date), "MMM d")}</td>
                  <td className="py-2 px-4">{entry.customerName || entry.deal?.company?.name || "—"}</td>
                  <td className="py-2 px-4">{entry.deal?.title || "No Project"}</td>
                  <td className="py-2 px-4" style={{ color: "var(--muted)" }}>{entry.category}</td>
                  <td className="py-2 px-4 text-right font-mono text-white">{formatHours(entry.hours)}</td>
                </tr>
              ))}
              {reportEntries.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-center text-sm" colSpan={5} style={{ color: "var(--muted)" }}>No entries found for this filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

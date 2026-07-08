"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";
import { downloadCSV } from "@/lib/export";
import { formatHours } from "@/lib/utils";

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  category: string;
  billable: boolean;
  notes?: string;
  companyId?: string;
  company?: { id: string; name: string };
  projectId?: string;
  project?: { id: string; name: string };
}
interface Company { id: string; name: string; }
interface Project { id: string; name: string; companyId: string; }

const CATEGORIES = [
  { value: "TASK", label: "Görev" },
  { value: "MEETING", label: "Toplantı" },
  { value: "TRAINING", label: "Eğitim" },
  { value: "SUPPORT", label: "Destek" },
];

type ReportFilters = {
  start: string;
  end: string;
  companyId: string;
  projectId: string;
  category: string;
  billable: "all" | "billable" | "nonbillable";
};

// Geçersiz veya boş tarih girdilerinde çökmemek için güvenli ayrıştırma
const parseDate = (value: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

export default function TimesheetReportsPage() {
  const [reportEntries, setReportEntries] = useState<TimeEntry[]>([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const now = new Date();
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
      companyId: "",
      projectId: "",
      category: "",
      billable: "all",
    };
  });

  const startDate = parseDate(filters.start);
  const endDate = parseDate(filters.end);
  const invalidRange = !!(startDate && endDate && startDate > endDate);

  const loadLookups = useCallback(() => {
    setLoadError(false);
    fetch("/api/companies")
      .then(r => r.json())
      .then(data => setCompanies(Array.isArray(data) ? data : []))
      .catch(() => setLoadError(true));
    fetch("/api/projects")
      .then(r => r.json())
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => { loadLookups(); }, [loadLookups]);

  const filteredProjects = filters.companyId ? projects.filter(p => p.companyId === filters.companyId) : projects;

  useEffect(() => {
    const start = parseDate(filters.start);
    const end = parseDate(filters.end);
    // Tarih aralığı geçersizse sorguyu atla
    if (start && end && start > end) return;

    const params = new URLSearchParams();
    if (start) params.set("start", filters.start);
    if (end) params.set("end", filters.end);
    if (filters.companyId) params.set("companyId", filters.companyId);
    if (filters.projectId) params.set("projectId", filters.projectId);
    if (filters.category) params.set("category", filters.category);
    if (filters.billable === "billable") params.set("billable", "true");
    if (filters.billable === "nonbillable") params.set("billable", "false");

    setReportLoading(true);
    fetch(`/api/timeentries?${params.toString()}`)
      .then(r => r.json())
      .then(data => setReportEntries(Array.isArray(data) ? data : []))
      .catch(() => setLoadError(true))
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
      `timesheet-rapor-${filters.start || "baslangic"}-${filters.end || "bitis"}`,
      ["Tarih", "Müşteri", "Proje", "Kategori", "Faturalanabilir", "Saat", "Notlar"],
      reportEntries.map(entry => {
        const d = parseDate(entry.date);
        return [
          d ? format(d, "yyyy-MM-dd") : "—",
          entry.company?.name || "—",
          entry.project?.name || "—",
          entry.category,
          entry.billable ? "Evet" : "Hayır",
          entry.hours,
          entry.notes || "",
        ];
      })
    );
  };

  return (
    <div className="p-8 pt-16 md:pt-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Zaman Çizelgesi Raporları</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Filtrele ve CSV indir</p>
        </div>
        <button className="btn-primary text-xs" onClick={exportReport} disabled={reportLoading || !reportEntries.length}>CSV İndir</button>
      </div>

      {loadError && (
        <div className="glass rounded-xl p-4 flex items-center justify-between" style={{ border: "1px solid rgba(239,68,68,0.4)" }}>
          <span className="text-sm" style={{ color: "#fca5a5" }}>Veriler yüklenemedi. Lütfen tekrar deneyin.</span>
          <button onClick={loadLookups} className="btn-ghost text-xs">Yeniden Dene</button>
        </div>
      )}

      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Başlangıç</label>
            <input type="date" value={filters.start} onChange={e => setFilters(f => ({ ...f, start: e.target.value }))} />
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Bitiş</label>
            <input type="date" value={filters.end} onChange={e => setFilters(f => ({ ...f, end: e.target.value }))} />
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Faturalama</label>
            <select value={filters.billable} onChange={e => setFilters(f => ({ ...f, billable: e.target.value as ReportFilters["billable"] }))}>
              <option value="all">Tümü</option>
              <option value="billable">Faturalanabilir</option>
              <option value="nonbillable">Faturalanamaz</option>
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Müşteri (Şirket)</label>
            <select value={filters.companyId} onChange={e => setFilters(f => ({ ...f, companyId: e.target.value, projectId: "" }))}>
              <option value="">Tüm Şirketler</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Proje</label>
            <select value={filters.projectId} onChange={e => setFilters(f => ({ ...f, projectId: e.target.value }))} disabled={!filters.companyId && filteredProjects.length === 0}>
              <option value="">Tüm Projeler</option>
              {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block mb-1" style={{ color: "var(--muted)" }}>Kategori</label>
            <select value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
              <option value="">Tümü</option>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {invalidRange && (
          <div className="text-xs rounded-lg px-3 py-2" style={{ background: "rgba(245,158,11,0.1)", color: "#fbbf24" }}>
            Başlangıç tarihi bitiş tarihinden sonra olamaz. Lütfen tarih aralığını düzeltin.
          </div>
        )}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <h3 className="text-sm font-semibold text-white">{reportLoading ? "Yükleniyor…" : `${reportEntries.length} kayıt`}</h3>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              {startDate && endDate && !invalidRange
                ? `${format(startDate, "d MMM", { locale: tr })} – ${format(endDate, "d MMM", { locale: tr })} aralığı`
                : "Tarih aralığı seçilmedi"}
            </p>
          </div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>{formatHours(totals.total)} toplam / {formatHours(totals.billable)} faturalanabilir</div>
        </div>

        <div className="max-h-[420px] overflow-auto text-xs">
          <table className="w-full">
            <thead style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
              <tr>
                <th className="py-2 px-4 text-left font-medium">Tarih</th>
                <th className="py-2 px-4 text-left font-medium">Müşteri</th>
                <th className="py-2 px-4 text-left font-medium">Proje</th>
                <th className="py-2 px-4 text-left font-medium">Kategori</th>
                <th className="py-2 px-4 text-right font-medium">Saat</th>
              </tr>
            </thead>
            <tbody>
              {reportEntries.map(entry => {
                const entryDate = parseDate(entry.date);
                return (
                  <tr key={entry.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td className="py-2 px-4 text-white">{entryDate ? format(entryDate, "d MMM", { locale: tr }) : "—"}</td>
                    <td className="py-2 px-4">{entry.company?.name || "—"}</td>
                    <td className="py-2 px-4">{entry.project?.name || "—"}</td>
                    <td className="py-2 px-4" style={{ color: "var(--muted)" }}>{entry.category}</td>
                    <td className="py-2 px-4 text-right font-mono text-white">{formatHours(entry.hours)}</td>
                  </tr>
                );
              })}
              {reportEntries.length === 0 && (
                <tr>
                  <td className="py-6 px-4 text-center text-sm" colSpan={5} style={{ color: "var(--muted)" }}>Bu filtreye uygun kayıt bulunamadı.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

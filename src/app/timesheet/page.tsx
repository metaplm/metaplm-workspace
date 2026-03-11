
"use client";
import { useEffect, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, BarChart3, Pencil } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import Link from "next/link";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay } from "date-fns";
import { formatHours, getDayStatus, parseTimeInput } from "@/lib/utils";

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
  project?: { id: string; name: string; defaultBillable: boolean };
}
interface Company { id: string; name: string; }
interface Project { id: string; name: string; companyId: string; defaultBillable: boolean; }

const CATEGORIES = [
  { value: "TASK", label: "Task" },
  { value: "MEETING", label: "Meeting" },
  { value: "TRAINING", label: "Training" },
  { value: "SUPPORT", label: "Support" },
];

export default function TimesheetPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ value: "", unit: "hours", category: "TASK", billable: true, notes: "", companyId: "", projectId: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth() + 1;
    fetch(`/api/timeentries?year=${y}&month=${m}`).then(r => r.json()).then(setEntries);
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
    fetch("/api/projects").then(r => r.json()).then(setProjects);
  }, [currentDate]);

  useEffect(() => { load(); }, [load]);

  const companyProjects = projects.filter(p => p.companyId === form.companyId);


  const getDayEntries = (date: Date) => entries.filter(e => isSameDay(new Date(e.date), date));
  const getDayHours = (date: Date) => getDayEntries(date).reduce((s, e) => s + e.hours, 0);

  const openModal = (day: Date) => {
    setSelectedDay(day);
    setForm({ value: "", unit: "hours", category: "TASK", billable: true, notes: "", companyId: "", projectId: "" });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (entry: TimeEntry) => {
    setSelectedDay(new Date(entry.date));
    setForm({
      value: String(entry.hours),
      unit: "hours",
      category: entry.category,
      billable: entry.billable,
      notes: entry.notes || "",
      companyId: entry.companyId || "",
      projectId: entry.projectId || "",
    });
    setEditingId(entry.id);
    setShowModal(true);
  };

  const handleCompanyChange = (companyId: string) => {
    setForm(f => ({ ...f, companyId, projectId: "" }));
  };

  const handleProjectChange = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    setForm(f => ({ ...f, projectId, billable: proj?.defaultBillable ?? f.billable }));
  };

  const save = async () => {
    if (!selectedDay || !form.value || !form.category) return;
    setSaving(true);
    try {
      const payload = {
        value: form.value,
        unit: form.unit,
        category: form.category,
        billable: form.billable,
        notes: form.notes,
        companyId: form.companyId || null,
        projectId: form.projectId || null,
        date: format(selectedDay, "yyyy-MM-dd"),
      };
      if (editingId) {
        await fetch(`/api/timeentries/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/timeentries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  };

  const deleteEntry = async (id: string) => {
    await fetch(`/api/timeentries/${id}`, { method: "DELETE" });
    load();
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const monthTotal = entries.reduce((s, e) => s + e.hours, 0);
  const billableTotal = entries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);

  return (
    <div className="p-8 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Timesheet</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Click any day to log time</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "rgba(16,185,129,0.3)", border: "1px solid rgba(16,185,129,0.5)" }} /> <span className="text-xs">8h optimal</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "rgba(245,158,11,0.3)", border: "1px solid rgba(245,158,11,0.5)" }} /> <span className="text-xs">&lt;8h</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm" style={{ background: "rgba(249,115,22,0.3)", border: "1px solid rgba(249,115,22,0.5)" }} /> <span className="text-xs">overtime</span></div>
          </div>
        </div>
      </div>

      {/* Month Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Total Hours</div>
          <div className="text-xl font-semibold font-mono text-white">{formatHours(monthTotal)}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Billable</div>
          <div className="text-xl font-semibold font-mono" style={{ color: "#6366f1" }}>{formatHours(billableTotal)}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Non-Billable</div>
          <div className="text-xl font-semibold font-mono text-white">{formatHours(monthTotal - billableTotal)}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Billable Rate</div>
          <div className="text-xl font-semibold font-mono text-white">{monthTotal > 0 ? `${((billableTotal / monthTotal) * 100).toFixed(0)}%` : "0%"}</div>
        </div>
      </div>

      {/* Calendar Nav */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"><ChevronLeft size={16} /></button>
          <h2 className="text-sm font-semibold text-white">{format(currentDate, "MMMM yyyy")}</h2>
          <button onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white"><ChevronRight size={16} /></button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
            <div key={d} className="text-center py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>{d}</div>
          ))}
        </div>

        {/* Day Cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const inMonth = isSameMonth(day, currentDate);
            const hours = getDayHours(day);
            const status = inMonth ? getDayStatus(hours) : "empty";
            const dayEntries = getDayEntries(day);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={i}
                onClick={() => inMonth && openModal(day)}
                className="relative p-2 min-h-[90px] transition-all cursor-pointer group"
                style={{
                  borderRight: (i + 1) % 7 !== 0 ? "1px solid var(--border)" : "none",
                  borderBottom: i < days.length - 7 ? "1px solid var(--border)" : "none",
                  opacity: inMonth ? 1 : 0.3,
                  background: isCurrentDay ? "rgba(99,102,241,0.05)" : "transparent",
                }}
              >
                {/* Day number */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1 ${isCurrentDay ? "text-white" : "text-slate-400"}`}
                  style={isCurrentDay ? { background: "#6366f1" } : {}}>
                  {format(day, "d")}
                </div>

                {/* Hours badge */}
                {hours > 0 && (
                  <div className={`text-xs font-bold rounded-full px-1.5 py-0.5 mb-1 w-fit ${
                    status === "optimal" ? "text-emerald-900 dark:text-emerald-100" :
                    status === "overtime" ? "text-orange-900 dark:text-orange-100" : "text-amber-900 dark:text-amber-100"
                  }`} style={{
                    background: status === "optimal" ? "rgba(16,185,129,0.35)" :
                               status === "overtime" ? "rgba(249,115,22,0.35)" : "rgba(245,158,11,0.35)"
                  }}>
                    {formatHours(hours)}
                  </div>
                )}

                {/* Entry pills */}
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 2).map(e => (
                    <div key={e.id} className={`text-xs truncate rounded px-1 py-0.5 font-medium ${
                      e.billable ? "text-indigo-900 dark:text-indigo-100" : "text-slate-900 dark:text-slate-100"
                    }`} style={{ background: e.billable ? "rgba(99,102,241,0.35)" : "rgba(100,116,139,0.35)", fontSize: "10px" }}>
                      {e.company?.name || e.project?.name || e.category}
                    </div>
                  ))}
                  {dayEntries.length > 2 && <div className="text-xs" style={{ color: "var(--muted)", fontSize: "10px" }}>+{dayEntries.length - 2} more</div>}
                </div>

                {/* Add button on hover */}
                {inMonth && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={12} style={{ color: "#6366f1" }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Reports redirect */}
      <div className="glass rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Detailed Reports moved</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Raporlar artık ayrı bir sayfada.</p>
        </div>
        <Link href="/timesheet/reports" className="btn-primary flex items-center gap-2 text-xs">
          <BarChart3 size={14} /> Go to Reports
        </Link>
      </div>

      {/* Log Time Modal */}
      {showModal && selectedDay && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">{editingId ? "Edit Time Entry" : "Log Time"}</h2>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{format(selectedDay, "EEEE, MMMM d, yyyy")}</div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Existing entries for this day */}
            {getDayEntries(selectedDay).length > 0 && (
              <div className="mb-4 space-y-2">
                <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>Logged today:</div>
                {getDayEntries(selectedDay).map(e => (
                  <div key={e.id} className="flex items-center justify-between text-xs rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <span className="text-white">{e.company?.name || e.project?.name || e.category} — {formatHours(e.hours)}</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={
                          e.billable
                            ? { background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }
                            : { background: "rgba(100,116,139,0.2)", color: "#94a3b8" }
                        }
                      >
                        {e.billable ? "Billable" : "Non-billable"}
                      </span>
                      <button onClick={() => openEdit(e)} className="hover:text-blue-400" style={{ color: "var(--muted)" }}><Pencil size={12} /></button>
                      <button onClick={() => deleteEntry(e.id)} className="hover:text-red-400" style={{ color: "var(--muted)" }}><X size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3">
              {/* Time Input with unit toggle */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Effort *</label>
                <div className="flex gap-2">
                  <input type="number" step="0.25" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder="0" className="flex-1 text-sm" />
                  <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                    {["hours", "days"].map(u => (
                      <button key={u} onClick={() => setForm(f => ({ ...f, unit: u }))} className="px-3 py-2 text-xs font-medium transition-all" style={{
                        background: form.unit === u ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.03)",
                        color: form.unit === u ? "#a5b4fc" : "var(--muted)",
                      }}>{u}</button>
                    ))}
                  </div>
                </div>
                {form.unit === "days" && form.value && (
                  <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>= {parseFloat(form.value) * 8}h (1 day = 8 hours)</div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Category *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="text-sm">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Customer (Company)</label>
                <select value={form.companyId} onChange={e => handleCompanyChange(e.target.value)} className="text-sm">
                  <option value="">— Select Company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Link to Project</label>
                <select value={form.projectId} onChange={e => handleProjectChange(e.target.value)} className="text-sm" disabled={!form.companyId}>
                  <option value="">— {form.companyId ? (companyProjects.length > 0 ? "Select Project" : "No projects for this company") : "Select a company first"} —</option>
                  {companyProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="flex items-center justify-between glass rounded-lg px-3 py-2.5">
                <span className="text-sm text-white">Billable</span>
                <button onClick={() => setForm(f => ({ ...f, billable: !f.billable }))} className="relative w-10 h-5 rounded-full transition-colors" style={{ background: form.billable ? "#6366f1" : "rgba(255,255,255,0.1)" }}>
                  <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white" style={{ left: form.billable ? "calc(100% - 18px)" : "2px" }} />
                </button>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm resize-none" placeholder="What did you work on?" />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.value || !form.category}>{saving ? "Saving..." : (editingId ? "Update" : "Log Time")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

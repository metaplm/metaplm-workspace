"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus, X, Pencil, Trash2, FolderKanban } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface Company { id: string; name: string; }
interface Project {
  id: string;
  name: string;
  companyId: string;
  company: Company;
  estimateDate?: string;
  defaultBillable: boolean;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", companyId: "", estimateDate: "", defaultBillable: true });
  const [saving, setSaving] = useState(false);
  const [filterCompany, setFilterCompany] = useState("");

  const load = useCallback(() => {
    fetch("/api/projects").then(r => r.json()).then(setProjects);
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterCompany ? projects.filter(p => p.companyId === filterCompany) : projects;

  const openNew = () => {
    setForm({ name: "", companyId: "", estimateDate: "", defaultBillable: true });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (p: Project) => {
    setForm({
      name: p.name,
      companyId: p.companyId,
      estimateDate: p.estimateDate ? p.estimateDate.slice(0, 10) : "",
      defaultBillable: p.defaultBillable,
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.companyId) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        companyId: form.companyId,
        estimateDate: form.estimateDate || null,
        defaultBillable: form.defaultBillable,
      };
      if (editingId) {
        await fetch(`/api/projects/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/projects", {
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

  const deleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-in pt-16 md:pt-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>Projects</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Manage timesheet projects per company</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={14} /> New Project
        </button>
      </div>

      {/* Filter */}
      <div className="glass rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center gap-3">
        <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Filter by Company:</label>
        <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)} className="text-sm min-w-[200px]">
          <option value="">All Companies</option>
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs" style={{ color: "var(--muted)" }}>{filtered.length} project{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Projects Table */}
      <div className="glass rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <FolderKanban size={32} style={{ color: "var(--muted)" }} />
            <p className="text-sm" style={{ color: "var(--muted)" }}>No projects yet. Create one to get started.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Project Name</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Company</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Estimate Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Default Billable</th>
                <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="glass-hover transition-colors" style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="px-5 py-3 font-medium" style={{ color: "var(--text)" }}>{p.name}</td>
                  <td className="px-5 py-3" style={{ color: "var(--muted)" }}>{p.company?.name}</td>
                  <td className="px-5 py-3 font-mono text-xs" style={{ color: "var(--muted)" }}>
                    {p.estimateDate ? new Date(p.estimateDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={
                      p.defaultBillable
                        ? { background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }
                        : { background: "rgba(100,116,139,0.2)", color: "#94a3b8" }
                    }>
                      {p.defaultBillable ? "Billable" : "Non-billable"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
                      <button onClick={() => deleteProject(p.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{editingId ? "Edit Project" : "New Project"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Company *</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="text-sm">
                  <option value="">— Select Company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Project Name *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. STEP & PDF Converter" className="text-sm" />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Estimate Date</label>
                <input type="date" value={form.estimateDate} onChange={e => setForm(f => ({ ...f, estimateDate: e.target.value }))} className="text-sm" />
              </div>

              <div className="flex items-center justify-between glass rounded-lg px-3 py-2.5">
                <span className="text-sm" style={{ color: "var(--text)" }}>Default Billable</span>
                <button onClick={() => setForm(f => ({ ...f, defaultBillable: !f.defaultBillable }))} className="relative w-10 h-5 rounded-full transition-colors" style={{ background: form.defaultBillable ? "#6366f1" : "rgba(255,255,255,0.1)" }}>
                  <span className="absolute top-0.5 transition-all w-4 h-4 rounded-full bg-white" style={{ left: form.defaultBillable ? "calc(100% - 18px)" : "2px" }} />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.name || !form.companyId}>{saving ? "Saving..." : (editingId ? "Update" : "Create")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

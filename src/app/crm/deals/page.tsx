
"use client";
import { useEffect, useState } from "react";
import { Plus, TrendingUp, X, DollarSign, Calendar, Pencil, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatCurrency } from "@/lib/utils";

interface Deal {
  id: string;
  title: string;
  amount: number;
  currency: string;
  stage: string;
  expectedCloseDate?: string;
  company?: { id: string; name: string };
  _count: { timeEntries: number; activities: number };
}
interface Company { id: string; name: string; }

const STAGES = ["LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];
const STAGE_COLORS: Record<string, string> = {
  LEAD: "#64748b", QUALIFIED: "#6366f1", PROPOSAL: "#8b5cf6",
  NEGOTIATION: "#f59e0b", WON: "#10b981", LOST: "#ef4444",
};
const EMPTY = { title: "", amount: "", currency: "USD", stage: "LEAD", expectedCloseDate: "", companyId: "" };

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState("ALL");

  const load = () => {
    fetch("/api/deals").then(r => r.json()).then(setDeals);
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (!data.companyId) delete (data as any).companyId;
    try {
      if (editingId) {
        await fetch(`/api/deals/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  };

  const deleteDeal = async (id: string) => {
    await fetch(`/api/deals/${id}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
    load();
  };

  const openEdit = (deal: Deal) => {
    setForm({
      title: deal.title,
      amount: String(deal.amount),
      currency: deal.currency,
      stage: deal.stage,
      expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.slice(0, 10) : "",
      companyId: deal.company?.id || "",
    });
    setEditingId(deal.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowModal(true);
  };

  const updateStage = async (id: string, stage: string) => {
    await fetch(`/api/deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
    load();
  };

  const totalPipeline = deals.filter(d => !["WON", "LOST"].includes(d.stage)).reduce((s, d) => s + d.amount, 0);
  const wonTotal = deals.filter(d => d.stage === "WON").reduce((s, d) => s + d.amount, 0);

  const filtered = filterStage === "ALL" ? deals : deals.filter(d => d.stage === filterStage);

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Deals & Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{deals.length} total deals</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> New Deal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Active Pipeline</div>
          <div className="text-xl font-semibold text-white font-mono">{formatCurrency(totalPipeline, "USD")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Won Revenue</div>
          <div className="text-xl font-semibold font-mono" style={{ color: "#10b981" }}>{formatCurrency(wonTotal, "USD")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Win Rate</div>
          <div className="text-xl font-semibold text-white font-mono">
            {deals.length > 0 ? `${((deals.filter(d => d.stage === "WON").length / deals.length) * 100).toFixed(0)}%` : "0%"}
          </div>
        </div>
      </div>

      {/* Stage Filter */}
      <div className="flex gap-2 flex-wrap">
        {["ALL", ...STAGES].map(s => (
          <button key={s} onClick={() => setFilterStage(s)} className="text-xs px-3 py-1.5 rounded-lg transition-all font-medium" style={{
            background: filterStage === s ? STAGE_COLORS[s] || "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
            color: filterStage === s ? "white" : "var(--muted)",
            border: "1px solid transparent",
          }}>
            {s} {s !== "ALL" && `(${deals.filter(d => d.stage === s).length})`}
          </button>
        ))}
      </div>

      {/* Deals List */}
      <div className="space-y-3">
        {filtered.map(deal => (
          <div key={deal.id} className="glass rounded-xl p-4 glass-hover flex items-center gap-4 relative group">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => openEdit(deal)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
              <button onClick={() => setShowDeleteConfirm(deal.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
            </div>
            <div className="w-2 h-10 rounded-full shrink-0" style={{ background: STAGE_COLORS[deal.stage] }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm">{deal.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{deal.company?.name || "No company"} · {deal._count.activities} activities · {deal._count.timeEntries} time entries</div>
            </div>
            <div className="text-right">
              <div className="font-semibold font-mono text-sm text-white">{formatCurrency(deal.amount, deal.currency)}</div>
              {deal.expectedCloseDate && (
                <div className="text-xs mt-0.5 flex items-center gap-1 justify-end" style={{ color: "var(--muted)" }}>
                  <Calendar size={10} />{new Date(deal.expectedCloseDate).toLocaleDateString()}
                </div>
              )}
            </div>
            <select value={deal.stage} onChange={e => updateStage(deal.id, e.target.value)} className="text-xs w-32" style={{ padding: "4px 8px" }}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <TrendingUp size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">No deals yet</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Won deals automatically become billable projects</div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Edit Deal" : "New Deal"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Deal Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Website Redesign Project" className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Amount</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="text-sm">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="TRY">TRY</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Stage</label>
                <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="text-sm">
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Company</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="text-sm">
                  <option value="">— No Company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Expected Close Date</label>
                <input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.title}>{saving ? "Saving..." : (editingId ? "Update" : "Create Deal")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-2">Delete Deal?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>This action cannot be undone. All time entries and activities linked to this deal will remain but lose their deal association.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteDeal(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

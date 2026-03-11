
"use client";
import { useEffect, useState } from "react";
import { Plus, Receipt, X, Hash, Tag, Pencil, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatCurrency } from "@/lib/utils";

interface Expense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  tags: string[];
  deal?: { id: string; title: string; company?: { name: string } };
}
interface Deal { id: string; title: string; }

const QUICK_TAGS = ["software", "travel", "food", "equipment", "office", "marketing", "cloud", "tools"];
const EMPTY = { description: "", amount: "", currency: "USD", date: new Date().toISOString().slice(0, 10), tags: [] as string[], dealId: "" };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/expenses").then(r => r.json()).then(setExpenses);
    fetch("/api/deals").then(r => r.json()).then(setDeals);
  };
  useEffect(() => { load(); }, []);

  const addTag = (tag: string) => {
    const clean = tag.replace("#", "").trim().toLowerCase();
    if (clean && !form.tags.includes(clean)) {
      setForm(f => ({ ...f, tags: [...f.tags, clean] }));
    }
    setTagInput("");
  };

  const save = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (!data.dealId) delete (data as any).dealId;
    try {
      if (editingId) {
        await fetch(`/api/expenses/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      setTagInput("");
      load();
    } finally { setSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
    load();
  };

  const openEdit = (expense: Expense) => {
    setForm({
      description: expense.description,
      amount: String(expense.amount),
      currency: expense.currency,
      date: expense.date.slice(0, 10),
      tags: [...expense.tags],
      dealId: expense.deal?.id || "",
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowModal(true);
  };

  const totalThisMonth = expenses.filter(e => {
    const d = new Date(e.date);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).reduce((s, e) => s + e.amount, 0);

  // Tag distribution
  const tagCounts: Record<string, number> = {};
  expenses.forEach(e => e.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; }));

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{expenses.length} expenses logged</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> Log Expense
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>This Month</div>
          <div className="text-xl font-semibold font-mono" style={{ color: "#f87171" }}>{formatCurrency(totalThisMonth, "USD")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Total Logged</div>
          <div className="text-xl font-semibold font-mono text-white">{formatCurrency(expenses.reduce((s, e) => s + e.amount, 0), "USD")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Top Tags</div>
          <div className="flex gap-1 flex-wrap mt-1">
            {Object.entries(tagCounts).sort(([,a],[,b]) => b - a).slice(0, 3).map(([tag]) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>#{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Expense List */}
      <div className="space-y-3">
        {expenses.map(exp => (
          <div key={exp.id} className="glass rounded-xl p-4 glass-hover flex items-center gap-4 relative group">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
              <button onClick={() => setShowDeleteConfirm(exp.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
            </div>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)" }}>
              <Receipt size={15} style={{ color: "#f87171" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm">{exp.description}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {exp.tags.map(t => (
                  <span key={t} className="text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                    <Hash size={9} />{ t}
                  </span>
                ))}
                {exp.deal && <span className="text-xs" style={{ color: "var(--muted)" }}>· {exp.deal.title}</span>}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold font-mono text-sm" style={{ color: "#f87171" }}>-{formatCurrency(exp.amount, exp.currency)}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{new Date(exp.date).toLocaleDateString()}</div>
            </div>
          </div>
        ))}
      </div>

      {expenses.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Receipt size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">No expenses yet</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Use #hashtags for quick categorization</div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Edit Expense" : "Log Expense"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Description *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="AWS monthly bill" className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Amount *</label>
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
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm" />
              </div>
              
              {/* Tags */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Tags (use #hashtags)</label>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); addTag(tagInput); } }} placeholder="#software, #travel..." className="text-sm" />
                {/* Quick tags */}
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {QUICK_TAGS.map(t => (
                    <button key={t} onClick={() => addTag(t)} className="text-xs px-2 py-1 rounded transition-all" style={{
                      background: form.tags.includes(t) ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.05)",
                      color: form.tags.includes(t) ? "#a5b4fc" : "var(--muted)",
                      border: `1px solid ${form.tags.includes(t) ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                    }}>#{t}</button>
                  ))}
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {form.tags.map(t => (
                      <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>
                        #{t}
                        <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Link to Project</label>
                <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))} className="text-sm">
                  <option value="">— No Project —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.description || !form.amount}>{saving ? "Saving..." : (editingId ? "Update" : "Log Expense")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-2">Delete Expense?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteExpense(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

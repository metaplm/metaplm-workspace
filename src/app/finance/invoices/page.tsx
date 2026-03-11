
"use client";
import { useEffect, useState } from "react";
import { Plus, FileText, X, AlertCircle, CheckCircle, Clock, Pencil, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatCurrency } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  dueDate?: string;
  issuedDate: string;
  deal?: { id: string; title: string; company?: { name: string } };
  notes?: string;
}
interface Deal { id: string; title: string; company?: { name: string }; }

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: any }> = {
  DRAFT: { bg: "rgba(100,116,139,0.2)", text: "#94a3b8", icon: Clock },
  PENDING: { bg: "rgba(245,158,11,0.2)", text: "#fbbf24", icon: Clock },
  PAID: { bg: "rgba(16,185,129,0.2)", text: "#34d399", icon: CheckCircle },
  OVERDUE: { bg: "rgba(239,68,68,0.2)", text: "#f87171", icon: AlertCircle },
  CANCELLED: { bg: "rgba(100,116,139,0.15)", text: "#64748b", icon: X },
};

const EMPTY = { amount: "", currency: "USD", status: "DRAFT", dueDate: "", dealId: "", notes: "" };

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/invoices").then(r => r.json()).then(setInvoices);
    fetch("/api/deals").then(r => r.json()).then(setDeals);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (!data.dealId) delete (data as any).dealId;
    try {
      if (editingId) {
        await fetch(`/api/invoices/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        await fetch("/api/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  };

  const deleteInvoice = async (id: string) => {
    await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
    load();
  };

  const openEdit = (invoice: Invoice) => {
    setForm({
      amount: String(invoice.amount),
      currency: invoice.currency,
      status: invoice.status,
      dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
      dealId: invoice.deal?.id || "",
      notes: invoice.notes || "",
    });
    setEditingId(invoice.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowModal(true);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/invoices/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  };

  const now = new Date();
  const overdue = invoices.filter(i => i.status !== "PAID" && i.dueDate && new Date(i.dueDate) < now);
  const pending = invoices.filter(i => i.status === "PENDING");
  const totalPending = pending.reduce((s, i) => s + i.amount, 0);
  const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Invoices</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{invoices.length} invoices total</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Pending</div>
          <div className="text-xl font-semibold font-mono" style={{ color: "#fbbf24" }}>{formatCurrency(totalPending, "USD")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Collected</div>
          <div className="text-xl font-semibold font-mono" style={{ color: "#34d399" }}>{formatCurrency(totalPaid, "USD")}</div>
        </div>
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          {overdue.length > 0 ? <AlertCircle size={16} style={{ color: "#f87171" }} /> : <CheckCircle size={16} style={{ color: "#34d399" }} />}
          <div>
            <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>Overdue</div>
            <div className="text-xl font-semibold font-mono" style={{ color: overdue.length > 0 ? "#f87171" : "#34d399" }}>{overdue.length}</div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="space-y-3">
        {invoices.map(inv => {
          const st = STATUS_STYLE[inv.status] || STATUS_STYLE.DRAFT;
          const Icon = st.icon;
          const isOverdue = inv.status !== "PAID" && inv.dueDate && new Date(inv.dueDate) < now;
          return (
            <div key={inv.id} className="glass rounded-xl p-4 glass-hover flex items-center gap-4 relative group">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={() => openEdit(inv)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
                <button onClick={() => setShowDeleteConfirm(inv.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
              </div>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
                <FileText size={15} style={{ color: "#6366f1" }} />
              </div>
              <div className="flex-1 min-w-0 pr-20">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-white">{inv.number}</span>
                  {isOverdue && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.2)", color: "#f87171" }}>OVERDUE</span>}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {inv.deal ? `${inv.deal.title}${inv.deal.company ? ` · ${inv.deal.company.name}` : ""}` : "No project"}
                  {inv.dueDate && ` · Due ${new Date(inv.dueDate).toLocaleDateString()}`}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold font-mono text-sm text-white">{formatCurrency(inv.amount, inv.currency)}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{inv.currency}</div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: st.bg }}>
                <Icon size={12} style={{ color: st.text }} />
                <span className="text-xs font-medium" style={{ color: st.text }}>{inv.status}</span>
              </div>
              <select value={inv.status} onChange={e => updateStatus(inv.id, e.target.value)} className="text-xs w-28" style={{ padding: "4px 8px" }}>
                {["DRAFT", "PENDING", "PAID", "OVERDUE", "CANCELLED"].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          );
        })}
      </div>

      {invoices.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">No invoices yet</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Create invoices and track payments</div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Edit Invoice" : "New Invoice"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
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
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="text-sm">
                  {["DRAFT", "PENDING", "PAID"].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Due Date</label>
                <input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Linked Project</label>
                <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))} className="text-sm">
                  <option value="">— No Project —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm resize-none" placeholder="Invoice notes..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.amount}>{saving ? "Saving..." : (editingId ? "Update" : "Create Invoice")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-2">Delete Invoice?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>This action cannot be undone.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteInvoice(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

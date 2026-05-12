
"use client";
import { useEffect, useState } from "react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, FileText, X, AlertCircle, CheckCircle, Clock, Pencil, Trash2, RefreshCw, Send, ExternalLink } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatCurrency } from "@/lib/utils";

/* ── KolayBi types ── */
interface KolayBiInvoice {
  id: number;
  currency: string;
  issue_date: string;
  e_document_status: string;
  commercial_doc_type: { description: string; group: string };
  commercial_doc_status: { description: string };
  associate: { full_name: string };
  total: { grand_total: number; total_vat: number };
}
const E_DOC_LABEL: Record<string, { label: string; color: string }> = {
  not_sent: { label: "Gönderilmedi", color: "#94a3b8" },
  waiting:  { label: "Bekliyor",     color: "#fbbf24" },
  sent:     { label: "Gönderildi",   color: "#34d399" },
  accepted: { label: "Kabul Edildi", color: "#34d399" },
  rejected: { label: "Reddedildi",  color: "#f87171" },
};

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  vatRate: number;
  vatAmount: number;
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

const EMPTY = { amount: "", currency: "TRY", vatRate: "20", status: "DRAFT", dueDate: "", dealId: "", notes: "" };

export default function InvoicesPage() {
  const [tab, setTab] = useState<"internal" | "giden" | "gelen">("internal");

  /* ── internal invoices state ── */
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ── KolayBi state ── */
  const [kbInvoices, setKbInvoices] = useState<KolayBiInvoice[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [kbError, setKbError] = useState<string | null>(null);
  const [kbLastSync, setKbLastSync] = useState<Date | null>(null);

  const loadKolayBi = async () => {
    setKbLoading(true);
    setKbError(null);
    try {
      const res = await fetch("/api/kolaybi?resource=invoices");
      const data = await res.json();
      if (!res.ok) { setKbError(data.error ?? "Bağlantı hatası"); return; }
      setKbInvoices(Array.isArray(data) ? data : (data.data ?? []));
      setKbLastSync(new Date());
    } catch { setKbError("KolayBi API'sine ulaşılamadı"); }
    finally { setKbLoading(false); }
  };

  useEffect(() => { if ((tab === "giden" || tab === "gelen") && kbInvoices.length === 0 && !kbError) loadKolayBi(); }, [tab]);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/invoices").then(r => r.json()).then(setInvoices),
      fetch("/api/deals").then(r => r.json()).then(setDeals),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const amt = parseFloat(form.amount) || 0;
    const vr = parseInt(form.vatRate) || 0;
    const data = { ...form, amount: amt, vatRate: vr, vatAmount: +(amt * vr / 100).toFixed(2) };
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
      vatRate: String(invoice.vatRate ?? 20),
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
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {tab === "internal" ? `${invoices.length} invoices total` : tab === "giden" ? "KolayBi · Satış faturaları" : "KolayBi · Alış faturaları"}
          </p>
        </div>
        {tab === "internal" && (
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
            <Plus size={15} /> New Invoice
          </button>
        )}
        {(tab === "giden" || tab === "gelen") && (
          <button className="btn-ghost flex items-center gap-2 text-sm" onClick={loadKolayBi} disabled={kbLoading}>
            <RefreshCw size={14} className={kbLoading ? "animate-spin" : ""} /> Yenile
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", width: "fit-content" }}>
        {([["internal", "Dahili"], ["giden", "e-Fatura Giden"], ["gelen", "e-Fatura Gelen"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={tab === key
              ? { background: "rgba(99,102,241,0.25)", color: "#818cf8" }
              : { color: "var(--muted)" }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Dahili Faturalar tab ── */}
      {tab === "internal" && (<>
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Pending</div>
            <div className="text-xl font-semibold font-mono" style={{ color: "#fbbf24" }}>{formatCurrency(totalPending, "TRY")}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Collected</div>
            <div className="text-xl font-semibold font-mono" style={{ color: "#34d399" }}>{formatCurrency(totalPaid, "TRY")}</div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            {overdue.length > 0 ? <AlertCircle size={16} style={{ color: "#f87171" }} /> : <CheckCircle size={16} style={{ color: "#34d399" }} />}
            <div>
              <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>Overdue</div>
              <div className="text-xl font-semibold font-mono" style={{ color: overdue.length > 0 ? "#f87171" : "#34d399" }}>{overdue.length}</div>
            </div>
          </div>
        </div>
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
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>KDV %{inv.vatRate ?? 20}: {formatCurrency(inv.vatAmount ?? inv.amount * (inv.vatRate ?? 20) / 100, inv.currency)}</div>
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
        {loading && <LoadingRows />}
        {!loading && invoices.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
            <div className="text-sm text-white mb-1">No invoices yet</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Create invoices and track payments</div>
          </div>
        )}
      </>)}

      {/* ── e-Fatura (KolayBi) tab ── */}
      {(tab === "giden" || tab === "gelen") && (<>
        {(() => {
          const group = tab === "giden" ? "sale" : "purchase";
          const filtered = kbInvoices.filter(i => i.commercial_doc_type.group === group);
          const notSent = filtered.filter(i => i.e_document_status === "not_sent").length;
          return (<>
            {kbError && (
              <div className="glass rounded-xl p-4 flex items-center gap-3" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
                <AlertCircle size={16} style={{ color: "#f87171" }} />
                <span className="text-sm" style={{ color: "#f87171" }}>{kbError}</span>
              </div>
            )}
            {!kbError && !kbLoading && (
              <div className="grid grid-cols-3 gap-4">
                <div className="glass rounded-xl p-4">
                  <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Toplam Fatura</div>
                  <div className="text-xl font-semibold text-white">{filtered.length}</div>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Toplam Tutar</div>
                  <div className="text-xl font-semibold font-mono" style={{ color: "#34d399" }}>
                    {formatCurrency(filtered.reduce((s, i) => s + (i.total?.grand_total ?? 0), 0), "TRY")}
                  </div>
                </div>
                <div className="glass rounded-xl p-4 flex items-center gap-3">
                  <Send size={16} style={{ color: notSent > 0 ? "#fbbf24" : "#34d399" }} />
                  <div>
                    <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>{tab === "giden" ? "Gönderilmemiş" : "İşlenmemiş"}</div>
                    <div className="text-xl font-semibold" style={{ color: notSent > 0 ? "#fbbf24" : "#34d399" }}>{notSent}</div>
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-3">
              {kbLoading && (
                <div className="glass rounded-xl p-6 text-center text-sm animate-pulse" style={{ color: "var(--muted)" }}>
                  KolayBi'den faturalar yükleniyor...
                </div>
              )}
              {!kbLoading && !kbError && filtered.length === 0 && (
                <div className="glass rounded-xl p-12 text-center">
                  <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
                  <div className="text-sm text-white mb-1">{tab === "giden" ? "Giden fatura bulunamadı" : "Gelen fatura bulunamadı"}</div>
                  <div className="text-xs" style={{ color: "var(--muted)" }}>Sandbox ortamında henüz fatura yok</div>
                </div>
              )}
              {!kbLoading && filtered.map(inv => {
                const docSt = E_DOC_LABEL[inv.e_document_status] ?? { label: inv.e_document_status, color: "#94a3b8" };
                return (
                  <div key={inv.id} className="glass rounded-xl p-4 glass-hover flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.15)" }}>
                      <FileText size={15} style={{ color: "#6366f1" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-white">#{inv.id}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                          {inv.commercial_doc_type.description}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {inv.associate.full_name}
                        {inv.issue_date && ` · ${new Date(inv.issue_date).toLocaleDateString("tr-TR")}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold font-mono text-sm text-white">
                        {formatCurrency(inv.total?.grand_total ?? 0, inv.currency.toUpperCase())}
                      </div>
                      {inv.total?.total_vat > 0 && (
                        <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          KDV: {formatCurrency(inv.total.total_vat, inv.currency.toUpperCase())}
                        </div>
                      )}
                    </div>
                    <div className="text-xs px-2 py-1 rounded-lg font-medium shrink-0" style={{ background: `${docSt.color}20`, color: docSt.color }}>
                      {docSt.label}
                    </div>
                  </div>
                );
              })}
            </div>
            {kbLastSync && (
              <div className="text-center">
                <a href="https://ofis-sandbox.kolaybi.com" target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
                  <ExternalLink size={12} /> KolayBi Sandbox Paneli
                </a>
              </div>
            )}
          </>);
        })()}
      </>)}

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
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>KDV Oranı</label>
                  <select value={form.vatRate} onChange={e => setForm(f => ({ ...f, vatRate: e.target.value }))} className="text-sm">
                    <option value="20">%20</option>
                    <option value="0">%0 (KDV Hariç)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>KDV Tutarı</label>
                  <div className="text-sm font-mono py-2 px-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted)" }}>
                    {formatCurrency((parseFloat(form.amount) || 0) * (parseInt(form.vatRate) || 0) / 100, form.currency)}
                  </div>
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

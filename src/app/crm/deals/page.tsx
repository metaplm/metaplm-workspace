
"use client";
import { useEffect, useRef, useState } from "react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, TrendingUp, X, Calendar, Pencil, Trash2, Search } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatCurrency } from "@/lib/utils";
import { STAGE_LABELS, STAGE_COLORS } from "@/components/crm/constants";
import { useToast } from "@/components/ui/Toaster";

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
const EMPTY = { title: "", amount: "", currency: "TRY", stage: "LEAD", expectedCloseDate: "", companyId: "" };

export default function DealsPage() {
  const { toast } = useToast();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [filterStage, setFilterStage] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightHandled = useRef(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/deals").then(r => r.json()).then(setDeals),
      fetch("/api/companies").then(r => r.json()).then(setCompanies),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (highlightHandled.current || deals.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const highlight = params.get("highlight");
    if (highlight && deals.some(d => d.id === highlight)) {
      highlightHandled.current = true;
      setHighlightedId(highlight);
      setTimeout(() => document.getElementById(`deal-${highlight}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
      setTimeout(() => setHighlightedId(null), 2000);
      const url = new URL(window.location.href);
      url.searchParams.delete("highlight");
      window.history.replaceState({}, "", url.toString());
    }
  }, [deals]);

  // Close modals with ESC
  useEffect(() => {
    if (!showModal && !showDeleteConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showDeleteConfirm) setShowDeleteConfirm(null);
      else setShowModal(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showModal, showDeleteConfirm]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (!data.companyId) delete (data as any).companyId;
    try {
      const res = editingId
        ? await fetch(`/api/deals/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        : await fetch("/api/deals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { toast("Kaydedilemedi, alanları kontrol edin", "error"); return; }
      toast(editingId ? "Fırsat güncellendi" : "Fırsat eklendi", "success");
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      load();
    } catch {
      toast("Bağlantı hatası, tekrar deneyin", "error");
    } finally { setSaving(false); }
  };

  const deleteDeal = async (id: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "DELETE" });
      if (!res.ok) { toast("Fırsat silinemedi", "error"); return; }
      toast("Fırsat silindi", "success");
      setShowDeleteConfirm(null);
      load();
    } catch {
      toast("Bağlantı hatası, tekrar deneyin", "error");
    } finally { setSaving(false); }
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
    try {
      const res = await fetch(`/api/deals/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage }) });
      if (!res.ok) { toast("Aşama güncellenemedi", "error"); return; }
      toast("Aşama güncellendi", "success");
      load();
    } catch {
      toast("Bağlantı hatası, tekrar deneyin", "error");
    }
  };

  const totalPipeline = deals.filter(d => !["WON", "LOST"].includes(d.stage)).reduce((s, d) => s + d.amount, 0);
  const wonTotal = deals.filter(d => d.stage === "WON").reduce((s, d) => s + d.amount, 0);

  const filtered = deals
    .filter(d => filterStage === "ALL" || d.stage === filterStage)
    .filter(d => `${d.title} ${d.company?.name || ""}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Fırsatlar & Pipeline</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{deals.length} fırsat</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> Yeni Fırsat
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Aktif Pipeline</div>
          <div className="text-xl font-semibold text-white font-mono">{formatCurrency(totalPipeline, "TRY")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Kazanılan Gelir</div>
          <div className="text-xl font-semibold font-mono" style={{ color: "#10b981" }}>{formatCurrency(wonTotal, "TRY")}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Kazanma Oranı</div>
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
            {s === "ALL" ? "Tümü" : STAGE_LABELS[s]} {s !== "ALL" && `(${deals.filter(d => d.stage === s).length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1" style={{ maxWidth: 320 }}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
        <input placeholder="Fırsat veya şirket ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      {/* Deals List */}
      <div className="space-y-3">
        {filtered.map(deal => (
          <div
            key={deal.id}
            id={`deal-${deal.id}`}
            className="glass rounded-xl p-4 glass-hover flex items-center gap-4 relative group transition-all"
            style={highlightedId === deal.id ? { boxShadow: "0 0 0 2px #6366f1", background: "rgba(99,102,241,0.08)" } : undefined}
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => openEdit(deal)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
              <button onClick={() => setShowDeleteConfirm(deal.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
            </div>
            <div className="w-2 h-10 rounded-full shrink-0" style={{ background: STAGE_COLORS[deal.stage] }} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm">{deal.title}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{deal.company?.name || "Şirket yok"} · {deal._count.activities} aktivite · {deal._count.timeEntries} zaman girişi</div>
            </div>
            <div className="text-right">
              <div className="font-semibold font-mono text-sm text-white">{formatCurrency(deal.amount, deal.currency)}</div>
              {deal.expectedCloseDate && (
                <div className="text-xs mt-0.5 flex items-center gap-1 justify-end" style={{ color: "var(--muted)" }}>
                  <Calendar size={10} />{new Date(deal.expectedCloseDate).toLocaleDateString("tr-TR")}
                </div>
              )}
            </div>
            <select value={deal.stage} onChange={e => updateStage(deal.id, e.target.value)} className="text-xs w-32" style={{ padding: "4px 8px" }}>
              {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
        ))}
      </div>

      {loading && <LoadingRows />}
      {!loading && filtered.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <TrendingUp size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">Fırsat bulunamadı</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Kazanılan fırsatlar otomatik olarak faturalanabilir projelere dönüşür</div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowModal(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Fırsat Düzenle" : "Yeni Fırsat"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Fırsat Başlığı *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Örn: Web Sitesi Yenileme Projesi" className="text-sm" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Tutar</label>
                  <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Para Birimi</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="text-sm">
                    <option value="TRY">TRY (₺)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Aşama</label>
                <select value={form.stage} onChange={e => setForm(f => ({ ...f, stage: e.target.value }))} className="text-sm">
                  {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Şirket</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="text-sm">
                  <option value="">— Şirket Yok —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Tahmini Kapanış Tarihi</label>
                <input type="date" value={form.expectedCloseDate} onChange={e => setForm(f => ({ ...f, expectedCloseDate: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.title}>{saving ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Fırsat Oluştur")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white mb-2">Fırsat Silinsin mi?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              {(() => {
                const target = deals.find(d => d.id === showDeleteConfirm);
                return target ? `"${target.title}" fırsatı silinecek. ` : "";
              })()}
              Bu işlem geri alınamaz. Bu fırsata bağlı zaman girişleri ve aktiviteler korunur fakat fırsat bağlantısı kaldırılır.
            </p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} disabled={saving} onClick={() => deleteDeal(showDeleteConfirm)}>{saving ? "Siliniyor..." : "Sil"}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

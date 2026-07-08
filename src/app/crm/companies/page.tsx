"use client";
import { useEffect, useState } from "react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, Search, Globe, Linkedin, Building2, Sparkles, X, Loader2, Pencil, Trash2, Users, GitBranch, FileText, Clock, Briefcase, ChevronRight, ChevronDown, Calendar, LayoutGrid, List } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { STAGE_LABELS, STAGE_COLORS, INVOICE_STATUS_COLORS, TYPE_LABELS, TYPE_COLORS, STATUS_LABELS, STATUS_COLORS, formatMoney } from "@/components/crm/constants";
import { QuickActivityModal } from "@/components/crm/QuickActivityModal";
import { useToast } from "@/components/ui/Toaster";

interface Company {
  id: string;
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  linkedinUrl?: string;
  nda?: boolean;
  status: string;
  lastActivityAt?: string | null;
  nextActionAt?: string | null;
  contacts: Array<{ id: string }>;
  deals: Array<{ id: string; amount: number; stage: string }>;
}

interface CompanyDetail {
  id: string;
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  linkedinUrl?: string;
  nda?: boolean;
  status: string;
  contacts: Array<{ id: string; firstName: string; lastName: string; title?: string; email?: string; phone?: string }>;
  deals: Array<{
    id: string; title: string; amount: number; currency: string; stage: string; expectedCloseDate?: string;
    invoices: Array<{ id: string; number: string; amount: number; currency: string; status: string; issuedDate: string }>;
  }>;
  activities: Array<{
    id: string; type: string; notes?: string; createdAt: string; nextActionDate?: string;
    contacts?: { id: string; firstName: string; lastName: string }[];
    deal?: { id: string; title: string } | null;
    parentId?: string | null;
  }>;
  timeEntries: Array<{
    id: string; date: string; hours: number; category: string; billable: boolean; notes?: string;
    project?: { id: string; name: string } | null;
  }>;
  projects: Array<{
    id: string; name: string; estimateDate?: string; defaultBillable: boolean;
    timeEntries: Array<{ id: string; hours: number; billable: boolean }>;
  }>;
}

const EMPTY = { name: "", website: "", logoUrl: "", description: "", linkedinUrl: "", nda: false, status: "LEAD" };

function isStale(company: Pick<Company, "lastActivityAt" | "status">): boolean {
  if (company.status === "INACTIVE") return false;
  if (!company.lastActivityAt) return true;
  const days = (Date.now() - new Date(company.lastActivityAt).getTime()) / 86400000;
  return days > 30;
}

type Tab = "activities" | "contacts" | "deals" | "projects" | "timesheet";

function CompanyDrawer({ companyId, onClose, onEdit, onChanged }: { companyId: string; onClose: () => void; onEdit: () => void; onChanged?: () => void }) {
  const { toast } = useToast();
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("activities");
  const [showQuickActivity, setShowQuickActivity] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/companies/${companyId}`).then(r => r.json()).then(setDetail).finally(() => setLoading(false));
  };
  useEffect(load, [companyId]);

  const changeStatus = async (status: string) => {
    const prevStatus = detail?.status;
    setDetail(d => d ? { ...d, status } : d);
    try {
      const res = await fetch(`/api/companies/${companyId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!res.ok) throw new Error();
      onChanged?.();
    } catch {
      setDetail(d => d && prevStatus ? { ...d, status: prevStatus } : d);
      toast("Durum güncellenemedi", "error");
    }
  };

  const totalHours = detail?.timeEntries.reduce((s, e) => s + e.hours, 0) ?? 0;
  const billableHours = detail?.timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0) ?? 0;
  const allInvoices = detail?.deals.flatMap(d => d.invoices) ?? [];
  const totalInvoiced = allInvoices.reduce((s, i) => s + i.amount, 0);
  const paidInvoiced = allInvoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
  const activeDeals = detail?.deals.filter(d => !["WON", "LOST"].includes(d.stage)) ?? [];
  const wonDeals = detail?.deals.filter(d => d.stage === "WON") ?? [];

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "activities", label: "Aktiviteler", icon: <GitBranch size={13} />, count: detail?.activities.length },
    { id: "contacts", label: "Kişiler", icon: <Users size={13} />, count: detail?.contacts.length },
    { id: "deals", label: "Pipeline", icon: <Briefcase size={13} />, count: detail?.deals.length },
    { id: "projects", label: "Projeler", icon: <ChevronRight size={13} />, count: detail?.projects.length },
    { id: "timesheet", label: "Timesheet", icon: <Clock size={13} />, count: detail?.timeEntries.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl flex flex-col animate-in"
        style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "var(--icon-bg)" }}>
              {detail?.logoUrl
                ? <img src={detail.logoUrl} alt={detail.name} className="w-full h-full object-contain" />
                : <Building2 size={22} style={{ color: "var(--muted)" }} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold" style={{ color: "var(--text)" }}>{detail?.name ?? "..."}</h2>
                {detail?.nda && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)", color: "#dc2626" }}>NDA</span>}
                {detail && (
                  <span className="relative inline-flex items-center">
                    <select
                      value={detail.status}
                      onChange={e => changeStatus(e.target.value)}
                      className="text-[10px] pl-1.5 pr-4 py-0.5 rounded-full font-medium border-0 appearance-none cursor-pointer"
                      style={{ background: `${STATUS_COLORS[detail.status]}22`, color: STATUS_COLORS[detail.status], colorScheme: "dark" }}
                      title="Durumu değiştir"
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <ChevronDown size={9} className="absolute right-1 pointer-events-none" style={{ color: STATUS_COLORS[detail.status] }} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                {detail?.website && <a href={detail.website} target="_blank" className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}><Globe size={10} />{detail.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</a>}
                {detail?.linkedinUrl && <a href={detail.linkedinUrl} target="_blank" className="text-xs flex items-center gap-1" style={{ color: "var(--accent2)" }}><Linkedin size={10} />LinkedIn</a>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {detail && <button onClick={() => setShowQuickActivity(true)} className="btn-ghost text-xs">+ Aktivite</button>}
            <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
            <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><X size={16} /></button>
          </div>
        </div>

        {showQuickActivity && detail && (
          <QuickActivityModal
            companyId={detail.id}
            companyName={detail.name}
            dealOptions={detail.deals}
            onClose={() => setShowQuickActivity(false)}
            onSaved={() => { setShowQuickActivity(false); load(); onChanged?.(); }}
          />
        )}

        {loading ? (
          <div className="flex-1 p-6"><LoadingRows /></div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-4 gap-3 p-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              {[
                { label: "Aktivite", value: detail?.activities.length ?? 0, sub: null },
                { label: "Pipeline", value: activeDeals.length, sub: wonDeals.length > 0 ? `${wonDeals.length} kazanıldı` : null, accent: activeDeals.length > 0 ? "#818cf8" : undefined },
                { label: "Faturalanan", value: formatMoney(totalInvoiced), sub: null },
                { label: "Tahsilat", value: formatMoney(paidInvoiced), sub: totalInvoiced > 0 ? `%${Math.round((paidInvoiced / totalInvoiced) * 100)}` : null, accent: paidInvoiced > 0 ? "#22c55e" : undefined },
              ].map(s => (
                <div key={s.label} className="glass rounded-lg p-3 text-center">
                  <div className="text-lg font-semibold" style={{ color: s.accent ?? "var(--text)" }}>{s.value}</div>
                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>{s.label}</div>
                  {s.sub && <div className="text-[10px] mt-0.5" style={{ color: s.accent ?? "var(--muted)" }}>{s.sub}</div>}
                </div>
              ))}
            </div>

            {detail?.description && (
              <div className="px-6 py-3 shrink-0 text-xs" style={{ color: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                {detail.description}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-t-lg transition-colors"
                  style={{
                    color: tab === t.id ? "var(--accent2)" : "var(--muted)",
                    background: tab === t.id ? "var(--surface2)" : "transparent",
                    borderBottom: tab === t.id ? `2px solid var(--accent2)` : "2px solid transparent",
                    fontWeight: tab === t.id ? 600 : 400,
                  }}
                >
                  {t.icon}
                  {t.label}
                  {t.count !== undefined && t.count > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: "var(--badge-bg)", color: "var(--muted)" }}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {tab === "activities" && (
                <>
                  {detail?.activities.length === 0 && <Empty label="Henüz aktivite yok" />}
                  {detail?.activities.map(a => (
                    <div key={a.id} className="glass rounded-xl p-3 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: TYPE_COLORS[a.type], background: `${TYPE_COLORS[a.type]}28` }}>{TYPE_LABELS[a.type]}</span>
                        <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(a.createdAt).toLocaleDateString("tr-TR")}</span>
                        {a.parentId && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--accent2)" }}>devam</span>}
                        {a.deal && <span className="text-[11px]" style={{ color: "var(--accent2)" }}>→ {a.deal.title}</span>}
                      </div>
                      {a.notes && <p className="text-xs line-clamp-2" style={{ color: "var(--text)", opacity: 0.85 }}>{a.notes}</p>}
                      <div className="flex gap-3 text-[11px]" style={{ color: "var(--muted)" }}>
                        {a.contacts && a.contacts.length > 0 && <span>👤 {a.contacts.map(c => `${c.firstName} ${c.lastName}`).join(", ")}</span>}
                        {a.nextActionDate && <span className="flex items-center gap-1"><Calendar size={10} />{new Date(a.nextActionDate).toLocaleDateString("tr-TR")}</span>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === "contacts" && (
                <>
                  {detail?.contacts.length === 0 && <Empty label="Henüz kişi yok" />}
                  {detail?.contacts.map(c => (
                    <div key={c.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: "var(--surface2)", color: "var(--accent2)" }}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium" style={{ color: "var(--text)" }}>{c.firstName} {c.lastName}</div>
                        {c.title && <div className="text-xs" style={{ color: "var(--muted)" }}>{c.title}</div>}
                      </div>
                      <div className="text-right text-xs" style={{ color: "var(--muted)" }}>
                        {c.email && <div>{c.email}</div>}
                        {c.phone && <div>{c.phone}</div>}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {tab === "deals" && (
                <>
                  {(detail?.deals.length ?? 0) > 0 && (
                    <div className="flex items-center gap-3 flex-wrap pb-1">
                      {["LEAD","QUALIFIED","PROPOSAL","NEGOTIATION","WON","LOST"].map(stage => {
                        const count = detail!.deals.filter(d => d.stage === stage).length;
                        if (!count) return null;
                        return (
                          <span key={stage} className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${STAGE_COLORS[stage]}22`, color: STAGE_COLORS[stage] }}>
                            {STAGE_LABELS[stage]} {count}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {detail?.deals.length === 0 && <Empty label="Henüz pipeline yok" />}
                  {detail?.deals.map(d => (
                    <div key={d.id} className="glass rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{d.title}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: `${STAGE_COLORS[d.stage]}28`, color: STAGE_COLORS[d.stage] }}>{STAGE_LABELS[d.stage]}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{d.currency} {d.amount.toLocaleString()}</span>
                        {d.expectedCloseDate && <span className="flex items-center gap-1"><Calendar size={10} />{new Date(d.expectedCloseDate).toLocaleDateString("tr-TR")}</span>}
                      </div>
                      {d.invoices.length > 0 && (
                        <div className="space-y-1 pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                          {d.invoices.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5" style={{ color: "var(--muted)" }}><FileText size={11} />{inv.number}</span>
                              <div className="flex items-center gap-2">
                                <span style={{ color: "var(--text)" }}>{inv.currency} {inv.amount.toLocaleString()}</span>
                                <span className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: `${INVOICE_STATUS_COLORS[inv.status]}28`, color: INVOICE_STATUS_COLORS[inv.status] }}>{inv.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {tab === "projects" && (
                <>
                  {detail?.projects.length === 0 && <Empty label="Henüz proje yok" />}
                  {detail?.projects.map(p => {
                    const totalH = p.timeEntries.reduce((s, e) => s + e.hours, 0);
                    const billableH = p.timeEntries.filter(e => e.billable).reduce((s, e) => s + e.hours, 0);
                    return (
                      <div key={p.id} className="glass rounded-xl p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{p.name}</span>
                          {p.estimateDate && <span className="text-xs flex items-center gap-1" style={{ color: "var(--muted)" }}><Calendar size={10} />{new Date(p.estimateDate).toLocaleDateString("tr-TR")}</span>}
                        </div>
                        <div className="flex gap-3 text-xs" style={{ color: "var(--muted)" }}>
                          <span className="flex items-center gap-1"><Clock size={10} />{totalH.toFixed(1)}h toplam</span>
                          <span>{billableH.toFixed(1)}h faturalanabilir</span>
                          <span>{p.timeEntries.length} giriş</span>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {tab === "timesheet" && (
                <>
                  {detail?.timeEntries.length === 0 && <Empty label="Henüz zaman girişi yok" />}
                  <div className="flex items-center justify-between text-xs px-1 pb-1" style={{ color: "var(--muted)" }}>
                    <span>{totalHours.toFixed(1)}h toplam · {billableHours.toFixed(1)}h faturalanabilir</span>
                    <span>{detail?.timeEntries.length} giriş</span>
                  </div>
                  {detail?.timeEntries.map(e => (
                    <div key={e.id} className="glass rounded-xl p-3 flex items-center gap-3">
                      <div className="text-center shrink-0" style={{ minWidth: 40 }}>
                        <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>{e.hours}h</div>
                        <div className="text-[10px]" style={{ color: e.billable ? "#16a34a" : "var(--muted)" }}>{e.billable ? "bill." : "iç"}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs truncate" style={{ color: "var(--text)", opacity: 0.85 }}>{e.notes || "—"}</div>
                        {e.project && <div className="text-[11px] mt-0.5" style={{ color: "var(--accent2)" }}>{e.project.name}</div>}
                      </div>
                      <div className="text-right text-xs shrink-0" style={{ color: "var(--muted)" }}>
                        <div>{new Date(e.date).toLocaleDateString("tr-TR")}</div>
                        <div>{e.category}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <div className="text-center py-10 text-sm" style={{ color: "var(--muted)" }}>{label}</div>;
}

export default function CompaniesPage() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [view, setView] = useState<"card" | "list">("card");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const load = () => {
    setLoading(true);
    fetch("/api/companies").then(r => r.json()).then(setCompanies).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get("open");
    if (open) {
      setSelectedCompanyId(open);
      const url = new URL(window.location.href);
      url.searchParams.delete("open");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const scrape = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: scrapeUrl }) });
      if (!res.ok) { toast("Site bilgileri alınamadı, adresi kontrol edin", "error"); return; }
      const data = await res.json();
      setForm(f => ({ ...f, name: data.name || f.name, description: data.description || f.description, logoUrl: data.logoUrl || f.logoUrl, linkedinUrl: data.linkedinUrl || f.linkedinUrl, website: data.website || f.website }));
    } catch {
      toast("Bağlantı hatası, tekrar deneyin", "error");
    } finally { setScraping(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = editingId
        ? await fetch(`/api/companies/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) { toast("Kaydedilemedi, alanları kontrol edin", "error"); return; }
      toast(editingId ? "Şirket güncellendi" : "Şirket eklendi", "success");
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      setScrapeUrl("");
      load();
    } finally { setSaving(false); }
  };

  const deleteCompany = async (id: string) => {
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    toast("Şirket silindi", "success");
    setShowDeleteConfirm(null);
    setSelectedCompanyId(null);
    load();
  };

  const openEdit = (company: Company) => {
    setForm({
      name: company.name,
      website: company.website || "",
      logoUrl: company.logoUrl || "",
      description: company.description || "",
      linkedinUrl: company.linkedinUrl || "",
      nda: company.nda || false,
      status: company.status || "LEAD",
    });
    setEditingId(company.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowModal(true);
  };

  const filtered = companies
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter(c => !filterStatus || c.status === filterStatus);

  const selectedCompany = selectedCompanyId ? companies.find(c => c.id === selectedCompanyId) : null;

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Şirketler</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{companies.length} şirket</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> Şirket Ekle
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 320 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input placeholder="Şirket ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
        </div>
        <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid var(--border)" }}>
          <button
            onClick={() => setView("card")}
            className="p-2 transition-colors"
            style={{ background: view === "card" ? "var(--surface2)" : "transparent", color: view === "card" ? "var(--text)" : "var(--muted)" }}
            title="Kart görünümü"
          >
            <LayoutGrid size={15} />
          </button>
          <button
            onClick={() => setView("list")}
            className="p-2 transition-colors"
            style={{ background: view === "list" ? "var(--surface2)" : "transparent", color: view === "list" ? "var(--text)" : "var(--muted)" }}
            title="Liste görünümü"
          >
            <List size={15} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus("")}
          className="text-xs px-3 py-1.5 rounded-full border transition-all"
          style={{
            background: !filterStatus ? "var(--surface2)" : "transparent",
            color: !filterStatus ? "var(--text)" : "var(--muted)",
            borderColor: !filterStatus ? "var(--accent2)" : "var(--border)",
          }}
        >
          Tümü <span className="ml-1 opacity-70">{companies.length}</span>
        </button>
        {Object.entries(STATUS_LABELS).map(([value, label]) => {
          const count = companies.filter(c => c.status === value).length;
          const active = filterStatus === value;
          return (
            <button
              key={value}
              onClick={() => setFilterStatus(active ? "" : value)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: active ? `${STATUS_COLORS[value]}22` : "transparent",
                color: active ? STATUS_COLORS[value] : "var(--muted)",
                borderColor: active ? STATUS_COLORS[value] : "var(--border)",
              }}
            >
              {label} <span className="ml-1 opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div
              key={c.id}
              className="glass rounded-xl p-5 glass-hover relative group cursor-pointer"
              onClick={() => setSelectedCompanyId(c.id)}
              style={selectedCompanyId === c.id ? { borderColor: "rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.06)" } : {}}
            >
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
                <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(c.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "var(--icon-bg)" }}>
                  {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <Building2 size={18} style={{ color: "var(--muted)" }} />}
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center gap-1.5">
                    <div className="font-medium text-white text-sm truncate" title={c.name}>{c.name}</div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0" style={{ background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status] }}>{STATUS_LABELS[c.status]}</span>
                  </div>
                  {c.website && <div className="text-xs mt-0.5 flex items-center gap-1 truncate" style={{ color: "var(--muted)" }}><Globe size={10} />{c.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</div>}
                </div>
              </div>
              {c.description && <p className="text-xs mb-3 line-clamp-2 break-words" style={{ color: "var(--muted)" }}>{c.description}</p>}
              {isStale(c) && (
                <div className="text-[11px] mb-2 px-2 py-1 rounded-lg inline-flex items-center gap-1" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                  {c.lastActivityAt ? "30+ gün temas yok" : "Hiç temas yok"}
                </div>
              )}
              <div className="flex items-center justify-between text-xs pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <span style={{ color: "var(--muted)" }}>{c.contacts.length} kişi</span>
                  {(() => {
                    const active = c.deals.filter(d => !["WON","LOST"].includes(d.stage)).length;
                    const won = c.deals.filter(d => d.stage === "WON").length;
                    if (active > 0) return <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(129,140,248,0.15)", color: "#818cf8" }}>{active} aktif pipeline</span>;
                    if (won > 0) return <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>{won} kazanıldı</span>;
                    return null;
                  })()}
                </div>
                {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-blue-400"><Linkedin size={11} />LinkedIn</a>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Şirket", "Durum", "Son Aktivite", "Sonraki Adım", "Website", "Kişiler", "Pipeline", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="group cursor-pointer transition-colors"
                  onClick={() => setSelectedCompanyId(c.id)}
                  style={{
                    borderTop: i === 0 ? undefined : "1px solid var(--border)",
                    background: selectedCompanyId === c.id ? "var(--surface2)" : "transparent",
                  }}
                  onMouseEnter={e => { if (selectedCompanyId !== c.id) (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                  onMouseLeave={e => { if (selectedCompanyId !== c.id) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "var(--icon-bg)" }}>
                        {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <Building2 size={14} style={{ color: "var(--muted)" }} />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate" style={{ color: "var(--text)" }}>{c.name}</div>
                        {c.nda && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>NDA</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status] }}>{STATUS_LABELS[c.status]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.lastActivityAt
                      ? <span className="text-xs" style={{ color: isStale(c) ? "#f59e0b" : "var(--muted)" }}>{new Date(c.lastActivityAt).toLocaleDateString("tr-TR")}</span>
                      : <span className="text-xs" style={{ color: isStale(c) ? "#f59e0b" : "var(--muted)", opacity: isStale(c) ? 1 : 0.4 }}>{isStale(c) ? "Hiç temas yok" : "—"}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.nextActionAt
                      ? <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(c.nextActionAt).toLocaleDateString("tr-TR")}</span>
                      : <span style={{ color: "var(--muted)", opacity: 0.4 }} className="text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.website
                      ? <span className="text-xs" style={{ color: "var(--muted)" }}>{c.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</span>
                      : <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{c.contacts.length}</span>
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const active = c.deals.filter(d => !["WON","LOST"].includes(d.stage));
                      const won = c.deals.filter(d => d.stage === "WON").length;
                      if (active.length > 0)
                        return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(129,140,248,0.12)", color: "#818cf8" }}>{active.length} aktif</span>;
                      if (won > 0)
                        return <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>{won} kazanıldı</span>;
                      return <span style={{ color: "var(--muted)", opacity: 0.4 }} className="text-xs">—</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" onClick={e => e.stopPropagation()} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><Linkedin size={13} /></a>}
                      <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><Pencil size={13} /></button>
                      <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(c.id); }} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {loading && <LoadingRows />}
      {!loading && filtered.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">Henüz şirket yok</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Magic Add ile herhangi bir web sitesini anında ekleyebilirsiniz</div>
        </div>
      )}

      {selectedCompanyId && (
        <ModalPortal>
          <CompanyDrawer
            companyId={selectedCompanyId}
            onClose={() => setSelectedCompanyId(null)}
            onEdit={() => {
              const c = companies.find(x => x.id === selectedCompanyId);
              if (c) { openEdit(c); }
            }}
            onChanged={load}
          />
        </ModalPortal>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowModal(false)}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Şirket Düzenle" : "Şirket Ekle"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="flex items-center gap-2 mb-2"><Sparkles size={13} style={{ color: "#a5b4fc" }} /><span className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>Magic Company Add</span></div>
              <div className="flex gap-2">
                <input placeholder="stripe.com" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && scrape()} className="flex-1 text-sm" />
                <button className="btn-primary text-xs whitespace-nowrap flex items-center gap-1.5" onClick={scrape} disabled={scraping || !scrapeUrl.trim()}>
                  {scraping ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {scraping ? "Getiriliyor..." : "Getir"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {[["Şirket Adı *", "name", "Örn: Acme A.Ş."], ["Website", "website", "https://acme.com"], ["Logo URL", "logoUrl", "https://..."], ["LinkedIn URL", "linkedinUrl", "https://linkedin.com/company/..."]].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                  <input placeholder={ph} value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="text-sm" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Açıklama</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-sm resize-none" placeholder="Şirket ne yapar?" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Durum</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="text-sm">
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Gizlilik Anlaşması</label>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, nda: !f.nda }))}
                  className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                  style={{ background: form.nda ? "#6366f1" : "rgba(255,255,255,0.1)" }}
                >
                  <span
                    className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                    style={{ transform: form.nda ? "translateX(20px)" : "translateX(2px)" }}
                  />
                </button>
              </div>
            </div>
            {form.logoUrl && <div className="mt-3 flex items-center gap-2"><img src={form.logoUrl} alt="" className="w-8 h-8 object-contain rounded" /><span className="text-xs" style={{ color: "var(--muted)" }}>Logo önizleme</span></div>}
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.name}>{saving ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Şirket Ekle")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white mb-2">Şirket Silinsin mi?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              {(() => {
                const target = companies.find(c => c.id === showDeleteConfirm);
                return target ? `"${target.name}" şirketi silinecek. ` : "";
              })()}
              Bu işlem geri alınamaz. İlişkili kişiler, fırsatlar ve aktiviteler korunur fakat şirket bağlantısı kaldırılır.
            </p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteCompany(showDeleteConfirm)}>Sil</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, Search, Globe, Linkedin, Building2, Sparkles, X, Loader2, Pencil, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface Company {
  id: string;
  name: string;
  website?: string;
  logoUrl?: string;
  description?: string;
  linkedinUrl?: string;
  nda?: boolean;
  contacts: Array<{ id: string }>;
  deals: Array<{ id: string; amount: number; stage: string }>;
}

const EMPTY = { name: "", website: "", logoUrl: "", description: "", linkedinUrl: "", nda: false };

export default function CompaniesPage() {
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

  const load = () => {
    setLoading(true);
    fetch("/api/companies").then(r => r.json()).then(setCompanies).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const scrape = async () => {
    if (!scrapeUrl) return;
    setScraping(true);
    try {
      const res = await fetch("/api/scrape", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: scrapeUrl }) });
      const data = await res.json();
      setForm(f => ({ ...f, name: data.name || f.name, description: data.description || f.description, logoUrl: data.logoUrl || f.logoUrl, linkedinUrl: data.linkedinUrl || f.linkedinUrl, website: data.website || f.website }));
    } finally { setScraping(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editingId) {
        await fetch(`/api/companies/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      } else {
        await fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      }
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      setScrapeUrl("");
      load();
    } finally { setSaving(false); }
  };

  const deleteCompany = async (id: string) => {
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
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
    });
    setEditingId(company.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowModal(true);
  };

  const filtered = companies.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Companies</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{companies.length} companies</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> Add Company
        </button>
      </div>

      <div className="relative" style={{ maxWidth: 320 }}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
        <input placeholder="Search companies..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="glass rounded-xl p-5 glass-hover relative group">
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
              <button onClick={() => setShowDeleteConfirm(c.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
                {c.logoUrl ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} /> : <Building2 size={18} style={{ color: "var(--muted)" }} />}
              </div>
              <div className="flex-1 min-w-0 pr-12">
                <div className="font-medium text-white text-sm truncate" title={c.name}>{c.name}</div>
                {c.website && <div className="text-xs mt-0.5 flex items-center gap-1 truncate" style={{ color: "var(--muted)" }}><Globe size={10} />{c.website.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}</div>}
              </div>
            </div>
            {c.description && <p className="text-xs mb-3 line-clamp-2 break-words" style={{ color: "var(--muted)" }}>{c.description}</p>}
            <div className="flex items-center justify-between text-xs pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <span style={{ color: "var(--muted)" }}>{c.contacts.length} contacts · {c.deals.length} deals</span>
              {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" className="flex items-center gap-1 text-blue-400"><Linkedin size={11} />LinkedIn</a>}
            </div>
          </div>
        ))}
      </div>

      {loading && <LoadingRows />}
      {!loading && filtered.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Building2 size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">No companies yet</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Use the Magic Add to scrape any website instantly</div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-lg p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Edit Company" : "Add Company"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
              <div className="flex items-center gap-2 mb-2"><Sparkles size={13} style={{ color: "#a5b4fc" }} /><span className="text-xs font-semibold" style={{ color: "#a5b4fc" }}>Magic Company Add</span></div>
              <div className="flex gap-2">
                <input placeholder="stripe.com" value={scrapeUrl} onChange={e => setScrapeUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && scrape()} className="flex-1 text-sm" />
                <button className="btn-primary text-xs whitespace-nowrap flex items-center gap-1.5" onClick={scrape} disabled={scraping}>
                  {scraping ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} {scraping ? "Fetching..." : "Fetch"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {[["Company Name *", "name", "Acme Corp"], ["Website", "website", "https://acme.com"], ["Logo URL", "logoUrl", "https://..."], ["LinkedIn URL", "linkedinUrl", "https://linkedin.com/company/..."]].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                  <input placeholder={ph} value={form[key as keyof typeof form] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="text-sm" />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Description</label>
                <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="text-sm resize-none" placeholder="What does this company do?" />
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
            {form.logoUrl && <div className="mt-3 flex items-center gap-2"><img src={form.logoUrl} alt="" className="w-8 h-8 object-contain rounded" /><span className="text-xs" style={{ color: "var(--muted)" }}>Logo preview</span></div>}
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.name}>{saving ? "Saving..." : (editingId ? "Update" : "Add Company")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-2">Delete Company?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>This action cannot be undone. All associated contacts, deals, and activities will remain but lose their company link.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteCompany(showDeleteConfirm)}>Delete</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

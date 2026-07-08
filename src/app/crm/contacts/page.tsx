"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, Search, Linkedin, Mail, Phone, Building2, X, User, Pencil, Trash2, Sparkles, AlertCircle, LayoutGrid, List } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { ContactDrawer } from "@/components/crm/ContactDrawer";
import { useToast } from "@/components/ui/Toaster";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  company?: { id: string; name: string; logoUrl?: string };
}
interface Company { id: string; name: string; }

const EMPTY = { firstName: "", lastName: "", title: "", email: "", phone: "", linkedinUrl: "", companyId: "" };

export default function ContactsPage() {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scrapeInput, setScrapeInput] = useState("");
  const [scrapeMode, setScrapeMode] = useState<"url" | "text">("text");
  const [scraping, setScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState("");
  const [view, setView] = useState<"card" | "list">("card");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/contacts").then(r => r.json()).then(setContacts),
      fetch("/api/companies").then(r => r.json()).then(setCompanies),
    ]).finally(() => setLoading(false));
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
      setSelectedContactId(open);
      const url = new URL(window.location.href);
      url.searchParams.delete("open");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form, companyId: form.companyId || null };
    try {
      const res = editingId
        ? await fetch(`/api/contacts/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) })
        : await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      if (!res.ok) { toast("Kaydedilemedi, alanları kontrol edin", "error"); return; }
      toast(editingId ? "Kişi güncellendi" : "Kişi eklendi", "success");
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      load();
    } finally { setSaving(false); }
  };

  const deleteContact = async (id: string) => {
    await fetch(`/api/contacts/${id}`, { method: "DELETE" });
    toast("Kişi silindi", "success");
    setShowDeleteConfirm(null);
    load();
  };

  const openEdit = (contact: Contact) => {
    setForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      title: contact.title || "",
      email: contact.email || "",
      phone: contact.phone || "",
      linkedinUrl: contact.linkedinUrl || "",
      companyId: contact.company?.id || "",
    });
    setEditingId(contact.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setScrapeInput("");
    setScrapeError("");
    setShowModal(true);
  };

  const scrapeContact = async () => {
    if (!scrapeInput.trim()) return;
    setScraping(true);
    setScrapeError("");
    const body = scrapeMode === "url"
      ? { url: scrapeInput.trim() }
      : { text: scrapeInput.trim() };
    try {
      const res = await fetch("/api/scrape/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setScrapeError(data.error || "Scrape başarısız oldu.");
        return;
      }
      // Auto-fill form fields with scraped data
      setForm(f => ({
        ...f,
        firstName: data.firstName || f.firstName,
        lastName: data.lastName || f.lastName,
        title: data.title || f.title,
        email: data.email || f.email,
        phone: data.phone || f.phone,
        linkedinUrl: data.linkedinUrl || f.linkedinUrl,
      }));
      // If company name found, try to match existing company
      if (data.companyName) {
        const match = companies.find(c =>
          c.name.toLowerCase().includes(data.companyName.toLowerCase()) ||
          data.companyName.toLowerCase().includes(c.name.toLowerCase())
        );
        if (match) setForm(f => ({ ...f, companyId: match.id }));
      }
    } catch {
      setScrapeError("Bağlantı hatası.");
    } finally {
      setScraping(false);
    }
  };

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName} ${c.company?.name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Kişiler</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{contacts.length} kişi</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
          <Plus size={15} /> Kişi Ekle
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1" style={{ maxWidth: 320 }}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input placeholder="Kişi ara..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
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

      {view === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="glass rounded-xl p-5 glass-hover relative group cursor-pointer" onClick={() => setSelectedContactId(c.id)}>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={e => { e.stopPropagation(); openEdit(c); }} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
                <button onClick={e => { e.stopPropagation(); setShowDeleteConfirm(c.id); }} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
              </div>
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}>
                  {c.firstName[0]}{c.lastName[0]}
                </div>
                <div className="flex-1 min-w-0 pr-12">
                  <div className="font-medium text-white text-sm truncate" title={`${c.firstName} ${c.lastName}`}>{c.firstName} {c.lastName}</div>
                  {c.title && <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>{c.title}</div>}
                  {c.company && (
                    <div className="flex items-center gap-1 mt-1 truncate">
                      <Building2 size={10} style={{ color: "var(--muted)" }} />
                      <Link href={`/crm/companies?open=${c.company.id}`} onClick={e => e.stopPropagation()} className="text-xs hover:underline truncate" style={{ color: "var(--muted)" }}>{c.company.name}</Link>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                {c.email && <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}><Mail size={11} />{c.email}</a>}
                {c.phone && <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}><Phone size={11} />{c.phone}</div>}
                {c.linkedinUrl && (
                  <a href={c.linkedinUrl} target="_blank" onClick={e => e.stopPropagation()} className="flex items-center gap-2 text-xs" style={{ color: "var(--accent2)" }}>
                    <Linkedin size={11} />LinkedIn
                  </a>
                )}
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
                {["Kişi", "Şirket", "E-posta", "Telefon", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: "var(--muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="group transition-colors cursor-pointer"
                  style={{ borderTop: i === 0 ? undefined : "1px solid var(--border)" }}
                  onClick={() => setSelectedContactId(c.id)}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface2)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate" style={{ color: "var(--text)" }}>{c.firstName} {c.lastName}</div>
                        {c.title && <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{c.title}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.company
                      ? <Link href={`/crm/companies?open=${c.company.id}`} onClick={e => e.stopPropagation()} className="text-xs hover:underline" style={{ color: "var(--muted)" }}>{c.company.name}</Link>
                      : <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.email
                      ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-xs" style={{ color: "var(--muted)" }}>{c.email}</a>
                      : <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.phone
                      ? <span className="text-xs" style={{ color: "var(--muted)" }}>{c.phone}</span>
                      : <span style={{ color: "var(--muted)", opacity: 0.4 }}>—</span>}
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
          <User size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">Henüz kişi yok</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Kişi ekleyin ve şirketlerle ilişkilendirin</div>
        </div>
      )}

      {selectedContactId && (
        <ContactDrawer
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
          onEdit={() => {
            const c = contacts.find(x => x.id === selectedContactId);
            if (c) openEdit(c);
          }}
        />
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowModal(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Kişi Düzenle" : "Kişi Ekle"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Scrape section */}
            {!editingId && (
              <div className="mb-4 p-3 rounded-xl space-y-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#a5b4fc" }}>
                    <Sparkles size={12} /> AI ile otomatik doldur
                  </div>
                  <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: "1px solid rgba(99,102,241,0.3)" }}>
                    <button
                      onClick={() => { setScrapeMode("text"); setScrapeInput(""); setScrapeError(""); }}
                      className="px-2.5 py-1 transition-colors"
                      style={{ background: scrapeMode === "text" ? "rgba(99,102,241,0.4)" : "transparent", color: scrapeMode === "text" ? "white" : "var(--muted)" }}
                    >
                      Metin yapıştır
                    </button>
                    <button
                      onClick={() => { setScrapeMode("url"); setScrapeInput(""); setScrapeError(""); }}
                      className="px-2.5 py-1 transition-colors"
                      style={{ background: scrapeMode === "url" ? "rgba(99,102,241,0.4)" : "transparent", color: scrapeMode === "url" ? "white" : "var(--muted)" }}
                    >
                      URL
                    </button>
                  </div>
                </div>

                {scrapeMode === "text" ? (
                  <textarea
                    rows={3}
                    value={scrapeInput}
                    onChange={e => { setScrapeInput(e.target.value); setScrapeError(""); }}
                    className="text-sm w-full"
                    placeholder={"LinkedIn profilinden kopyaladığınız metni buraya yapıştırın...\n(Profil sayfasını Ctrl+A → Ctrl+C ile kopyalayabilirsiniz)"}
                    disabled={scraping}
                  />
                ) : (
                  <input
                    value={scrapeInput}
                    onChange={e => { setScrapeInput(e.target.value); setScrapeError(""); }}
                    onKeyDown={e => e.key === "Enter" && scrapeContact()}
                    className="text-sm w-full"
                    placeholder="https://... (LinkedIn dışı siteler için)"
                    disabled={scraping}
                  />
                )}

                <button
                  onClick={scrapeContact}
                  disabled={scraping || !scrapeInput.trim()}
                  className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
                  style={{ opacity: scraping || !scrapeInput.trim() ? 0.6 : 1 }}
                >
                  {scraping ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analiz ediliyor...
                    </>
                  ) : (
                    <><Sparkles size={12} /> Bilgileri Çıkar</>
                  )}
                </button>

                {scrapeError && (
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#f87171" }}>
                    <AlertCircle size={12} /> {scrapeError}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Ad *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="text-sm" placeholder="Ahmet" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Soyad *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="text-sm" placeholder="Yılmaz" />
                </div>
              </div>
              {[["Unvan", "title", "CEO"], ["E-posta", "email", "ahmet@acme.com"], ["Telefon", "phone", "+90 555 000 0000"], ["LinkedIn URL", "linkedinUrl", "https://linkedin.com/in/..."]].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="text-sm" placeholder={ph} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Şirket</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="text-sm">
                  <option value="">— Şirket Yok —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Vazgeç</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.firstName || !form.lastName}>{saving ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Kişi Ekle")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white mb-2">Kişi Silinsin mi?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              {(() => {
                const target = contacts.find(c => c.id === showDeleteConfirm);
                return target ? `"${target.firstName} ${target.lastName}" kişisi silinecek. ` : "";
              })()}
              Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>Vazgeç</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteContact(showDeleteConfirm)}>Sil</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}


"use client";
import { useEffect, useState } from "react";
import { Plus, Search, Linkedin, Mail, Phone, Building2, X, User } from "lucide-react";

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/contacts").then(r => r.json()).then(setContacts);
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    const data = { ...form };
    if (!data.companyId) delete (data as any).companyId;
    try {
      await fetch("/api/contacts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      setShowModal(false);
      setForm({ ...EMPTY });
      load();
    } finally { setSaving(false); }
  };

  const filtered = contacts.filter(c =>
    `${c.firstName} ${c.lastName} ${c.company?.name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Contacts</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>{contacts.length} contacts</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm" onClick={() => setShowModal(true)}>
          <Plus size={15} /> Add Contact
        </button>
      </div>

      <div className="relative" style={{ maxWidth: 320 }}>
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
        <input placeholder="Search contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 text-sm" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="glass rounded-xl p-5 glass-hover">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-white text-sm">{c.firstName} {c.lastName}</div>
                {c.title && <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{c.title}</div>}
                {c.company && (
                  <div className="flex items-center gap-1 mt-1">
                    <Building2 size={10} style={{ color: "var(--muted)" }} />
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{c.company.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              {c.email && <a href={`mailto:${c.email}`} className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}><Mail size={11} />{c.email}</a>}
              {c.phone && <div className="flex items-center gap-2 text-xs" style={{ color: "var(--muted)" }}><Phone size={11} />{c.phone}</div>}
              {c.linkedinUrl && (
                <a href={c.linkedinUrl} target="_blank" className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
                  <Linkedin size={11} />Open in LinkedIn
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <User size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">No contacts yet</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Add contacts and link them to companies</div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">Add Contact</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>First Name *</label>
                  <input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="text-sm" placeholder="John" />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Last Name *</label>
                  <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="text-sm" placeholder="Doe" />
                </div>
              </div>
              {[["Title", "title", "CEO"], ["Email", "email", "john@acme.com"], ["Phone", "phone", "+1 555 000 0000"], ["LinkedIn URL", "linkedinUrl", "https://linkedin.com/in/..."]].map(([label, key, ph]) => (
                <div key={key}>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>{label}</label>
                  <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="text-sm" placeholder={ph} />
                </div>
              ))}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Company</label>
                <select value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))} className="text-sm">
                  <option value="">— No Company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.firstName || !form.lastName}>{saving ? "Saving..." : "Add Contact"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

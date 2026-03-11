"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Filter, Calendar, RefreshCw, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface Activity {
  id: string;
  type: "MEETING" | "CALL" | "EMAIL" | "NOTE";
  notes?: string;
  nextActionDate?: string;
  createdAt: string;
  company?: { id: string; name: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; title: string } | null;
}

interface Company { id: string; name: string; }
interface Contact { id: string; firstName: string; lastName: string; companyId?: string | null; }

const TYPE_OPTIONS = [
  { value: "MEETING", label: "Toplantı", accent: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  { value: "CALL", label: "Telefon", accent: "#0ea5e9", bg: "rgba(14,165,233,0.15)" },
  { value: "EMAIL", label: "E-posta", accent: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  { value: "NOTE", label: "Not / Sohbet", accent: "#94a3b8", bg: "rgba(148,163,184,0.18)" },
] as const;

const EMPTY_ACTIVITY = {
  type: "MEETING" as Activity["type"],
  notes: "",
  nextActionDate: "",
  companyId: "",
  contactId: "",
};

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ACTIVITY });
  const [saving, setSaving] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Activity | null>(null);
  const [convertForm, setConvertForm] = useState({ title: "", amount: "", currency: "TRY" });

  const load = () => {
    fetch("/api/activities").then(r => r.json()).then(setActivities);
    fetch("/api/companies").then(r => r.json()).then(setCompanies);
    fetch("/api/contacts").then(r => r.json()).then(setContacts);
  };

  useEffect(() => { load(); }, []);

  const filteredActivities = filterType === "ALL" ? activities : activities.filter(a => a.type === filterType);
  const totalConverted = activities.filter(a => a.deal).length;
  const conversionRate = activities.length ? (totalConverted / activities.length) * 100 : 0;
  const upcomingNextActions = activities.filter(a => a.nextActionDate && new Date(a.nextActionDate) >= new Date()).length;

  const contactOptions = useMemo(() => {
    if (!form.companyId) return contacts;
    return contacts.filter(c => c.companyId === form.companyId);
  }, [contacts, form.companyId]);

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      type: form.type,
      notes: form.notes,
      nextActionDate: form.nextActionDate ? new Date(form.nextActionDate) : null,
    };
    if (form.companyId) payload.companyId = form.companyId;
    if (form.contactId) payload.contactId = form.contactId;

    try {
      if (editingId) {
        await fetch(`/api/activities/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch("/api/activities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
      setShowModal(false);
      setForm({ ...EMPTY_ACTIVITY });
      setEditingId(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async (id: string) => {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
    load();
  };

  const openEdit = (activity: Activity) => {
    setForm({
      type: activity.type,
      notes: activity.notes || "",
      nextActionDate: activity.nextActionDate ? activity.nextActionDate.slice(0, 10) : "",
      companyId: activity.company?.id || "",
      contactId: activity.contact?.id || "",
    });
    setEditingId(activity.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_ACTIVITY });
    setEditingId(null);
    setShowModal(true);
  };

  const openConvertModal = (activity: Activity) => {
    setConvertTarget(activity);
    setConvertForm({
      title: activity.notes?.slice(0, 80) || `${activity.type} - ${activity.company?.name ?? "Yeni Fırsat"}`,
      amount: "",
      currency: "TRY",
    });
  };

  const handleConvert = async () => {
    if (!convertTarget) return;
    await fetch(`/api/activities/${convertTarget.id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: convertForm.title,
        amount: convertForm.amount ? Number(convertForm.amount) : undefined,
        currency: convertForm.currency,
      }),
    });
    setConvertTarget(null);
    load();
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">CRM Aktiviteleri</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>Toplantılar, görüşmeler ve notların tek yerden takibi</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost text-sm flex items-center gap-2" onClick={load}>
            <RefreshCw size={14} /> Yenile
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
            <Plus size={15} /> Aktivite Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Toplam Aktivite</div>
          <div className="text-2xl font-semibold text-white">{activities.length}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Pipeline'a Dönüşen</div>
          <div className="text-2xl font-semibold text-white">{totalConverted}</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Aktivite → Deal Oranı</div>
          <div className="text-2xl font-semibold text-white">{conversionRate.toFixed(0)}%</div>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Yaklaşan Aksiyon</div>
          <div className="text-2xl font-semibold text-white">{upcomingNextActions}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="text-xs uppercase tracking-wide flex items-center gap-1" style={{ color: "var(--muted)" }}>
          <Filter size={12} /> Filtrele
        </div>
        {(["ALL", ...TYPE_OPTIONS.map(o => o.value)] as string[]).map(type => {
          const data = TYPE_OPTIONS.find(o => o.value === type);
          const active = filterType === type;
          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all"
              style={{
                background: active ? data?.bg || "rgba(255,255,255,0.1)" : "transparent",
                color: active ? data?.accent || "var(--muted)" : "var(--muted)",
                borderColor: active ? (data?.accent || "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.08)",
              }}
            >
              {type === "ALL" ? "Tümü" : data?.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {filteredActivities.map(activity => {
          const typeMeta = TYPE_OPTIONS.find(t => t.value === activity.type);
          return (
            <div key={activity.id} className="glass rounded-xl p-4 flex flex-col gap-2 relative group">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <button onClick={() => openEdit(activity)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
                <button onClick={() => setShowDeleteConfirm(activity.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ color: typeMeta?.accent, background: typeMeta?.bg }}
                  >
                    {typeMeta?.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {activity.deal ? (
                  <span className="text-xs flex items-center gap-1" style={{ color: "#a5b4fc" }}>
                    <ArrowRight size={12} /> {activity.deal.title}
                  </span>
                ) : (
                  <button className="btn-ghost text-xs" onClick={() => openConvertModal(activity)}>
                    Pipeline'a Çevir
                  </button>
                )}
              </div>
              {activity.notes && <p className="text-sm text-white/90">{activity.notes}</p>}
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted)" }}>
                {activity.company && <span>🏢 {activity.company.name}</span>}
                {activity.contact && <span>👤 {activity.contact.firstName} {activity.contact.lastName}</span>}
                {activity.nextActionDate && (
                  <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(activity.nextActionDate).toLocaleDateString()}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredActivities.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Plus size={28} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">Henüz aktivite yok</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>Toplantı, telefon veya not ekleyerek takibi başlat</div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">{editingId ? "Aktivite Düzenle" : "Yeni Aktivite"}</h2>
              <button className="btn-ghost text-xs" onClick={() => setShowModal(false)}>Kapat</button>
            </div>

            <div className="flex gap-2 flex-wrap">
              {TYPE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setForm(f => ({ ...f, type: option.value }))}
                  className="px-3 py-2 rounded-lg text-xs font-medium border"
                  style={{
                    background: form.type === option.value ? option.bg : "transparent",
                    color: form.type === option.value ? option.accent : "var(--muted)",
                    borderColor: form.type === option.value ? option.accent : "rgba(255,255,255,0.08)",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Notlar</label>
              <textarea rows={3} className="text-sm" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Toplantı özeti, sonraki adımlar..." />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Sonraki Aksiyon</label>
              <input type="date" className="text-sm" value={form.nextActionDate} onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Şirket</label>
              <select className="text-sm" value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value, contactId: "" }))}>
                <option value="">— Seçilmedi —</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Kişi</label>
              <select className="text-sm" value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))}>
                <option value="">— Seçilmedi —</option>
                {contactOptions.map(contact => (
                  <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Vazgeç</button>
              <button className="btn-primary flex-1 text-sm" disabled={saving} onClick={handleSave}>{saving ? "Kaydediliyor" : (editingId ? "Güncelle" : "Aktiviteyi Kaydet")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {convertTarget && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-3 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white">Pipeline Fırsatı Oluştur</h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Bu aktiviteyi yeni bir deal olarak kaydetmek üzeresiniz. Tutar ve başlığı onaylayın.
            </p>
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Başlık</label>
              <input className="text-sm" value={convertForm.title} onChange={e => setConvertForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Tutar</label>
                <input type="number" className="text-sm" value={convertForm.amount} onChange={e => setConvertForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Para Birimi</label>
                <select className="text-sm" value={convertForm.currency} onChange={e => setConvertForm(f => ({ ...f, currency: e.target.value }))}>
                  {[["TRY", "TRY (₺)"], ["USD", "USD ($)"], ["EUR", "EUR (€)"]].map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setConvertTarget(null)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" onClick={handleConvert}>Deal Oluştur</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-semibold text-white mb-2">Aktiviteyi Sil?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>Vazgeç</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteActivity(showDeleteConfirm)}>Sil</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

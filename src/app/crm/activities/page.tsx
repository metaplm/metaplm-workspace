"use client";

import { useEffect, useMemo, useState } from "react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, Filter, Calendar, RefreshCw, ArrowRight, Pencil, Trash2, GitBranch, ChevronDown, ChevronRight, ChevronsUpDown } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";

interface Activity {
  id: string;
  type: "MEETING" | "CALL" | "EMAIL" | "NOTE";
  notes?: string;
  nextActionDate?: string;
  createdAt: string;
  source?: string | null;
  parentId?: string | null;
  rootActivityId?: string | null;
  rootActivity?: { id: string; notes?: string; company?: { id: string; name: string; logoUrl?: string } | null } | null;
  company?: { id: string; name: string; logoUrl?: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; title: string } | null;
  children?: Activity[];
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
  createdAt: new Date().toISOString().slice(0, 10),
  source: "",
  companyId: "",
  contactId: "",
  parentId: "",
  rootActivityId: "",
};

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onConvert,
  onAddChild,
  isChild = false,
  collapsed,
  onToggleCollapse,
}: {
  activity: Activity;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
  onConvert: (a: Activity) => void;
  onAddChild: (a: Activity) => void;
  isChild?: boolean;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
}) {
  const typeMeta = TYPE_OPTIONS.find(t => t.value === activity.type);
  const hasChildren = (activity.children?.length ?? 0) > 0;
  const isRootActivity = !activity.parentId;

  return (
    <div className={isChild ? "ml-6 border-l-2 pl-4" : ""} style={isChild ? { borderColor: "rgba(255,255,255,0.1)" } : {}}>
      <div 
        className="glass rounded-xl p-4 flex flex-col gap-2 relative group"
        style={isRootActivity && !isChild ? { 
          background: "rgba(99,102,241,0.08)",
          borderColor: "rgba(99,102,241,0.3)",
          borderWidth: "1px"
        } : {}}
      >
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={() => onAddChild(activity)}
            className="p-1.5 rounded-lg hover:bg-indigo-500/20 flex items-center gap-1 text-xs"
            style={{ color: "var(--muted)" }}
            title="Devam ekle"
          >
            <GitBranch size={13} />
          </button>
          <button onClick={() => onEdit(activity)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
          <button onClick={() => onDelete(activity.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
        </div>
        <div className="flex items-center justify-between pr-24">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => onToggleCollapse(activity.id)}
                className="p-0.5 rounded hover:bg-white/10 transition-colors"
                style={{ color: "var(--muted)" }}
                title={collapsed ? "Genişlet" : "Daralt"}
              >
                {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: typeMeta?.accent, background: typeMeta?.bg }}>
              {typeMeta?.label}
            </span>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              {new Date(activity.createdAt).toLocaleDateString()}
            </span>
            {hasChildren && (
              <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ color: "#a5b4fc", background: "rgba(99,102,241,0.12)" }}>
                <GitBranch size={10} /> {activity.children!.length} devam
              </span>
            )}
          </div>
          {activity.deal ? (
            <span className="text-xs flex items-center gap-1" style={{ color: "#a5b4fc" }}>
              <ArrowRight size={12} /> {activity.deal.title}
            </span>
          ) : (
            <button className="btn-ghost text-xs" onClick={() => onConvert(activity)}>
              Pipeline&apos;a Çevir
            </button>
          )}
        </div>
        {activity.notes && <p className="text-sm text-white/90">{activity.notes}</p>}
        <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted)" }}>
          {isRootActivity && !isChild && activity.company && (
            <div className="flex items-center gap-2">
              {activity.company.logoUrl && (
                <img src={activity.company.logoUrl} alt={activity.company.name} className="w-5 h-5 object-contain rounded" />
              )}
              <span>🏢 {activity.company.name}</span>
            </div>
          )}
          {!isRootActivity && activity.company && <span>🏢 {activity.company.name}</span>}
          {activity.contact && <span>👤 {activity.contact.firstName} {activity.contact.lastName}</span>}
          {activity.source && isRootActivity && !isChild && <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc" }}>📌 {activity.source}</span>}
          {activity.nextActionDate && (
            <span className="flex items-center gap-1"><Calendar size={11} /> {new Date(activity.nextActionDate).toLocaleDateString()}</span>
          )}
        </div>
      </div>
      {hasChildren && !collapsed && (
        <div className="space-y-2 mt-2">
          {activity.children!.map(child => (
            <ActivityCard
              key={child.id}
              activity={child}
              onEdit={onEdit}
              onDelete={onDelete}
              onConvert={onConvert}
              onAddChild={onAddChild}
              isChild
              collapsed={false}
              onToggleCollapse={onToggleCollapse}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const [filterContactId, setFilterContactId] = useState<string>("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ACTIVITY });
  const [saving, setSaving] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Activity | null>(null);
  const [convertForm, setConvertForm] = useState({ title: "", amount: "", currency: "TRY" });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/activities").then(r => r.json()).then(setActivities),
      fetch("/api/companies").then(r => r.json()).then(setCompanies),
      fetch("/api/contacts").then(r => r.json()).then(setContacts),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const allActivitiesFlat = useMemo(() => {
    const flat: Activity[] = [];
    const collect = (list: Activity[]) => { list.forEach(a => { flat.push(a); if (a.children) collect(a.children); }); };
    collect(activities);
    return flat;
  }, [activities]);

  // IDs of root activities that have children (for collapse all/expand all)
  const parentIds = useMemo(() => activities.filter(a => (a.children?.length ?? 0) > 0).map(a => a.id), [activities]);
  const allCollapsed = parentIds.length > 0 && parentIds.every(id => collapsedIds.has(id));

  const toggleCollapseAll = () => {
    if (allCollapsed) {
      setCollapsedIds(new Set());
    } else {
      setCollapsedIds(new Set(parentIds));
    }
  };

  const toggleCollapse = (id: string) => {
    setCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      if (filterType !== "ALL" && a.type !== filterType) return false;
      if (filterCompanyId && a.company?.id !== filterCompanyId) return false;
      if (filterContactId && a.contact?.id !== filterContactId) return false;
      return true;
    });
  }, [activities, filterType, filterCompanyId, filterContactId]);

  const totalConverted = allActivitiesFlat.filter(a => a.deal).length;
  const conversionRate = allActivitiesFlat.length ? (totalConverted / allActivitiesFlat.length) * 100 : 0;
  const upcomingNextActions = allActivitiesFlat.filter(a => a.nextActionDate && new Date(a.nextActionDate) >= new Date()).length;

  const contactOptions = useMemo(() => {
    if (!form.companyId) return contacts;
    return contacts.filter(c => c.companyId === form.companyId);
  }, [contacts, form.companyId]);

  // Contacts available in filter (optionally scoped to selected company)
  const filterContactOptions = useMemo(() => {
    if (!filterCompanyId) return contacts;
    return contacts.filter(c => c.companyId === filterCompanyId);
  }, [contacts, filterCompanyId]);

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      type: form.type,
      notes: form.notes,
      nextActionDate: form.nextActionDate ? new Date(form.nextActionDate) : null,
      createdAt: form.createdAt ? new Date(form.createdAt) : undefined,
    };
    if (form.companyId) payload.companyId = form.companyId;
    if (form.contactId) payload.contactId = form.contactId;
    if (form.parentId) payload.parentId = form.parentId;
    if (form.source) payload.source = form.source;
    if (form.rootActivityId) payload.rootActivityId = form.rootActivityId;

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
      createdAt: activity.createdAt ? activity.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      source: activity.source || "",
      companyId: activity.company?.id || "",
      contactId: activity.contact?.id || "",
      parentId: activity.parentId || "",
      rootActivityId: activity.rootActivityId || "",
    });
    setEditingId(activity.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY_ACTIVITY, createdAt: new Date().toISOString().slice(0, 10) });
    setEditingId(null);
    setShowModal(true);
  };

  const openAddChild = (parent: Activity) => {
    setForm({
      ...EMPTY_ACTIVITY,
      createdAt: new Date().toISOString().slice(0, 10),
      companyId: parent.company?.id || "",
      contactId: parent.contact?.id || "",
      parentId: parent.id,
      source: "",
      rootActivityId: "",
    });
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

  const hasActiveFilters = filterType !== "ALL" || filterCompanyId || filterContactId;

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
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Pipeline&apos;a Dönüşen</div>
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

      {/* Filters */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs uppercase tracking-wide flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            <Filter size={12} /> Filtrele
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                style={{ color: "var(--muted)" }}
                onClick={() => { setFilterType("ALL"); setFilterCompanyId(""); setFilterContactId(""); }}
              >
                Temizle
              </button>
            )}
            {parentIds.length > 0 && (
              <button
                className="text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all hover:bg-white/5"
                style={{ color: "var(--muted)", borderColor: "rgba(255,255,255,0.08)" }}
                onClick={toggleCollapseAll}
              >
                <ChevronsUpDown size={12} />
                {allCollapsed ? "Tümünü Aç" : "Tümünü Kapat"}
              </button>
            )}
          </div>
        </div>

        {/* Type pills */}
        <div className="flex items-center gap-2 flex-wrap">
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
                  color: active ? data?.accent || "white" : "var(--muted)",
                  borderColor: active ? (data?.accent || "rgba(255,255,255,0.1)") : "rgba(255,255,255,0.08)",
                }}
              >
                {type === "ALL" ? "Tümü" : data?.label}
              </button>
            );
          })}
        </div>

        {/* Company + Contact dropdowns */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="text-xs py-1.5"
            style={{ minWidth: 160 }}
            value={filterCompanyId}
            onChange={e => { setFilterCompanyId(e.target.value); setFilterContactId(""); }}
          >
            <option value="">🏢 Tüm Şirketler</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="text-xs py-1.5"
            style={{ minWidth: 160 }}
            value={filterContactId}
            onChange={e => setFilterContactId(e.target.value)}
          >
            <option value="">👤 Tüm Kişiler</option>
            {filterContactOptions.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filteredActivities.map(activity => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onEdit={openEdit}
            onDelete={id => setShowDeleteConfirm(id)}
            onConvert={openConvertModal}
            onAddChild={openAddChild}
            collapsed={collapsedIds.has(activity.id)}
            onToggleCollapse={toggleCollapse}
          />
        ))}
      </div>

      {loading && <LoadingRows />}
      {!loading && filteredActivities.length === 0 && (
        <div className="glass rounded-xl p-12 text-center">
          <Plus size={28} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
          <div className="text-sm text-white mb-1">Aktivite bulunamadı</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {hasActiveFilters ? "Filtreleri temizleyerek tüm aktiviteleri görebilirsiniz." : "Toplantı, telefon veya not ekleyerek takibi başlat"}
          </div>
        </div>
      )}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-white">
                {editingId ? "Aktivite Düzenle" : form.parentId ? "Devam Aktivitesi Ekle" : "Yeni Aktivite"}
              </h2>
              <button className="btn-ghost text-xs" onClick={() => setShowModal(false)}>Kapat</button>
            </div>
            {form.parentId && !editingId && (
              <div className="text-xs px-3 py-2 rounded-lg flex items-center gap-2" style={{ background: "rgba(99,102,241,0.12)", color: "#a5b4fc" }}>
                <GitBranch size={12} /> Bu aktivite bir öncekinin devamı olarak kaydedilecek
              </div>
            )}

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

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Activity Date</label>
                <input
                  type="date"
                  value={form.createdAt}
                  onChange={e => setForm(f => ({ ...f, createdAt: e.target.value }))}
                  className="text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Notlar</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Toplantı özeti, sonraki adımlar..."
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Sonraki Aksiyon</label>
                <input type="date" className="text-sm" value={form.nextActionDate} onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))} />
              </div>

              {!form.parentId && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Kaynak</label>
                  <input
                    type="text"
                    className="text-sm"
                    value={form.source}
                    onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    placeholder="Örn: LinkedIn, Referans, Web..."
                    list="sources-list"
                  />
                  <datalist id="sources-list">
                    {Array.from(new Set(activities.map(a => a.source).filter((s): s is string => !!s))).map(src => (
                      <option key={src} value={src} />
                    ))}
                  </datalist>
                </div>
              )}

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Root Aktivite</label>
                <select className="text-sm" value={form.rootActivityId} onChange={e => setForm(f => ({ ...f, rootActivityId: e.target.value }))}>
                  <option value="">— Seçilmedi —</option>
                  {activities
                    .filter(a => !a.parentId && a.id !== editingId)
                    .map(activity => (
                      <option key={activity.id} value={activity.id}>
                        {activity.notes?.slice(0, 50) || `${activity.type} - ${activity.company?.name || "Bilinmiyor"}`}
                      </option>
                    ))}
                </select>
              </div>

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

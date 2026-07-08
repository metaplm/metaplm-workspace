"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { Plus, Filter, Calendar, RefreshCw, ArrowRight, Pencil, Trash2, GitBranch, ChevronDown, ChevronRight, ChevronsUpDown, X, ChevronDown as ChevronDownSm, Check, Search, Sparkles, Loader2, CheckCircle2, Clock, AlarmClock, CalendarClock, Send } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { useToast } from "@/components/ui/Toaster";

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
  contacts?: { id: string; firstName: string; lastName: string }[];
  deal?: { id: string; title: string } | null;
  children?: Activity[];
}

interface Company { id: string; name: string; }
interface Contact { id: string; firstName: string; lastName: string; companyId?: string | null; }
interface Deal { id: string; title: string; companyId?: string | null; }

const TYPE_OPTIONS = [
  { value: "MEETING", label: "Toplantı", accent: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  { value: "CALL", label: "Telefon", accent: "#0ea5e9", bg: "rgba(14,165,233,0.15)" },
  { value: "EMAIL", label: "E-posta", accent: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  { value: "NOTE", label: "Not / Sohbet", accent: "#94a3b8", bg: "rgba(148,163,184,0.18)" },
] as const;

const NOTES_LIMIT = 200;

function FilterCombobox({
  value,
  onChange,
  options,
  placeholder,
  allLabel,
}: {
  value: string;
  onChange: (id: string) => void;
  options: { id: string; label: string }[];
  placeholder: string;
  allLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const openDropdown = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 6,
        left: rect.left,
        minWidth: Math.max(rect.width, 220),
        zIndex: 9999,
      });
    }
    setOpen(true);
    setSearch("");
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  const selected = options.find(o => o.id === value);

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      className="rounded-xl overflow-hidden"
      style={{
        ...dropdownStyle,
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div className="p-2" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Ara..."
            className="pl-7 text-xs py-1.5"
            style={{ background: "var(--surface2)" }}
          />
        </div>
      </div>
      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        <div
          onMouseDown={() => { onChange(""); setOpen(false); setSearch(""); }}
          className="flex items-center gap-2 px-3 py-2 cursor-pointer text-xs"
          style={{
            color: !value ? "var(--accent2)" : "var(--muted)",
            background: !value ? "rgba(2,103,160,0.08)" : "transparent",
            fontWeight: !value ? 600 : 400,
          }}
        >
          {allLabel}
        </div>
        {filtered.length === 0 && (
          <div className="px-3 py-3 text-xs text-center" style={{ color: "var(--muted)" }}>Sonuç bulunamadı</div>
        )}
        {filtered.map(opt => (
          <div
            key={opt.id}
            onMouseDown={() => { onChange(opt.id); setOpen(false); setSearch(""); }}
            className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer text-xs"
            style={{
              background: value === opt.id ? "rgba(2,103,160,0.08)" : "transparent",
              color: value === opt.id ? "var(--text)" : "var(--muted)",
              fontWeight: value === opt.id ? 600 : 400,
            }}
            onMouseEnter={e => { if (value !== opt.id) (e.currentTarget as HTMLElement).style.background = "rgba(99,102,241,0.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = value === opt.id ? "rgba(2,103,160,0.08)" : "transparent"; }}
          >
            <span className="truncate">{opt.label}</span>
            {value === opt.id && <Check size={11} style={{ color: "var(--accent2)", flexShrink: 0 }} />}
          </div>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => open ? (setOpen(false), setSearch("")) : openDropdown()}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{
          minWidth: 150,
          border: `1px solid ${open || value ? "var(--accent2)" : "var(--border)"}`,
          background: value ? "rgba(2,103,160,0.08)" : "var(--surface)",
          color: value ? "var(--text)" : "var(--muted)",
          boxShadow: open ? "0 0 0 3px rgba(2,103,160,0.12)" : "none",
        }}
      >
        <span className="truncate font-medium">{selected ? selected.label : placeholder}</span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <span
              onMouseDown={e => { e.stopPropagation(); onChange(""); setOpen(false); setSearch(""); }}
              className="rounded p-0.5 hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              <X size={11} />
            </span>
          )}
          <ChevronDownSm
            size={12}
            style={{ color: "var(--muted)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          />
        </div>
      </button>
      {typeof window !== "undefined" && open && createPortal(dropdown, document.body)}
    </>
  );
}

const EMPTY_ACTIVITY = {
  type: "MEETING" as Activity["type"],
  notes: "",
  nextActionDate: "",
  createdAt: new Date().toISOString().slice(0, 10),
  source: "",
  companyId: "",
  contactIds: [] as string[],
  parentId: "",
  rootActivityId: "",
  dealId: "",
};

/* ---------- date helpers ---------- */

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayDiffFromToday(dateStr: string) {
  const today = startOfDay(new Date()).getTime();
  const day = startOfDay(new Date(dateStr)).getTime();
  return Math.round((day - today) / 86400000);
}

function feedGroupLabel(dateStr: string) {
  const diff = dayDiffFromToday(dateStr);
  const d = new Date(dateStr);
  const now = new Date();
  if (diff >= 0) return "Bugün";
  if (diff === -1) return "Dün";
  if (diff > -7) return "Bu Hafta";
  if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) return "Bu Ay";
  return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

function relativeDayLabel(dateStr: string) {
  const diff = dayDiffFromToday(dateStr);
  if (diff === 0) return "Bugün";
  if (diff === 1) return "Yarın";
  if (diff === -1) return "Dün";
  if (diff < 0) return `${-diff} gün gecikti`;
  return `${diff} gün sonra`;
}

function ActivityCard({
  activity,
  onEdit,
  onDelete,
  onConvert,
  onAddChild,
  onView,
  isChild = false,
  collapsed,
  onToggleCollapse,
}: {
  activity: Activity;
  onEdit: (a: Activity) => void;
  onDelete: (id: string) => void;
  onConvert: (a: Activity) => void;
  onAddChild: (a: Activity) => void;
  onView: (a: Activity) => void;
  isChild?: boolean;
  collapsed: boolean;
  onToggleCollapse: (id: string) => void;
}) {
  const typeMeta = TYPE_OPTIONS.find(t => t.value === activity.type);
  const hasChildren = (activity.children?.length ?? 0) > 0;
  const isRootActivity = !activity.parentId;
  const company = activity.company;

  const stopProp = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      className={isChild ? "activity-child-wrapper ml-6 border-l-2 pl-4" : ""}
    >
      <div
        className={`glass rounded-xl p-4 flex flex-col gap-2 relative group cursor-pointer ${isRootActivity && !isChild ? "activity-card-root" : "activity-card-child"}`}
        onClick={() => onView(activity)}
      >
        {/* Actions */}
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1" onClick={stopProp}>
          {!isChild && (
            <button
              onClick={() => onAddChild(activity)}
              className="p-1.5 rounded-lg hover:bg-indigo-500/20 flex items-center gap-1 text-xs"
              style={{ color: "var(--muted)" }}
              title="Devam ekle"
            >
              <GitBranch size={13} />
            </button>
          )}
          <button onClick={() => onEdit(activity)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
          <button onClick={() => onDelete(activity.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}><Trash2 size={14} /></button>
        </div>

        {/* Company header */}
        {company && (
          <div className="flex items-center gap-2 pr-24">
            {company.logoUrl && (
              <img src={company.logoUrl} alt={company.name} className="w-6 h-6 object-contain rounded" />
            )}
            <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{company.name}</span>
          </div>
        )}

        {/* Type + date + deal row */}
        <div className="flex items-center justify-between pr-24">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={e => { stopProp(e); onToggleCollapse(activity.id); }}
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
              {new Date(activity.createdAt).toLocaleDateString("tr-TR")}
            </span>
            {hasChildren && (
              <span className="text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ color: "#818cf8", background: "rgba(99,102,241,0.12)" }}>
                <GitBranch size={10} /> {activity.children!.length} devam
              </span>
            )}
          </div>
          {activity.deal ? (
            <span className="text-xs flex items-center gap-1" style={{ color: "#818cf8" }}>
              <ArrowRight size={12} /> {activity.deal.title}
            </span>
          ) : (
            <button className="btn-ghost text-xs" onClick={e => { stopProp(e); onConvert(activity); }}>
              Pipeline&apos;a Çevir
            </button>
          )}
        </div>

        {/* Notes */}
        {activity.notes && (
          <p className="text-sm leading-relaxed" style={{ color: "var(--text)", opacity: 0.88 }}>
            {activity.notes.length > NOTES_LIMIT ? activity.notes.slice(0, NOTES_LIMIT) + "…" : activity.notes}
          </p>
        )}

        {/* Footer */}
        <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--muted)" }}>
          {activity.contacts && activity.contacts.length > 0 && (
            <span>👤 {activity.contacts.map(c => `${c.firstName} ${c.lastName}`).join(", ")}</span>
          )}
          {activity.source && isRootActivity && !isChild && (
            <span className="px-1.5 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>📌 {activity.source}</span>
          )}
          {activity.nextActionDate && (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-full"
              style={dayDiffFromToday(activity.nextActionDate) < 0
                ? { background: "rgba(239,68,68,0.12)", color: "#f87171" }
                : { background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
            >
              <Calendar size={11} /> {new Date(activity.nextActionDate).toLocaleDateString("tr-TR")} · {relativeDayLabel(activity.nextActionDate)}
            </span>
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
              onView={onView}
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

interface QuickPreview {
  type: Activity["type"];
  notes: string;
  createdAt: string;
  nextActionDate: string;
  source: string;
  companyId: string;
  contactIds: string[];
}

export default function ActivitiesPage() {
  const { toast } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const [filterContactId, setFilterContactId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ACTIVITY });
  const [saving, setSaving] = useState(false);
  const [convertTarget, setConvertTarget] = useState<Activity | null>(null);
  const [convertForm, setConvertForm] = useState({ title: "", amount: "", currency: "TRY" });
  const [converting, setConverting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const [contactSearch, setContactSearch] = useState("");
  const contactPickerRef = useRef<HTMLDivElement>(null);
  const [viewActivity, setViewActivity] = useState<Activity | null>(null);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFilledFields, setAiFilledFields] = useState<string[]>([]);
  const deepLinkHandled = useRef(false);

  // Quick composer state
  const [quickText, setQuickText] = useState("");
  const [quickParsing, setQuickParsing] = useState(false);
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickPreview, setQuickPreview] = useState<QuickPreview | null>(null);
  const [quickError, setQuickError] = useState("");
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/activities").then(r => r.json()).then(setActivities),
      fetch("/api/companies").then(r => r.json()).then(setCompanies),
      fetch("/api/contacts").then(r => r.json()).then(setContacts),
      fetch("/api/deals").then(r => r.json()).then(setDeals),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Close modals with ESC (delete > convert > edit priority)
  useEffect(() => {
    if (!showModal && !convertTarget && !showDeleteConfirm) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showDeleteConfirm) setShowDeleteConfirm(null);
      else if (convertTarget) setConvertTarget(null);
      else setShowModal(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showModal, convertTarget, showDeleteConfirm]);

  const allActivitiesFlat = useMemo(() => {
    const flat: Activity[] = [];
    const collect = (list: Activity[]) => { list.forEach(a => { flat.push(a); if (a.children) collect(a.children); }); };
    collect(activities);
    return flat;
  }, [activities]);

  useEffect(() => {
    if (deepLinkHandled.current || activities.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const open = params.get("open");
    if (open) {
      const root = activities.find(a => a.id === open);
      if (root) {
        setViewActivity(root);
        deepLinkHandled.current = true;
        const url = new URL(window.location.href);
        url.searchParams.delete("open");
        window.history.replaceState({}, "", url.toString());
      }
    }
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

  const matchesSearch = (a: Activity, q: string): boolean => {
    const hay = [
      a.notes,
      a.company?.name,
      a.source,
      a.deal?.title,
      ...(a.contacts?.map(c => `${c.firstName} ${c.lastName}`) ?? []),
    ].filter(Boolean).join(" ").toLowerCase();
    if (hay.includes(q)) return true;
    return (a.children ?? []).some(c => matchesSearch(c, q));
  };

  const filteredActivities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return activities.filter(a => {
      if (filterType !== "ALL" && a.type !== filterType && !(a.children ?? []).some(c => c.type === filterType)) return false;
      if (filterCompanyId && a.company?.id !== filterCompanyId) return false;
      if (filterContactId && !a.contacts?.some(c => c.id === filterContactId) && !(a.children ?? []).some(ch => ch.contacts?.some(c => c.id === filterContactId))) return false;
      if (q && !matchesSearch(a, q)) return false;
      return true;
    });
  }, [activities, filterType, filterCompanyId, filterContactId, searchQuery]);

  // Feed grouped by date bucket (activities already sorted desc by createdAt)
  const groupedFeed = useMemo(() => {
    const groups: { label: string; items: Activity[] }[] = [];
    for (const a of filteredActivities) {
      const label = feedGroupLabel(a.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(a);
      else groups.push({ label, items: [a] });
    }
    return groups;
  }, [filteredActivities]);

  // Next-action buckets for the follow-up panel
  const actionBuckets = useMemo(() => {
    const withAction = allActivitiesFlat
      .filter(a => a.nextActionDate)
      .sort((x, y) => new Date(x.nextActionDate!).getTime() - new Date(y.nextActionDate!).getTime());
    const overdue = withAction.filter(a => dayDiffFromToday(a.nextActionDate!) < 0);
    const today = withAction.filter(a => dayDiffFromToday(a.nextActionDate!) === 0);
    const upcoming = withAction.filter(a => {
      const d = dayDiffFromToday(a.nextActionDate!);
      return d > 0 && d <= 14;
    });
    const later = withAction.filter(a => dayDiffFromToday(a.nextActionDate!) > 14);
    return { overdue, today, upcoming, later };
  }, [allActivitiesFlat]);

  const totalConverted = allActivitiesFlat.filter(a => a.deal).length;
  const conversionRate = allActivitiesFlat.length ? (totalConverted / allActivitiesFlat.length) * 100 : 0;

  const contactOptions = contacts;

  const filteredContactOptions = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contactOptions;
    return contactOptions.filter(c =>
      `${c.firstName} ${c.lastName}`.toLowerCase().includes(q)
    );
  }, [contactOptions, contactSearch]);

  const selectedContactObjects = useMemo(() =>
    contacts.filter(c => form.contactIds.includes(c.id)),
    [contacts, form.contactIds]
  );

  const toggleContact = (contactId: string) => {
    setForm(f => ({
      ...f,
      contactIds: f.contactIds.includes(contactId)
        ? f.contactIds.filter(id => id !== contactId)
        : [...f.contactIds, contactId],
    }));
  };

  useEffect(() => {
    if (!contactPickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (contactPickerRef.current && !contactPickerRef.current.contains(e.target as Node)) {
        setContactPickerOpen(false);
        setContactSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [contactPickerOpen]);

  // Contacts available in filter (scoped to selected company if set)
  const filterContactOptions = useMemo(() => {
    if (!filterCompanyId) return contacts;
    return contacts.filter(c => c.companyId === filterCompanyId);
  }, [contacts, filterCompanyId]);

  const companyFilterOptions = useMemo(() =>
    companies.map(c => ({ id: c.id, label: c.name })),
    [companies]
  );
  const contactFilterOptions = useMemo(() =>
    filterContactOptions.map(c => ({ id: c.id, label: `${c.firstName} ${c.lastName}` })),
    [filterContactOptions]
  );

  /* ---------- quick composer ---------- */

  const handleQuickParse = async () => {
    if (!quickText.trim() || quickParsing) return;
    setQuickParsing(true);
    setQuickError("");
    try {
      const res = await fetch("/api/activities/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: quickText,
          companies: companies.map(c => ({ id: c.id, name: c.name })),
          contacts: contacts.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setQuickError(typeof data.error === "string" ? data.error : "Metin analiz edilemedi");
        return;
      }
      setQuickPreview({
        type: data.type || "NOTE",
        notes: data.notes || quickText.trim(),
        createdAt: data.createdAt || new Date().toISOString().slice(0, 10),
        nextActionDate: data.nextActionDate || "",
        source: data.source || "",
        companyId: data.companyId || "",
        contactIds: data.contactIds || [],
      });
    } catch {
      setQuickError("Analiz sırasında hata oluştu");
    } finally {
      setQuickParsing(false);
    }
  };

  const handleQuickSave = async () => {
    if (!quickPreview || quickSaving) return;
    setQuickSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type: quickPreview.type,
        notes: quickPreview.notes,
        createdAt: quickPreview.createdAt || undefined,
        nextActionDate: quickPreview.nextActionDate || null,
        contactIds: quickPreview.contactIds,
      };
      if (quickPreview.companyId) payload.companyId = quickPreview.companyId;
      if (quickPreview.source) payload.source = quickPreview.source;
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setQuickError("Kaydedilemedi, alanları kontrol edin");
        return;
      }
      setQuickText("");
      setQuickPreview(null);
      setQuickError("");
      load();
    } finally {
      setQuickSaving(false);
    }
  };

  const openQuickInModal = () => {
    if (!quickPreview) return;
    setForm({
      ...EMPTY_ACTIVITY,
      type: quickPreview.type,
      notes: quickPreview.notes,
      createdAt: quickPreview.createdAt,
      nextActionDate: quickPreview.nextActionDate,
      source: quickPreview.source,
      companyId: quickPreview.companyId,
      contactIds: quickPreview.contactIds,
    });
    setEditingId(null);
    setShowModal(true);
    setQuickPreview(null);
    setQuickText("");
  };

  /* ---------- follow-up panel actions ---------- */

  const updateNextAction = async (a: Activity, nextActionDate: string | null) => {
    setActionBusyId(a.id);
    try {
      // PUT resets omitted relational fields, so send the full record back
      const res = await fetch(`/api/activities/${a.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: a.type,
          notes: a.notes ?? "",
          nextActionDate,
          createdAt: a.createdAt,
          source: a.source || null,
          companyId: a.company?.id || null,
          contactIds: a.contacts?.map(c => c.id) || [],
          rootActivityId: a.rootActivityId || null,
          dealId: a.deal?.id || null,
        }),
      });
      if (!res.ok) { toast("Aksiyon güncellenemedi", "error"); return; }
      toast("Aksiyon güncellendi", "success");
      load();
    } catch {
      toast("Bağlantı hatası, tekrar deneyin", "error");
    } finally {
      setActionBusyId(null);
    }
  };

  const completeAction = (a: Activity) => updateNextAction(a, null);

  const postponeAction = (a: Activity) => {
    const base = a.nextActionDate ? new Date(a.nextActionDate) : new Date();
    const from = base.getTime() < Date.now() ? new Date() : base;
    const next = new Date(from.getTime() + 7 * 86400000);
    return updateNextAction(a, next.toISOString().slice(0, 10));
  };

  const handleAiFill = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiFilledFields([]);
    try {
      const res = await fetch("/api/activities/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText,
          companies: companies.map(c => ({ id: c.id, name: c.name })),
          contacts: contacts.map(c => ({ id: c.id, firstName: c.firstName, lastName: c.lastName })),
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast(typeof data.error === "string" ? data.error : "Metin analiz edilemedi", "error");
        return;
      }
      const filled: string[] = [];
      setForm(f => {
        const next = { ...f };
        if (data.type) { next.type = data.type; filled.push("Tür"); }
        if (data.notes) { next.notes = data.notes; filled.push("Notlar"); }
        if (data.nextActionDate) { next.nextActionDate = data.nextActionDate; filled.push("Sonraki Aksiyon"); }
        if (data.createdAt) { next.createdAt = data.createdAt; filled.push("Tarih"); }
        if (data.source) { next.source = data.source; filled.push("Kaynak"); }
        if (data.companyId) { next.companyId = data.companyId; filled.push("Şirket"); }
        if (data.contactIds?.length) { next.contactIds = data.contactIds; filled.push("Kişiler"); }
        return next;
      });
      setAiFilledFields(filled);
      setAiText("");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload: Record<string, unknown> = {
      type: form.type,
      notes: form.notes,
      nextActionDate: form.nextActionDate ? new Date(form.nextActionDate) : null,
      createdAt: form.createdAt ? new Date(form.createdAt) : undefined,
    };
    if (form.companyId) payload.companyId = form.companyId;
    payload.contactIds = form.contactIds;
    if (form.parentId) payload.parentId = form.parentId;
    if (form.source) payload.source = form.source;
    if (form.rootActivityId) payload.rootActivityId = form.rootActivityId;
    if (form.dealId) payload.dealId = form.dealId;

    try {
      const res = editingId
        ? await fetch(`/api/activities/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/activities", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) { toast("Kaydedilemedi, alanları kontrol edin", "error"); return; }
      toast(editingId ? "Aktivite güncellendi" : "Aktivite kaydedildi", "success");
      setShowModal(false);
      setForm({ ...EMPTY_ACTIVITY });
      setEditingId(null);
      setContactPickerOpen(false);
      setContactSearch("");
      setAiText("");
      setAiFilledFields([]);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteActivity = async (id: string) => {
    await fetch(`/api/activities/${id}`, { method: "DELETE" });
    toast("Aktivite silindi", "success");
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
      contactIds: activity.contacts?.map(c => c.id) || [],
      parentId: activity.parentId || "",
      rootActivityId: activity.rootActivityId || "",
      dealId: activity.deal?.id || "",
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
      contactIds: parent.contacts?.map(c => c.id) || [],
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
    if (!convertTarget || converting) return;
    setConverting(true);
    try {
      const res = await fetch(`/api/activities/${convertTarget.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: convertForm.title,
          amount: convertForm.amount ? Number(convertForm.amount) : undefined,
          currency: convertForm.currency,
        }),
      });
      if (!res.ok) { toast("Deal oluşturulamadı, tekrar deneyin", "error"); return; }
      toast("Deal oluşturuldu", "success");
      setConvertTarget(null);
      load();
    } catch {
      toast("Bağlantı hatası, tekrar deneyin", "error");
    } finally {
      setConverting(false);
    }
  };

  const hasActiveFilters = filterType !== "ALL" || filterCompanyId || filterContactId || searchQuery.trim();

  const previewCompany = quickPreview?.companyId ? companies.find(c => c.id === quickPreview.companyId) : null;
  const previewContacts = quickPreview ? contacts.filter(c => quickPreview.contactIds.includes(c.id)) : [];

  const renderActionItem = (a: Activity, tone: "overdue" | "today" | "upcoming") => {
    const typeMeta = TYPE_OPTIONS.find(t => t.value === a.type);
    const toneColor = tone === "overdue" ? "#f87171" : tone === "today" ? "#f59e0b" : "#818cf8";
    const busy = actionBusyId === a.id;
    return (
      <div
        key={a.id}
        className="rounded-xl p-3 space-y-1.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
        style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        onClick={() => setViewActivity(a)}
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0" style={{ color: typeMeta?.accent, background: typeMeta?.bg }}>{typeMeta?.label}</span>
          {a.company && <span className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{a.company.name}</span>}
        </div>
        {a.notes && (
          <p className="text-[11px] leading-snug" style={{ color: "var(--muted)" }}>
            {a.notes.length > 90 ? a.notes.slice(0, 90) + "…" : a.notes}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: toneColor }}>
            <Calendar size={10} /> {relativeDayLabel(a.nextActionDate!)}
          </span>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button
              title="Tamamlandı — takipten kaldır"
              disabled={busy}
              onClick={() => completeAction(a)}
              className="p-1 rounded-md hover:bg-emerald-500/20 transition-colors"
              style={{ color: "#10b981", opacity: busy ? 0.4 : 1 }}
            >
              {busy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            </button>
            <button
              title="1 hafta ertele"
              disabled={busy}
              onClick={() => postponeAction(a)}
              className="p-1 rounded-md hover:bg-white/10 transition-colors"
              style={{ color: "var(--muted)", opacity: busy ? 0.4 : 1 }}
            >
              <Clock size={13} />
            </button>
          </div>
        </div>
      </div>
    );
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
            <Plus size={15} /> Detaylı Ekle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4">
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Toplam Aktivite</div>
          <div className="text-2xl font-semibold text-white">{allActivitiesFlat.length}</div>
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
          <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Gecikmiş Aksiyon</div>
          <div className="text-2xl font-semibold" style={{ color: actionBuckets.overdue.length > 0 ? "#f87171" : "#fff" }}>
            {actionBuckets.overdue.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ===== Main column: composer + filters + feed ===== */}
        <div className="lg:col-span-2 space-y-4">

          {/* Quick composer */}
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} style={{ color: "#818cf8" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Hızlı Kayıt</span>
              <span className="text-[11px] ml-auto" style={{ color: "var(--muted)" }}>Serbest metin yaz — tür, şirket, kişi ve tarihler otomatik çıkarılır</span>
            </div>

            {!quickPreview && (
              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={quickText}
                  onChange={e => setQuickText(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleQuickParse(); }}
                  placeholder="Örn: Bugün Acme'den Ahmet ile telefonda görüştük, teklifi beğendiler, salı günü tekrar arayacağım..."
                  className="flex-1 text-sm resize-none"
                />
                <button
                  onClick={handleQuickParse}
                  disabled={quickParsing || !quickText.trim()}
                  className="btn-primary flex items-center gap-1.5 text-xs px-4 self-stretch"
                  style={{ opacity: (!quickText.trim() || quickParsing) ? 0.5 : 1 }}
                >
                  {quickParsing ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {quickParsing ? "Analiz..." : "Analiz Et"}
                </button>
              </div>
            )}

            {quickPreview && (
              <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.2)" }}>
                {/* type selector */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {TYPE_OPTIONS.map(option => (
                    <button
                      key={option.value}
                      onClick={() => setQuickPreview(p => p ? { ...p, type: option.value } : p)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
                      style={{
                        background: quickPreview.type === option.value ? option.bg : "transparent",
                        color: quickPreview.type === option.value ? option.accent : "var(--muted)",
                        borderColor: quickPreview.type === option.value ? option.accent : "var(--border)",
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                  <span className="text-[11px] ml-auto flex items-center gap-1" style={{ color: "var(--muted)" }}>
                    <Calendar size={11} /> {new Date(quickPreview.createdAt).toLocaleDateString("tr-TR")}
                  </span>
                </div>

                <textarea
                  rows={3}
                  value={quickPreview.notes}
                  onChange={e => setQuickPreview(p => p ? { ...p, notes: e.target.value } : p)}
                  className="text-sm w-full resize-none"
                />

                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  <span
                    className="px-2 py-0.5 rounded-full font-medium"
                    style={previewCompany
                      ? { background: "rgba(2,103,160,0.12)", color: "var(--accent2)", border: "1px solid rgba(2,103,160,0.25)" }
                      : { background: "rgba(148,163,184,0.1)", color: "var(--muted)", border: "1px dashed var(--border)" }}
                  >
                    🏢 {previewCompany ? previewCompany.name : "Şirket eşleşmedi"}
                  </span>
                  {previewContacts.map(c => (
                    <span key={c.id} className="px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.25)" }}>
                      👤 {c.firstName} {c.lastName}
                    </span>
                  ))}
                  {quickPreview.nextActionDate && (
                    <span className="px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                      <CalendarClock size={11} /> Takip: {new Date(quickPreview.nextActionDate).toLocaleDateString("tr-TR")}
                    </span>
                  )}
                  {quickPreview.source && (
                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.1)", color: "#a5b4fc" }}>📌 {quickPreview.source}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button className="btn-primary text-xs flex items-center gap-1.5 px-4" disabled={quickSaving} onClick={handleQuickSave}>
                    {quickSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                    {quickSaving ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                  <button className="btn-ghost text-xs" onClick={openQuickInModal}>Detayları Düzenle</button>
                  <button className="btn-ghost text-xs ml-auto" style={{ color: "var(--muted)" }} onClick={() => setQuickPreview(null)}>Vazgeç</button>
                </div>
              </div>
            )}

            {quickError && (
              <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{quickError}</div>
            )}
          </div>

          {/* Filters + search */}
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Notlarda, şirketlerde, kişilerde ara..."
                  className="pl-8 text-sm w-full"
                />
              </div>
              {hasActiveFilters && (
                <button
                  className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  style={{ color: "var(--muted)" }}
                  onClick={() => { setFilterType("ALL"); setFilterCompanyId(""); setFilterContactId(""); setSearchQuery(""); }}
                >
                  Temizle
                </button>
              )}
              {parentIds.length > 0 && (
                <button
                  className="text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all hover:bg-white/5 shrink-0"
                  style={{ color: "var(--muted)", borderColor: "rgba(255,255,255,0.08)" }}
                  onClick={toggleCollapseAll}
                >
                  <ChevronsUpDown size={12} />
                  {allCollapsed ? "Tümünü Aç" : "Tümünü Kapat"}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs flex items-center gap-1.5 mr-1" style={{ color: "var(--muted)" }}>
                <Filter size={12} />
              </span>
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
                      color: active ? data?.accent || "var(--text)" : "var(--muted)",
                      borderColor: active ? (data?.accent || "rgba(255,255,255,0.1)") : "var(--border)",
                    }}
                  >
                    {type === "ALL" ? "Tümü" : data?.label}
                  </button>
                );
              })}

              <div className="w-px self-stretch mx-1" style={{ background: "var(--border)" }} />

              <FilterCombobox
                value={filterCompanyId}
                onChange={id => { setFilterCompanyId(id); setFilterContactId(""); }}
                options={companyFilterOptions}
                placeholder="🏢 Şirket"
                allLabel="Tüm şirketler"
              />
              <FilterCombobox
                value={filterContactId}
                onChange={setFilterContactId}
                options={contactFilterOptions}
                placeholder="👤 Kişi"
                allLabel="Tüm kişiler"
              />
            </div>
          </div>

          {/* Feed grouped by date */}
          {groupedFeed.map(group => (
            <div key={group.label} className="space-y-3">
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: "var(--muted)" }}>{group.label}</span>
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                <span className="text-[10px] shrink-0" style={{ color: "var(--muted)" }}>{group.items.length}</span>
              </div>
              {group.items.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  onEdit={openEdit}
                  onDelete={id => setShowDeleteConfirm(id)}
                  onConvert={openConvertModal}
                  onAddChild={openAddChild}
                  onView={setViewActivity}
                  collapsed={collapsedIds.has(activity.id)}
                  onToggleCollapse={toggleCollapse}
                />
              ))}
            </div>
          ))}

          {loading && <LoadingRows />}
          {!loading && filteredActivities.length === 0 && (
            <div className="glass rounded-xl p-12 text-center">
              <Plus size={28} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
              <div className="text-sm text-white mb-1">Aktivite bulunamadı</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {hasActiveFilters ? "Filtreleri temizleyerek tüm aktiviteleri görebilirsiniz." : "Yukarıdaki hızlı kayıt kutusuna yazarak takibi başlat"}
              </div>
            </div>
          )}
        </div>

        {/* ===== Right column: follow-up panel ===== */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-1.5">
              <AlarmClock size={14} style={{ color: "#f59e0b" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Aksiyon Takibi</span>
              <span className="text-[11px] ml-auto" style={{ color: "var(--muted)" }}>
                {actionBuckets.overdue.length + actionBuckets.today.length + actionBuckets.upcoming.length + actionBuckets.later.length} açık
              </span>
            </div>

            {actionBuckets.overdue.length === 0 && actionBuckets.today.length === 0 && actionBuckets.upcoming.length === 0 && actionBuckets.later.length === 0 && (
              <div className="text-center py-6">
                <CheckCircle2 size={22} className="mx-auto mb-2" style={{ color: "#10b981" }} />
                <div className="text-xs" style={{ color: "var(--muted)" }}>Açık aksiyon yok — hepsi tamam 🎉</div>
              </div>
            )}

            {actionBuckets.overdue.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#f87171" }}>
                  Gecikmiş <span className="px-1.5 rounded-full" style={{ background: "rgba(239,68,68,0.15)" }}>{actionBuckets.overdue.length}</span>
                </div>
                {actionBuckets.overdue.map(a => renderActionItem(a, "overdue"))}
              </div>
            )}

            {actionBuckets.today.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#f59e0b" }}>
                  Bugün <span className="px-1.5 rounded-full" style={{ background: "rgba(245,158,11,0.15)" }}>{actionBuckets.today.length}</span>
                </div>
                {actionBuckets.today.map(a => renderActionItem(a, "today"))}
              </div>
            )}

            {actionBuckets.upcoming.length > 0 && (
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: "#818cf8" }}>
                  Yaklaşan (14 gün) <span className="px-1.5 rounded-full" style={{ background: "rgba(99,102,241,0.15)" }}>{actionBuckets.upcoming.length}</span>
                </div>
                {actionBuckets.upcoming.map(a => renderActionItem(a, "upcoming"))}
              </div>
            )}

            {actionBuckets.later.length > 0 && (
              <div className="text-[11px] text-center pt-1" style={{ color: "var(--muted)" }}>
                + {actionBuckets.later.length} aksiyon daha ileri tarihte
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity Detail Modal */}
      {viewActivity && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.65)" }} onClick={() => setViewActivity(null)}>
          <div
            className="glass rounded-2xl w-full max-w-lg animate-in overflow-hidden"
            style={{ maxHeight: "88vh" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header bar */}
            {(() => {
              const tm = TYPE_OPTIONS.find(t => t.value === viewActivity.type);
              return (
                <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {viewActivity.company?.logoUrl && (
                      <img src={viewActivity.company.logoUrl} alt="" className="w-8 h-8 object-contain rounded-lg shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ color: tm?.accent, background: tm?.bg }}>{tm?.label}</span>
                        {viewActivity.company && <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{viewActivity.company.name}</span>}
                        {!viewActivity.parentId && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(99,102,241,0.15)", color: "#818cf8" }}>Root</span>}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                        {new Date(viewActivity.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  </div>
                  <button className="btn-ghost text-xs shrink-0" onClick={() => setViewActivity(null)}>Kapat</button>
                </div>
              );
            })()}

            <div className="overflow-y-auto" style={{ maxHeight: "calc(88vh - 80px)" }}>
              <div className="px-5 py-4 space-y-4">

                {/* Notes */}
                {viewActivity.notes && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Notlar</div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text)" }}>{viewActivity.notes}</p>
                  </div>
                )}

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-3">
                  {viewActivity.contacts && viewActivity.contacts.length > 0 && (
                    <div className="col-span-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted)" }}>Kişiler</div>
                      <div className="flex flex-wrap gap-1.5">
                        {viewActivity.contacts.map(c => (
                          <span key={c.id} className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                            {c.firstName} {c.lastName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {viewActivity.nextActionDate && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Sonraki Aksiyon</div>
                      <div className="text-sm flex items-center gap-1.5" style={{ color: "var(--text)" }}>
                        <Calendar size={13} style={{ color: "#f59e0b" }} />
                        {new Date(viewActivity.nextActionDate).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                      </div>
                    </div>
                  )}
                  {viewActivity.source && (
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Kaynak</div>
                      <div className="text-sm" style={{ color: "var(--text)" }}>📌 {viewActivity.source}</div>
                    </div>
                  )}
                  {viewActivity.deal && (
                    <div className="col-span-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Bağlı Deal</div>
                      <div className="text-sm flex items-center gap-1.5" style={{ color: "#818cf8" }}>
                        <ArrowRight size={13} /> {viewActivity.deal.title}
                      </div>
                    </div>
                  )}
                  {viewActivity.rootActivity && (
                    <div className="col-span-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted)" }}>Root Aktivite</div>
                      <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(99,102,241,0.08)", color: "var(--text)", border: "1px solid rgba(99,102,241,0.15)" }}>
                        {viewActivity.rootActivity.company?.name && <span className="font-medium">{viewActivity.rootActivity.company.name} — </span>}
                        {viewActivity.rootActivity.notes?.slice(0, 80) || "—"}
                      </div>
                    </div>
                  )}
                </div>

                {/* Child activities timeline */}
                {viewActivity.children && viewActivity.children.length > 0 && (
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
                      <GitBranch size={11} /> Devam Aktiviteleri ({viewActivity.children.length})
                    </div>
                    <div className="relative">
                      {/* vertical line */}
                      <div className="absolute left-3 top-0 bottom-0 w-px" style={{ background: "var(--border)" }} />
                      <div className="space-y-3 pl-8">
                        {viewActivity.children.map((child, i) => {
                          const ctm = TYPE_OPTIONS.find(t => t.value === child.type);
                          return (
                            <div key={child.id} className="relative">
                              {/* dot */}
                              <div className="absolute -left-5 top-3 w-2.5 h-2.5 rounded-full border-2" style={{ background: "var(--bg-panel)", borderColor: ctm?.accent || "var(--border)" }} />
                              <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: ctm?.accent, background: ctm?.bg }}>{ctm?.label}</span>
                                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                                    {new Date(child.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                  {i === viewActivity.children!.length - 1 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>Son</span>
                                  )}
                                </div>
                                {child.notes && (
                                  <p className="text-xs leading-relaxed" style={{ color: "var(--text)" }}>
                                    {child.notes.length > 160 ? child.notes.slice(0, 160) + "…" : child.notes}
                                  </p>
                                )}
                                {child.contacts && child.contacts.length > 0 && (
                                  <div className="text-[11px]" style={{ color: "var(--muted)" }}>
                                    👤 {child.contacts.map(c => `${c.firstName} ${c.lastName}`).join(", ")}
                                  </div>
                                )}
                                {child.nextActionDate && (
                                  <div className="text-[11px] flex items-center gap-1" style={{ color: "var(--muted)" }}>
                                    <Calendar size={10} /> {new Date(child.nextActionDate).toLocaleDateString("tr-TR")}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer actions */}
              <div className="px-5 pb-5 flex gap-2 justify-end" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                {viewActivity.nextActionDate && (
                  <button
                    className="btn-ghost text-xs flex items-center gap-1.5 mr-auto"
                    style={{ color: "#10b981" }}
                    onClick={async () => { const a = viewActivity; setViewActivity(null); await completeAction(a); }}
                  >
                    <CheckCircle2 size={12} /> Aksiyonu Tamamla
                  </button>
                )}
                <button className="btn-ghost text-xs flex items-center gap-1.5" onClick={() => { setViewActivity(null); openEdit(viewActivity); }}>
                  <Pencil size={12} /> Düzenle
                </button>
              </div>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowModal(false)}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
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

            {/* AI Asistan */}
            {!editingId && (
              <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)" }}>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={13} style={{ color: "#818cf8" }} />
                  <span className="text-xs font-semibold" style={{ color: "#818cf8" }}>AI ile Doldur</span>
                  <span className="text-[10px] ml-auto" style={{ color: "var(--muted)" }}>Serbest metin yaz, alanları otomatik dolduralım</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    rows={2}
                    value={aiText}
                    onChange={e => setAiText(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAiFill(); }}
                    placeholder="Örn: Bugün Acme firmasından Ahmet ile toplantı yaptık, ürün demo verdik, haftaya tekrar konuşacağız..."
                    className="flex-1 text-xs resize-none"
                    style={{ background: "rgba(99,102,241,0.08)", borderColor: "rgba(99,102,241,0.2)" }}
                  />
                  <button
                    onClick={handleAiFill}
                    disabled={aiLoading || !aiText.trim()}
                    className="btn-primary flex items-center gap-1.5 text-xs px-3 self-stretch"
                    style={{ opacity: (!aiText.trim() || aiLoading) ? 0.5 : 1 }}
                  >
                    {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    {aiLoading ? "Analiz..." : "Doldur"}
                  </button>
                </div>
                {aiFilledFields.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px]" style={{ color: "#22c55e" }}>✓ Dolduruldu:</span>
                    {aiFilledFields.map(f => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>{f}</span>
                    ))}
                  </div>
                )}
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
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Aktivite Tarihi</label>
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
              <select className="text-sm" value={form.companyId} onChange={e => setForm(f => ({ ...f, companyId: e.target.value, contactIds: [], dealId: "" }))}>
                <option value="">— Seçilmedi —</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>

            {form.companyId && deals.some(d => d.companyId === form.companyId) && (
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Fırsat</label>
                <select className="text-sm" value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))}>
                  <option value="">— Fırsat yok —</option>
                  {deals.filter(d => d.companyId === form.companyId).map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
            )}

            <div ref={contactPickerRef} className="relative">
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Kişiler</label>

              {/* Combobox trigger */}
              <div
                className="rounded-lg cursor-text flex flex-wrap gap-1.5 p-2 min-h-[38px]"
                style={{
                  border: `1px solid ${contactPickerOpen ? "var(--accent2)" : "var(--border)"}`,
                  background: "var(--surface)",
                  boxShadow: contactPickerOpen ? "0 0 0 3px rgba(2,103,160,0.15)" : "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onClick={() => { setContactPickerOpen(true); }}
              >
                {/* Selected chips */}
                {selectedContactObjects.map(c => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                    style={{ background: "rgba(99,102,241,0.15)", color: "var(--accent, #6366f1)", border: "1px solid rgba(99,102,241,0.3)" }}
                  >
                    {c.firstName} {c.lastName}
                    <button
                      type="button"
                      onMouseDown={e => { e.stopPropagation(); toggleContact(c.id); }}
                      className="rounded hover:opacity-70 ml-0.5"
                      style={{ color: "inherit", lineHeight: 1 }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}

                {/* Search input */}
                <input
                  type="text"
                  value={contactSearch}
                  onChange={e => { setContactSearch(e.target.value); setContactPickerOpen(true); }}
                  onFocus={() => setContactPickerOpen(true)}
                  placeholder={selectedContactObjects.length === 0 ? "Kişi ara veya seç…" : ""}
                  style={{
                    border: "none !important",
                    boxShadow: "none !important",
                    background: "transparent !important",
                    padding: "0 4px",
                    minWidth: 80,
                    flex: 1,
                    fontSize: 13,
                    color: "var(--text)",
                    outline: "none",
                    width: "auto",
                  }}
                />

                <ChevronDownSm
                  size={14}
                  className="ml-auto self-center shrink-0"
                  style={{ color: "var(--muted)", transform: contactPickerOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
                />
              </div>

              {/* Dropdown */}
              {contactPickerOpen && (
                <div
                  className="absolute z-10 w-full rounded-lg overflow-hidden"
                  style={{
                    top: "calc(100% + 4px)",
                    border: "1px solid var(--border)",
                    background: "var(--bg-panel)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {filteredContactOptions.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-center" style={{ color: "var(--muted)" }}>
                      {contactSearch ? "Eşleşen kişi bulunamadı" : contactOptions.length === 0 ? (form.companyId ? "Bu şirkete ait kişi yok" : "Kişi bulunamadı") : ""}
                    </div>
                  ) : (
                    filteredContactOptions.map(contact => {
                      const selected = form.contactIds.includes(contact.id);
                      return (
                        <div
                          key={contact.id}
                          onMouseDown={e => { e.preventDefault(); toggleContact(contact.id); }}
                          className="flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors"
                          style={{
                            background: selected ? "rgba(99,102,241,0.1)" : "transparent",
                            color: "var(--text)",
                          }}
                          onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = "rgba(99,102,241,0.06)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = selected ? "rgba(99,102,241,0.1)" : "transparent"; }}
                        >
                          <div
                            className="w-4 h-4 rounded flex items-center justify-center shrink-0"
                            style={{
                              border: `1.5px solid ${selected ? "#6366f1" : "var(--border)"}`,
                              background: selected ? "#6366f1" : "transparent",
                            }}
                          >
                            {selected && <Check size={10} color="white" strokeWidth={3} />}
                          </div>
                          <span className="text-sm">{contact.firstName} {contact.lastName}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>Vazgeç</button>
              <button className="btn-primary flex-1 text-sm" disabled={saving} onClick={handleSave}>{saving ? "Kaydediliyor" : (editingId ? "Güncelle" : "Aktiviteyi Kaydet")}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {convertTarget && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setConvertTarget(null)}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 space-y-3 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              <button className="btn-primary flex-1 text-sm" disabled={converting} onClick={handleConvert}>{converting ? "Oluşturuluyor..." : "Deal Oluştur"}</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-white mb-2">Aktiviteyi Sil?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              {(() => {
                const target = allActivitiesFlat.find(a => a.id === showDeleteConfirm);
                if (!target) return "";
                const typeLabel = TYPE_OPTIONS.find(t => t.value === target.type)?.label ?? target.type;
                return `"${typeLabel}${target.company ? ` · ${target.company.name}` : ""}" aktivitesi silinecek. `;
              })()}
              Bu işlem geri alınamaz.
            </p>
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

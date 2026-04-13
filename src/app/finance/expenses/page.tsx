"use client";
import { useEffect, useState, useMemo } from "react";
import { Plus, Receipt, X, Pencil, Trash2, Layers, Sparkles, ChevronLeft, AlertTriangle, Search } from "lucide-react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { formatCurrency } from "@/lib/utils";

interface Expense {
  id: string;
  description?: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
  deal?: { id: string; title: string; company?: { name: string } };
}
interface Deal { id: string; title: string; }
interface ParsedExpense {
  description: string;
  amount: number;
  currency: string;
  category: string;
  date: string;
}
interface Stats {
  thisMonth: Record<string, number>;
  thisYear: Record<string, number>;
  total: Record<string, number>;
  categoryAmounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  availableMonths: string[];
}

const CATEGORIES = [
  { value: "ARAC", label: "Araç" },
  { value: "YEMEK", label: "Yemek" },
  { value: "MUHASEBE", label: "Muhasebe" },
  { value: "DEMIRBAS", label: "Demirbaş" },
  { value: "GENEL", label: "Genel" },
  { value: "VERGI", label: "Vergi" },
  { value: "KIRA", label: "Kira" },
  { value: "AKARYAKIT", label: "Akaryakıt" },
];
const EMPTY = { description: "", amount: "", currency: "TRY", category: "GENEL", date: new Date().toISOString().slice(0, 10), dealId: "" };
const PIE_COLORS = ["#6366f1", "#f87171", "#fbbf24", "#34d399", "#a78bfa", "#60a5fa", "#f472b6", "#fb923c"];
const PAGE_SIZE = 20;

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [lastBulkDate, setLastBulkDate] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem("lastBulkImport") : null
  );

  // Stats state (loaded on mount, lightweight)
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Table state
  const [tableLoading, setTableLoading] = useState(false);

  // Filter state — default to current month
  const [search, setSearch] = useState("");
  const [filterCats, setFilterCats] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Bulk import state
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkItems, setBulkItems] = useState<ParsedExpense[]>([]);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [srFind, setSrFind] = useState("");
  const [srReplace, setSrReplace] = useState("");
  const [bulkCat, setBulkCat] = useState("");

  const loadTable = (replace: boolean, month: string, searchVal: string, cats: string[]) => {
    const skip = replace ? 0 : expenses.length;
    setTableLoading(true);
    const params = new URLSearchParams({ skip: String(skip), take: String(PAGE_SIZE) });
    if (month) params.set("month", month);
    if (searchVal.trim()) params.set("search", searchVal.trim());
    if (cats.length > 0) params.set("categories", cats.join(","));
    fetch(`/api/expenses?${params}`)
      .then(r => r.json())
      .then(({ expenses: data, total: t }) => {
        setExpenses(prev => replace ? data : [...prev, ...data]);
        setTotal(t);
      })
      .finally(() => setTableLoading(false));
  };

  const loadStats = (month: string) => {
    setStatsLoading(true);
    const p = month ? `?month=${month}` : "";
    fetch(`/api/expenses/stats${p}`).then(r => r.json()).then(setStats).finally(() => setStatsLoading(false));
  };

  // Load stats + deals + current month's records on mount
  useEffect(() => {
    loadStats(filterMonth);
    fetch("/api/deals").then(r => r.json()).then(setDeals);
    loadTable(true, filterMonth, search, filterCats);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reload when month or category filter changes immediately
  useEffect(() => {
    loadStats(filterMonth);
    loadTable(true, filterMonth, search, filterCats);
  }, [filterMonth, filterCats]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce search filter reload
  useEffect(() => {
    const timer = setTimeout(() => {
      loadTable(true, filterMonth, search, filterCats);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    setSaving(true);
    const data = { ...form, amount: parseFloat(form.amount) || 0 };
    if (!data.dealId) delete (data as any).dealId;
    try {
      if (editingId) {
        await fetch(`/api/expenses/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      } else {
        await fetch("/api/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      }
      setShowModal(false);
      setForm({ ...EMPTY });
      setEditingId(null);
      // Refresh stats and table
      loadStats(filterMonth);
      loadTable(true, filterMonth, search, filterCats);
    } finally { setSaving(false); }
  };

  const deleteExpense = async (id: string) => {
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    setShowDeleteConfirm(null);
    loadStats(filterMonth);
    loadTable(true, filterMonth, search, filterCats);
  };

  const openEdit = (expense: Expense) => {
    setForm({
      description: expense.description || "",
      amount: String(expense.amount),
      currency: expense.currency,
      category: expense.category,
      date: expense.date.slice(0, 10),
      dealId: expense.deal?.id || "",
    });
    setEditingId(expense.id);
    setShowModal(true);
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setEditingId(null);
    setShowModal(true);
  };

  const openBulk = () => {
    setBulkText("");
    setBulkItems([]);
    setBulkError("");
    setShowBulk(true);
  };

  const closeBulk = () => {
    setShowBulk(false);
    setBulkText("");
    setBulkItems([]);
    setBulkError("");
    setSelectedRows(new Set());
    setSrFind("");
    setSrReplace("");
    setBulkCat("");
  };

  const parseBulk = async () => {
    if (!bulkText.trim()) return;
    setBulkParsing(true);
    setBulkError("");
    try {
      const res = await fetch("/api/expenses/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: bulkText }),
      });
      const data = await res.json();
      if (!res.ok) { setBulkError(data.error || "Analiz başarısız oldu."); return; }
      if (!data.expenses?.length) { setBulkError("Metinden hiç harcama bulunamadı. Farklı bir format deneyin."); return; }
      setBulkItems(data.expenses);
    } catch {
      setBulkError("Sunucu hatası oluştu.");
    } finally { setBulkParsing(false); }
  };

  const updateBulkItem = (idx: number, field: keyof ParsedExpense, value: string | number) => {
    setBulkItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const removeBulkItem = (idx: number) => {
    setBulkItems(prev => prev.filter((_, i) => i !== idx));
  };

  const isDuplicate = (item: ParsedExpense) =>
    (expenses || []).some(e =>
      e.date.slice(0, 10) === item.date &&
      Math.abs(e.amount - Number(item.amount)) < 0.01 &&
      e.currency === item.currency
    );

  const removeAllDuplicates = () => {
    setBulkItems(prev => {
      const kept = prev.filter(item => !isDuplicate(item));
      const oldKeptIndices = prev.reduce<number[]>((acc, item, i) => {
        if (!isDuplicate(item)) acc.push(i);
        return acc;
      }, []);
      setSelectedRows(prev2 => {
        const next = new Set<number>();
        oldKeptIndices.forEach((oldIdx, newIdx) => { if (prev2.has(oldIdx)) next.add(newIdx); });
        return next;
      });
      return kept;
    });
  };

  const applySearchReplace = () => {
    if (!srFind.trim()) return;
    const newSelected = new Set<number>();
    setBulkItems(prev => prev.map((item, idx) => {
      if (item.description.toLowerCase().includes(srFind.toLowerCase())) {
        newSelected.add(idx);
        return { ...item, description: item.description.replace(new RegExp(srFind.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), srReplace) };
      }
      return item;
    }));
    setSelectedRows(newSelected);
  };

  const applyBulkCategory = () => {
    if (!bulkCat || selectedRows.size === 0) return;
    setBulkItems(prev => prev.map((item, idx) => selectedRows.has(idx) ? { ...item, category: bulkCat } : item));
    setBulkCat("");
  };

  const toggleRow = (idx: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAllRows = () => {
    setSelectedRows(prev => prev.size === bulkItems.length ? new Set() : new Set(bulkItems.map((_, i) => i)));
  };

  const saveBulk = async () => {
    if (!bulkItems.length) return;
    setBulkSaving(true);
    try {
      for (const item of bulkItems) {
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, amount: Number(item.amount) }),
        });
      }
      const now = new Date().toISOString();
      localStorage.setItem("lastBulkImport", now);
      setLastBulkDate(now);
      closeBulk();
      // Refresh stats and table
      loadStats(filterMonth);
      loadTable(true, filterMonth, search, filterCats);
    } finally { setBulkSaving(false); }
  };

  const toggleCat = (cat: string) => {
    setFilterCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  // Available months from stats
  const availableMonths = stats?.availableMonths ?? [];

  // All loaded expenses are already server-filtered — no client-side filter needed
  const filtered = expenses || [];

  const hasFilters = search || filterCats.length > 0 || filterMonth;

  // Stats from API (always accurate)
  const statsThisMonth = stats?.thisMonth ?? {};
  const statsThisYear = stats?.thisYear ?? {};
  const statsTotal = stats?.total ?? {};
  const categoryAmounts = stats?.categoryAmounts ?? {};
  const categoryCounts = stats?.categoryCounts ?? {};
  const totalCatAmount = Object.values(categoryAmounts).reduce((s, v) => s + v, 0);
  const pieData = Object.entries(categoryAmounts)
    .map(([cat, amount]) => ({ name: CATEGORIES.find(c => c.value === cat)?.label || cat, cat, value: amount }))
    .sort((a, b) => b.value - a.value);

  // Filtered total (from loaded records, when month is selected)
  const filteredTotal = useMemo(() => {
    return filtered.reduce((acc, e) => {
      if (!acc[e.currency]) acc[e.currency] = 0;
      acc[e.currency] += e.amount;
      return acc;
    }, {} as Record<string, number>);
  }, [filtered]);

  return (
    <div className="p-8 space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Expenses</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {tableLoading
              ? "Yükleniyor..."
              : `${expenses.length}${total > expenses.length ? ` / ${total}` : ""} kayıt`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <button className="btn-ghost flex items-center gap-2 text-sm" onClick={openBulk}>
              <Layers size={15} /> Bulk Ekle
            </button>
            {lastBulkDate && (
              <span className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                Son: {new Date(lastBulkDate).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
          <button className="btn-primary flex items-center gap-2 text-sm" onClick={openAdd}>
            <Plus size={15} /> Log Expense
          </button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse" style={{ height: 70 }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Bu Ay", data: statsThisMonth, color: "#f87171" },
            { label: "Bu Yıl", data: statsThisYear, color: "#fb923c" },
            { label: "Toplam", data: statsTotal, color: "#e2e8f0" },
          ].map(({ label, data, color }) => (
            <div key={label} className="glass rounded-xl p-4">
              <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{label}</div>
              {Object.entries(data).map(([curr, amt]) => (
                <div key={curr} className="text-xl font-bold font-mono" style={{ color }}>{formatCurrency(amt, curr)}</div>
              ))}
              {Object.keys(data).length === 0 && <div className="text-xl font-bold font-mono" style={{ color: "var(--muted)" }}>₺0</div>}
            </div>
          ))}
        </div>
      )}

      {/* Category breakdown + filtered month total */}
      <div className="flex gap-4">
        <div className="glass rounded-xl p-4 flex-1">
          <div className="text-xs mb-3" style={{ color: "var(--muted)" }}>Kategori Dağılımı</div>
          {statsLoading ? (
            <div className="animate-pulse h-12 rounded" style={{ background: "rgba(255,255,255,0.04)" }} />
          ) : pieData.length > 0 ? (
            <div className="grid gap-y-1.5 gap-x-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
              {pieData.map((d, i) => {
                const pct = totalCatAmount > 0 ? Math.round((d.value / totalCatAmount) * 100) : 0;
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                    <span className="text-xs flex-1" style={{ color: "var(--muted)" }}>{d.name}</span>
                    <span className="text-xs font-mono font-medium" style={{ color: "#e2e8f0" }}>{pct === 0 ? "<1%" : `${pct}%`}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--muted)" }}>Henüz veri yok</div>
          )}
        </div>

        {filterMonth && !tableLoading && expenses.length > 0 && (() => {
          const [y, m] = filterMonth.split("-");
          const monthLabel = new Date(Number(y), Number(m) - 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
          return (
            <div className="glass rounded-xl p-4 flex flex-col justify-center" style={{ minWidth: 160 }}>
              <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>{monthLabel}</div>
              {Object.entries(filteredTotal).map(([curr, amt]) => (
                <div key={curr} className="text-xl font-bold font-mono" style={{ color: "#f87171" }}>{formatCurrency(amt, curr)}</div>
              ))}
              {Object.keys(filteredTotal).length === 0 && (
                <div className="text-xl font-bold font-mono" style={{ color: "var(--muted)" }}>₺0</div>
              )}
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{filtered.length} kayıt</div>
            </div>
          );
        })()}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl p-3 space-y-3">
        {/* Search + Month */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[220px] lg:min-w-[320px] max-w-[520px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--muted)" }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Açıklamada ara..."
              className="text-sm pl-8 w-full"
            />
          </div>
          <div className="flex gap-2 items-center lg:justify-end">
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="text-sm shrink-0"
              style={{ width: 140 }}
            >
              <option value="">Tüm aylar</option>
              {availableMonths.map(m => {
                const [y, mo] = m.split("-");
                const label = new Date(Number(y), Number(mo) - 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(""); setFilterCats([]); setFilterMonth(""); }}
                className="text-xs px-3 rounded-lg shrink-0"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
              >
                Temizle
              </button>
            )}
          </div>
        </div>
        {/* Category pills */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(c => {
            const active = filterCats.includes(c.value);
            const count = categoryCounts[c.value];
            return (
              <button
                key={c.value}
                onClick={() => toggleCat(c.value)}
                className={`text-xs px-2.5 py-1 rounded-lg transition-all${active ? " cat-chip-active" : ""}`}
                style={{
                  background: active ? "rgba(99,102,241,0.35)" : "rgba(99,102,241,0.08)",
                  color: active ? "#c7d2fe" : "var(--muted)",
                  border: active ? "1px solid rgba(99,102,241,0.5)" : "1px solid transparent",
                }}
              >
                {c.label}
                {count ? <span className="ml-1 opacity-60">{count}</span> : null}
              </button>
            );
          })}
        </div>
      </div>

      {tableLoading && <LoadingRows />}

      {!tableLoading && (
        <div className="glass rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center">
              <Receipt size={28} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
              <div className="text-sm text-white mb-1">{hasFilters ? "Filtrelerle eşleşen kayıt yok" : "Henüz harcama yok"}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {hasFilters ? "Filtreleri değiştirin veya temizleyin" : "Log Expense veya Bulk Ekle ile başlayın"}
              </div>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <th className="text-left text-xs font-medium px-4 py-2.5" style={{ color: "var(--muted)" }}>Açıklama</th>
                  <th className="text-left text-xs font-medium px-3 py-2.5" style={{ color: "var(--muted)" }}>Kategori</th>
                  <th className="text-left text-xs font-medium px-3 py-2.5" style={{ color: "var(--muted)" }}>Proje</th>
                  <th className="text-left text-xs font-medium px-3 py-2.5" style={{ color: "var(--muted)" }}>Tarih</th>
                  <th className="text-right text-xs font-medium px-4 py-2.5" style={{ color: "var(--muted)" }}>Tutar</th>
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((exp, i) => (
                  <tr key={exp.id} className="group" style={{ borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-white">{exp.description || <span style={{ color: "var(--muted)" }}>—</span>}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc" }}>
                        {CATEGORIES.find(c => c.value === exp.category)?.label || exp.category}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {exp.deal
                        ? <span className="text-xs" style={{ color: "var(--muted)" }}>{exp.deal.title}</span>
                        : <span style={{ color: "var(--muted)", opacity: 0.3 }}>—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-mono" style={{ color: "var(--muted)" }}>
                        {new Date(exp.date).toLocaleDateString("tr-TR")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-sm font-semibold font-mono" style={{ color: "#f87171" }}>
                        -{formatCurrency(exp.amount, exp.currency)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(exp)} className="p-1.5 rounded-lg hover:bg-white/10" style={{ color: "var(--muted)" }}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(exp.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400" style={{ color: "var(--muted)" }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {expenses.length < total && (
            <button
              onClick={() => loadTable(false, filterMonth, search, filterCats)}
              className="w-full py-2.5 text-xs transition-colors"
              style={{ color: "var(--muted)", borderTop: "1px solid rgba(255,255,255,0.04)" }}
              onMouseEnter={e => (e.currentTarget.style.color = "#a5b4fc")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--muted)")}
            >
              {total - expenses.length} kayıt daha göster
            </button>
          )}
        </div>
      )}

      {/* Log / Edit Expense Modal */}
      {showModal && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-white">{editingId ? "Harcamayı Düzenle" : "Harcama Ekle"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Açıklama</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Açıklama (opsiyonel)" className="text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Tutar *</label>
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
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Kategori *</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="text-sm">
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Tarih</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Proje</label>
                <select value={form.dealId} onChange={e => setForm(f => ({ ...f, dealId: e.target.value }))} className="text-sm">
                  <option value="">— Proje yok —</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowModal(false)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" onClick={save} disabled={saving || !form.amount}>
                {saving ? "Kaydediliyor..." : (editingId ? "Güncelle" : "Kaydet")}
              </button>
            </div>
          </div>
        </div>
      </ModalPortal>)}

      {/* Bulk Import Modal */}
      {showBulk && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-3xl p-6 animate-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  {bulkItems.length > 0
                    ? <><Sparkles size={16} style={{ color: "#a78bfa" }} />{bulkItems.length} harcama bulundu — İncele &amp; Kaydet</>
                    : <><Layers size={16} style={{ color: "#a5b4fc" }} />Toplu Harcama Ekle</>
                  }
                </h2>
                {bulkItems.length === 0 && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>Kart ekstrenizi veya harcama listenizi yapıştırın, yapay zeka ayıklasın</p>
                )}
              </div>
              <button onClick={closeBulk} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>

            {/* Step 1: Paste text */}
            {bulkItems.length === 0 && (
              <div className="space-y-4">
                <textarea
                  value={bulkText}
                  onChange={e => setBulkText(e.target.value)}
                  placeholder={"Kart ekstrenizi veya harcama listenizi buraya yapıştırın...\n\nÖrnek:\n15.03.2024  MIGROS MARKET        -245,90 TL\n16.03.2024  SHELL AKARYAKIT       -850,00 TL\n17.03.2024  RESTORAN X            -320,00 TL"}
                  rows={12}
                  className="text-sm w-full resize-none"
                  style={{ fontFamily: "monospace" }}
                />
                {bulkError && (
                  <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{bulkError}</p>
                )}
                <div className="flex gap-3">
                  <button className="btn-ghost flex-1 text-sm" onClick={closeBulk}>İptal</button>
                  <button
                    className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                    onClick={parseBulk}
                    disabled={bulkParsing || !bulkText.trim()}
                  >
                    {bulkParsing
                      ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Analiz ediliyor...</>
                      : <><Sparkles size={14} />Analiz Et</>
                    }
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review parsed items */}
            {bulkItems.length > 0 && (() => {
              const duplicateCount = bulkItems.filter(isDuplicate).length;
              const allSelected = selectedRows.size === bulkItems.length && bulkItems.length > 0;
              return (
                <div className="space-y-3">
                  {/* Duplicate warning */}
                  {duplicateCount > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}>
                      <div className="flex items-center gap-2" style={{ color: "#fbbf24" }}>
                        <AlertTriangle size={14} />
                        <span><strong>{duplicateCount}</strong> kayıt mevcut harcamalarla aynı tarih+tutar+para birimine sahip</span>
                      </div>
                      <button onClick={removeAllDuplicates} className="text-xs px-2 py-1 rounded font-medium" style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24" }}>
                        Tümünü Çıkar
                      </button>
                    </div>
                  )}

                  {/* Search & Replace */}
                  <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="text-xs font-medium" style={{ color: "var(--muted)" }}>Search &amp; Replace — Açıklama</div>
                    <div className="flex gap-2">
                      <input
                        value={srFind}
                        onChange={e => setSrFind(e.target.value)}
                        placeholder="Ara..."
                        className="text-xs flex-1"
                        onKeyDown={e => e.key === "Enter" && applySearchReplace()}
                      />
                      <input
                        value={srReplace}
                        onChange={e => setSrReplace(e.target.value)}
                        placeholder="Değiştir..."
                        className="text-xs flex-1"
                        onKeyDown={e => e.key === "Enter" && applySearchReplace()}
                      />
                      <button
                        onClick={applySearchReplace}
                        disabled={!srFind.trim()}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
                        style={{ background: "rgba(99,102,241,0.25)", color: "#a5b4fc" }}
                      >
                        Uygula
                      </button>
                    </div>
                  </div>

                  {/* Bulk category for selected */}
                  {selectedRows.size > 0 && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)" }}>
                      <span className="text-xs font-medium" style={{ color: "#a5b4fc" }}>{selectedRows.size} satır seçili</span>
                      <div className="flex-1" />
                      <span className="text-xs" style={{ color: "var(--muted)" }}>Toplu kategori:</span>
                      <select
                        value={bulkCat}
                        onChange={e => setBulkCat(e.target.value)}
                        className="text-xs"
                        style={{ minWidth: 110 }}
                      >
                        <option value="">Seç...</option>
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                      <button
                        onClick={applyBulkCategory}
                        disabled={!bulkCat}
                        className="text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-40"
                        style={{ background: "rgba(99,102,241,0.3)", color: "#c7d2fe" }}
                      >
                        Uygula
                      </button>
                      <button onClick={() => setSelectedRows(new Set())} className="text-xs px-2 py-1.5 rounded-lg" style={{ color: "var(--muted)" }}>
                        Seçimi kaldır
                      </button>
                    </div>
                  )}

                  {/* Table */}
                  <div className="space-y-1">
                    {/* Header */}
                    <div className="grid gap-2 text-xs font-medium px-1 pb-1" style={{ color: "var(--muted)", gridTemplateColumns: "20px 20px 1fr 90px 70px 110px 100px 32px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <button onClick={toggleAllRows} className="flex items-center justify-center" style={{ color: allSelected ? "#a5b4fc" : "var(--muted)" }}>
                        <span style={{ width: 13, height: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${allSelected ? "#6366f1" : "rgba(255,255,255,0.2)"}`, borderRadius: 3, background: allSelected ? "#6366f1" : "transparent", fontSize: 9, color: "#fff" }}>
                          {allSelected ? "✓" : ""}
                        </span>
                      </button>
                      <span />
                      <span>Açıklama</span>
                      <span>Tutar</span>
                      <span>Birim</span>
                      <span>Kategori</span>
                      <span>Tarih</span>
                      <span />
                    </div>
                    {bulkItems.map((item, idx) => {
                      const dup = isDuplicate(item);
                      const selected = selectedRows.has(idx);
                      return (
                        <div
                          key={idx}
                          className="grid gap-2 items-center rounded-lg px-1 py-0.5"
                          style={{
                            gridTemplateColumns: "20px 20px 1fr 90px 70px 110px 100px 32px",
                            background: selected
                              ? "rgba(99,102,241,0.1)"
                              : dup ? "rgba(245,158,11,0.06)" : undefined,
                            border: selected ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent",
                          }}
                        >
                          {/* Checkbox */}
                          <button onClick={() => toggleRow(idx)} className="flex items-center justify-center">
                            <span style={{ width: 13, height: 13, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${selected ? "#6366f1" : "rgba(255,255,255,0.2)"}`, borderRadius: 3, background: selected ? "#6366f1" : "transparent", fontSize: 9, color: "#fff", flexShrink: 0 }}>
                              {selected ? "✓" : ""}
                            </span>
                          </button>
                          {/* Dup icon */}
                          <div className="flex items-center justify-center">
                            {dup && <span title="Muhtemel mükerrer kayıt"><AlertTriangle size={12} style={{ color: "#fbbf24" }} /></span>}
                          </div>
                          <input value={item.description} onChange={e => updateBulkItem(idx, "description", e.target.value)} className="text-xs" placeholder="Açıklama" />
                          <input type="number" value={item.amount} onChange={e => updateBulkItem(idx, "amount", e.target.value)} className="text-xs" min="0" />
                          <select value={item.currency} onChange={e => updateBulkItem(idx, "currency", e.target.value)} className="text-xs">
                            <option value="TRY">TRY</option>
                            <option value="USD">USD</option>
                            <option value="EUR">EUR</option>
                          </select>
                          <select value={item.category} onChange={e => updateBulkItem(idx, "category", e.target.value)} className="text-xs">
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                          <input type="date" value={item.date} onChange={e => updateBulkItem(idx, "date", e.target.value)} className="text-xs" />
                          <button onClick={() => removeBulkItem(idx)} className="p-1.5 rounded-lg hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center" style={{ color: "var(--muted)" }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button className="btn-ghost flex items-center gap-1.5 text-sm" onClick={() => { setBulkItems([]); setSelectedRows(new Set()); }}>
                      <ChevronLeft size={14} /> Geri Dön
                    </button>
                    <button
                      className="btn-primary flex-1 text-sm flex items-center justify-center gap-2"
                      onClick={saveBulk}
                      disabled={bulkSaving || bulkItems.length === 0}
                    >
                      {bulkSaving
                        ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Kaydediliyor...</>
                        : <><Plus size={14} />{bulkItems.length} Harcamayı Kaydet</>
                      }
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </ModalPortal>)}

      {showDeleteConfirm && (<ModalPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="glass rounded-2xl w-full max-w-sm p-6 animate-in">
            <h2 className="text-base font-semibold text-white mb-2">Harcamayı sil?</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>Bu işlem geri alınamaz.</p>
            <div className="flex gap-3">
              <button className="btn-ghost flex-1 text-sm" onClick={() => setShowDeleteConfirm(null)}>İptal</button>
              <button className="btn-primary flex-1 text-sm" style={{ background: "#ef4444" }} onClick={() => deleteExpense(showDeleteConfirm!)}>Sil</button>
            </div>
          </div>
        </div>
      </ModalPortal>)}
    </div>
  );
}

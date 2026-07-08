"use client";
import { useEffect, useRef, useState } from "react";
import { Search, Building2, User, TrendingUp, Activity as ActivityIcon } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { STAGE_LABELS, STAGE_COLORS, STATUS_LABELS, STATUS_COLORS, TYPE_LABELS, TYPE_COLORS, formatMoney } from "@/components/crm/constants";

interface SearchResults {
  companies: Array<{ id: string; name: string; logoUrl?: string; status: string }>;
  contacts: Array<{ id: string; firstName: string; lastName: string; title?: string; company?: { name: string } | null }>;
  deals: Array<{ id: string; title: string; stage: string; amount: number; currency: string; company?: { name: string } | null }>;
  activities: Array<{ id: string; parentId?: string | null; rootActivityId?: string | null; type: string; createdAt: string; notes?: string; company?: { name: string } | null }>;
}

const EMPTY_RESULTS: SearchResults = { companies: [], contacts: [], deals: [], activities: [] };

interface FlatItem {
  kind: "company" | "contact" | "deal" | "activity";
  key: string;
  navigate: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults(EMPTY_RESULTS);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then(r => r.json())
        .then(data => { setResults(data); setActiveIndex(0); })
        .catch(err => { if (err.name !== "AbortError") setResults(EMPTY_RESULTS); })
        .finally(() => setLoading(false));
    }, 250);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open]);

  const flat: FlatItem[] = [
    ...results.companies.map(c => ({
      kind: "company" as const,
      key: `company-${c.id}`,
      navigate: () => window.location.assign(`/crm/companies?open=${c.id}`),
    })),
    ...results.contacts.map(c => ({
      kind: "contact" as const,
      key: `contact-${c.id}`,
      navigate: () => window.location.assign(`/crm/contacts?open=${c.id}`),
    })),
    ...results.deals.map(d => ({
      kind: "deal" as const,
      key: `deal-${d.id}`,
      navigate: () => window.location.assign(`/crm/deals?highlight=${d.id}`),
    })),
    ...results.activities.map(a => ({
      kind: "activity" as const,
      key: `activity-${a.id}`,
      navigate: () => window.location.assign(`/crm/activities?open=${a.rootActivityId ?? a.parentId ?? a.id}`),
    })),
  ];

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flat[activeIndex]?.navigate();
    }
  };

  if (!open) return null;

  let cursor = -1;

  return (
    <ModalPortal>
      <div className="fixed inset-0 flex items-start justify-center pt-24 p-4" style={{ background: "rgba(0,0,0,0.5)", zIndex: 80 }} onClick={() => setOpen(false)}>
        <div
          className="glass rounded-2xl w-full max-w-lg animate-in overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <Search size={15} style={{ color: "var(--muted)" }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Şirket, kişi, fırsat veya aktivite ara..."
              className="flex-1 text-sm bg-transparent border-0 outline-none"
              style={{ background: "transparent", border: "none", boxShadow: "none" }}
            />
            <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--surface2)", color: "var(--muted)" }}>ESC</kbd>
          </div>

          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {query.trim().length < 2 && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>En az 2 karakter yazın</div>
            )}
            {query.trim().length >= 2 && !loading && flat.length === 0 && (
              <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted)" }}>Sonuç bulunamadı</div>
            )}

            {results.companies.length > 0 && (
              <ResultGroup label="Şirketler">
                {results.companies.map(c => {
                  cursor++;
                  const idx = cursor;
                  return (
                    <ResultRow key={c.id} active={idx === activeIndex} onClick={() => flat[idx].navigate()} onMouseEnter={() => setActiveIndex(idx)}>
                      <Building2 size={14} style={{ color: "var(--muted)" }} />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${STATUS_COLORS[c.status]}22`, color: STATUS_COLORS[c.status] }}>{STATUS_LABELS[c.status]}</span>
                    </ResultRow>
                  );
                })}
              </ResultGroup>
            )}

            {results.contacts.length > 0 && (
              <ResultGroup label="Kişiler">
                {results.contacts.map(c => {
                  cursor++;
                  const idx = cursor;
                  return (
                    <ResultRow key={c.id} active={idx === activeIndex} onClick={() => flat[idx].navigate()} onMouseEnter={() => setActiveIndex(idx)}>
                      <User size={14} style={{ color: "var(--muted)" }} />
                      <span className="flex-1 truncate">{c.firstName} {c.lastName}</span>
                      {c.company?.name && <span className="text-xs truncate" style={{ color: "var(--muted)" }}>{c.company.name}</span>}
                    </ResultRow>
                  );
                })}
              </ResultGroup>
            )}

            {results.deals.length > 0 && (
              <ResultGroup label="Fırsatlar">
                {results.deals.map(d => {
                  cursor++;
                  const idx = cursor;
                  return (
                    <ResultRow key={d.id} active={idx === activeIndex} onClick={() => flat[idx].navigate()} onMouseEnter={() => setActiveIndex(idx)}>
                      <TrendingUp size={14} style={{ color: "var(--muted)" }} />
                      <span className="flex-1 truncate">{d.title}</span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{formatMoney(d.amount, d.currency === "TRY" ? "₺" : d.currency + " ")}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${STAGE_COLORS[d.stage]}22`, color: STAGE_COLORS[d.stage] }}>{STAGE_LABELS[d.stage]}</span>
                    </ResultRow>
                  );
                })}
              </ResultGroup>
            )}

            {results.activities.length > 0 && (
              <ResultGroup label="Aktiviteler">
                {results.activities.map(a => {
                  cursor++;
                  const idx = cursor;
                  return (
                    <ResultRow key={a.id} active={idx === activeIndex} onClick={() => flat[idx].navigate()} onMouseEnter={() => setActiveIndex(idx)}>
                      <ActivityIcon size={14} style={{ color: "var(--muted)" }} />
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0" style={{ background: `${TYPE_COLORS[a.type]}22`, color: TYPE_COLORS[a.type] }}>{TYPE_LABELS[a.type]}</span>
                      <span className="flex-1 truncate">{a.notes || a.company?.name || "—"}</span>
                    </ResultRow>
                  );
                })}
              </ResultGroup>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>{label}</div>
      {children}
    </div>
  );
}

function ResultRow({ active, onClick, onMouseEnter, children }: { active: boolean; onClick: () => void; onMouseEnter: () => void; children: React.ReactNode }) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className="flex items-center gap-2 px-4 py-2 mx-1 rounded-lg cursor-pointer text-sm"
      style={{ background: active ? "var(--surface2)" : "transparent", color: "var(--text)" }}
    >
      {children}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Globe, Linkedin, Mail, Phone, Building2, X, Pencil, Calendar, GitBranch } from "lucide-react";
import { LoadingRows } from "@/components/ui/LoadingRows";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { TYPE_LABELS, TYPE_COLORS, STAGE_LABELS, STAGE_COLORS } from "@/components/crm/constants";
import { QuickActivityModal } from "@/components/crm/QuickActivityModal";

interface ContactDetail {
  id: string;
  firstName: string;
  lastName: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  company?: {
    id: string;
    name: string;
    deals: Array<{ id: string; title: string; amount: number; currency: string; stage: string }>;
  } | null;
  activities: Array<{
    id: string;
    type: string;
    notes?: string;
    createdAt: string;
    nextActionDate?: string;
    parentId?: string | null;
    company?: { id: string; name: string } | null;
    deal?: { id: string; title: string } | null;
  }>;
}

export function ContactDrawer({
  contactId,
  onClose,
  onEdit,
}: {
  contactId: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showQuickActivity, setShowQuickActivity] = useState(false);

  const load = () => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/contacts/${contactId}`)
      .then(async r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(setDetail)
      .finally(() => setLoading(false));
  };
  useEffect(load, [contactId]);

  const openDeals = detail?.company?.deals.filter(d => !["WON", "LOST"].includes(d.stage)) ?? [];
  const lastContact = detail?.activities[0]?.createdAt;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
        <div
          className="h-full w-full max-w-2xl flex flex-col animate-in"
          style={{ background: "var(--bg-panel)", borderLeft: "1px solid var(--border)" }}
          onClick={e => e.stopPropagation()}
        >
          {notFound ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <div className="text-sm" style={{ color: "var(--muted)" }}>Kişi bulunamadı</div>
              <button className="btn-ghost text-xs" onClick={onClose}>Kapat</button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-start justify-between p-6 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base shrink-0"
                    style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white" }}
                  >
                    {detail ? `${detail.firstName[0]}${detail.lastName[0]}` : "…"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold truncate" style={{ color: "var(--text)" }}>
                      {detail ? `${detail.firstName} ${detail.lastName}` : "..."}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {detail?.title && <span className="text-xs" style={{ color: "var(--muted)" }}>{detail.title}</span>}
                      {detail?.company && (
                        <a
                          href={`/crm/companies?open=${detail.company.id}`}
                          className="text-xs flex items-center gap-1"
                          style={{ color: "var(--accent2)" }}
                        >
                          <Building2 size={10} />{detail.company.name}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      {detail?.email && <a href={`mailto:${detail.email}`} title={detail.email} className="p-1 rounded-lg" style={{ color: "var(--muted)" }}><Mail size={13} /></a>}
                      {detail?.phone && <a href={`tel:${detail.phone}`} title={detail.phone} className="p-1 rounded-lg" style={{ color: "var(--muted)" }}><Phone size={13} /></a>}
                      {detail?.linkedinUrl && <a href={detail.linkedinUrl} target="_blank" title="LinkedIn" className="p-1 rounded-lg" style={{ color: "var(--accent2)" }}><Linkedin size={13} /></a>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><Pencil size={14} /></button>
                  <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted)" }}><X size={16} /></button>
                </div>
              </div>

              {loading ? (
                <div className="flex-1 p-6"><LoadingRows /></div>
              ) : (
                <>
                  {/* Stat strip */}
                  <div className="grid grid-cols-3 gap-3 p-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold" style={{ color: "var(--text)" }}>{detail?.activities.length ?? 0}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>Aktivite</div>
                    </div>
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {lastContact ? new Date(lastContact).toLocaleDateString("tr-TR") : "—"}
                      </div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>Son Temas</div>
                    </div>
                    <div className="glass rounded-lg p-3 text-center">
                      <div className="text-lg font-semibold" style={{ color: openDeals.length > 0 ? "#818cf8" : "var(--text)" }}>{openDeals.length}</div>
                      <div className="text-[11px]" style={{ color: "var(--muted)" }}>Açık Fırsat</div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Activity timeline */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Aktivite Zaman Çizelgesi</div>
                        <button className="btn-ghost text-xs" onClick={() => setShowQuickActivity(true)}>+ Aktivite</button>
                      </div>
                      <div className="space-y-2">
                        {(detail?.activities.length ?? 0) === 0 && (
                          <div className="text-center py-8 text-sm" style={{ color: "var(--muted)" }}>Henüz aktivite yok</div>
                        )}
                        {detail?.activities.map(a => (
                          <div key={a.id} className="glass rounded-xl p-3 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ color: TYPE_COLORS[a.type], background: `${TYPE_COLORS[a.type]}28` }}>{TYPE_LABELS[a.type]}</span>
                              <span className="text-xs" style={{ color: "var(--muted)" }}>{new Date(a.createdAt).toLocaleDateString("tr-TR")}</span>
                              {a.parentId && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--accent2)" }}>devam</span>}
                              {a.deal && <span className="text-[11px]" style={{ color: "var(--accent2)" }}>→ {a.deal.title}</span>}
                            </div>
                            {a.notes && <p className="text-xs line-clamp-2" style={{ color: "var(--text)", opacity: 0.85 }}>{a.notes}</p>}
                            {a.nextActionDate && (
                              <div className="flex items-center gap-1 text-[11px]" style={{ color: "var(--muted)" }}>
                                <Calendar size={10} />{new Date(a.nextActionDate).toLocaleDateString("tr-TR")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Related deals */}
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted)" }}>İlgili Fırsatlar</div>
                      {!detail?.company && (
                        <div className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>Şirket bağlantısı yok</div>
                      )}
                      {detail?.company && detail.company.deals.length === 0 && (
                        <div className="text-center py-6 text-sm" style={{ color: "var(--muted)" }}>Henüz fırsat yok</div>
                      )}
                      <div className="space-y-2">
                        {detail?.company?.deals.map(d => (
                          <div key={d.id} className="glass rounded-xl p-3 flex items-center justify-between gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>{d.title}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs font-medium" style={{ color: "var(--text)" }}>{d.currency} {d.amount.toLocaleString()}</span>
                              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${STAGE_COLORS[d.stage]}28`, color: STAGE_COLORS[d.stage] }}>{STAGE_LABELS[d.stage]}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {showQuickActivity && detail && (
            <QuickActivityModal
              companyId={detail.company?.id}
              companyName={detail.company?.name}
              contactId={detail.id}
              contactName={`${detail.firstName} ${detail.lastName}`}
              dealOptions={detail.company?.deals ?? []}
              onClose={() => setShowQuickActivity(false)}
              onSaved={() => { setShowQuickActivity(false); load(); }}
            />
          )}
        </div>
      </div>
    </ModalPortal>
  );
}

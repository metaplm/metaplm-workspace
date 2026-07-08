"use client";
import { useState } from "react";
import { X, Building2, User, Loader2, Check } from "lucide-react";
import { ModalPortal } from "@/components/ui/ModalPortal";
import { TYPE_LABELS, TYPE_COLORS } from "@/components/crm/constants";
import { useToast } from "@/components/ui/Toaster";

const TYPES = ["MEETING", "CALL", "EMAIL", "NOTE"] as const;

interface DealOption { id: string; title: string; }

export function QuickActivityModal({
  companyId,
  companyName,
  contactId,
  contactName,
  dealOptions,
  onClose,
  onSaved,
}: {
  companyId?: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  dealOptions: DealOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [type, setType] = useState<(typeof TYPES)[number]>("NOTE");
  const [notes, setNotes] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");
  const [dealId, setDealId] = useState("");
  const [source, setSource] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        notes,
        nextActionDate: nextActionDate || null,
        contactIds: contactId ? [contactId] : [],
      };
      if (companyId) payload.companyId = companyId;
      if (dealId) payload.dealId = dealId;
      if (source) payload.source = source;
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast("Aktivite kaydedildi", "success");
        onSaved();
      } else {
        toast("Kaydedilemedi, alanları kontrol edin", "error");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)", zIndex: 70 }} onClick={onClose}>
        <div className="glass rounded-2xl w-full max-w-md p-6 animate-in max-h-[90vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Hızlı Aktivite</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {companyName && (
              <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "var(--surface2)", color: "var(--text)" }}>
                <Building2 size={11} />{companyName}
              </span>
            )}
            {contactName && (
              <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "var(--surface2)", color: "var(--text)" }}>
                <User size={11} />{contactName}
              </span>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className="px-3 py-2 rounded-lg text-xs font-medium border"
                style={{
                  background: type === t ? `${TYPE_COLORS[t]}28` : "transparent",
                  color: type === t ? TYPE_COLORS[t] : "var(--muted)",
                  borderColor: type === t ? TYPE_COLORS[t] : "rgba(255,255,255,0.08)",
                }}
              >
                {TYPE_LABELS[t]}
              </button>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Notlar</label>
            <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" placeholder="Toplantı özeti, sonraki adımlar..." />
          </div>

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Sonraki Aksiyon</label>
            <input type="date" className="text-sm" value={nextActionDate} onChange={e => setNextActionDate(e.target.value)} />
          </div>

          {dealOptions.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Fırsat</label>
              <select className="text-sm" value={dealId} onChange={e => setDealId(e.target.value)}>
                <option value="">— Fırsat yok —</option>
                {dealOptions.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Kaynak</label>
            <input type="text" className="text-sm" value={source} onChange={e => setSource(e.target.value)} placeholder="Örn: LinkedIn, Referans, Web..." />
          </div>

          <div className="flex gap-3">
            <button className="btn-ghost flex-1 text-sm" onClick={onClose}>Vazgeç</button>
            <button className="btn-primary flex-1 text-sm flex items-center justify-center gap-1.5" disabled={saving || !notes.trim()} onClick={save}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}

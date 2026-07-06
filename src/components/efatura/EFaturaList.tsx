"use client";
import { useEffect, useState } from "react";
import { FileText, RefreshCw, AlertCircle, ExternalLink, Send, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface KolayBiInvoice {
  document_id: number;
  uuid: string;
  no: string;
  status: string;
  scenario: string;
  type: string;
  direction: string;
  exchange_grand_total: number;
  exchange_grand_currency: string;
  grand_total: number;
  grand_currency: string;
  issue_date: string;
  cancelled_at?: string;
  party_name?: string;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  sent_to_receiver: { label: "Alıcıya Ulaştı",  color: "#34d399" },
  sent_to_gib:      { label: "GİB'e Gönderildi", color: "#34d399" },
  processed_in_gib: { label: "GİB'de İşlendi",   color: "#34d399" },
  approved:         { label: "Onaylandı",         color: "#34d399" },
  rejected:         { label: "Reddedildi",        color: "#f87171" },
  cancelled:        { label: "İptal Edildi",      color: "#f87171" },
  processing_failed:{ label: "İşlem Hatası",      color: "#f87171" },
  sending_failed:   { label: "Gönderim Hatası",   color: "#f87171" },
  failed:           { label: "Hata",              color: "#f87171" },
  in_process:       { label: "İşlemde",           color: "#fbbf24" },
  waiting_gib:      { label: "GİB Bekliyor",      color: "#fbbf24" },
  preparing:        { label: "Hazırlanıyor",      color: "#fbbf24" },
  ready:            { label: "Hazır",             color: "#6366f1" },
  not_sent:         { label: "Gönderilmedi",      color: "#94a3b8" },
};

interface Props {
  type: "giden" | "gelen";
}

export default function EFaturaList({ type }: Props) {
  const [all, setAll] = useState<KolayBiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const docType = type === "giden" ? "sale_invoice" : "purchase_invoice";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/kolaybi?resource=invoices&doc_type=${docType}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Bağlantı hatası"); return; }
      const list: KolayBiInvoice[] = Array.isArray(data) ? data : (data.data ?? []);
      setAll(list);
      setLastSync(new Date());
    } catch { setError("KolayBi API'sine ulaşılamadı"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [type]);

  const invoices = all;
  const totalAmount = invoices.reduce((s, i) => s + (i.grand_total ?? 0), 0);
  const errorCount = invoices.filter(i => ["not_sent", "processing_failed", "sending_failed", "failed", "rejected"].includes(i.status)).length;

  const Icon = type === "giden" ? Send : Download;
  const accentColor = type === "giden" ? "#6366f1" : "#0ea5e9";

  return (
    <div className="p-8 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-white">
              e-Fatura {type === "giden" ? "Giden" : "Gelen"}
            </h1>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            KolayBi · {type === "giden" ? "Satış faturaları" : "Alış faturaları"}
            {lastSync && <span className="ml-2">· {lastSync.toLocaleTimeString("tr-TR")}</span>}
          </p>
        </div>
        <button className="btn-ghost flex items-center gap-2 text-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Yenile
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-4 flex items-center gap-3" style={{ border: "1px solid rgba(239,68,68,0.3)" }}>
          <AlertCircle size={16} style={{ color: "#f87171" }} />
          <span className="text-sm" style={{ color: "#f87171" }}>{error}</span>
        </div>
      )}

      {/* Stats */}
      {!error && !loading && (
        <div className="grid grid-cols-3 gap-4">
          <div className="glass rounded-xl p-4">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Toplam Fatura</div>
            <div className="text-2xl font-semibold text-white">{invoices.length}</div>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="text-xs mb-1" style={{ color: "var(--muted)" }}>Toplam Tutar</div>
            <div className="text-xl font-semibold font-mono" style={{ color: "#34d399" }}>
              {formatCurrency(totalAmount, "TRY")}
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <Icon size={16} style={{ color: errorCount > 0 ? "#f87171" : "#34d399" }} />
            <div>
              <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>
                {type === "giden" ? "Hatalı/Reddedilen" : "Hatalı/Reddedilen"}
              </div>
              <div className="text-xl font-semibold" style={{ color: errorCount > 0 ? "#f87171" : "#34d399" }}>
                {errorCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {loading && (
          <div className="glass rounded-xl p-6 text-center text-sm animate-pulse" style={{ color: "var(--muted)" }}>
            KolayBi'den faturalar yükleniyor...
          </div>
        )}

        {!loading && !error && invoices.length === 0 && (
          <div className="glass rounded-xl p-12 text-center">
            <FileText size={32} className="mx-auto mb-3" style={{ color: "var(--muted)" }} />
            <div className="text-sm text-white mb-1">
              {type === "giden" ? "Giden fatura bulunamadı" : "Gelen fatura bulunamadı"}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>Henüz e-fatura kaydı yok</div>
          </div>
        )}

        {!loading && invoices.map(inv => {
          const st = STATUS_LABEL[inv.status] ?? { label: inv.status, color: "#94a3b8" };
          const currency = (inv.grand_currency ?? "TRY").toUpperCase();
          return (
            <div key={inv.document_id} className="glass rounded-xl p-4 glass-hover flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
                <FileText size={15} style={{ color: accentColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-white">{inv.no ?? `#${inv.document_id}`}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${accentColor}15`, color: accentColor }}>
                    {inv.scenario}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {inv.party_name}
                  {inv.issue_date && ` · ${new Date(inv.issue_date).toLocaleDateString("tr-TR")}`}
                  {inv.cancelled_at && <span style={{ color: "#f87171" }}> · İptal</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold font-mono text-sm text-white">
                  {formatCurrency(inv.grand_total ?? 0, currency)}
                </div>
                {inv.exchange_grand_currency && inv.exchange_grand_currency !== inv.grand_currency && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {formatCurrency(inv.exchange_grand_total, inv.exchange_grand_currency.toUpperCase())}
                  </div>
                )}
              </div>
              <div className="text-xs px-2 py-1 rounded-lg font-medium shrink-0"
                style={{ background: `${st.color}20`, color: st.color }}>
                {st.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <a href="https://ofis.kolaybi.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          <ExternalLink size={12} />
          KolayBi Paneli
        </a>
      </div>
    </div>
  );
}

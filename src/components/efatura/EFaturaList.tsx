"use client";
import { useEffect, useState } from "react";
import { FileText, RefreshCw, AlertCircle, ExternalLink, Send, Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface KolayBiInvoice {
  id: number;
  currency: string;
  issue_date: string;
  due_date?: string;
  e_document_status: string;
  commercial_doc_type: { description: string; group: string };
  commercial_doc_status: { description: string };
  associate: { full_name: string };
  total: { grand_total: number; total_vat: number; subtotal: number };
}

const E_DOC_LABEL: Record<string, { label: string; color: string }> = {
  not_sent: { label: "Gönderilmedi", color: "#94a3b8" },
  waiting:  { label: "Bekliyor",     color: "#fbbf24" },
  sent:     { label: "Gönderildi",   color: "#34d399" },
  accepted: { label: "Kabul Edildi", color: "#34d399" },
  rejected: { label: "Reddedildi",  color: "#f87171" },
};

interface Props {
  type: "giden" | "gelen";
}

export default function EFaturaList({ type }: Props) {
  const [all, setAll] = useState<KolayBiInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const docType = type === "giden" ? "SALE_INVOICE" : "PURCHASE_INVOICE";

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
  const totalAmount = invoices.reduce((s, i) => s + (i.total?.grand_total ?? 0), 0);
  const notSentCount = invoices.filter(i => i.e_document_status === "not_sent").length;

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
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${accentColor}20`, color: accentColor }}>
              Sandbox
            </span>
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
            <Icon size={16} style={{ color: notSentCount > 0 ? "#fbbf24" : "#34d399" }} />
            <div>
              <div className="text-xs mb-0.5" style={{ color: "var(--muted)" }}>
                {type === "giden" ? "Gönderilmemiş" : "İşlenmemiş"}
              </div>
              <div className="text-xl font-semibold" style={{ color: notSentCount > 0 ? "#fbbf24" : "#34d399" }}>
                {notSentCount}
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
            <div className="text-xs" style={{ color: "var(--muted)" }}>Sandbox ortamında henüz fatura yok</div>
          </div>
        )}

        {!loading && invoices.map(inv => {
          const docSt = E_DOC_LABEL[inv.e_document_status] ?? { label: inv.e_document_status, color: "#94a3b8" };
          return (
            <div key={inv.id} className="glass rounded-xl p-4 glass-hover flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accentColor}18` }}>
                <FileText size={15} style={{ color: accentColor }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-semibold text-white">#{inv.id}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${accentColor}15`, color: accentColor }}>
                    {inv.commercial_doc_type.description}
                  </span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {inv.associate.full_name}
                  {inv.issue_date && ` · ${new Date(inv.issue_date).toLocaleDateString("tr-TR")}`}
                  {inv.due_date && ` · Vade: ${new Date(inv.due_date).toLocaleDateString("tr-TR")}`}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-semibold font-mono text-sm text-white">
                  {formatCurrency(inv.total?.grand_total ?? 0, inv.currency.toUpperCase())}
                </div>
                {(inv.total?.total_vat ?? 0) > 0 && (
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    KDV: {formatCurrency(inv.total.total_vat, inv.currency.toUpperCase())}
                  </div>
                )}
              </div>
              <div className="text-xs px-2 py-1 rounded-lg font-medium shrink-0"
                style={{ background: `${docSt.color}20`, color: docSt.color }}>
                {docSt.label}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-center pt-2">
        <a href="https://ofis-sandbox.kolaybi.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--muted)" }}>
          <ExternalLink size={12} />
          KolayBi Sandbox Paneli
        </a>
      </div>
    </div>
  );
}

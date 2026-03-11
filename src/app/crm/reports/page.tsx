"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, DownloadCloud, BarChart3, Activity, TrendingUp } from "lucide-react";
import { downloadCSV } from "@/lib/export";

interface ActivityRecord {
  id: string;
  type: "MEETING" | "CALL" | "EMAIL" | "NOTE";
  notes?: string;
  createdAt: string;
  nextActionDate?: string;
  company?: { id: string; name: string } | null;
  contact?: { id: string; firstName: string; lastName: string } | null;
  deal?: { id: string; title: string } | null;
}

interface DealRecord {
  id: string;
  title: string;
  amount: number;
  currency: string;
  stage: string;
  expectedCloseDate?: string;
  createdAt: string;
  company?: { id: string; name: string } | null;
  activities?: ActivityRecord[];
}

const TYPE_OPTIONS = ["ALL", "MEETING", "CALL", "EMAIL", "NOTE"];
const STAGE_OPTIONS = ["ALL", "LEAD", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

type DateRange = { start: string; end: string };

export default function CRMReportsPage() {
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [activityFilters, setActivityFilters] = useState({
    type: "ALL",
    company: "",
    hasDeal: "all" as "all" | "linked" | "unlinked",
    dates: defaultRange(),
  });

  const [dealFilters, setDealFilters] = useState({
    stage: "ALL",
    company: "",
    minAmount: "",
    dates: defaultRange(),
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/activities").then(r => r.json()),
      fetch("/api/deals").then(r => r.json()),
    ])
      .then(([acts, dl]) => {
        setActivities(acts);
        setDeals(dl);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (activityFilters.type !== "ALL" && activity.type !== activityFilters.type) return false;
      if (activityFilters.company && !activity.company?.name?.toLowerCase().includes(activityFilters.company.toLowerCase())) return false;
      if (activityFilters.hasDeal === "linked" && !activity.deal) return false;
      if (activityFilters.hasDeal === "unlinked" && activity.deal) return false;
      if (!isWithinRange(activity.createdAt, activityFilters.dates)) return false;
      return true;
    });
  }, [activities, activityFilters]);

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (dealFilters.stage !== "ALL" && deal.stage !== dealFilters.stage) return false;
      if (dealFilters.company && !deal.company?.name?.toLowerCase().includes(dealFilters.company.toLowerCase())) return false;
      if (dealFilters.minAmount && deal.amount < Number(dealFilters.minAmount)) return false;
      if (!isWithinRange(deal.createdAt, dealFilters.dates)) return false;
      return true;
    });
  }, [deals, dealFilters]);

  const conversionRate = activities.length ? ((activities.filter(a => a.deal).length / activities.length) * 100).toFixed(1) : "0";
  const avgDealSize = filteredDeals.length ? (filteredDeals.reduce((s, d) => s + d.amount, 0) / filteredDeals.length).toFixed(0) : "0";

  const exportActivities = () => {
    downloadCSV(
      `crm-activities-${activityFilters.dates.start}-${activityFilters.dates.end}`,
      ["Date", "Type", "Company", "Contact", "Linked Deal", "Notes"],
      filteredActivities.map((a) => [
        formatDate(a.createdAt),
        a.type,
        a.company?.name ?? "-",
        a.contact ? `${a.contact.firstName} ${a.contact.lastName}` : "-",
        a.deal?.title ?? "-",
        a.notes ?? "",
      ])
    );
  };

  const exportDeals = () => {
    downloadCSV(
      `crm-deals-${dealFilters.dates.start}-${dealFilters.dates.end}`,
      ["Created", "Title", "Company", "Stage", "Amount", "Currency"],
      filteredDeals.map((d) => [
        formatDate(d.createdAt),
        d.title,
        d.company?.name ?? "-",
        d.stage,
        d.amount,
        d.currency,
      ])
    );
  };

  return (
    <div className="p-8 space-y-6 animate-in">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">CRM Reports</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Filter activities & deals, export CSV snapshots</p>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted)" }}>
          <span className="flex items-center gap-1"><Activity size={14} /> {filteredActivities.length} activities</span>
          <span className="flex items-center gap-1"><TrendingUp size={14} /> {filteredDeals.length} deals</span>
        </div>
      </header>

      <section className="grid grid-cols-4 gap-4">
        {[{
          label: "Conversion Rate",
          value: `${conversionRate}%`,
          sub: `${activities.filter(a => a.deal).length}/${activities.length} linked`,
        }, {
          label: "Open Deals",
          value: filteredDeals.filter(d => !["WON", "LOST"].includes(d.stage)).length,
          sub: "active pipeline",
        }, {
          label: "Won Deals",
          value: filteredDeals.filter(d => d.stage === "WON").length,
          sub: "in date range",
        }, {
          label: "Avg Deal Size",
          value: `$${avgDealSize}`,
          sub: "filtered set",
        }].map(card => (
          <div key={card.label} className="glass rounded-xl p-4">
            <div className="text-xs" style={{ color: "var(--muted)" }}>{card.label}</div>
            <div className="text-2xl font-semibold text-white mt-1">{card.value}</div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>{card.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-7 space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white">
                <Filter size={14} /> Activity Filters
              </div>
              <button className="btn-primary text-xs flex items-center gap-1" onClick={exportActivities} disabled={loading || !filteredActivities.length}>
                <DownloadCloud size={14} /> Export CSV
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label style={{ color: "var(--muted)" }}>From</label>
                <input type="date" value={activityFilters.dates.start} onChange={e => setActivityFilters(f => ({ ...f, dates: { ...f.dates, start: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>To</label>
                <input type="date" value={activityFilters.dates.end} onChange={e => setActivityFilters(f => ({ ...f, dates: { ...f.dates, end: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Type</label>
                <select value={activityFilters.type} onChange={e => setActivityFilters(f => ({ ...f, type: e.target.value }))}>
                  {TYPE_OPTIONS.map(option => <option key={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Company</label>
                <input type="text" placeholder="Search" value={activityFilters.company} onChange={e => setActivityFilters(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Pipeline?</label>
                <select value={activityFilters.hasDeal} onChange={e => setActivityFilters(f => ({ ...f, hasDeal: e.target.value as typeof f.hasDeal }))}>
                  <option value="all">All</option>
                  <option value="linked">Linked to Deal</option>
                  <option value="unlinked">No Deal</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <h3 className="text-sm font-semibold text-white">Activity Log ({filteredActivities.length})</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Filtered dataset</p>
              </div>
            </div>
            <div className="max-h-[360px] overflow-auto text-xs">
              <table className="w-full">
                <thead style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
                  <tr>
                    <th className="text-left py-2 px-4">Date</th>
                    <th className="text-left py-2 px-4">Type</th>
                    <th className="text-left py-2 px-4">Company</th>
                    <th className="text-left py-2 px-4">Contact</th>
                    <th className="text-left py-2 px-4">Linked Deal</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredActivities.map(activity => (
                    <tr key={activity.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-2 px-4 text-white">{formatDate(activity.createdAt)}</td>
                      <td className="py-2 px-4">{activity.type}</td>
                      <td className="py-2 px-4">{activity.company?.name ?? "-"}</td>
                      <td className="py-2 px-4">{activity.contact ? `${activity.contact.firstName} ${activity.contact.lastName}` : "-"}</td>
                      <td className="py-2 px-4">{activity.deal?.title ?? "-"}</td>
                    </tr>
                  ))}
                  {!filteredActivities.length && !loading && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center" style={{ color: "var(--muted)" }}>No records for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-span-5 space-y-4">
          <div className="glass rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-white">
                <BarChart3 size={14} /> Deal Filters
              </div>
              <button className="btn-primary text-xs flex items-center gap-1" onClick={exportDeals} disabled={loading || !filteredDeals.length}>
                <DownloadCloud size={14} /> Export CSV
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label style={{ color: "var(--muted)" }}>From</label>
                <input type="date" value={dealFilters.dates.start} onChange={e => setDealFilters(f => ({ ...f, dates: { ...f.dates, start: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>To</label>
                <input type="date" value={dealFilters.dates.end} onChange={e => setDealFilters(f => ({ ...f, dates: { ...f.dates, end: e.target.value } }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Stage</label>
                <select value={dealFilters.stage} onChange={e => setDealFilters(f => ({ ...f, stage: e.target.value }))}>
                  {STAGE_OPTIONS.map(stage => <option key={stage}>{stage}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Company</label>
                <input type="text" placeholder="Search" value={dealFilters.company} onChange={e => setDealFilters(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div>
                <label style={{ color: "var(--muted)" }}>Min Amount ($)</label>
                <input type="number" min={0} value={dealFilters.minAmount} onChange={e => setDealFilters(f => ({ ...f, minAmount: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <h3 className="text-sm font-semibold text-white">Deals ({filteredDeals.length})</h3>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Filtered dataset</p>
              </div>
            </div>
            <div className="max-h-[360px] overflow-auto text-xs">
              <table className="w-full">
                <thead style={{ background: "rgba(255,255,255,0.02)", color: "var(--muted)" }}>
                  <tr>
                    <th className="text-left py-2 px-4">Created</th>
                    <th className="text-left py-2 px-4">Title</th>
                    <th className="text-left py-2 px-4">Company</th>
                    <th className="text-left py-2 px-4">Stage</th>
                    <th className="text-left py-2 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeals.map(deal => (
                    <tr key={deal.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="py-2 px-4 text-white">{formatDate(deal.createdAt)}</td>
                      <td className="py-2 px-4">{deal.title}</td>
                      <td className="py-2 px-4">{deal.company?.name ?? "-"}</td>
                      <td className="py-2 px-4">{deal.stage}</td>
                      <td className="py-2 px-4 font-mono text-white">${deal.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                  {!filteredDeals.length && !loading && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center" style={{ color: "var(--muted)" }}>No deals for this filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultRange(): DateRange {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: formatISO(first), end: formatISO(last) };
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString();
}

function formatISO(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWithinRange(date: string, range: DateRange) {
  if (!range.start && !range.end) return true;
  const value = new Date(date).getTime();
  const start = range.start ? new Date(range.start).getTime() : -Infinity;
  const end = range.end ? new Date(range.end).getTime() : Infinity;
  return value >= start && value <= end;
}

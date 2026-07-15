"use client";

import { useMemo, useState, useTransition } from "react";
import {
  META_METRICS,
  META_BREAKDOWNS,
  DEFAULT_META_METRICS,
  DEFAULT_META_BREAKDOWNS,
  type MetaInsightRow,
  type MetaMetricId,
  type MetaBreakdownId,
} from "@/lib/meta";
import { getClientMetaInsights } from "@/lib/actions/integrations";
import AdPreviewModal from "@/components/AdPreviewModal";

const DIMENSION_COLUMNS: { id: MetaBreakdownId; key: keyof MetaInsightRow; label: string }[] = [
  { id: "campaign", key: "campaignName", label: "Campaign name" },
  { id: "adset", key: "adsetName", label: "Ad set name" },
  { id: "ad", key: "adName", label: "Ad name" },
  { id: "age", key: "age", label: "Age" },
  { id: "gender", key: "gender", label: "Gender" },
  { id: "country", key: "country", label: "Country" },
  { id: "region", key: "region", label: "Region" },
  { id: "platform", key: "platform", label: "Platform" },
  { id: "placement", key: "placement", label: "Placement" },
  { id: "day", key: "date", label: "Day" },
  { id: "month", key: "date", label: "Month" },
];

function formatValue(value: number, format: "currency" | "number" | "percent" | "decimal") {
  if (format === "currency") return `₹${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (format === "percent") return `${value.toFixed(2)}%`;
  if (format === "decimal") return value.toFixed(2);
  return value.toLocaleString();
}

export default function MetaAdsExplorer({
  accountId,
  clientId,
  initialRows,
  initialError,
}: {
  accountId: string;
  clientId?: string;
  initialRows: MetaInsightRow[];
  initialError: string | null;
}) {
  const [breakdowns, setBreakdowns] = useState<MetaBreakdownId[]>(DEFAULT_META_BREAKDOWNS);
  const [metrics, setMetrics] = useState<MetaMetricId[]>(DEFAULT_META_METRICS);
  const [rows, setRows] = useState<MetaInsightRow[]>(initialRows);
  const [error, setError] = useState<string | null>(initialError);
  const [panelOpen, setPanelOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [openFilterCol, setOpenFilterCol] = useState<string | null>(null);
  const [previewAd, setPreviewAd] = useState<{ id: string; name?: string } | null>(null);

  const activeDimensionCols = DIMENSION_COLUMNS.filter((c) => breakdowns.includes(c.id));

  function refetch(nextBreakdowns: MetaBreakdownId[]) {
    setBreakdowns(nextBreakdowns);
    startTransition(async () => {
      const result = await getClientMetaInsights(accountId, nextBreakdowns, clientId);
      setRows(result.rows);
      setError(result.error);
      setSort(null);
      setFilters({});
    });
  }

  function toggleBreakdown(id: MetaBreakdownId) {
    const isTime = id === "day" || id === "month";
    let next: MetaBreakdownId[];
    if (isTime) {
      // Day/month are mutually exclusive time increments.
      next = breakdowns.includes(id) ? breakdowns.filter((b) => b !== id) : [...breakdowns.filter((b) => b !== "day" && b !== "month"), id];
    } else {
      next = breakdowns.includes(id) ? breakdowns.filter((b) => b !== id) : [...breakdowns, id];
    }
    refetch(next);
  }

  function toggleMetric(id: MetaMetricId) {
    setMetrics((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  function toggleSort(key: string) {
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "desc" };
      if (s.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  const filteredSortedRows = useMemo(() => {
    let result = rows;
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      result = result.filter((r) => {
        const cell = (r as any)[key];
        if (typeof cell === "number") return cell >= Number(val || 0);
        return String(cell ?? "").toLowerCase().includes(val.toLowerCase());
      });
    }
    if (sort) {
      result = [...result].sort((a, b) => {
        const av = (a as any)[sort.key] ?? 0;
        const bv = (b as any)[sort.key] ?? 0;
        const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, filters, sort]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const m of metrics) {
      if (m === "ctr" || m === "cpc" || m === "cpm" || m === "costPerResult" || m === "frequency") continue;
      t[m] = filteredSortedRows.reduce((s, r) => s + ((r as any)[m] ?? 0), 0);
    }
    return t;
  }, [filteredSortedRows, metrics]);

  function ColumnHeader({ id, label, numeric }: { id: string; label: string; numeric: boolean }) {
    const active = sort?.key === id;
    return (
      <th className="py-2 font-normal relative">
        <div className={`flex items-center gap-1 cursor-pointer select-none ${numeric ? "justify-end" : ""}`}>
          <span onClick={() => toggleSort(id)} className="hover:text-base-100">
            {label} {active ? (sort!.dir === "asc" ? "▲" : "▼") : ""}
          </span>
          <button
            type="button"
            onClick={() => setOpenFilterCol(openFilterCol === id ? null : id)}
            className="text-base-500 hover:text-signal text-[10px]"
            title="Filter this column"
          >
            ▾
          </button>
        </div>
        {openFilterCol === id && (
          <div className="absolute z-10 top-full mt-1 right-0 bg-base-800 border border-base-600 rounded-sm p-2 w-40 shadow-lg">
            <input
              autoFocus
              placeholder={numeric ? "Min value…" : "Contains…"}
              value={filters[id] ?? ""}
              onChange={(e) => setFilters((f) => ({ ...f, [id]: e.target.value }))}
              className="input text-xs w-full"
              type={numeric ? "number" : "text"}
            />
          </div>
        )}
      </th>
    );
  }

  return (
    <div className="card p-5 relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base">Meta Ads — last 30 days</h2>
        <button type="button" onClick={() => setPanelOpen((o) => !o)} className="btn-secondary text-xs">
          {panelOpen ? "Close" : "Customise"}
        </button>
      </div>

      {panelOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-5 border border-base-700 rounded-sm p-4 bg-base-900/60">
          <div>
            <div className="label mb-2">Breakdown</div>
            <div className="space-y-1 max-h-56 overflow-y-auto scroll-thin pr-1">
              {META_BREAKDOWNS.map((b) => (
                <label key={b.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded-sm hover:bg-base-800 cursor-pointer">
                  <input type="checkbox" checked={breakdowns.includes(b.id)} onChange={() => toggleBreakdown(b.id)} />
                  {b.label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="label mb-2">Metrics</div>
            <div className="space-y-1 max-h-56 overflow-y-auto scroll-thin pr-1">
              {META_METRICS.map((m) => (
                <label key={m.id} className="flex items-center gap-2 text-sm px-1 py-0.5 rounded-sm hover:bg-base-800 cursor-pointer">
                  <input type="checkbox" checked={metrics.includes(m.id)} onChange={() => toggleMetric(m.id)} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {error === "not_connected" ? (
        <p className="text-base-500 text-sm">
          Not connected yet. An admin can connect Meta Ads from{" "}
          <a href="/integrations" className="text-signal hover:underline">Integrations</a>.
        </p>
      ) : error ? (
        <p className="text-danger text-sm">Couldn't load campaign data: {error}</p>
      ) : isPending ? (
        <p className="text-base-500 text-sm">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-base-500 text-sm">No campaign activity in the last 30 days.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
                {breakdowns.includes("ad") && <th className="py-2 font-normal">Preview</th>}
                {activeDimensionCols.map((c) => (
                  <ColumnHeader key={c.id} id={c.key as string} label={c.label} numeric={false} />
                ))}
                {metrics.map((m) => {
                  const meta = META_METRICS.find((x) => x.id === m)!;
                  return <ColumnHeader key={m} id={m} label={meta.label} numeric />;
                })}
              </tr>
            </thead>
            <tbody>
              {filteredSortedRows.map((r) => (
                <tr key={r.id} className="border-b border-base-800 last:border-0">
                  {breakdowns.includes("ad") && (
                    <td className="py-2">
                      {r.adId ? (
                        <button
                          type="button"
                          onClick={() => setPreviewAd({ id: r.adId!, name: r.adName })}
                          className="text-signal hover:text-signal-soft text-xs border border-signal/40 hover:border-signal rounded-sm px-2 py-1"
                        >
                          👁 Preview
                        </button>
                      ) : (
                        <span className="text-base-600 text-xs">—</span>
                      )}
                    </td>
                  )}
                  {activeDimensionCols.map((c) => (
                    <td key={c.id} className="py-2">{(r as any)[c.key] ?? "—"}</td>
                  ))}
                  {metrics.map((m) => {
                    const meta = META_METRICS.find((x) => x.id === m)!;
                    return (
                      <td key={m} className="py-2 text-right font-mono">
                        {formatValue((r as any)[m] ?? 0, meta.format)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-base-700 font-medium">
                {breakdowns.includes("ad") && <td className="py-2" />}
                {activeDimensionCols.map((c, i) => (
                  <td key={c.id} className="py-2">{i === 0 ? "Total" : ""}</td>
                ))}
                {metrics.map((m) => {
                  const meta = META_METRICS.find((x) => x.id === m)!;
                  const hasTotal = m in totals;
                  return (
                    <td key={m} className="py-2 text-right font-mono">
                      {hasTotal ? formatValue(totals[m], meta.format) : "—"}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {previewAd && (
        <AdPreviewModal
          adId={previewAd.id}
          adName={previewAd.name}
          clientId={clientId}
          onClose={() => setPreviewAd(null)}
        />
      )}
    </div>
  );
}

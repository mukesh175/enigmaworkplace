"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import GoogleAdsCard from "@/components/GoogleAdsCard";
import MetaAdsExplorer from "@/components/MetaAdsExplorer";
import { updateClientAdBudget } from "@/lib/actions/clients";
import { getClientMetaSpendTotal } from "@/lib/actions/integrations";
import {
  resolveDateRange,
  DEFAULT_DATE_RANGE_PRESET,
  DATE_RANGE_PRESETS,
  type DateRangePresetId,
  type DateRange,
} from "@/lib/meta";
import type { GoogleAdsCampaign } from "@/lib/googleAds";
import type { MetaInsightRow } from "@/lib/meta";

type GoogleAccount = { id: string; label: string; accountId: string; campaigns: GoogleAdsCampaign[]; error: string | null };
type MetaAccount = { id: string; label: string; accountId: string; rows: MetaInsightRow[]; error: string | null };

function BudgetGivenCard({ clientId, budgetGiven, isAdmin }: { clientId: string; budgetGiven: number; isAdmin: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(budgetGiven));
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function save() {
    const formData = new FormData();
    formData.set("adBudget", value);
    startTransition(async () => {
      await updateClientAdBudget(clientId, formData);
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <div className="card p-4">
        <div className="label">Budget given</div>
        <div className="flex items-center gap-1 mt-1">
          <input
            type="number"
            min={0}
            step="0.01"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="input text-lg py-1 w-full"
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button onClick={save} disabled={isPending} className="btn-secondary text-xs">
            {isPending ? "Saving…" : "Save"}
          </button>
          <button onClick={() => { setEditing(false); setValue(String(budgetGiven)); }} className="text-xs text-base-500 hover:text-base-300">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-4 group relative">
      <div className="label">Budget given</div>
      <div className="font-display text-2xl mt-1">₹{budgetGiven.toLocaleString()}</div>
      {isAdmin && (
        <button
          onClick={() => setEditing(true)}
          className="absolute top-3 right-3 text-xs text-base-500 hover:text-signal opacity-0 group-hover:opacity-100"
          title="Edit budget given"
        >
          ✎ Edit
        </button>
      )}
    </div>
  );
}

function SummaryCards({
  clientId,
  isAdmin,
  budgetGiven,
  adSpend,
  adSpendLabel,
  revenue,
  outstanding,
}: {
  clientId: string;
  isAdmin: boolean;
  budgetGiven: number;
  adSpend: number;
  adSpendLabel: string;
  revenue: number;
  outstanding: number;
}) {
  const remaining = budgetGiven - adSpend;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <BudgetGivenCard clientId={clientId} budgetGiven={budgetGiven} isAdmin={isAdmin} />
      <div className="card p-4">
        <div className="label">{adSpendLabel}</div>
        <div className="font-display text-2xl mt-1">₹{adSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
      </div>
      <div className="card p-4">
        <div className="label">Remaining budget</div>
        <div className={`font-display text-2xl mt-1 ${remaining < 0 ? "text-danger" : "text-ok"}`}>
          ₹{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
      <div className="card p-4">
        <div className="label">Revenue collected</div>
        <div className="font-display text-2xl mt-1 text-ok">₹{revenue.toLocaleString()}</div>
      </div>
      <div className="card p-4">
        <div className="label">Outstanding</div>
        <div className="font-display text-2xl mt-1 text-warn">₹{outstanding.toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function PlatformDashboardTabs({
  clientId,
  isAdmin,
  googleAccounts,
  metaAccounts,
  budgetGiven,
  revenue,
  outstanding,
}: {
  clientId: string;
  isAdmin: boolean;
  googleAccounts: GoogleAccount[];
  metaAccounts: MetaAccount[];
  budgetGiven: number;
  revenue: number;
  outstanding: number;
}) {
  const [platform, setPlatform] = useState<"GOOGLE_ADS" | "META">(googleAccounts.length > 0 || metaAccounts.length === 0 ? "GOOGLE_ADS" : "META");
  const [googleAccountId, setGoogleAccountId] = useState(googleAccounts[0]?.id);
  const [metaAccountId, setMetaAccountId] = useState(metaAccounts[0]?.id);

  const [metaDatePreset, setMetaDatePreset] = useState<DateRangePresetId>(DEFAULT_DATE_RANGE_PRESET);
  const [metaCustomRange, setMetaCustomRange] = useState<DateRange>(() => resolveDateRange(DEFAULT_DATE_RANGE_PRESET));
  const [metaSpendTotal, setMetaSpendTotal] = useState(() => metaAccounts.reduce((s, a) => s + a.rows.reduce((rs, r) => rs + r.spend, 0), 0));
  const isFirstRangeFetch = useRef(true);

  const googleSpend = googleAccounts.reduce((s, a) => s + a.campaigns.reduce((cs, c) => cs + c.costUsd, 0), 0);

  const activeGoogle = googleAccounts.find((a) => a.id === googleAccountId) ?? googleAccounts[0];
  const activeMeta = metaAccounts.find((a) => a.id === metaAccountId) ?? metaAccounts[0];

  const resolvedMetaRange = resolveDateRange(metaDatePreset, metaCustomRange);

  // Keep the "Ad spend" summary card in sync with whatever date range is
  // picked in the Meta table below — it re-totals spend across *all* of the
  // client's Meta accounts (not just the one currently open in the table),
  // since the summary card represents the whole client, not one account.
  useEffect(() => {
    if (isFirstRangeFetch.current) {
      isFirstRangeFetch.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      const totals = await Promise.all(
        metaAccounts.map((a) => getClientMetaSpendTotal(a.accountId, clientId, resolvedMetaRange))
      );
      if (!cancelled) setMetaSpendTotal(totals.reduce((s, t) => s + t.spend, 0));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedMetaRange.since, resolvedMetaRange.until]);

  const metaRangeLabel = DATE_RANGE_PRESETS.find((p) => p.id === metaDatePreset)?.label ?? "Last 30 days";

  return (
    <div className="mb-6">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPlatform("GOOGLE_ADS")}
          className={`pill ${platform === "GOOGLE_ADS" ? "text-signal border-signal" : "text-base-400"}`}
        >
          🔵 Google Ads
        </button>
        <button
          onClick={() => setPlatform("META")}
          className={`pill ${platform === "META" ? "text-signal border-signal" : "text-base-400"}`}
        >
          🔷 Meta Ads
        </button>
      </div>

      {platform === "GOOGLE_ADS" ? (
        <>
          <SummaryCards
            clientId={clientId}
            isAdmin={isAdmin}
            budgetGiven={budgetGiven}
            adSpend={googleSpend}
            adSpendLabel="Ad spend (30d)"
            revenue={revenue}
            outstanding={outstanding}
          />
          {googleAccounts.length === 0 ? (
            <div className="card p-5">
              <p className="text-base-500 text-sm">No Google Ads accounts connected for this client yet.</p>
            </div>
          ) : (
            <>
              {googleAccounts.length > 1 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {googleAccounts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setGoogleAccountId(a.id)}
                      className={`pill ${a.id === activeGoogle?.id ? "text-signal border-signal" : "text-base-400"}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {activeGoogle && <GoogleAdsCard campaigns={activeGoogle.campaigns} error={activeGoogle.error} />}
            </>
          )}
        </>
      ) : (
        <>
          <SummaryCards
            clientId={clientId}
            isAdmin={isAdmin}
            budgetGiven={budgetGiven}
            adSpend={metaSpendTotal}
            adSpendLabel={`Ad spend (${metaRangeLabel})`}
            revenue={revenue}
            outstanding={outstanding}
          />
          {metaAccounts.length === 0 ? (
            <div className="card p-5">
              <p className="text-base-500 text-sm">No Meta Ads accounts connected for this client yet.</p>
            </div>
          ) : (
            <>
              {metaAccounts.length > 1 && (
                <div className="flex gap-2 mb-3 flex-wrap">
                  {metaAccounts.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setMetaAccountId(a.id)}
                      className={`pill ${a.id === activeMeta?.id ? "text-signal border-signal" : "text-base-400"}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
              {activeMeta && (
                <MetaAdsExplorer
                  accountId={activeMeta.accountId}
                  clientId={clientId}
                  initialRows={activeMeta.rows}
                  initialError={activeMeta.error}
                  datePreset={metaDatePreset}
                  customRange={metaCustomRange}
                  onDateRangeChange={(preset, custom) => {
                    setMetaDatePreset(preset);
                    setMetaCustomRange(custom);
                  }}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

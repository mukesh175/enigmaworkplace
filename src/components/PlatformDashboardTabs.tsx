"use client";

import { useState } from "react";
import GoogleAdsCard from "@/components/GoogleAdsCard";
import MetaAdsExplorer from "@/components/MetaAdsExplorer";
import type { GoogleAdsCampaign } from "@/lib/googleAds";
import type { MetaInsightRow } from "@/lib/meta";

type GoogleAccount = { id: string; label: string; accountId: string; campaigns: GoogleAdsCampaign[]; error: string | null };
type MetaAccount = { id: string; label: string; accountId: string; rows: MetaInsightRow[]; error: string | null };

function SummaryCards({
  budgetGiven,
  adSpend,
  revenue,
  outstanding,
}: {
  budgetGiven: number;
  adSpend: number;
  revenue: number;
  outstanding: number;
}) {
  const remaining = budgetGiven - adSpend;
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
      <div className="card p-4">
        <div className="label">Budget given</div>
        <div className="font-display text-2xl mt-1">₹{budgetGiven.toLocaleString()}</div>
      </div>
      <div className="card p-4">
        <div className="label">Ad spend (30d)</div>
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
  googleAccounts,
  metaAccounts,
  budgetGiven,
  revenue,
  outstanding,
}: {
  clientId: string;
  googleAccounts: GoogleAccount[];
  metaAccounts: MetaAccount[];
  budgetGiven: number;
  revenue: number;
  outstanding: number;
}) {
  const [platform, setPlatform] = useState<"GOOGLE_ADS" | "META">(googleAccounts.length > 0 || metaAccounts.length === 0 ? "GOOGLE_ADS" : "META");
  const [googleAccountId, setGoogleAccountId] = useState(googleAccounts[0]?.id);
  const [metaAccountId, setMetaAccountId] = useState(metaAccounts[0]?.id);

  const googleSpend = googleAccounts.reduce((s, a) => s + a.campaigns.reduce((cs, c) => cs + c.costUsd, 0), 0);
  const metaSpend = metaAccounts.reduce((s, a) => s + a.rows.reduce((rs, r) => rs + r.spend, 0), 0);

  const activeGoogle = googleAccounts.find((a) => a.id === googleAccountId) ?? googleAccounts[0];
  const activeMeta = metaAccounts.find((a) => a.id === metaAccountId) ?? metaAccounts[0];

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
          <SummaryCards budgetGiven={budgetGiven} adSpend={googleSpend} revenue={revenue} outstanding={outstanding} />
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
          <SummaryCards budgetGiven={budgetGiven} adSpend={metaSpend} revenue={revenue} outstanding={outstanding} />
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
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import GoogleAdsCard from "@/components/GoogleAdsCard";
import MetaAdsCard from "@/components/MetaAdsCard";
import type { GoogleAdsCampaign } from "@/lib/googleAds";
import type { MetaCampaign } from "@/lib/meta";

type Tab = {
  id: string;
  label: string;
  platform: "GOOGLE_ADS" | "META";
  googleCampaigns?: GoogleAdsCampaign[];
  metaCampaigns?: MetaCampaign[];
  error: string | null;
};

export default function AdAccountTabs({ tabs }: { tabs: Tab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0];

  if (tabs.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex gap-2 mb-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`pill ${
              t.id === active.id ? "text-signal border-signal" : "text-base-400"
            }`}
          >
            {t.platform === "GOOGLE_ADS" ? "🔵" : "🔷"} {t.label}
          </button>
        ))}
      </div>

      {active.platform === "GOOGLE_ADS" ? (
        <GoogleAdsCard campaigns={active.googleCampaigns ?? []} error={active.error} />
      ) : (
        <MetaAdsCard campaigns={active.metaCampaigns ?? []} error={active.error} />
      )}
    </div>
  );
}

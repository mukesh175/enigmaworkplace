import type { MetaCampaign } from "@/lib/meta";

export default function MetaAdsCard({
  campaigns,
  error,
}: {
  campaigns: MetaCampaign[];
  error: string | null;
}) {
  if (error === "not_connected") {
    return (
      <div className="card p-5">
        <h2 className="font-display text-base mb-2">Meta Ads</h2>
        <p className="text-base-500 text-sm">
          Not connected yet. An admin can connect Meta Ads from{" "}
          <a href="/settings" className="text-signal hover:underline">Settings</a>.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5">
        <h2 className="font-display text-base mb-2">Meta Ads</h2>
        <p className="text-danger text-sm">Couldn't load campaign data: {error}</p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="font-display text-base mb-4">Meta Ads — last 30 days</h2>
      {campaigns.length === 0 ? (
        <p className="text-base-500 text-sm">No campaign activity in the last 30 days.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="py-2 font-normal">Campaign</th>
              <th className="py-2 font-normal text-right">Impr.</th>
              <th className="py-2 font-normal text-right">Clicks</th>
              <th className="py-2 font-normal text-right">CTR</th>
              <th className="py-2 font-normal text-right">CPC</th>
              <th className="py-2 font-normal text-right">Spend</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-b border-base-800 last:border-0">
                <td className="py-2">{c.name}</td>
                <td className="py-2 text-right font-mono">{c.impressions.toLocaleString()}</td>
                <td className="py-2 text-right font-mono">{c.clicks.toLocaleString()}</td>
                <td className="py-2 text-right font-mono">{c.ctr.toFixed(2)}%</td>
                <td className="py-2 text-right font-mono">₹{c.cpc.toFixed(2)}</td>
                <td className="py-2 text-right font-mono">₹{c.spend.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}

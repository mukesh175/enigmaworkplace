import { prisma } from "@/lib/prisma";

const GRAPH_VERSION = process.env.META_API_VERSION || "v21.0";
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Meta doesn't use refresh tokens like Google — instead a long-lived token
// (valid ~60 days) is periodically re-exchanged for a fresh 60-day token,
// which can be done server-side as long as the current one hasn't expired.
export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  });

  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta token exchange failed: ${text}`);
  }
  const data = await res.json();
  return {
    accessToken: data.access_token as string,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 5184000) * 1000), // default ~60d
  };
}

async function resolveMetaAccessToken(clientId?: string): Promise<string | null> {
  if (clientId) {
    const clientConn = await prisma.clientMetaConnection.findUnique({ where: { clientId } });
    if (clientConn?.accessToken) {
      // Refresh proactively if within 7 days of expiry.
      if (clientConn.expiresAt && clientConn.expiresAt.getTime() < Date.now() + 7 * 86_400_000) {
        try {
          const refreshed = await exchangeForLongLivedToken(clientConn.accessToken);
          await prisma.clientMetaConnection.update({ where: { clientId }, data: refreshed });
          return refreshed.accessToken;
        } catch {
          return clientConn.accessToken; // fall back to current token if refresh fails
        }
      }
      return clientConn.accessToken;
    }
  }

  const agency = await prisma.integrationToken.findUnique({ where: { id: "meta" } });
  if (!agency?.accessToken) return null;

  if (agency.expiresAt && agency.expiresAt.getTime() < Date.now() + 7 * 86_400_000) {
    try {
      const refreshed = await exchangeForLongLivedToken(agency.accessToken);
      await prisma.integrationToken.update({ where: { id: "meta" }, data: refreshed });
      return refreshed.accessToken;
    } catch {
      return agency.accessToken;
    }
  }
  return agency.accessToken;
}

export async function isMetaConnected(): Promise<boolean> {
  const stored = await prisma.integrationToken.findUnique({ where: { id: "meta" } });
  return !!stored?.accessToken;
}

export async function isClientMetaConnected(clientId: string): Promise<boolean> {
  const stored = await prisma.clientMetaConnection.findUnique({ where: { clientId } });
  return !!stored?.accessToken;
}

export type MetaMetricId =
  | "spend"
  | "impressions"
  | "reach"
  | "results"
  | "costPerResult"
  | "ctr"
  | "clicks"
  | "linkClicks"
  | "cpc"
  | "cpm"
  | "frequency";

export const META_METRICS: { id: MetaMetricId; label: string; format: "currency" | "number" | "percent" | "decimal" }[] = [
  { id: "spend", label: "Amount spent", format: "currency" },
  { id: "impressions", label: "Impressions", format: "number" },
  { id: "reach", label: "Reach", format: "number" },
  { id: "results", label: "Results", format: "number" },
  { id: "costPerResult", label: "Cost per result", format: "currency" },
  { id: "ctr", label: "CTR (all)", format: "percent" },
  { id: "clicks", label: "Clicks (all)", format: "number" },
  { id: "linkClicks", label: "Link clicks", format: "number" },
  { id: "cpc", label: "CPC (cost per link click)", format: "currency" },
  { id: "cpm", label: "CPM (cost per 1,000 impressions)", format: "currency" },
  { id: "frequency", label: "Frequency", format: "decimal" },
];

export const DEFAULT_META_METRICS: MetaMetricId[] = ["spend", "impressions", "reach", "results", "costPerResult", "ctr"];

export type MetaBreakdownId = "campaign" | "adset" | "ad" | "age" | "gender" | "country" | "region" | "platform" | "placement" | "day" | "month";

export const META_BREAKDOWNS: { id: MetaBreakdownId; label: string; group: "level" | "dimension" | "time" }[] = [
  { id: "campaign", label: "Campaign name", group: "level" },
  { id: "adset", label: "Ad set name", group: "level" },
  { id: "ad", label: "Ad name", group: "level" },
  { id: "age", label: "Age", group: "dimension" },
  { id: "gender", label: "Gender", group: "dimension" },
  { id: "country", label: "Country", group: "dimension" },
  { id: "region", label: "Region", group: "dimension" },
  { id: "platform", label: "Platform", group: "dimension" },
  { id: "placement", label: "Placement", group: "dimension" },
  { id: "day", label: "Day", group: "time" },
  { id: "month", label: "Month", group: "time" },
];

export const DEFAULT_META_BREAKDOWNS: MetaBreakdownId[] = ["campaign", "adset", "ad"];

export type DateRange = { since: string; until: string }; // YYYY-MM-DD, inclusive

export const DATE_RANGE_PRESETS = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last_7d", label: "Last 7 days" },
  { id: "last_14d", label: "Last 14 days" },
  { id: "last_30d", label: "Last 30 days" },
  { id: "last_90d", label: "Last 90 days" },
  { id: "custom", label: "Custom range" },
] as const;

export type DateRangePresetId = (typeof DATE_RANGE_PRESETS)[number]["id"];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Resolves a preset id (or an already-picked custom range) to concrete
// since/until dates. "Last N days" is inclusive of today, matching what
// Meta's own date-range picker means by e.g. "Last 7 days".
export function resolveDateRange(preset: DateRangePresetId, custom?: DateRange): DateRange {
  const today = new Date();
  if (preset === "custom" && custom) return custom;
  if (preset === "today") return { since: toIsoDate(today), until: toIsoDate(today) };
  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { since: toIsoDate(y), until: toIsoDate(y) };
  }
  const daysMap: Record<string, number> = { last_7d: 7, last_14d: 14, last_30d: 30, last_90d: 90 };
  const days = daysMap[preset] ?? 30;
  const since = new Date(today);
  since.setDate(since.getDate() - (days - 1));
  return { since: toIsoDate(since), until: toIsoDate(today) };
}

export const DEFAULT_DATE_RANGE_PRESET: DateRangePresetId = "last_30d";

const GRAPH_BREAKDOWN_PARAM: Partial<Record<MetaBreakdownId, string>> = {
  age: "age",
  gender: "gender",
  country: "country",
  region: "region",
  platform: "publisher_platform",
  placement: "platform_position",
};

export type MetaInsightRow = {
  id: string;
  campaignName?: string;
  adsetName?: string;
  adName?: string;
  adId?: string;
  age?: string;
  gender?: string;
  country?: string;
  region?: string;
  platform?: string;
  placement?: string;
  date?: string;
  spend: number;
  impressions: number;
  reach: number;
  results: number;
  costPerResult: number;
  ctr: number;
  clicks: number;
  linkClicks: number;
  cpc: number;
  cpm: number;
  frequency: number;
};

// adAccountId should be the numeric account ID without the "act_" prefix
// (e.g. "1234567890") — the "act_" prefix is added automatically here.
// `breakdowns` mirrors the checkboxes in Meta Ads Manager's own "Customise
// pivot table" panel: the deepest of campaign/adset/ad selected controls the
// insights `level`, demographic/geo/placement selections map to the Graph
// API's `breakdowns` param, and day/month map to `time_increment`.
export async function fetchMetaInsights(
  adAccountId: string,
  breakdowns: MetaBreakdownId[],
  clientId?: string,
  dateRange?: DateRange
): Promise<MetaInsightRow[]> {
  const accessToken = await resolveMetaAccessToken(clientId);
  if (!accessToken) throw new Error("Meta Ads is not connected for this client or your agency yet.");

  const cleanId = adAccountId.replace(/\D/g, "");
  const range = dateRange ?? resolveDateRange(DEFAULT_DATE_RANGE_PRESET);

  const level = breakdowns.includes("ad") ? "ad" : breakdowns.includes("adset") ? "adset" : "campaign";

  const fields = [
    "campaign_id",
    "campaign_name",
    ...(level !== "campaign" ? ["adset_id", "adset_name"] : []),
    ...(level === "ad" ? ["ad_id", "ad_name"] : []),
    "impressions",
    "reach",
    "spend",
    "ctr",
    "cpc",
    "cpm",
    "clicks",
    "inline_link_clicks",
    "frequency",
    "actions",
    "cost_per_action_type",
  ].join(",");

  const dimensionBreakdowns = breakdowns
    .map((b) => GRAPH_BREAKDOWN_PARAM[b])
    .filter((v): v is string => !!v);

  const params = new URLSearchParams({
    fields,
    level,
    time_range: JSON.stringify({ since: range.since, until: range.until }),
    access_token: accessToken,
  });
  if (dimensionBreakdowns.length) params.set("breakdowns", dimensionBreakdowns.join(","));
  if (breakdowns.includes("day")) params.set("time_increment", "1");
  else if (breakdowns.includes("month")) params.set("time_increment", "monthly");

  const res = await fetch(`${GRAPH_URL}/act_${cleanId}/insights?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API error: ${text}`);
  }

  const data = await res.json();
  const rows = data.data ?? [];

  return rows.map((r: any, i: number) => {
    const actions: { action_type: string; value: string }[] = r.actions ?? [];
    const costPerAction: { action_type: string; value: string }[] = r.cost_per_action_type ?? [];
    // "Results" in Meta's UI depends on the campaign objective; lead-gen is
    // the most common case for this agency's accounts, so we sum any action
    // whose type mentions "lead". Falls back to 0 for non-lead campaigns
    // rather than guessing at a different objective's result definition.
    const leadActions = actions.filter((a) => a.action_type.includes("lead"));
    const results = leadActions.reduce((s, a) => s + Number(a.value || 0), 0);
    const leadCostAction = costPerAction.find((a) => a.action_type.includes("lead"));
    const spend = Number(r.spend ?? 0);
    const costPerResult = leadCostAction ? Number(leadCostAction.value) : results > 0 ? spend / results : 0;

    return {
      id: [r.campaign_id, r.adset_id, r.ad_id, r.age, r.gender, r.country, r.region, r.publisher_platform, r.platform_position, r.date_start, i]
        .filter(Boolean)
        .join("-"),
      campaignName: r.campaign_name,
      adsetName: r.adset_name,
      adName: r.ad_name,
      adId: r.ad_id,
      age: r.age,
      gender: r.gender,
      country: r.country,
      region: r.region,
      platform: r.publisher_platform,
      placement: r.platform_position,
      date: r.date_start,
      spend,
      impressions: Number(r.impressions ?? 0),
      reach: Number(r.reach ?? 0),
      results,
      costPerResult,
      ctr: Number(r.ctr ?? 0),
      clicks: Number(r.clicks ?? 0),
      linkClicks: Number(r.inline_link_clicks ?? 0),
      cpc: Number(r.cpc ?? 0),
      cpm: Number(r.cpm ?? 0),
      frequency: Number(r.frequency ?? 0),
    };
  });
}

export const AD_PREVIEW_FORMATS = [
  { id: "MOBILE_FEED_STANDARD", label: "Facebook feed (mobile)" },
  { id: "DESKTOP_FEED_STANDARD", label: "Facebook feed (desktop)" },
  { id: "INSTAGRAM_STANDARD", label: "Instagram feed" },
  { id: "INSTAGRAM_STORY", label: "Instagram story" },
  { id: "FACEBOOK_STORY_MOBILE", label: "Facebook story" },
] as const;

export type AdPreviewFormat = (typeof AD_PREVIEW_FORMATS)[number]["id"];

// Returns the raw iframe embed HTML Meta generates to render exactly what
// the ad looks like in a given placement — this is the same mechanism Ads
// Manager itself uses for its ad preview panel.
export async function fetchMetaAdPreview(
  adId: string,
  format: AdPreviewFormat = "MOBILE_FEED_STANDARD",
  clientId?: string
): Promise<string> {
  const accessToken = await resolveMetaAccessToken(clientId);
  if (!accessToken) throw new Error("Meta Ads is not connected for this client or your agency yet.");

  const params = new URLSearchParams({ ad_format: format, access_token: accessToken });
  const res = await fetch(`${GRAPH_URL}/${adId}/previews?${params.toString()}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meta API error: ${text}`);
  }
  const data = await res.json();
  const body = data?.data?.[0]?.body;
  if (!body) throw new Error("No preview available for this ad.");
  return body as string;
}

// Legacy shape kept for the client-dashboard summary cards (total ad spend),
// which only needs spend, not the full breakdown/metric matrix.
export type MetaCampaign = {
  id: string;
  name: string;
  impressions: number;
  clicks: number;
  spend: number;
  ctr: number;
  cpc: number;
};

export async function fetchMetaCampaigns(adAccountId: string, clientId?: string, dateRange?: DateRange): Promise<MetaCampaign[]> {
  const rows = await fetchMetaInsights(adAccountId, ["campaign"], clientId, dateRange);
  return rows.map((r) => ({
    id: r.id,
    name: r.campaignName ?? "—",
    impressions: r.impressions,
    clicks: r.clicks,
    spend: r.spend,
    ctr: r.ctr,
    cpc: r.cpc,
  }));
}

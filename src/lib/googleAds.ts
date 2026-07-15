import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_VERSION = process.env.GOOGLE_ADS_API_VERSION || "v24";

async function refreshWithGoogle(refreshToken: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed: ${text}`);
  }

  const data = await res.json();
  return { accessToken: data.access_token as string, expiresAt: new Date(Date.now() + data.expires_in * 1000) };
}

// Agency-level token only (no client fallback needed) - used by any feature
// that piggybacks on the same Google connection, like Meet link generation.
export async function getAgencyGoogleAccessToken(): Promise<string | null> {
  const agency = await prisma.integrationToken.findUnique({ where: { id: "google_ads" } });
  if (!agency?.refreshToken) return null;

  const isExpired = !agency.expiresAt || agency.expiresAt.getTime() < Date.now() + 60_000;
  if (!isExpired && agency.accessToken) return agency.accessToken;

  const { accessToken, expiresAt } = await refreshWithGoogle(agency.refreshToken);
  await prisma.integrationToken.update({ where: { id: "google_ads" }, data: { accessToken, expiresAt } });
  return accessToken;
}
// Resolves which token to use for a given client: the client's own connection
// if they've connected one directly, otherwise the agency-wide MCC connection.
async function resolveAccessToken(clientId?: string): Promise<{ accessToken: string; loginCustomerId?: string } | null> {
  if (clientId) {
    const clientConn = await prisma.clientGoogleAdsConnection.findUnique({ where: { clientId } });
    if (clientConn?.refreshToken) {
      const isExpired = !clientConn.expiresAt || clientConn.expiresAt.getTime() < Date.now() + 60_000;
      if (!isExpired && clientConn.accessToken) {
        return { accessToken: clientConn.accessToken, loginCustomerId: clientConn.loginCustomerId ?? undefined };
      }

      const { accessToken, expiresAt } = await refreshWithGoogle(clientConn.refreshToken);
      await prisma.clientGoogleAdsConnection.update({ where: { clientId }, data: { accessToken, expiresAt } });
      return { accessToken, loginCustomerId: clientConn.loginCustomerId ?? undefined };
    }
  }

  // Fall back to the shared agency (MCC) connection.
  const agency = await prisma.integrationToken.findUnique({ where: { id: "google_ads" } });
  if (!agency?.refreshToken) return null;

  const extra = agency.extra ? JSON.parse(agency.extra) : {};
  const isExpired = !agency.expiresAt || agency.expiresAt.getTime() < Date.now() + 60_000;
  if (!isExpired && agency.accessToken) return { accessToken: agency.accessToken, loginCustomerId: extra.loginCustomerId };

  const { accessToken, expiresAt } = await refreshWithGoogle(agency.refreshToken);
  await prisma.integrationToken.update({ where: { id: "google_ads" }, data: { accessToken, expiresAt } });
  return { accessToken, loginCustomerId: extra.loginCustomerId };
}

export async function isGoogleAdsConnected(): Promise<boolean> {
  const stored = await prisma.integrationToken.findUnique({ where: { id: "google_ads" } });
  return !!stored?.refreshToken;
}

export async function isClientGoogleAdsConnected(clientId: string): Promise<boolean> {
  const stored = await prisma.clientGoogleAdsConnection.findUnique({ where: { clientId } });
  return !!stored?.refreshToken;
}

export type GoogleAdsCampaign = {
  id: string;
  name: string;
  status: string;
  impressions: number;
  clicks: number;
  costUsd: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
};

// customerId must be digits only, no dashes (e.g. "1234567890").
// Pass clientId to prefer that client's own connection (if they have one)
// over the shared agency/MCC connection.
export async function fetchGoogleAdsCampaigns(customerId: string, clientId?: string): Promise<GoogleAdsCampaign[]> {
  const resolved = await resolveAccessToken(clientId);
  if (!resolved) throw new Error("Google Ads is not connected for this client or your agency yet.");

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
  `;

  const res = await fetch(
    `https://googleads.googleapis.com/${API_VERSION}/customers/${customerId}/googleAds:search`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resolved.accessToken}`,
        "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        ...(resolved.loginCustomerId ? { "login-customer-id": resolved.loginCustomerId } : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google Ads API error: ${text}`);
  }

  const data = await res.json();
  const results = data.results ?? [];

  return results.map((r: any) => ({
    id: r.campaign.id,
    name: r.campaign.name,
    status: r.campaign.status,
    impressions: Number(r.metrics.impressions ?? 0),
    clicks: Number(r.metrics.clicks ?? 0),
    costUsd: Number(r.metrics.costMicros ?? 0) / 1_000_000,
    conversions: Number(r.metrics.conversions ?? 0),
    ctr: Number(r.metrics.ctr ?? 0),
    avgCpc: Number(r.metrics.averageCpc ?? 0) / 1_000_000,
  }));
}

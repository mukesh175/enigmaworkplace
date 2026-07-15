"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { fetchGoogleAdsCampaigns, isGoogleAdsConnected, type GoogleAdsCampaign } from "@/lib/googleAds";
import { fetchMetaCampaigns, fetchMetaInsights, fetchMetaAdPreview, type MetaCampaign, type MetaInsightRow, type MetaBreakdownId, type AdPreviewFormat } from "@/lib/meta";

export async function getClientGoogleAdsCampaigns(
  customerId: string,
  clientId?: string
): Promise<{ campaigns: GoogleAdsCampaign[]; error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "MEMBER") return { campaigns: [], error: "Not authorized" };

  try {
    const campaigns = await fetchGoogleAdsCampaigns(customerId.replace(/\D/g, ""), clientId);
    return { campaigns, error: null };
  } catch (err: any) {
    console.error("Google Ads fetch failed:", err);
    const message: string = err.message || "unknown_error";
    if (message.includes("not connected")) return { campaigns: [], error: "not_connected" };
    return { campaigns: [], error: message };
  }
}

export async function updateGoogleAdsMccId(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  const loginCustomerId = String(formData.get("loginCustomerId") || "").replace(/-/g, "");

  await prisma.integrationToken.upsert({
    where: { id: "google_ads" },
    update: { extra: JSON.stringify({ loginCustomerId }) },
    create: { id: "google_ads", extra: JSON.stringify({ loginCustomerId }) },
  });

  revalidatePath("/integrations");
}

export async function disconnectGoogleAds() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.integrationToken.deleteMany({ where: { id: "google_ads" } });
  revalidatePath("/integrations");
}

export async function disconnectClientGoogleAds(clientId: string) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.clientGoogleAdsConnection.deleteMany({ where: { clientId } });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientGoogleAdsMccId(clientId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  const loginCustomerId = String(formData.get("loginCustomerId") || "").replace(/\D/g, "");

  await prisma.clientGoogleAdsConnection.updateMany({
    where: { clientId },
    data: { loginCustomerId: loginCustomerId || null },
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function getClientMetaCampaigns(
  adAccountId: string,
  clientId?: string
): Promise<{ campaigns: MetaCampaign[]; error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "MEMBER") return { campaigns: [], error: "Not authorized" };

  try {
    const campaigns = await fetchMetaCampaigns(adAccountId, clientId);
    return { campaigns, error: null };
  } catch (err: any) {
    console.error("Meta fetch failed:", err);
    const message: string = err.message || "unknown_error";
    if (message.includes("not connected")) return { campaigns: [], error: "not_connected" };
    return { campaigns: [], error: message };
  }
}

export async function getMetaAdPreview(
  adId: string,
  format: AdPreviewFormat,
  clientId?: string
): Promise<{ html: string | null; error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "MEMBER") return { html: null, error: "Not authorized" };

  try {
    const html = await fetchMetaAdPreview(adId, format, clientId);
    return { html, error: null };
  } catch (err: any) {
    console.error("Meta ad preview fetch failed:", err);
    return { html: null, error: err.message || "unknown_error" };
  }
}

export async function getClientMetaInsights(
  adAccountId: string,
  breakdowns: MetaBreakdownId[],
  clientId?: string
): Promise<{ rows: MetaInsightRow[]; error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "MEMBER") return { rows: [], error: "Not authorized" };

  try {
    const rows = await fetchMetaInsights(adAccountId, breakdowns, clientId);
    return { rows, error: null };
  } catch (err: any) {
    console.error("Meta insights fetch failed:", err);
    const message: string = err.message || "unknown_error";
    if (message.includes("not connected")) return { rows: [], error: "not_connected" };
    return { rows: [], error: message };
  }
}

export async function disconnectMeta() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.integrationToken.deleteMany({ where: { id: "meta" } });
  revalidatePath("/integrations");
}

export async function disconnectClientMeta(clientId: string) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.clientMetaConnection.deleteMany({ where: { clientId } });
  revalidatePath(`/clients/${clientId}`);
}

export async function disconnectGoogleCalendar() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.integrationToken.deleteMany({ where: { id: "google_calendar" } });
  revalidatePath("/integrations");
}

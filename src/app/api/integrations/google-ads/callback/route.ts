import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractGoogleErrorReason } from "@/lib/oauthErrors";
import { siteUrl } from "@/lib/env";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.redirect(siteUrl("/login"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const clientId = url.searchParams.get("state") || null; // set only for per-client connects

  const returnPath = clientId ? `/clients/${clientId}` : "/integrations";

  if (error || !code) {
    return NextResponse.redirect(siteUrl(`${returnPath}?googleAdsError=${encodeURIComponent(error || "no_code")}`));
  }

  const redirectUri = siteUrl("/api/integrations/google-ads/callback");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Google Ads token exchange failed:", text);
    const reason = extractGoogleErrorReason(text);
    return NextResponse.redirect(siteUrl(`${returnPath}?googleAdsError=${encodeURIComponent(reason)}`));
  }

  const data = await tokenRes.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000);

  if (clientId) {
    // Per-client connection: this client authorized their own separate account.
    await prisma.clientGoogleAdsConnection.upsert({
      where: { clientId },
      update: {
        accessToken: data.access_token,
        ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
        expiresAt,
      },
      create: {
        clientId,
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? null,
        expiresAt,
      },
    });
    return NextResponse.redirect(siteUrl(`/clients/${clientId}?googleAdsConnected=1`));
  }

  // Agency-wide (MCC) connection.
  await prisma.integrationToken.upsert({
    where: { id: "google_ads" },
    update: {
      accessToken: data.access_token,
      ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
      expiresAt,
    },
    create: {
      id: "google_ads",
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresAt,
    },
  });

  return NextResponse.redirect(siteUrl("/integrations?googleAdsConnected=1"));
}

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { exchangeForLongLivedToken } from "@/lib/meta";
import { extractMetaErrorReason } from "@/lib/oauthErrors";
import { siteUrl } from "@/lib/env";

const GRAPH_VERSION = process.env.META_API_VERSION || "v21.0";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.redirect(siteUrl("/login"));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const clientId = url.searchParams.get("state") || null;

  const returnPath = clientId ? `/clients/${clientId}` : "/integrations";

  if (error || !code) {
    return NextResponse.redirect(siteUrl(`${returnPath}?metaError=${encodeURIComponent(error || "no_code")}`));
  }

  const redirectUri = siteUrl("/api/integrations/meta/callback");

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    client_secret: process.env.META_APP_SECRET!,
    code,
  });

  const tokenRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?${params.toString()}`);
  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    console.error("Meta token exchange failed:", text);
    const reason = extractMetaErrorReason(text);
    return NextResponse.redirect(siteUrl(`${returnPath}?metaError=${encodeURIComponent(reason)}`));
  }

  const shortLived = await tokenRes.json();

  let longLived;
  try {
    longLived = await exchangeForLongLivedToken(shortLived.access_token);
  } catch (err) {
    console.error("Meta long-lived token exchange failed:", err);
    const reason = err instanceof Error ? err.message.slice(0, 200) : "long_lived_exchange_failed";
    return NextResponse.redirect(siteUrl(`${returnPath}?metaError=${encodeURIComponent(reason)}`));
  }

  if (clientId) {
    await prisma.clientMetaConnection.upsert({
      where: { clientId },
      update: longLived,
      create: { clientId, ...longLived },
    });
    return NextResponse.redirect(siteUrl(`/clients/${clientId}?metaConnected=1`));
  }

  await prisma.integrationToken.upsert({
    where: { id: "meta" },
    update: longLived,
    create: { id: "meta", ...longLived },
  });

  return NextResponse.redirect(siteUrl("/integrations?metaConnected=1"));
}

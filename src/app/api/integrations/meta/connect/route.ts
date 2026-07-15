import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { siteUrl } from "@/lib/env";

const GRAPH_VERSION = process.env.META_API_VERSION || "v21.0";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const url = new URL(request.url);
  const clientId = url.searchParams.get("clientId") || "";

  const redirectUri = siteUrl("/api/integrations/meta/callback");

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "ads_read",
    ...(clientId ? { state: clientId } : {}),
  });

  return NextResponse.redirect(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`);
}

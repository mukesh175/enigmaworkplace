import { prisma } from "@/lib/prisma";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

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
    throw new Error(`Google Calendar token refresh failed: ${text}`);
  }
  const data = await res.json();
  return { accessToken: data.access_token as string, expiresAt: new Date(Date.now() + data.expires_in * 1000) };
}

export async function isGoogleCalendarConnected(): Promise<boolean> {
  const stored = await prisma.integrationToken.findUnique({ where: { id: "google_calendar" } });
  return !!stored?.refreshToken;
}

async function getAgencyCalendarAccessToken(): Promise<string | null> {
  const stored = await prisma.integrationToken.findUnique({ where: { id: "google_calendar" } });
  if (!stored?.refreshToken) return null;

  const isExpired = !stored.expiresAt || stored.expiresAt.getTime() < Date.now() + 60_000;
  if (!isExpired && stored.accessToken) return stored.accessToken;

  const { accessToken, expiresAt } = await refreshWithGoogle(stored.refreshToken);
  await prisma.integrationToken.update({ where: { id: "google_calendar" }, data: { accessToken, expiresAt } });
  return accessToken;
}

export async function createGoogleMeetLink(title = "Quick Meet"): Promise<string> {
  const accessToken = await getAgencyCalendarAccessToken();
  if (!accessToken) {
    throw new Error("Google Meet isn't connected yet. An admin needs to connect it from Settings.");
  }

  const now = new Date();
  const end = new Date(now.getTime() + 30 * 60 * 1000);
  const requestId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: title,
        start: { dateTime: now.toISOString() },
        end: { dateTime: end.toISOString() },
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Calendar API error: ${text}`);
  }

  const data = await res.json();
  const link = data.hangoutLink || data.conferenceData?.entryPoints?.find((e: any) => e.entryPointType === "video")?.uri;
  if (!link) throw new Error("Google didn't return a Meet link.");

  return link;
}

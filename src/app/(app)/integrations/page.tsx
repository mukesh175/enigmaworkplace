import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { updateGoogleAdsMccId, disconnectGoogleAds, disconnectMeta, disconnectGoogleCalendar } from "@/lib/actions/integrations";
import { isGoogleAdsConnected } from "@/lib/googleAds";
import { isMetaConnected } from "@/lib/meta";
import { isGoogleCalendarConnected } from "@/lib/googleCalendar";
import { prisma } from "@/lib/prisma";
import SubmitButton from "@/components/SubmitButton";

export default async function IntegrationsPage({
  searchParams,
}: {
  searchParams: {
    googleAdsConnected?: string;
    googleAdsError?: string;
    metaConnected?: string;
    metaError?: string;
    calendarConnected?: string;
    calendarError?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [googleAdsToken, googleAdsConnected, metaConnected, calendarConnected] = await Promise.all([
    prisma.integrationToken.findUnique({ where: { id: "google_ads" } }),
    isGoogleAdsConnected(),
    isMetaConnected(),
    isGoogleCalendarConnected(),
  ]);
  const googleAdsMcc = googleAdsToken?.extra ? JSON.parse(googleAdsToken.extra).loginCustomerId ?? "" : "";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl mb-1">Integrations</h1>
        <p className="text-base-400 text-sm">Connect ad platforms and calendar to show live data across the workspace.</p>
      </div>

      <div className="card p-6">
        {searchParams.googleAdsConnected && (
          <p className="text-ok text-sm mb-4">✓ Google Ads connected successfully.</p>
        )}
        {searchParams.googleAdsError && (
          <p className="text-danger text-sm mb-4">Connection failed: {searchParams.googleAdsError}</p>
        )}

        <div className="flex items-center justify-between border border-base-700 rounded-sm p-4 mb-4">
          <div>
            <div className="text-sm">Google Ads</div>
            <div className="text-xs text-base-500">
              {googleAdsConnected ? "Connected" : "Not connected"}
            </div>
          </div>
          {googleAdsConnected ? (
            <form action={disconnectGoogleAds}>
              <SubmitButton idleLabel="Disconnect" pendingLabel="Disconnecting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger" />
            </form>
          ) : (
            <a href="/api/integrations/google-ads/connect" className="btn-primary text-xs">
              Connect Google Ads
            </a>
          )}
        </div>

        {googleAdsConnected && (
          <form action={updateGoogleAdsMccId} className="space-y-2">
            <label className="label">Manager (MCC) login customer ID</label>
            <div className="flex gap-2">
              <input
                name="loginCustomerId"
                defaultValue={googleAdsMcc}
                placeholder="123-456-7890"
                className="input"
              />
              <SubmitButton idleLabel="Save" pendingLabel="Saving…" className="btn-secondary text-xs shrink-0" />
            </div>
            <p className="text-xs text-base-500">
              Only needed if you access client accounts through a Google Ads manager account.
            </p>
          </form>
        )}
      </div>

      <div className="card p-6">
        {searchParams.metaConnected && (
          <p className="text-ok text-sm mb-4">✓ Meta Ads connected successfully.</p>
        )}
        {searchParams.metaError && (
          <p className="text-danger text-sm mb-4">Connection failed: {searchParams.metaError}</p>
        )}
        <div className="flex items-center justify-between border border-base-700 rounded-sm p-4">
          <div>
            <div className="text-sm">Meta Ads</div>
            <div className="text-xs text-base-500">
              {metaConnected ? "Connected" : "Not connected"}
            </div>
          </div>
          {metaConnected ? (
            <form action={disconnectMeta}>
              <SubmitButton idleLabel="Disconnect" pendingLabel="Disconnecting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger" />
            </form>
          ) : (
            <a href="/api/integrations/meta/connect" className="btn-primary text-xs">
              Connect Meta Ads
            </a>
          )}
        </div>
      </div>

      <div className="card p-6">
        {searchParams.calendarConnected && (
          <p className="text-ok text-sm mb-4">✓ Google Meet connected successfully.</p>
        )}
        {searchParams.calendarError && (
          <p className="text-danger text-sm mb-4">Connection failed: {searchParams.calendarError}</p>
        )}
        <div className="flex items-center justify-between border border-base-700 rounded-sm p-4">
          <div>
            <div className="text-sm">Google Meet</div>
            <div className="text-xs text-base-500">
              {calendarConnected ? "Connected — used for all video calls started in chat" : "Not connected"}
            </div>
          </div>
          {calendarConnected ? (
            <form action={disconnectGoogleCalendar}>
              <SubmitButton idleLabel="Disconnect" pendingLabel="Disconnecting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger shrink-0" />
            </form>
          ) : (
            <a href="/api/integrations/google-calendar/connect" className="btn-primary text-xs shrink-0">
              Connect Google Meet
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

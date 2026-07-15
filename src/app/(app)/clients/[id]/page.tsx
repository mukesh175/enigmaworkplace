import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateClient, deleteClient, addClientAdAccount, deleteClientAdAccount } from "@/lib/actions/clients";
import {
  getClientGoogleAdsCampaigns,
  disconnectClientGoogleAds,
  updateClientGoogleAdsMccId,
  getClientMetaInsights,
  disconnectClientMeta,
} from "@/lib/actions/integrations";
import { DEFAULT_META_BREAKDOWNS } from "@/lib/meta";
import { isGoogleAdsConnected } from "@/lib/googleAds";
import { isMetaConnected } from "@/lib/meta";
import PlatformDashboardTabs from "@/components/PlatformDashboardTabs";
import { FullWidthPage } from "@/components/PageWidthProvider";
import { checkAndAlertBudgetOverspend } from "@/lib/bot";
import SubmitButton from "@/components/SubmitButton";

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { googleAdsConnected?: string; googleAdsError?: string; metaConnected?: string; metaError?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") redirect("/my-tasks");
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const client = await prisma.client.findUnique({
    where: { id: params.id },
    include: {
      projects: { include: { tasks: { include: { assignee: true }, orderBy: { createdAt: "desc" } } } },
      invoices: { include: { items: true } },
      adAccounts: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!client) notFound();

  const tasks = client.projects.flatMap((p) => p.tasks.map((t) => ({ ...t, projectName: p.name })));

  const budgetGiven = client.projects.reduce((sum, p) => sum + (p.budget ?? 0), 0);
  const revenue = client.invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity * it.rate, 0), 0);
  const outstanding = client.invoices
    .filter((inv) => inv.status === "SENT" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity * it.rate, 0), 0);

  const updateWithId = updateClient.bind(null, client.id);
  const deleteWithId = deleteClient.bind(null, client.id);
  const disconnectWithId = disconnectClientGoogleAds.bind(null, client.id);
  const updateMccWithId = updateClientGoogleAdsMccId.bind(null, client.id);
  const disconnectMetaWithId = disconnectClientMeta.bind(null, client.id);
  const addAccountWithId = addClientAdAccount.bind(null, client.id);

  const [ownConnection, hasAgencyConnection, ownMetaConnection, hasAgencyMetaConnection] = await Promise.all([
    prisma.clientGoogleAdsConnection.findUnique({ where: { clientId: client.id } }),
    isGoogleAdsConnected(),
    prisma.clientMetaConnection.findUnique({ where: { clientId: client.id } }),
    isMetaConnected(),
  ]);
  const hasOwnConnection = !!ownConnection?.refreshToken;
  const hasOwnMetaConnection = !!ownMetaConnection?.accessToken;

  // Fetch campaign data for every linked ad account in parallel.
  const accountResults = await Promise.all(
    client.adAccounts.map(async (acc) => {
      if (acc.platform === "GOOGLE_ADS") {
        const result = await getClientGoogleAdsCampaigns(acc.accountId, client.id);
        return { ...acc, googleCampaigns: result.campaigns, error: result.error, metaRows: undefined as undefined };
      }
      const result = await getClientMetaInsights(acc.accountId, DEFAULT_META_BREAKDOWNS, client.id);
      return { ...acc, metaRows: result.rows, error: result.error, googleCampaigns: undefined as undefined };
    })
  );

  const googleAccounts = accountResults
    .filter((a) => a.platform === "GOOGLE_ADS")
    .map((a) => ({ id: a.id, label: a.label, accountId: a.accountId, campaigns: a.googleCampaigns ?? [], error: a.error }));
  const metaAccounts = accountResults
    .filter((a) => a.platform === "META")
    .map((a) => ({ id: a.id, label: a.label, accountId: a.accountId, rows: a.metaRows ?? [], error: a.error }));

  const googleAdSpend = googleAccounts.reduce((sum, a) => sum + a.campaigns.reduce((s, c) => s + c.costUsd, 0), 0);
  const metaAdSpend = metaAccounts.reduce((sum, a) => sum + a.rows.reduce((s, r) => s + r.spend, 0), 0);
  const adSpend = googleAdSpend + metaAdSpend;
  const hasAdSpendData = accountResults.some((a) => !a.error);

  if (hasAdSpendData) {
    await checkAndAlertBudgetOverspend(client.id, client.name, budgetGiven, adSpend);
  }

  return (
    <div>
      <FullWidthPage />
      <Link href="/clients" className="text-base-400 text-sm hover:text-signal">← Clients</Link>
      <h1 className="font-display text-2xl mt-2 mb-4">{client.name}</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="card p-4">
          <div className="label">Budget given</div>
          <div className="font-display text-2xl mt-1">₹{budgetGiven.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="label">Revenue collected</div>
          <div className="font-display text-2xl mt-1 text-ok">₹{revenue.toLocaleString()}</div>
        </div>
        <div className="card p-4">
          <div className="label">Outstanding</div>
          <div className="font-display text-2xl mt-1 text-warn">₹{outstanding.toLocaleString()}</div>
        </div>
      </div>

      {searchParams.googleAdsConnected && (
        <p className="text-ok text-sm mb-3">✓ Google Ads connected for {client.name}.</p>
      )}
      {searchParams.googleAdsError && (
        <p className="text-danger text-sm mb-3">Connection failed: {searchParams.googleAdsError}</p>
      )}
      {searchParams.metaConnected && (
        <p className="text-ok text-sm mb-3">✓ Meta Ads connected for {client.name}.</p>
      )}
      {searchParams.metaError && (
        <p className="text-danger text-sm mb-3">Connection failed: {searchParams.metaError}</p>
      )}

      {accountResults.length > 0 && (
        <PlatformDashboardTabs
          clientId={client.id}
          googleAccounts={googleAccounts}
          metaAccounts={metaAccounts}
          budgetGiven={budgetGiven}
          revenue={revenue}
          outstanding={outstanding}
        />
      )}

      {canManage && (
        <div className="card p-5 mb-6">
          <h2 className="font-display text-base mb-4">Ad accounts</h2>

          {client.adAccounts.length > 0 && (
            <div className="space-y-2 mb-4">
              {client.adAccounts.map((acc) => {
                const deleteAccWithId = deleteClientAdAccount.bind(null, acc.id, client.id);
                return (
                  <div key={acc.id} className="flex items-center justify-between text-sm border-b border-base-800 pb-2 last:border-0">
                    <span>
                      {acc.platform === "GOOGLE_ADS" ? "🔵 Google Ads" : "🔷 Meta"} — <strong>{acc.label}</strong>{" "}
                      <span className="text-base-500 font-mono text-xs">{acc.accountId}</span>
                    </span>
                    <form action={deleteAccWithId}>
                      <SubmitButton idleLabel="Remove" pendingLabel="Removing…" className="text-base-500 hover:text-danger text-xs bg-transparent" />
                    </form>
                  </div>
                );
              })}
            </div>
          )}

          <details className="group">
            <summary className="cursor-pointer text-sm text-signal list-none flex items-center gap-2">
              <span className="group-open:rotate-45 transition-transform inline-block">+</span> Add ad account
            </summary>
            <form action={addAccountWithId} className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
              <select name="platform" className="input" required>
                <option value="GOOGLE_ADS">Google Ads</option>
                <option value="META">Meta</option>
              </select>
              <input name="label" placeholder="Label, e.g. Gami Avant" className="input" required />
              <input name="accountId" placeholder="Account ID" className="input" required />
              <SubmitButton idleLabel="Add" pendingLabel="Adding…" className="btn-primary text-sm" />
            </form>
          </details>

          <div className="border-t border-base-700 mt-5 pt-4 space-y-3 text-xs text-base-500">
            <div className="flex items-center justify-between">
              <span>
                Google Ads: {hasOwnConnection ? "using this client's own connection" : hasAgencyConnection ? "using your agency's shared connection" : "not connected"}
              </span>
              {hasOwnConnection ? (
                <form action={disconnectWithId}>
                  <SubmitButton idleLabel="Disconnect" pendingLabel="Disconnecting…" className="text-danger hover:underline bg-transparent" />
                </form>
              ) : (
                <a href={`/api/integrations/google-ads/connect?clientId=${client.id}`} className="text-signal hover:underline">
                  Connect this client's own account
                </a>
              )}
            </div>
            {hasOwnConnection && (
              <form action={updateMccWithId} className="flex items-center gap-2">
                <input
                  name="loginCustomerId"
                  defaultValue={ownConnection?.loginCustomerId ?? ""}
                  placeholder="Manager account ID, only if needed"
                  className="input text-xs"
                />
                <SubmitButton idleLabel="Save" pendingLabel="Saving…" className="btn-secondary text-xs shrink-0" />
              </form>
            )}

            <div className="flex items-center justify-between border-t border-base-800 pt-3">
              <span>
                Meta: {hasOwnMetaConnection ? "using this client's own connection" : hasAgencyMetaConnection ? "using your agency's shared connection" : "not connected"}
              </span>
              {hasOwnMetaConnection ? (
                <form action={disconnectMetaWithId}>
                  <SubmitButton idleLabel="Disconnect" pendingLabel="Disconnecting…" className="text-danger hover:underline bg-transparent" />
                </form>
              ) : (
                <a href={`/api/integrations/meta/connect?clientId=${client.id}`} className="text-signal hover:underline">
                  Connect this client's own account
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5">
            <h2 className="font-display text-base mb-4">Projects</h2>
            <div className="space-y-2">
              {client.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between text-sm border-b border-base-800 pb-2 last:border-0 hover:text-signal">
                  <span>{p.name}</span>
                  <span className="pill">{p.status.replace("_", " ")}</span>
                </Link>
              ))}
              {client.projects.length === 0 && <p className="text-base-500 text-sm">No projects yet.</p>}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-base mb-4">Tasks</h2>
            <div className="space-y-2">
              {tasks.map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between text-sm border-b border-base-800 pb-2 last:border-0 hover:text-signal">
                  <span>{t.title}</span>
                  <span className="text-base-500 text-xs">{t.projectName} · {t.assignee?.name ?? "Unassigned"}</span>
                  <span className="pill">{t.status.replace("_", " ")}</span>
                </Link>
              ))}
              {tasks.length === 0 && <p className="text-base-500 text-sm">No tasks yet.</p>}
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-base mb-4">Invoices</h2>
            <div className="space-y-2">
              {client.invoices.map((inv) => {
                const total = inv.items.reduce((s, it) => s + it.quantity * it.rate, 0);
                return (
                  <Link key={inv.id} href={`/invoices/${inv.id}`} className="flex items-center justify-between text-sm border-b border-base-800 pb-2 last:border-0 hover:text-signal">
                    <span className="font-mono">{inv.number}</span>
                    <span>₹{total.toFixed(2)}</span>
                    <span className="pill">{inv.status}</span>
                  </Link>
                );
              })}
              {client.invoices.length === 0 && <p className="text-base-500 text-sm">No invoices yet.</p>}
            </div>
          </div>
        </div>

        <div className="card p-5 h-fit">
          <h2 className="font-display text-base mb-4">Details</h2>
          <form action={updateWithId} className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input name="name" defaultValue={client.name} className="input" required />
            </div>
            <div>
              <label className="label">Company</label>
              <input name="company" defaultValue={client.company ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" defaultValue={client.email ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" defaultValue={client.phone ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Notes</label>
              <textarea name="notes" defaultValue={client.notes ?? ""} className="input" rows={3} />
            </div>
            <div>
              <label className="label">GST number</label>
              <input name="gstNumber" defaultValue={client.gstNumber ?? ""} className="input" />
            </div>
            <div>
              <label className="label">Billing address (for invoices)</label>
              <textarea name="billingAddress" defaultValue={client.billingAddress ?? ""} className="input" rows={4} />
            </div>
            <SubmitButton idleLabel="Save changes" pendingLabel="Saving…" className="btn-primary w-full" />
          </form>
          <form action={deleteWithId} className="mt-3">
            <SubmitButton idleLabel="Delete client" pendingLabel="Deleting…" className="btn-secondary w-full text-danger border-danger/40 hover:border-danger" />
          </form>
        </div>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SoundPicker from "@/components/SoundPicker";
import PreferencesForm from "@/components/PreferencesForm";
import ThemeAccentPicker from "@/components/ThemeAccentPicker";
import FontPicker from "@/components/FontPicker";
import NotificationPrefsForm from "@/components/NotificationPrefsForm";
import TeamSidebarPicker from "@/components/TeamSidebarPicker";
import ProfileImageUpload from "@/components/ProfileImageUpload";
import { getCompanyProfile, updateCompanyProfile, updateInvoiceNumbering } from "@/lib/actions/company";
import SubmitButton from "@/components/SubmitButton";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const isAdmin = session.user.role === "ADMIN";
  const company = isAdmin ? await getCompanyProfile() : null;

  const [allMembers, groupChats] = await Promise.all([
    prisma.user.findMany({
      where: { id: { not: user.id } },
      select: { id: true, name: true, title: true },
      orderBy: { name: "asc" },
    }),
    prisma.conversation.findMany({
      where: { isGroup: true, participants: { some: { userId: user.id } } },
      include: { participants: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pinnedIds = user.pinnedTeamMemberIds ? user.pinnedTeamMemberIds.split(",").filter(Boolean) : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl mb-1">Profile & settings</h1>
        <p className="text-base-400 text-sm">Manage your identity, appearance, notifications, and workspace preferences.</p>
      </div>

      <div className="card p-6 flex items-center gap-4">
        <ProfileImageUpload name={user.name} avatarColor={user.avatarColor} avatarImageUrl={user.avatarImageUrl} />
        <div>
          <h2 className="font-display text-lg">{user.name}</h2>
          <p className="text-base-400 text-sm">{user.email}</p>
          <div className="flex gap-2 mt-1.5">
            {user.title && <span className="pill">{user.title}</span>}
            {user.employeeCode && <span className="pill">{user.employeeCode}</span>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <ThemeAccentPicker themeMode={user.themeMode} accentColor={user.accentColor} />
          <FontPicker fontFamily={user.fontFamily} fontWeight={user.fontWeight} fontSizeScale={user.fontSizeScale} />
        </div>

        <div className="space-y-6">
          <NotificationPrefsForm
            dmNotifPref={user.dmNotifPref}
            groupNotifPref={user.groupNotifPref}
            threadReplyPref={user.threadReplyPref}
            taskUpdateAlerts={user.taskUpdateAlerts}
            pushNotifications={user.pushNotifications}
            emailNotifications={user.emailNotifications}
          />

          <TeamSidebarPicker members={allMembers} initialPinned={pinnedIds} />

          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base">Group chats</h2>
              <Link href="/chat" className="btn-secondary text-xs">
                + New Group
              </Link>
            </div>
            {groupChats.length === 0 ? (
              <p className="text-sm text-base-500">You're not in any group chats yet.</p>
            ) : (
              <div className="space-y-2">
                {groupChats.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-sm border border-base-700">
                    <div>
                      <div className="text-sm">{c.name ?? "Untitled group"}</div>
                      <div className="text-xs text-base-500">{c.participants.length} members</div>
                    </div>
                    <Link href={`/chat/${c.id}`} className="text-signal text-sm hover:text-signal-soft">
                      Open
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-base mb-1">Notification sound</h2>
        <p className="text-base-400 text-sm mb-5">
          Played when a new message or task update arrives while the app is open.
        </p>
        <SoundPicker current={user.notificationSound} />
      </div>

      <div className="card p-6">
        <h2 className="font-display text-base mb-1">Alerts</h2>
        <p className="text-base-400 text-sm mb-5">Fine-tune how and when you're notified.</p>
        <PreferencesForm
          soundEnabled={user.soundEnabled}
          soundVolume={user.soundVolume}
          desktopNotifications={user.desktopNotifications}
          autoLogoutMinutes={user.autoLogoutMinutes}
        />
      </div>

      {company && (
        <div className="card p-6">
          <h2 className="font-display text-base mb-1">Company details</h2>
          <p className="text-base-400 text-sm mb-5">Used on the header and bank details of every invoice.</p>
          <form action={updateCompanyProfile} className="space-y-4">
            <div>
              <label className="label">Display name</label>
              <input name="name" defaultValue={company.name} className="input" required />
            </div>
            <div>
              <label className="label">Legal name</label>
              <input name="legalName" defaultValue={company.legalName} className="input" required />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea name="addressLines" defaultValue={company.addressLines} className="input" rows={3} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">GSTIN</label>
                <input name="gstin" defaultValue={company.gstin} className="input" required />
              </div>
              <div>
                <label className="label">PAN</label>
                <input name="pan" defaultValue={company.pan} className="input" required />
              </div>
            </div>
            <div className="border-t border-base-700 pt-4">
              <div className="label mb-2">Bank details</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Account name</label>
                  <input name="bankAccountName" defaultValue={company.bankAccountName} className="input" required />
                </div>
                <div>
                  <label className="label">Account type</label>
                  <input name="bankAccountType" defaultValue={company.bankAccountType} className="input" required />
                </div>
                <div>
                  <label className="label">Bank name</label>
                  <input name="bankName" defaultValue={company.bankName} className="input" required />
                </div>
                <div>
                  <label className="label">Branch</label>
                  <input name="bankBranch" defaultValue={company.bankBranch} className="input" required />
                </div>
                <div>
                  <label className="label">Account number</label>
                  <input name="bankAccountNumber" defaultValue={company.bankAccountNumber} className="input" required />
                </div>
                <div>
                  <label className="label">IFSC code</label>
                  <input name="bankIfsc" defaultValue={company.bankIfsc} className="input" required />
                </div>
              </div>
            </div>
            <SubmitButton idleLabel="Save company details" pendingLabel="Saving…" />
          </form>
        </div>
      )}

      {company && (
        <div className="card p-6">
          <h2 className="font-display text-base mb-1">Invoice numbering</h2>
          <p className="text-base-400 text-sm mb-5">
            The next number that will be assigned to a new invoice of each type. Increments automatically after
            each invoice is created — only change this if you need to re-sync the sequence.
          </p>
          <form action={updateInvoiceNumbering} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="label">Proforma invoices (PI-INV-…)</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-base-500">Next number</label>
                  <input name="nextProformaNumber" type="number" min={1} defaultValue={company.nextProformaNumber} className="input" />
                </div>
                <div className="w-28">
                  <label className="text-xs text-base-500">Digits</label>
                  <input name="proformaNumberDigits" type="number" min={1} max={10} defaultValue={company.proformaNumberDigits} className="input" />
                </div>
              </div>
              <p className="text-xs text-base-500">
                Next: PI-INV-{String(company.nextProformaNumber).padStart(company.proformaNumberDigits, "0")}
              </p>
            </div>
            <div className="space-y-3">
              <div className="label">Tax invoices (INV-…)</div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-xs text-base-500">Next number</label>
                  <input name="nextTaxNumber" type="number" min={1} defaultValue={company.nextTaxNumber} className="input" />
                </div>
                <div className="w-28">
                  <label className="text-xs text-base-500">Digits</label>
                  <input name="taxNumberDigits" type="number" min={1} max={10} defaultValue={company.taxNumberDigits} className="input" />
                </div>
              </div>
              <p className="text-xs text-base-500">
                Next: INV-{String(company.nextTaxNumber).padStart(company.taxNumberDigits, "0")}
              </p>
            </div>
            <div className="md:col-span-2">
              <SubmitButton idleLabel="Save numbering" pendingLabel="Saving…" />
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import MobileTabBar from "@/components/MobileTabBar";
import AutoLogout from "@/components/AutoLogout";
import { MobileNavProvider } from "@/components/MobileNavProvider";
import { PresenceProvider } from "@/components/PresenceProvider";
import { PageWidthProvider } from "@/components/PageWidthProvider";
import MainContent from "@/components/MainContent";
import type { SoundId } from "@/lib/sounds";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const [myConversations, me, notifications, unreadNotifCount] = await Promise.all([
    prisma.conversation.findMany({
      where: { participants: { some: { userId: session.user.id } } },
      include: {
        participants: { where: { userId: session.user.id } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: session.user.id, read: false } }),
  ]);

  const unreadChatCount = myConversations.filter((c) => {
    const last = c.messages[0];
    const meP = c.participants[0];
    return last && last.userId !== session.user.id && (!meP?.lastReadAt || last.createdAt > meP.lastReadAt);
  }).length;

  return (
    <PresenceProvider>
      <MobileNavProvider>
        <div className="flex min-h-screen">
          <AutoLogout minutes={me?.autoLogoutMinutes ?? 0} />
          <div className="print:hidden">
            <Sidebar role={session.user.role} unreadCount={unreadChatCount} />
          </div>
          <div className="flex-1 min-w-0">
            <PageWidthProvider>
              <div className="print:hidden">
                <Topbar
                  userId={session.user.id}
                  name={session.user.name ?? "User"}
                  role={session.user.role}
                  avatarImageUrl={me?.avatarImageUrl ?? null}
                  initialNotifications={notifications}
                  initialUnreadCount={unreadNotifCount}
                  soundPreference={(me?.notificationSound ?? "chime") as SoundId}
                  soundEnabled={me?.soundEnabled ?? true}
                  soundVolume={me?.soundVolume ?? 0.6}
                  desktopNotifications={me?.desktopNotifications ?? false}
                />
              </div>
              <MainContent>{children}</MainContent>
            </PageWidthProvider>
          </div>
        </div>
        <MobileTabBar role={session.user.role} unreadCount={unreadChatCount} />
      </MobileNavProvider>
    </PresenceProvider>
  );
}

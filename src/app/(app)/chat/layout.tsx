import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChatContactList from "@/components/ChatContactList";
import ChatPanes from "@/components/ChatPanes";
import RealtimeRefresh from "@/components/RealtimeRefresh";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const myId = session.user.id;
  const canCreateGroup = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const [directConvos, groupConvos, users] = await Promise.all([
    prisma.conversation.findMany({
      where: { isGroup: false, participants: { some: { userId: myId } } },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.conversation.findMany({
      where: { isGroup: true, participants: { some: { userId: myId } } },
      include: {
        participants: { include: { user: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.user.findMany({ where: { id: { not: myId } }, orderBy: { name: "asc" } }),
  ]);

  const directRows = users.map((u) => {
    const convo = directConvos.find(
      (c) => c.participants.length === 2 && c.participants.some((p) => p.userId === u.id)
    );
    const me = convo?.participants.find((p) => p.userId === myId);
    const last = convo?.messages[0];
    const unread = !!last && last.userId !== myId && (!me?.lastReadAt || last.createdAt > me.lastReadAt);

    return {
      key: u.id,
      conversationId: convo?.id ?? null,
      startUserId: u.id,
      title: u.name,
      subtitle: u.title ?? u.role,
      color: u.avatarColor,
      initial: u.name.charAt(0).toUpperCase(),
      lastMessage: last?.content ?? "No messages yet",
      lastAt: last?.createdAt ?? null,
      unread,
      isGroup: false,
    };
  });

  const groupRows = groupConvos.map((c) => {
    const me = c.participants.find((p) => p.userId === myId);
    const last = c.messages[0];
    const unread = !!last && last.userId !== myId && (!me?.lastReadAt || last.createdAt > me.lastReadAt);

    return {
      key: c.id,
      conversationId: c.id,
      startUserId: null,
      title: c.name ?? "Group",
      subtitle: `${c.participants.length} members`,
      color: "#A78BFA",
      initial: (c.name ?? "G").charAt(0).toUpperCase(),
      lastMessage: last?.content ?? "No messages yet",
      lastAt: last?.createdAt ?? null,
      unread,
      isGroup: true,
    };
  });

  const rows = [...groupRows, ...directRows].sort((a, b) => {
    if (a.lastAt && b.lastAt) return b.lastAt.getTime() - a.lastAt.getTime();
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.title.localeCompare(b.title);
  });

  return (
    <>
      <RealtimeRefresh channel={`user-${myId}`} event="chat-update" />
      <ChatPanes list={<ChatContactList rows={rows} allUsers={users} canCreateGroup={canCreateGroup} />}>
        {children}
      </ChatPanes>
    </>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markConversationRead } from "@/lib/actions/chat";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import ChatThread from "@/components/ChatThread";
import MediaPanel from "@/components/MediaPanel";
import OnlineDot from "@/components/OnlineDot";
import ActiveStatusText from "@/components/ActiveStatusText";

export default async function ChatThreadPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const myId = session.user.id;

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.id },
    include: {
      participants: { include: { user: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          user: true,
          file: true,
          replyTo: { include: { user: true } },
          reactions: true,
        },
      },
    },
  });
  if (!conversation || !conversation.participants.some((p) => p.userId === myId)) notFound();

  await markConversationRead(conversation.id);

  const allUsers = await prisma.user.findMany({ where: { id: { not: myId } }, select: { id: true, name: true } });

  const other = conversation.participants.find((p) => p.userId !== myId)?.user;
  const title = conversation.isGroup ? conversation.name ?? "Group" : other?.name ?? "Unknown";
  const otherParticipants = conversation.participants.filter((p) => p.userId !== myId);

  const messages = conversation.messages.map((m) => ({
    id: m.id,
    content: m.content,
    tag: m.tag,
    editedAt: m.editedAt,
    deletedAt: m.deletedAt,
    createdAt: m.createdAt,
    userId: m.userId,
    user: { name: m.user.name, avatarColor: m.user.avatarColor },
    file: m.file ? { url: m.file.url, name: m.file.name, mimeType: m.file.mimeType } : null,
    replyTo: m.replyTo ? { id: m.replyTo.id, content: m.replyTo.content, user: { name: m.replyTo.user.name } } : null,
    reactions: m.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
  }));

  return (
    <>
      <RealtimeRefresh channel={`conversation-${conversation.id}`} />
      <div className="px-4 md:px-6 py-4 border-b border-base-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/chat" className="md:hidden text-base-400 hover:text-signal shrink-0">←</Link>
          <div className="relative shrink-0">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono"
              style={{
                backgroundColor: (conversation.isGroup ? "#A78BFA" : other?.avatarColor ?? "#A78BFA") + "33",
                border: `1px solid ${conversation.isGroup ? "#A78BFA" : other?.avatarColor ?? "#A78BFA"}`,
              }}
            >
              {title.charAt(0).toUpperCase()}
            </div>
            {!conversation.isGroup && other && (
              <OnlineDot userId={other.id} className="absolute -bottom-0.5 -right-0.5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display truncate">{title}</div>
            <div className="text-xs text-base-500 truncate">
              {conversation.isGroup
                ? `${conversation.participants.length} members`
                : other?.title ?? ""}
            </div>
            {!conversation.isGroup && other && <ActiveStatusText userId={other.id} />}
          </div>
        </div>
        <MediaPanel conversationId={conversation.id} />
      </div>

      <ChatThread
        conversationId={conversation.id}
        myId={myId}
        messages={messages}
        otherReadTimes={otherParticipants.map((p) => p.lastReadAt)}
        mentionableUsers={allUsers}
      />
    </>
  );
}

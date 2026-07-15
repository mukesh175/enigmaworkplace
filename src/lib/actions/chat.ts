"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { pusherTrigger } from "@/lib/pusherServer";
import { createGoogleMeetLink } from "@/lib/googleCalendar";
import { extractMentionedUserIds } from "@/lib/mentions";

// Finds an existing 1:1 conversation between the current user and otherUserId,
// or creates one, then redirects to it.
export async function startDirectMessage(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const otherUserId = String(formData.get("userId") || "");
  if (!otherUserId || otherUserId === session.user.id) return;

  const candidates = await prisma.conversation.findMany({
    where: {
      isGroup: false,
      participants: { some: { userId: session.user.id } },
    },
    include: { participants: true },
  });

  const exact = candidates.find(
    (c) => c.participants.length === 2 && c.participants.some((p) => p.userId === otherUserId)
  );

  const conversation =
    exact ??
    (await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: session.user.id }, { userId: otherUserId }],
        },
      },
    }));

  redirect(`/chat/${conversation.id}`);
}

export async function createGroupChat(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER") return;

  const name = String(formData.get("name") || "").trim();
  const memberIds = (formData.getAll("memberIds") as string[]).filter(Boolean);
  if (!name || memberIds.length === 0) return;

  const uniqueIds = Array.from(new Set([...memberIds, session.user.id]));

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: true,
      name,
      participants: { create: uniqueIds.map((userId) => ({ userId })) },
    },
  });

  for (const id of uniqueIds) {
    if (id === session.user.id) continue;
    await notify(id, "MESSAGE", `Added to group: ${name}`, `${session.user.name} added you`, `/chat/${conversation.id}`);
  }

  redirect(`/chat/${conversation.id}`);
}

async function afterSend(conversationId: string, senderId: string, senderName: string, preview: string) {
  const [, participants] = await Promise.all([
    prisma.conversationParticipant.updateMany({
      where: { conversationId, userId: senderId },
      data: { lastReadAt: new Date() },
    }),
    prisma.conversationParticipant.findMany({
      where: { conversationId, userId: { not: senderId } },
      include: { user: true },
    }),
  ]);

  const mentionedIds = extractMentionedUserIds(
    preview,
    participants.map((p) => ({ id: p.userId, name: p.user.name }))
  );

  await Promise.all(
    participants.flatMap((p) => {
      const tasks = [
        notify(p.userId, "MESSAGE", `New message from ${senderName}`, preview, `/chat/${conversationId}`),
        pusherTrigger(`user-${p.userId}`, "chat-update"),
      ];
      if (mentionedIds.includes(p.userId)) {
        tasks.push(notify(p.userId, "MESSAGE", `${senderName} mentioned you`, preview, `/chat/${conversationId}`));
      }
      return tasks;
    })
  );

  await pusherTrigger(`conversation-${conversationId}`, "update");
  revalidatePath(`/chat/${conversationId}`);
}

export async function sendMessage(conversationId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const content = String(formData.get("content") || "").trim();
  const tag = String(formData.get("tag") || "NONE");
  const replyToId = String(formData.get("replyToId") || "") || null;
  if (!content) return;

  await prisma.directMessage.create({
    data: { conversationId, userId: session.user.id, content, tag: tag as any, replyToId },
  });

  await afterSend(conversationId, session.user.id, session.user.name ?? "Someone", content);
}

export async function attachFileAndSend(conversationId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const url = String(formData.get("fileUrl") || "");
  const name = String(formData.get("fileName") || "");
  if (!url || !name) return;

  const sizeBytes = Number(formData.get("fileSize") || 0) || null;
  const mimeType = String(formData.get("mimeType") || "") || null;
  const caption = String(formData.get("caption") || "");

  const file = await prisma.fileAsset.create({
    data: { name, url, sizeBytes, mimeType, uploadedById: session.user.id },
  });

  await prisma.directMessage.create({
    data: { conversationId, userId: session.user.id, content: caption, fileId: file.id },
  });

  await afterSend(conversationId, session.user.id, session.user.name ?? "Someone", caption || `Sent a file: ${name}`);
}

export async function markConversationRead(conversationId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.conversationParticipant.updateMany({
    where: { conversationId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  });

  revalidatePath("/chat");
}

export async function generateAndShareMeetLink(conversationId: string): Promise<{ error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not signed in" };

  try {
    const link = await createGoogleMeetLink();
    await prisma.directMessage.create({
      data: { conversationId, userId: session.user.id, content: `📹 Join Google Meet: ${link}` },
    });
    await afterSend(conversationId, session.user.id, session.user.name ?? "Someone", "Started a video call");
    return { error: null };
  } catch (err: any) {
    console.error("Meet link generation failed:", err);
    return { error: err.message || "Couldn't generate a Meet link." };
  }
}

export async function editMessage(messageId: string, conversationId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const content = String(formData.get("content") || "").trim();
  if (!content) return;

  await prisma.directMessage.updateMany({
    where: { id: messageId, userId: session.user.id },
    data: { content, editedAt: new Date() },
  });

  await pusherTrigger(`conversation-${conversationId}`, "update");
  revalidatePath(`/chat/${conversationId}`);
}

export async function deleteMessage(messageId: string, conversationId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  // Soft delete: keeps the row (so replies still resolve) but blanks the
  // content and marks it deleted, same pattern WhatsApp uses.
  await prisma.directMessage.updateMany({
    where: { id: messageId, userId: session.user.id },
    data: { content: "", deletedAt: new Date(), fileId: null },
  });

  await pusherTrigger(`conversation-${conversationId}`, "update");
  revalidatePath(`/chat/${conversationId}`);
}

export async function toggleReaction(messageId: string, conversationId: string, emoji: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId, userId: session.user.id, emoji } },
  });

  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.messageReaction.create({ data: { messageId, userId: session.user.id, emoji } });
  }

  await pusherTrigger(`conversation-${conversationId}`, "update");
  revalidatePath(`/chat/${conversationId}`);
}

export async function getConversationMedia(conversationId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return [];

  const messages = await prisma.directMessage.findMany({
    where: { conversationId, fileId: { not: null }, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { file: true, user: true },
  });

  return messages
    .filter((m) => m.file)
    .map((m) => ({
      id: m.file!.id,
      name: m.file!.name,
      url: m.file!.url,
      mimeType: m.file!.mimeType,
      uploadedBy: m.user.name,
      createdAt: m.createdAt,
    }));
}

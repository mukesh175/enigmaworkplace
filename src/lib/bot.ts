import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { pusherTrigger } from "@/lib/pusherServer";

const BOT_EMAIL = "bot@enigma.internal";
const CHANNEL_NAME = "Enigma Updates";

export async function getOrCreateBotUser() {
  const existing = await prisma.user.findUnique({ where: { email: BOT_EMAIL } });
  if (existing) return existing;

  const password = await bcrypt.hash(Math.random().toString(36), 10);
  return prisma.user.create({
    data: {
      name: "Enigma Bot",
      email: BOT_EMAIL,
      password,
      role: "MEMBER",
      title: "Automated updates",
      avatarColor: "#ed5e4e",
    },
  });
}

// Finds the shared announcements channel, creating it (with every current
// user as a member) the first time it's needed.
export async function getOrCreateAnnouncementChannel() {
  const existing = await prisma.conversation.findFirst({
    where: { isGroup: true, name: CHANNEL_NAME },
  });
  if (existing) return existing;

  const bot = await getOrCreateBotUser();
  const users = await prisma.user.findMany({ where: { id: { not: bot.id } } });

  return prisma.conversation.create({
    data: {
      isGroup: true,
      name: CHANNEL_NAME,
      participants: {
        create: [{ userId: bot.id }, ...users.map((u) => ({ userId: u.id }))],
      },
    },
  });
}

// Adds a user to the announcements channel if they aren't already in it —
// call this whenever a new team member is created.
export async function addUserToAnnouncementChannel(userId: string) {
  const channel = await getOrCreateAnnouncementChannel();
  const existing = await prisma.conversationParticipant.findFirst({
    where: { conversationId: channel.id, userId },
  });
  if (!existing) {
    await prisma.conversationParticipant.create({ data: { conversationId: channel.id, userId } });
  }
}

export async function postBotMessage(content: string) {
  try {
    const bot = await getOrCreateBotUser();
    const channel = await getOrCreateAnnouncementChannel();

    await prisma.directMessage.create({
      data: { conversationId: channel.id, userId: bot.id, content },
    });

    await pusherTrigger(`conversation-${channel.id}`, "update");

    const participants = await prisma.conversationParticipant.findMany({
      where: { conversationId: channel.id, userId: { not: bot.id } },
    });
    for (const p of participants) {
      await pusherTrigger(`user-${p.userId}`, "chat-update");
    }
  } catch (err) {
    // Bot announcements are a nice-to-have — never let a failure here
    // break the real action (task update, budget check, etc.) that
    // triggered it.
    console.error("Bot message failed:", err);
  }
}

// Posts an overspend alert at most once every 24 hours per client, so
// viewing a client's page repeatedly doesn't spam the channel.
export async function checkAndAlertBudgetOverspend(
  clientId: string,
  clientName: string,
  budgetGiven: number,
  adSpend: number
) {
  if (budgetGiven <= 0 || adSpend <= budgetGiven) return;

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  const cooldownMs = 24 * 60 * 60 * 1000;
  if (client?.lastBudgetAlertAt && Date.now() - client.lastBudgetAlertAt.getTime() < cooldownMs) return;

  const over = adSpend - budgetGiven;
  await postBotMessage(
    `🚨 **${clientName}** has overspent their ad budget by ₹${over.toLocaleString(undefined, { maximumFractionDigits: 0 })} (spent ₹${adSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })} of ₹${budgetGiven.toLocaleString(undefined, { maximumFractionDigits: 0 })}).`
  );

  await prisma.client.update({ where: { id: clientId }, data: { lastBudgetAlertAt: new Date() } });
}

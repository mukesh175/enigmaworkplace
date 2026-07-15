"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function requireUserId() {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Not signed in");
  return session.user.id;
}

export async function updateThemeMode(mode: "dark" | "light") {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { themeMode: mode } });
  revalidatePath("/", "layout");
}

export async function updateAccentColor(hex: string) {
  const userId = await requireUserId();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  await prisma.user.update({ where: { id: userId }, data: { accentColor: hex } });
  revalidatePath("/", "layout");
}

export async function updateFontPrefs(prefs: { fontFamily?: string; fontWeight?: string; fontSizeScale?: number }) {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(prefs.fontFamily ? { fontFamily: prefs.fontFamily } : {}),
      ...(prefs.fontWeight ? { fontWeight: prefs.fontWeight } : {}),
      ...(prefs.fontSizeScale ? { fontSizeScale: prefs.fontSizeScale } : {}),
    },
  });
  revalidatePath("/", "layout");
}

export async function updateNotificationPrefs(formData: FormData) {
  const userId = await requireUserId();

  await prisma.user.update({
    where: { id: userId },
    data: {
      dmNotifPref: String(formData.get("dmNotifPref") || "all"),
      groupNotifPref: String(formData.get("groupNotifPref") || "all"),
      threadReplyPref: String(formData.get("threadReplyPref") || "all"),
      taskUpdateAlerts: formData.get("taskUpdateAlerts") === "on",
      pushNotifications: formData.get("pushNotifications") === "on",
      emailNotifications: formData.get("emailNotifications") === "on",
    },
  });
  revalidatePath("/settings");
}

export async function updatePinnedTeamMembers(memberIds: string[]) {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { pinnedTeamMemberIds: memberIds.join(",") },
  });
  revalidatePath("/", "layout");
}

export async function updateAvatarColor(hex: string) {
  const userId = await requireUserId();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  await prisma.user.update({ where: { id: userId }, data: { avatarColor: hex } });
  revalidatePath("/", "layout");
}

export async function updateAvatarImage(url: string | null) {
  const userId = await requireUserId();
  await prisma.user.update({ where: { id: userId }, data: { avatarImageUrl: url } });
  revalidatePath("/", "layout");
}

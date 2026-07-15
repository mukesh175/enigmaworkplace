"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getMyNotifications() {
  const session = await getServerSession(authOptions);
  if (!session) return { notifications: [], unreadCount: 0 };

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
  ]);

  return { notifications, unreadCount };
}

export async function markAllNotificationsRead() {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  });

  revalidatePath("/", "layout");
}

export async function updateNotificationSound(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const sound = String(formData.get("sound") || "chime");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { notificationSound: sound },
  });

  revalidatePath("/settings");
}

export async function updatePreferences(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const soundEnabled = formData.get("soundEnabled") === "on";
  const soundVolume = Number(formData.get("soundVolume") || "0.6");
  const desktopNotifications = formData.get("desktopNotifications") === "on";
  const autoLogoutMinutes = Number(formData.get("autoLogoutMinutes") || "0");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { soundEnabled, soundVolume, desktopNotifications, autoLogoutMinutes },
  });

  revalidatePath("/settings");
  revalidatePath("/", "layout");
}

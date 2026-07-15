import { prisma } from "@/lib/prisma";
import { pusherTrigger } from "@/lib/pusherServer";

export async function notify(
  userId: string | null | undefined,
  type: "MESSAGE" | "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "TASK_COMMENT" | "LEAVE_REQUEST" | "PAYSLIP",
  title: string,
  body?: string | null,
  link?: string | null
) {
  if (!userId) return;
  try {
    await Promise.all([
      prisma.notification.create({
        data: { userId, type, title, body: body ?? null, link: link ?? null },
      }),
      pusherTrigger(`user-${userId}`, "notification"),
    ]);
  } catch {
    // Never let a notification failure break the primary action.
  }
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { pusherTrigger } from "@/lib/pusherServer";
import { postBotMessage } from "@/lib/bot";
import { createGoogleMeetLink } from "@/lib/googleCalendar";
import { extractMentionedUserIds } from "@/lib/mentions";

export async function createTask(formData: FormData) {
  const session = await getServerSession(authOptions);

  const title = String(formData.get("title") || "").trim();
  const projectId = String(formData.get("projectId") || "");
  if (!title || !projectId) return;

  const dueDateRaw = String(formData.get("dueDate") || "");
  const assigneeId = String(formData.get("assigneeId") || "") || null;

  const task = await prisma.task.create({
    data: {
      title,
      description: String(formData.get("description") || "") || null,
      projectId,
      assigneeId,
      priority: (String(formData.get("priority") || "MEDIUM")) as any,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      figmaLink: String(formData.get("figmaLink") || "") || null,
      referenceUrl: String(formData.get("referenceUrl") || "") || null,
      isHourly: formData.get("isHourly") === "on",
    },
    include: { project: true },
  });

  if (assigneeId && assigneeId !== session?.user.id) {
    await notify(
      assigneeId,
      "TASK_ASSIGNED",
      "New task assigned to you",
      `${task.title} — ${task.project.name}`,
      `/tasks/${task.id}`
    );
  }

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
}

export async function updateTaskStatus(id: string, projectId: string, status: string) {
  const session = await getServerSession(authOptions);

  try {
    const task = await prisma.task.update({
      where: { id },
      data: { status: status as any },
      include: { project: true },
    });

    if (task.assigneeId && task.assigneeId !== session?.user.id) {
      const label =
        status === "REVIEW" ? "sent for review" : status === "DONE" ? "marked complete" : `moved to ${status.replace("_", " ").toLowerCase()}`;
      await notify(
        task.assigneeId,
        "TASK_STATUS_CHANGED",
        `Task ${label}`,
        `${task.title} — ${task.project.name}`,
        `/tasks/${id}`
      );
    }

    // When a task is sent to review, nudge admins/managers to take a look.
    if (status === "REVIEW") {
      const managers = await prisma.user.findMany({
        where: { role: { in: ["ADMIN", "MANAGER"] }, id: { not: session?.user.id } },
      });
      for (const m of managers) {
        await notify(m.id, "TASK_STATUS_CHANGED", "Task ready for review", `${task.title} — ${task.project.name}`, `/tasks/${id}`);
      }
    }

    const statusEmoji: Record<string, string> = { TODO: "📋", IN_PROGRESS: "🚧", REVIEW: "👀", DONE: "✅" };
    await postBotMessage(
      `${statusEmoji[status] ?? "📋"} **${task.title}** (${task.project.name}) moved to *${status.replace("_", " ")}* by ${session?.user.name ?? "someone"}`
    );
  } catch (err: any) {
    if (err?.code !== "P2025") throw err; // P2025 = record not found; safe to ignore (stale UI)
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/my-tasks");
}

export async function updateTask(id: string, projectId: string, formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  if (!title) return;

  const dueDateRaw = String(formData.get("dueDate") || "");

  await prisma.task.update({
    where: { id },
    data: {
      title,
      description: String(formData.get("description") || "") || null,
      priority: (String(formData.get("priority") || "MEDIUM")) as any,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
      figmaLink: String(formData.get("figmaLink") || "") || null,
      referenceUrl: String(formData.get("referenceUrl") || "") || null,
      isHourly: formData.get("isHourly") === "on",
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/my-tasks");
  revalidatePath("/tasks");
}

export async function updateTaskAssignee(id: string, assigneeId: string) {
  const session = await getServerSession(authOptions);

  try {
    const task = await prisma.task.update({
      where: { id },
      data: { assigneeId: assigneeId || null },
      include: { project: true },
    });

    if (task.assigneeId && task.assigneeId !== session?.user.id) {
      await notify(
        task.assigneeId,
        "TASK_ASSIGNED",
        "New task assigned to you",
        `${task.title} — ${task.project.name}`,
        `/tasks/${id}`
      );
    }

    revalidatePath(`/projects/${task.projectId}`);
  } catch (err: any) {
    if (err?.code !== "P2025") throw err;
  }
  revalidatePath("/tasks");
  revalidatePath(`/tasks/${id}`);
  revalidatePath("/my-tasks");
}

export async function deleteTask(id: string, projectId: string) {
  try {
    await prisma.task.delete({ where: { id } });
  } catch (err: any) {
    if (err?.code !== "P2025") throw err;
  }
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/my-tasks");
}

export async function postTaskComment(taskId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const content = String(formData.get("content") || "").trim();
  if (!content) return;

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });

  await prisma.taskComment.create({
    data: { taskId, content, userId: session.user.id },
  });

  await notifyTaskDiscussion(task, session.user.id, session.user.name ?? "Someone", content, taskId);

  await pusherTrigger(`task-${taskId}`, "update");
  revalidatePath(`/tasks/${taskId}`);
}

// Shared by both plain comments and file-attached comments: pings the
// assignee, every admin/manager, and anyone specifically @mentioned.
async function notifyTaskDiscussion(
  task: { title: string; assigneeId: string | null; project: { name: string } } | null,
  senderId: string,
  senderName: string,
  content: string,
  taskId: string
) {
  if (!task) return;

  const [assignee, managers] = await Promise.all([
    task.assigneeId && task.assigneeId !== senderId
      ? prisma.user.findUnique({ where: { id: task.assigneeId } })
      : Promise.resolve(null),
    prisma.user.findMany({ where: { role: { in: ["ADMIN", "MANAGER"] }, id: { not: senderId } } }),
  ]);

  if (assignee) {
    await notify(assignee.id, "TASK_COMMENT", `${senderName} commented on a task`, content, `/tasks/${taskId}`);
  }

  const managersToNotify = managers.filter((m) => m.id !== assignee?.id);
  await Promise.all(
    managersToNotify.map((m) =>
      notify(
        m.id,
        "TASK_COMMENT",
        `New task discussion: ${task.title}`,
        `${senderName} — ${task.project.name}: ${content}`,
        `/tasks/${taskId}`
      )
    )
  );

  const allRelevant = [
    ...(assignee ? [{ id: assignee.id, name: assignee.name }] : []),
    ...managers.map((m) => ({ id: m.id, name: m.name })),
  ];
  const mentionedIds = extractMentionedUserIds(content, allRelevant);
  await Promise.all(
    mentionedIds.map((id) => notify(id, "TASK_COMMENT", `${senderName} mentioned you`, content, `/tasks/${taskId}`))
  );
}

export async function attachFileToTaskComment(taskId: string, formData: FormData) {
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

  await prisma.taskComment.create({
    data: { taskId, content: caption, userId: session.user.id, fileId: file.id },
  });

  const task = await prisma.task.findUnique({ where: { id: taskId }, include: { project: true } });
  await notifyTaskDiscussion(task, session.user.id, session.user.name ?? "Someone", caption || `Shared a file: ${name}`, taskId);

  await pusherTrigger(`task-${taskId}`, "update");
  revalidatePath(`/tasks/${taskId}`);
}

export async function editTaskComment(commentId: string, taskId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const content = String(formData.get("content") || "").trim();
  if (!content) return;

  await prisma.taskComment.updateMany({
    where: { id: commentId, userId: session.user.id },
    data: { content },
  });

  await pusherTrigger(`task-${taskId}`, "update");
  revalidatePath(`/tasks/${taskId}`);
}

export async function deleteTaskComment(commentId: string, taskId: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.taskComment.deleteMany({ where: { id: commentId, userId: session.user.id } });

  await pusherTrigger(`task-${taskId}`, "update");
  revalidatePath(`/tasks/${taskId}`);
}

export async function toggleTaskCommentReaction(commentId: string, taskId: string, emoji: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const existing = await prisma.taskCommentReaction.findUnique({
    where: { commentId_userId_emoji: { commentId, userId: session.user.id, emoji } },
  });

  if (existing) {
    await prisma.taskCommentReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.taskCommentReaction.create({ data: { commentId, userId: session.user.id, emoji } });
  }

  await pusherTrigger(`task-${taskId}`, "update");
  revalidatePath(`/tasks/${taskId}`);
}

export async function generateAndShareMeetLinkForTask(taskId: string): Promise<{ error: string | null }> {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Not signed in" };

  try {
    const link = await createGoogleMeetLink("Task discussion");
    await prisma.taskComment.create({
      data: { taskId, content: `📹 Join Google Meet: ${link}`, userId: session.user.id },
    });
    await pusherTrigger(`task-${taskId}`, "update");
    revalidatePath(`/tasks/${taskId}`);
    return { error: null };
  } catch (err: any) {
    console.error("Task Meet link generation failed:", err);
    return { error: err.message || "Couldn't generate a Meet link." };
  }
}

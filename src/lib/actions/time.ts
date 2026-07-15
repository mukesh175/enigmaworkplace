"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function logTime(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const projectId = String(formData.get("projectId") || "");
  const hours = Number(String(formData.get("hours") || "0"));
  const dateRaw = String(formData.get("date") || "");
  if (!projectId || !hours) return;

  await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      projectId,
      taskId: String(formData.get("taskId") || "") || null,
      minutes: Math.round(hours * 60),
      note: String(formData.get("note") || "") || null,
      date: dateRaw ? new Date(dateRaw) : new Date(),
    },
  });

  revalidatePath("/time");
}

export async function deleteTimeEntry(id: string) {
  await prisma.timeEntry.delete({ where: { id } });
  revalidatePath("/time");
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function requestLeave(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const startDate = String(formData.get("startDate") || "");
  const endDate = String(formData.get("endDate") || "");
  if (!startDate || !endDate) return;

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: String(formData.get("reason") || "") || null,
    },
  });

  const approvers = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "MANAGER"] } } });
  for (const a of approvers) {
    await notify(
      a.id,
      "LEAVE_REQUEST",
      `${session.user.name} requested leave`,
      `${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}`,
      `/leaves`
    );
  }

  revalidatePath("/leaves");
}

export async function reviewLeave(id: string, status: "APPROVED" | "REJECTED") {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN" && session?.user.role !== "MANAGER") return;

  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: { status, reviewedById: session.user.id },
  });

  await notify(
    leave.userId,
    "LEAVE_REQUEST",
    `Leave request ${status === "APPROVED" ? "approved" : "rejected"}`,
    `${new Date(leave.startDate).toLocaleDateString()} – ${new Date(leave.endDate).toLocaleDateString()}`,
    `/leaves`
  );

  revalidatePath("/leaves");
}

export async function cancelLeave(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.leaveRequest.deleteMany({
    where: { id, userId: session.user.id, status: "PENDING" },
  });

  revalidatePath("/leaves");
}

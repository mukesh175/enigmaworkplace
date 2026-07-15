"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addUserToAnnouncementChannel } from "@/lib/bot";

const COLORS = ["#E8A33D", "#4ADE80", "#60A5FA", "#F472B6", "#A78BFA", "#FB923C"];

export async function inviteTeamMember(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!name || !email || !password) return;

  const hashed = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: (String(formData.get("role") || "MEMBER")) as any,
      title: String(formData.get("title") || "") || null,
      avatarColor: COLORS[Math.floor(Math.random() * COLORS.length)],
    },
  });

  await addUserToAnnouncementChannel(newUser.id);

  revalidatePath("/team");
}

export async function updateTeamMember(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!name || !email) return;

  const password = String(formData.get("password") || "");

  await prisma.user.update({
    where: { id },
    data: {
      name,
      email,
      title: String(formData.get("title") || "") || null,
      role: (String(formData.get("role") || "MEMBER")) as any,
      ...(password ? { password: await bcrypt.hash(password, 10) } : {}),
    },
  });

  revalidatePath("/team");
}

export async function deleteTeamMember(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;
  if (session.user.id === id) return; // can't delete yourself

  await prisma.user.delete({ where: { id } });
  revalidatePath("/team");
}

export async function markAttendance(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "PRESENT");
  if (!userId) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.attendance.upsert({
    where: { userId_date: { userId, date: today } },
    update: { status: status as any },
    create: { userId, date: today, status: status as any },
  });

  revalidatePath("/team");
}

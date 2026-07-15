"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createNote() {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.note.create({ data: { userId: session.user.id, content: "" } });
  revalidatePath("/notes");
}

export async function updateNoteContent(id: string, content: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.note.updateMany({ where: { id, userId: session.user.id }, data: { content } });
  revalidatePath("/notes");
}

export async function updateNoteColor(id: string, color: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.note.updateMany({ where: { id, userId: session.user.id }, data: { color } });
  revalidatePath("/notes");
}

export async function toggleNotePin(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const note = await prisma.note.findFirst({ where: { id, userId: session.user.id } });
  if (!note) return;

  await prisma.note.update({ where: { id }, data: { pinned: !note.pinned } });
  revalidatePath("/notes");
}

export async function toggleNoteShared(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  const note = await prisma.note.findFirst({ where: { id, userId: session.user.id } });
  if (!note) return;

  await prisma.note.update({ where: { id }, data: { shared: !note.shared } });
  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  const session = await getServerSession(authOptions);
  if (!session) return;

  await prisma.note.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/notes");
}

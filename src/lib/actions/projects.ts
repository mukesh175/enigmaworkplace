"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const budgetRaw = String(formData.get("budget") || "");
  const startDateRaw = String(formData.get("startDate") || "");
  const dueDateRaw = String(formData.get("dueDate") || "");

  await prisma.project.create({
    data: {
      name,
      description: String(formData.get("description") || "") || null,
      clientId: String(formData.get("clientId") || "") || null,
      budget: budgetRaw ? Number(budgetRaw) : null,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });

  revalidatePath("/projects");
}

export async function updateProject(id: string, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const budgetRaw = String(formData.get("budget") || "");
  const startDateRaw = String(formData.get("startDate") || "");
  const dueDateRaw = String(formData.get("dueDate") || "");

  await prisma.project.update({
    where: { id },
    data: {
      name,
      description: String(formData.get("description") || "") || null,
      clientId: String(formData.get("clientId") || "") || null,
      status: (String(formData.get("status") || "ACTIVE")) as any,
      budget: budgetRaw ? Number(budgetRaw) : null,
      startDate: startDateRaw ? new Date(startDateRaw) : null,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    },
  });

  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function updateProjectStatus(id: string, status: string) {
  await prisma.project.update({ where: { id }, data: { status: status as any } });
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await prisma.project.delete({ where: { id } });
  revalidatePath("/projects");
  redirect("/projects");
}

"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function createClient(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await prisma.client.create({
    data: {
      name,
      company: String(formData.get("company") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      gstNumber: String(formData.get("gstNumber") || "") || null,
      billingAddress: String(formData.get("billingAddress") || "") || null,
    },
  });

  revalidatePath("/clients");
}

export async function updateClient(id: string, formData: FormData) {
  await prisma.client.update({
    where: { id },
    data: {
      name: String(formData.get("name") || ""),
      company: String(formData.get("company") || "") || null,
      email: String(formData.get("email") || "") || null,
      phone: String(formData.get("phone") || "") || null,
      notes: String(formData.get("notes") || "") || null,
      gstNumber: String(formData.get("gstNumber") || "") || null,
      billingAddress: String(formData.get("billingAddress") || "") || null,
    },
  });
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function deleteClient(id: string) {
  await prisma.client.delete({ where: { id } });
  revalidatePath("/clients");
  redirect("/clients");
}

export async function addClientAdAccount(clientId: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") return;

  const platform = String(formData.get("platform") || "GOOGLE_ADS") as "GOOGLE_ADS" | "META";
  const label = String(formData.get("label") || "").trim();
  const accountId = String(formData.get("accountId") || "").replace(/\s+/g, "").trim();
  if (!label || !accountId) return;

  await prisma.clientAdAccount.create({
    data: { clientId, platform, label, accountId },
  });

  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientAdAccount(id: string, clientId: string) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") return;

  await prisma.clientAdAccount.delete({ where: { id } });
  revalidatePath(`/clients/${clientId}`);
}

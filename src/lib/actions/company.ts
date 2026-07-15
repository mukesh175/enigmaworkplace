"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getCompanyProfile() {
  const existing = await prisma.companyProfile.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return prisma.companyProfile.create({ data: { id: "singleton" } });
}

export async function updateCompanyProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.companyProfile.upsert({
    where: { id: "singleton" },
    update: {
      name: String(formData.get("name") || ""),
      legalName: String(formData.get("legalName") || ""),
      addressLines: String(formData.get("addressLines") || ""),
      gstin: String(formData.get("gstin") || ""),
      pan: String(formData.get("pan") || ""),
      bankAccountName: String(formData.get("bankAccountName") || ""),
      bankAccountType: String(formData.get("bankAccountType") || ""),
      bankBranch: String(formData.get("bankBranch") || ""),
      bankName: String(formData.get("bankName") || ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") || ""),
      bankIfsc: String(formData.get("bankIfsc") || ""),
    },
    create: {
      id: "singleton",
      name: String(formData.get("name") || ""),
      legalName: String(formData.get("legalName") || ""),
      addressLines: String(formData.get("addressLines") || ""),
      gstin: String(formData.get("gstin") || ""),
      pan: String(formData.get("pan") || ""),
      bankAccountName: String(formData.get("bankAccountName") || ""),
      bankAccountType: String(formData.get("bankAccountType") || ""),
      bankBranch: String(formData.get("bankBranch") || ""),
      bankName: String(formData.get("bankName") || ""),
      bankAccountNumber: String(formData.get("bankAccountNumber") || ""),
      bankIfsc: String(formData.get("bankIfsc") || ""),
    },
  });

  revalidatePath("/settings");
  revalidatePath("/invoices");
}

export async function updateInvoiceNumbering(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  const nextProformaNumber = Math.max(1, Number(formData.get("nextProformaNumber") || 1));
  const proformaNumberDigits = Math.min(10, Math.max(1, Number(formData.get("proformaNumberDigits") || 4)));
  const nextTaxNumber = Math.max(1, Number(formData.get("nextTaxNumber") || 1));
  const taxNumberDigits = Math.min(10, Math.max(1, Number(formData.get("taxNumberDigits") || 4)));

  await prisma.companyProfile.upsert({
    where: { id: "singleton" },
    update: { nextProformaNumber, proformaNumberDigits, nextTaxNumber, taxNumberDigits },
    create: { id: "singleton", nextProformaNumber, proformaNumberDigits, nextTaxNumber, taxNumberDigits },
  });

  revalidatePath("/settings");
  revalidatePath("/invoices");
}

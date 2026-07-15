"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notify } from "@/lib/notify";

export async function createPayslip(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  const userId = String(formData.get("userId") || "");
  const periodLabel = String(formData.get("periodLabel") || "").trim();
  const periodStart = String(formData.get("periodStart") || "");
  const periodEnd = String(formData.get("periodEnd") || "");
  if (!userId || !periodLabel || !periodStart || !periodEnd) return;

  const basicPay = Number(formData.get("basicPay") || 0);
  const allowances = Number(formData.get("allowances") || 0);
  const deductions = Number(formData.get("deductions") || 0);
  const tax = Number(formData.get("tax") || 0);
  const netPay = basicPay + allowances - deductions - tax;

  const payslip = await prisma.payslip.create({
    data: {
      userId,
      periodLabel,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      basicPay,
      allowances,
      deductions,
      tax,
      netPay,
      notes: String(formData.get("notes") || "") || null,
    },
  });

  await notify(userId, "PAYSLIP", `Payslip ready — ${periodLabel}`, `Net pay: ₹${netPay.toFixed(2)}`, `/payslips/${payslip.id}`);

  revalidatePath("/payslips");
}

export async function updatePayslip(id: string, formData: FormData) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  const periodLabel = String(formData.get("periodLabel") || "").trim();
  const periodStart = String(formData.get("periodStart") || "");
  const periodEnd = String(formData.get("periodEnd") || "");
  if (!periodLabel || !periodStart || !periodEnd) return;

  const basicPay = Number(formData.get("basicPay") || 0);
  const allowances = Number(formData.get("allowances") || 0);
  const deductions = Number(formData.get("deductions") || 0);
  const tax = Number(formData.get("tax") || 0);
  const netPay = basicPay + allowances - deductions - tax;

  await prisma.payslip.update({
    where: { id },
    data: {
      periodLabel,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      basicPay,
      allowances,
      deductions,
      tax,
      netPay,
      notes: String(formData.get("notes") || "") || null,
    },
  });

  revalidatePath("/payslips");
  revalidatePath(`/payslips/${id}`);
  redirect(`/payslips/${id}`);
}

export async function deletePayslip(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.payslip.delete({ where: { id } });
  revalidatePath("/payslips");
  redirect("/payslips");
}

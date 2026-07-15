"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getCompanyProfile } from "@/lib/actions/company";

function computeBaseAmount(
  items: { quantity: number; rate: number }[],
  feePercent: number,
  retainerAmount: number
) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const fee = retainerAmount > 0 ? retainerAmount : subtotal * (feePercent / 100);
  return subtotal + fee;
}

export async function createInvoice(formData: FormData) {
  const clientId = String(formData.get("clientId") || "");
  if (!clientId) return;

  const type = String(formData.get("type") || "PROFORMA") as "PROFORMA" | "TAX";

  const descriptions = formData.getAll("itemDescription") as string[];
  const hsnCodes = formData.getAll("itemHsn") as string[];
  const quantities = formData.getAll("itemQuantity") as string[];
  const rates = formData.getAll("itemRate") as string[];

  const items = descriptions
    .map((description, i) => ({
      description,
      hsnSac: hsnCodes[i] || null,
      quantity: Number(quantities[i] || 1),
      rate: Number(rates[i] || 0),
    }))
    .filter((item) => item.description.trim().length > 0);

  const dueDateRaw = String(formData.get("dueDate") || "");
  const managementFeePercent = Number(formData.get("managementFeePercent") || 0);
  const retainerAmount = Number(formData.get("retainerAmount") || 0);
  const taxPercent = Number(formData.get("taxPercent") || 18);

  // Guard against the two ways this form was silently producing junk invoices:
  // no due date, and an amount of ₹0 (every line item left at the placeholder
  // rate of 0, with no retainer set either).
  if (!dueDateRaw) {
    redirect(`/invoices?invoiceError=${encodeURIComponent("Due date is required.")}`);
  }
  const baseAmount = computeBaseAmount(items.length ? items : [{ quantity: 1, rate: 0 }], managementFeePercent, retainerAmount);
  if (baseAmount <= 0) {
    redirect(
      `/invoices?invoiceError=${encodeURIComponent(
        "Invoice amount can't be ₹0 — add a line item rate greater than 0 or set a retainer amount."
      )}`
    );
  }

  // Numbering runs off a per-type counter on CompanyProfile so the sequence
  // (and its starting point / zero-padding width) is explicit and
  // admin-configurable, rather than derived from however many invoices of
  // that type happen to already exist.
  const company = await getCompanyProfile();
  const isProforma = type === "PROFORMA";
  const seq = isProforma ? company.nextProformaNumber : company.nextTaxNumber;
  const digits = isProforma ? company.proformaNumberDigits : company.taxNumberDigits;
  const prefix = isProforma ? "PI-INV" : "INV";
  const number = `${prefix}-${String(seq).padStart(digits, "0")}`;

  await prisma.$transaction([
    prisma.companyProfile.update({
      where: { id: "singleton" },
      data: isProforma ? { nextProformaNumber: seq + 1 } : { nextTaxNumber: seq + 1 },
    }),
    prisma.invoice.create({
      data: {
        number,
        type: type as any,
        clientId,
        projectId: String(formData.get("projectId") || "") || null,
        dueDate: new Date(dueDateRaw),
        notes: String(formData.get("notes") || "") || null,
        managementFeePercent,
        retainerAmount,
        taxPercent,
        items: { create: items.length ? items : [{ description: "Services rendered", quantity: 1, rate: 0 }] },
      },
    }),
  ]);

  revalidatePath("/invoices");
  redirect("/invoices?invoiceCreated=1");
}

export async function updateInvoice(id: string, formData: FormData) {
  const clientId = String(formData.get("clientId") || "");
  if (!clientId) return;

  const descriptions = formData.getAll("itemDescription") as string[];
  const hsnCodes = formData.getAll("itemHsn") as string[];
  const quantities = formData.getAll("itemQuantity") as string[];
  const rates = formData.getAll("itemRate") as string[];

  const items = descriptions
    .map((description, i) => ({
      description,
      hsnSac: hsnCodes[i] || null,
      quantity: Number(quantities[i] || 1),
      rate: Number(rates[i] || 0),
    }))
    .filter((item) => item.description.trim().length > 0);

  const dueDateRaw = String(formData.get("dueDate") || "");
  const managementFeePercent = Number(formData.get("managementFeePercent") || 0);
  const retainerAmount = Number(formData.get("retainerAmount") || 0);
  const taxPercent = Number(formData.get("taxPercent") || 18);

  if (!dueDateRaw) {
    redirect(`/invoices/${id}/edit?invoiceError=${encodeURIComponent("Due date is required.")}`);
  }
  const baseAmount = computeBaseAmount(items.length ? items : [{ quantity: 1, rate: 0 }], managementFeePercent, retainerAmount);
  if (baseAmount <= 0) {
    redirect(
      `/invoices/${id}/edit?invoiceError=${encodeURIComponent(
        "Invoice amount can't be ₹0 — add a line item rate greater than 0 or set a retainer amount."
      )}`
    );
  }

  await prisma.$transaction([
    prisma.invoiceItem.deleteMany({ where: { invoiceId: id } }),
    prisma.invoice.update({
      where: { id },
      data: {
        clientId,
        projectId: String(formData.get("projectId") || "") || null,
        dueDate: new Date(dueDateRaw),
        notes: String(formData.get("notes") || "") || null,
        managementFeePercent,
        retainerAmount,
        taxPercent,
        items: { create: items.length ? items : [{ description: "Services rendered", quantity: 1, rate: 0 }] },
      },
    }),
  ]);

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}`);
}

export async function updateInvoiceStatus(id: string, status: string) {
  await prisma.invoice.update({ where: { id }, data: { status: status as any } });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
}

export async function deleteInvoice(id: string) {
  await prisma.invoice.delete({ where: { id } });
  revalidatePath("/invoices");
  redirect("/invoices");
}

// One-time cleanup: wipes every invoice (and its line items, via cascade) and
// resets both numbering counters back to the agreed starting points —
// PI-INV-000082 for proforma, INV-0072 for tax — so the very next invoice
// created of each type picks up exactly there.
export async function deleteAllInvoicesAndResetNumbering() {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") return;

  await prisma.$transaction([
    prisma.invoice.deleteMany({}),
    prisma.companyProfile.upsert({
      where: { id: "singleton" },
      update: { nextProformaNumber: 82, proformaNumberDigits: 6, nextTaxNumber: 72, taxNumberDigits: 4 },
      create: { id: "singleton", nextProformaNumber: 82, proformaNumberDigits: 6, nextTaxNumber: 72, taxNumberDigits: 4 },
    }),
  ]);

  revalidatePath("/invoices");
  revalidatePath("/settings");
  redirect("/invoices?invoicesReset=1");
}

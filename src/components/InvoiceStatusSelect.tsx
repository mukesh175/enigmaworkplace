"use client";

import { useTransition } from "react";
import { updateInvoiceStatus } from "@/lib/actions/invoices";

const STATUSES = ["DRAFT", "SENT", "PAID", "OVERDUE"];

export default function InvoiceStatusSelect({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateInvoiceStatus(invoiceId, e.target.value))}
      className="input text-xs py-1.5"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

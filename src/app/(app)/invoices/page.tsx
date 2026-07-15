import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createInvoice, deleteAllInvoicesAndResetNumbering } from "@/lib/actions/invoices";
import SubmitButton from "@/components/SubmitButton";
import ConfirmSubmitButton from "@/components/ConfirmSubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";
import InvoiceLineItems from "@/components/InvoiceLineItems";

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "text-base-400 border-base-600",
  SENT: "text-warn border-warn/40",
  PAID: "text-ok border-ok/40",
  OVERDUE: "text-danger border-danger/40",
};

function computeTotal(items: { quantity: number; rate: number }[], feePercent: number, retainerAmount: number, taxPercent: number) {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const fee = retainerAmount > 0 ? retainerAmount : subtotal * (feePercent / 100);
  const taxable = subtotal + fee;
  const tax = taxable * (taxPercent / 100);
  return taxable + tax;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { invoiceError?: string; invoiceCreated?: string; invoicesReset?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") redirect("/my-tasks");

  const [invoices, clients, projects] = await Promise.all([
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, items: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Invoices</h1>
        <div className="flex items-center gap-2">
          {session?.user.role === "ADMIN" && (
            <form action={deleteAllInvoicesAndResetNumbering}>
              <ConfirmSubmitButton
                idleLabel="Delete all invoices"
                pendingLabel="Deleting…"
                confirmMessage={
                  "This permanently deletes every invoice (proforma and tax) and resets numbering to start at PI-INV-000082 and INV-0072. This can't be undone. Continue?"
                }
                className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger"
              />
            </form>
          )}
          <ExportExcelButton
            data={invoices.map((inv) => ({
              Number: inv.number,
              Type: inv.type,
              Client: inv.client.name,
              Issued: new Date(inv.issueDate).toLocaleDateString(),
              Total: computeTotal(inv.items, inv.managementFeePercent, inv.retainerAmount, inv.taxPercent),
              Status: inv.status,
            }))}
            filename="invoices.xlsx"
          />
        </div>
      </div>
      <p className="text-base-400 text-sm mb-3">Proforma and tax invoices, billed automatically with GST.</p>
      {searchParams.invoicesReset && (
        <p className="text-ok text-sm mb-3">
          ✓ All invoices deleted. Numbering reset — next proforma will be PI-INV-000082, next tax invoice INV-0072.
        </p>
      )}

      <details className="card p-5 mb-6 group" open={!!searchParams.invoiceError || !!searchParams.invoiceCreated}>
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> New invoice
        </summary>
        {searchParams.invoiceError && (
          <p className="text-danger text-sm mt-4 card p-3 border-danger/40">{searchParams.invoiceError}</p>
        )}
        <form action={createInvoice} className="space-y-4 mt-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Invoice type</label>
              <select name="type" className="input" required>
                <option value="PROFORMA">Proforma invoice</option>
                <option value="TAX">Tax invoice</option>
              </select>
            </div>
            <div>
              <label className="label">Client</label>
              <select name="clientId" className="input" required>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Project (optional)</label>
              <select name="projectId" className="input">
                <option value="">—</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Due date</label>
              <input name="dueDate" type="date" className="input" required />
            </div>
          </div>

          <div>
            <label className="label mb-2">Particulars</label>
            <InvoiceLineItems />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Management fee %</label>
              <input name="managementFeePercent" type="number" step="0.01" defaultValue={0} className="input" />
              <p className="text-xs text-base-500 mt-1">Use this OR retainer amount, not both.</p>
            </div>
            <div>
              <label className="label">Retainer amount (fixed ₹)</label>
              <input name="retainerAmount" type="number" step="0.01" defaultValue={0} className="input" />
              <p className="text-xs text-base-500 mt-1">If set, this is used instead of the % fee.</p>
            </div>
            <div>
              <label className="label">GST % (split evenly as CGST + SGST)</label>
              <input name="taxPercent" type="number" step="0.01" defaultValue={18} className="input" />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea name="notes" className="input" rows={2} />
          </div>

          <SubmitButton idleLabel="Create invoice" pendingLabel="Creating…" />
          {searchParams.invoiceCreated && (
            <p className="text-ok text-sm">✓ Invoice created successfully.</p>
          )}
        </form>
      </details>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-5 py-3 font-normal">Number</th>
              <th className="px-5 py-3 font-normal">Type</th>
              <th className="px-5 py-3 font-normal">Client</th>
              <th className="px-5 py-3 font-normal">Issued</th>
              <th className="px-5 py-3 font-normal">Total</th>
              <th className="px-5 py-3 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const total = computeTotal(inv.items, inv.managementFeePercent, inv.retainerAmount, inv.taxPercent);
              return (
                <tr key={inv.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                  <td className="px-5 py-3 font-mono">
                    <Link href={`/invoices/${inv.id}`} className="hover:text-signal">{inv.number}</Link>
                  </td>
                  <td className="px-5 py-3 text-base-400 text-xs">{inv.type === "PROFORMA" ? "Proforma" : "Tax"}</td>
                  <td className="px-5 py-3">{inv.client.name}</td>
                  <td className="px-5 py-3 text-base-400 text-xs">{new Date(inv.issueDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3 font-mono">₹{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-5 py-3">
                    <span className={`pill ${STATUS_COLOR[inv.status]}`}>{inv.status}</span>
                  </td>
                </tr>
              );
            })}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-base-500">No invoices yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

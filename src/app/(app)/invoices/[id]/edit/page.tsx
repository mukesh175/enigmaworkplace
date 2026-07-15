import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateInvoice } from "@/lib/actions/invoices";
import SubmitButton from "@/components/SubmitButton";
import InvoiceLineItems from "@/components/InvoiceLineItems";

export default async function EditInvoicePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { invoiceError?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "MEMBER") redirect(session ? "/my-tasks" : "/login");

  const [invoice, clients, projects] = await Promise.all([
    prisma.invoice.findUnique({ where: { id: params.id }, include: { items: true } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();

  const updateWithId = updateInvoice.bind(null, invoice.id);

  return (
    <div className="max-w-2xl">
      <Link href={`/invoices/${invoice.id}`} className="text-base-400 text-sm hover:text-signal">← Back to invoice</Link>
      <h1 className="font-display text-2xl mt-2 mb-6">Edit {invoice.number}</h1>

      {searchParams.invoiceError && (
        <p className="text-danger text-sm mb-4 card p-3 border-danger/40">{searchParams.invoiceError}</p>
      )}

      <form action={updateWithId} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Client</label>
            <select name="clientId" className="input" defaultValue={invoice.clientId} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Project (optional)</label>
            <select name="projectId" className="input" defaultValue={invoice.projectId ?? ""}>
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              name="dueDate"
              type="date"
              className="input"
              required
              defaultValue={invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : ""}
            />
          </div>
        </div>

        <div>
          <label className="label mb-2">Particulars</label>
          <InvoiceLineItems
            initialItems={invoice.items.map((it) => ({
              description: it.description,
              hsnSac: it.hsnSac ?? "",
              quantity: it.quantity,
              rate: it.rate,
            }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Management fee %</label>
            <input name="managementFeePercent" type="number" step="0.01" defaultValue={invoice.managementFeePercent} className="input" />
            <p className="text-xs text-base-500 mt-1">Use this OR retainer amount, not both.</p>
          </div>
          <div>
            <label className="label">Retainer amount (fixed ₹)</label>
            <input name="retainerAmount" type="number" step="0.01" defaultValue={invoice.retainerAmount} className="input" />
            <p className="text-xs text-base-500 mt-1">If set, this is used instead of the % fee.</p>
          </div>
          <div>
            <label className="label">GST % (split evenly as CGST + SGST)</label>
            <input name="taxPercent" type="number" step="0.01" defaultValue={invoice.taxPercent} className="input" />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea name="notes" defaultValue={invoice.notes ?? ""} className="input" rows={2} />
        </div>

        <SubmitButton idleLabel="Save changes" pendingLabel="Saving…" />
      </form>
    </div>
  );
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteInvoice } from "@/lib/actions/invoices";
import { getCompanyProfile } from "@/lib/actions/company";
import { amountInWordsINR } from "@/lib/numberToWords";
import InvoiceStatusSelect from "@/components/InvoiceStatusSelect";
import SubmitButton from "@/components/SubmitButton";
import PrintButton from "@/components/PrintButton";

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") redirect("/my-tasks");

  const [invoice, company] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id: params.id },
      include: { client: true, project: true, items: true },
    }),
    getCompanyProfile(),
  ]);
  if (!invoice) notFound();

  const subtotal = invoice.items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const feeAmount = invoice.retainerAmount > 0 ? invoice.retainerAmount : subtotal * (invoice.managementFeePercent / 100);
  const feeLabel = invoice.retainerAmount > 0 ? "Retainer Fee" : `Management Fees`;
  const taxable = subtotal + feeAmount;
  const halfTax = invoice.taxPercent / 2;
  const cgst = taxable * (halfTax / 100);
  const sgst = taxable * (halfTax / 100);
  const total = taxable + cgst + sgst;

  const deleteWithId = deleteInvoice.bind(null, invoice.id);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="text-base-400 text-sm hover:text-signal">← Invoices</Link>
          <Link href={`/invoices/${invoice.id}/edit`} className="text-signal text-sm hover:underline">Edit invoice</Link>
        </div>
        <div className="flex items-center gap-3">
          <InvoiceStatusSelect invoiceId={invoice.id} status={invoice.status} />
          <PrintButton label="Download / Print" />
        </div>
      </div>

      {/* Print-styled document — intentionally light-on-dark to match a real invoice */}
      <div className="bg-white text-black rounded-sm shadow-lg overflow-hidden">
        <div className="border-b-2 border-black text-center px-8 py-6">
          <h1 className="text-2xl underline font-serif tracking-wide">{company.name}</h1>
          <p className="text-xs mt-2 font-medium">{company.legalName}</p>
          {company.addressLines.split("\n").map((line, i) => (
            <p key={i} className="text-xs text-gray-700">{line}</p>
          ))}
          <p className="text-xs mt-1.5 text-gray-700">GSTIN - {company.gstin} &nbsp;/&nbsp; PAN - {company.pan}</p>
          <p className="text-sm font-bold mt-3 tracking-wider">
            {invoice.type === "PROFORMA" ? "PROFORMA INVOICE" : "TAX INVOICE"}
          </p>
        </div>

        <div className="flex justify-between px-8 py-3 border-b border-gray-300 text-xs bg-gray-50">
          <span className="text-gray-600">
            Date: <span className="text-black font-medium">{new Date(invoice.issueDate).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}</span>
          </span>
          <span className="font-bold">{invoice.number}</span>
        </div>

        <div className="px-8 py-5 border-b border-gray-300 text-xs leading-relaxed">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">Billed to</p>
          <p className="font-bold text-sm">{invoice.client.name}</p>
          {invoice.client.billingAddress?.split("\n").map((line, i) => (
            <p key={i} className="text-gray-700">{line}</p>
          ))}
          {invoice.client.gstNumber && <p className="text-gray-700 mt-1">GST Number: {invoice.client.gstNumber}</p>}
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-black bg-gray-50">
              <th className="text-left px-4 py-2.5 font-bold">Particulars</th>
              <th className="text-left px-4 py-2.5 font-bold">HSN/SAC</th>
              <th className="text-right px-4 py-2.5 font-bold w-16">Rate</th>
              <th className="text-right px-4 py-2.5 font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-200">
                <td className="px-4 py-2.5">{it.description}</td>
                <td className="px-4 py-2.5 text-gray-600">{it.hsnSac ?? "—"}</td>
                <td className="px-4 py-2.5 text-right text-gray-600"></td>
                <td className="px-4 py-2.5 text-right font-medium">₹{money(it.quantity * it.rate)}</td>
              </tr>
            ))}
            {feeAmount > 0 && (
              <tr className="border-b border-gray-200">
                <td className="px-4 py-2.5">{feeLabel}</td>
                <td className="px-4 py-2.5"></td>
                <td className="px-4 py-2.5 text-right text-gray-600">
                  {invoice.retainerAmount > 0 ? "" : `${invoice.managementFeePercent}%`}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">₹{money(feeAmount)}</td>
              </tr>
            )}
            <tr className="border-b border-gray-200">
              <td className="px-4 py-2.5">CGST</td>
              <td className="px-4 py-2.5"></td>
              <td className="px-4 py-2.5 text-right text-gray-600">{halfTax}%</td>
              <td className="px-4 py-2.5 text-right font-medium">₹{money(cgst)}</td>
            </tr>
            <tr className="border-b-2 border-black">
              <td className="px-4 py-2.5">SGST</td>
              <td className="px-4 py-2.5"></td>
              <td className="px-4 py-2.5 text-right text-gray-600">{halfTax}%</td>
              <td className="px-4 py-2.5 text-right font-medium">₹{money(sgst)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-gray-100">
              <td className="px-4 py-3 font-bold text-sm" colSpan={3}>Total</td>
              <td className="px-4 py-3 text-right font-bold text-sm">₹{money(total)}</td>
            </tr>
          </tfoot>
        </table>
        </div>

        <div className="px-8 py-4 border-b border-gray-300">
          <p className="text-xs italic text-gray-700">({amountInWordsINR(total)})</p>
        </div>

        <div className="px-8 py-5 grid grid-cols-2 gap-8 text-xs leading-relaxed">
          <div>
            <p className="font-bold mb-2 text-[10px] uppercase tracking-wider text-gray-500">Bank Details</p>
            <p><span className="text-gray-500">Account Name:</span> {company.bankAccountName}</p>
            <p><span className="text-gray-500">Account Type:</span> {company.bankAccountType}</p>
            <p><span className="text-gray-500">Bank:</span> {company.bankName}, {company.bankBranch}</p>
            <p><span className="text-gray-500">A/c No:</span> {company.bankAccountNumber}</p>
            <p><span className="text-gray-500">IFSC:</span> {company.bankIfsc}</p>
            <p><span className="text-gray-500">PAN:</span> {company.pan}</p>
            <p><span className="text-gray-500">GSTIN:</span> {company.gstin}</p>
          </div>
          <div className="flex flex-col items-end justify-end text-right">
            <p className="mb-10 font-medium">For {company.name}</p>
            <p className="border-t border-gray-400 pt-1 w-40 text-gray-600">Authorized Signatory</p>
          </div>
        </div>

        {invoice.notes && (
          <div className="px-8 py-4 border-t border-gray-300 text-xs">
            <span className="font-bold text-gray-500">Notes: </span>
            <span className="text-gray-700">{invoice.notes}</span>
          </div>
        )}
      </div>

      <form action={deleteWithId} className="mt-4 print:hidden">
        <SubmitButton idleLabel="Delete invoice" pendingLabel="Deleting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger" />
      </form>
    </div>
  );
}

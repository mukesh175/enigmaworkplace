import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deletePayslip } from "@/lib/actions/payslips";
import PrintButton from "@/components/PrintButton";
import SubmitButton from "@/components/SubmitButton";

export default async function PayslipDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const payslip = await prisma.payslip.findUnique({
    where: { id: params.id },
    include: { user: true },
  });
  if (!payslip) notFound();
  if (session.user.role !== "ADMIN" && payslip.userId !== session.user.id) redirect("/payslips");

  const deleteWithId = deletePayslip.bind(null, payslip.id);

  return (
    <div className="max-w-lg">
      <Link href="/payslips" className="text-base-400 text-sm hover:text-signal">← Payslips</Link>

      <div className="card p-8 mt-4">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display text-xl">{payslip.periodLabel}</h1>
            <p className="text-base-400 text-sm mt-1">
              {new Date(payslip.periodStart).toLocaleDateString()} – {new Date(payslip.periodEnd).toLocaleDateString()}
            </p>
          </div>
          <span className="pill">{payslip.user.name}</span>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full text-sm mb-6">
          <tbody>
            <tr className="border-b border-base-800">
              <td className="py-2 text-base-400">Basic pay</td>
              <td className="py-2 text-right font-mono">₹{payslip.basicPay.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-base-800">
              <td className="py-2 text-base-400">Allowances</td>
              <td className="py-2 text-right font-mono text-ok">+₹{payslip.allowances.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-base-800">
              <td className="py-2 text-base-400">Deductions</td>
              <td className="py-2 text-right font-mono text-danger">-₹{payslip.deductions.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-base-800">
              <td className="py-2 text-base-400">Tax</td>
              <td className="py-2 text-right font-mono text-danger">-₹{payslip.tax.toFixed(2)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="py-3 font-display">Net pay</td>
              <td className="py-3 text-right font-mono text-signal text-lg">₹{payslip.netPay.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
        </div>

        {payslip.notes && (
          <div className="mb-6">
            <div className="label">Notes</div>
            <p className="text-base-300 text-sm">{payslip.notes}</p>
          </div>
        )}

        <div className="flex gap-3 print:hidden">
          <PrintButton />
          {session.user.role === "ADMIN" && (
            <>
              <Link href={`/payslips/${payslip.id}/edit`} className="btn-secondary text-xs">Edit</Link>
              <form action={deleteWithId}>
                <SubmitButton idleLabel="Delete payslip" pendingLabel="Deleting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger" />
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

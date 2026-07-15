import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePayslip } from "@/lib/actions/payslips";
import SubmitButton from "@/components/SubmitButton";

export default async function EditPayslipPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (session?.user.role !== "ADMIN") redirect(session ? "/payslips" : "/login");

  const payslip = await prisma.payslip.findUnique({ where: { id: params.id }, include: { user: true } });
  if (!payslip) notFound();

  const updateWithId = updatePayslip.bind(null, payslip.id);

  return (
    <div className="max-w-lg">
      <Link href={`/payslips/${payslip.id}`} className="text-base-400 text-sm hover:text-signal">← Back to payslip</Link>
      <h1 className="font-display text-2xl mt-2 mb-1">Edit payslip</h1>
      <p className="text-base-400 text-sm mb-6">{payslip.user.name}</p>

      <form action={updateWithId} className="card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="label">Period label</label>
            <input name="periodLabel" defaultValue={payslip.periodLabel} className="input" required />
          </div>
          <div>
            <label className="label">Period start</label>
            <input name="periodStart" type="date" defaultValue={new Date(payslip.periodStart).toISOString().slice(0, 10)} className="input" required />
          </div>
          <div>
            <label className="label">Period end</label>
            <input name="periodEnd" type="date" defaultValue={new Date(payslip.periodEnd).toISOString().slice(0, 10)} className="input" required />
          </div>
          <div>
            <label className="label">Basic pay</label>
            <input name="basicPay" type="number" step="0.01" defaultValue={payslip.basicPay} className="input" required />
          </div>
          <div>
            <label className="label">Allowances</label>
            <input name="allowances" type="number" step="0.01" defaultValue={payslip.allowances} className="input" />
          </div>
          <div>
            <label className="label">Deductions</label>
            <input name="deductions" type="number" step="0.01" defaultValue={payslip.deductions} className="input" />
          </div>
          <div>
            <label className="label">Tax</label>
            <input name="tax" type="number" step="0.01" defaultValue={payslip.tax} className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <input name="notes" defaultValue={payslip.notes ?? ""} className="input" />
          </div>
        </div>
        <SubmitButton idleLabel="Save changes" pendingLabel="Saving…" />
      </form>
    </div>
  );
}

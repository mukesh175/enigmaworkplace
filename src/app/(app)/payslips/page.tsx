import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPayslip } from "@/lib/actions/payslips";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";

export default async function PayslipsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const isAdmin = session.user.role === "ADMIN";

  const [payslips, users] = await Promise.all([
    prisma.payslip.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      orderBy: { periodStart: "desc" },
      include: { user: true },
    }),
    isAdmin ? prisma.user.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Payslips</h1>
        <ExportExcelButton
          data={payslips.map((p) => ({
            "Team member": p.user.name,
            Period: p.periodLabel,
            "Basic pay": p.basicPay,
            Allowances: p.allowances,
            Deductions: p.deductions,
            Tax: p.tax,
            "Net pay": p.netPay,
          }))}
          filename="payslips.xlsx"
        />
      </div>
      <p className="text-base-400 text-sm mb-6">
        {isAdmin ? "Generate and review payslips for the team." : "Your pay history."}
      </p>

      {isAdmin && (
        <details className="card p-5 mb-6 group">
          <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
            <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> Generate payslip
          </summary>
          <form action={createPayslip} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div>
              <label className="label">Team member</label>
              <select name="userId" className="input" required>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Period label</label>
              <input name="periodLabel" placeholder="e.g. July 2026" className="input" required />
            </div>
            <div />
            <div>
              <label className="label">Period start</label>
              <input name="periodStart" type="date" className="input" required />
            </div>
            <div>
              <label className="label">Period end</label>
              <input name="periodEnd" type="date" className="input" required />
            </div>
            <div />
            <div>
              <label className="label">Basic pay</label>
              <input name="basicPay" type="number" step="0.01" className="input" required />
            </div>
            <div>
              <label className="label">Allowances</label>
              <input name="allowances" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
            <div>
              <label className="label">Deductions</label>
              <input name="deductions" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
            <div>
              <label className="label">Tax</label>
              <input name="tax" type="number" step="0.01" defaultValue={0} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Notes</label>
              <input name="notes" className="input" placeholder="Optional" />
            </div>
            <div className="md:col-span-3">
              <SubmitButton idleLabel="Generate payslip" pendingLabel="Generating…" />
            </div>
          </form>
        </details>
      )}

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              {isAdmin && <th className="px-5 py-3 font-normal">Team member</th>}
              <th className="px-5 py-3 font-normal">Period</th>
              <th className="px-5 py-3 font-normal text-right">Net pay</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                {isAdmin && <td className="px-5 py-3">{p.user.name}</td>}
                <td className="px-5 py-3">
                  <Link href={`/payslips/${p.id}`} className="hover:text-signal">{p.periodLabel}</Link>
                </td>
                <td className="px-5 py-3 text-right font-mono">₹{p.netPay.toFixed(2)}</td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 3 : 2} className="px-5 py-8 text-center text-base-500">No payslips yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

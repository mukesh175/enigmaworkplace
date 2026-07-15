import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requestLeave, cancelLeave } from "@/lib/actions/leaves";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";
import LeaveReviewButtons from "@/components/LeaveReviewButtons";

const STATUS_COLOR: Record<string, string> = {
  PENDING: "text-warn border-warn/40",
  APPROVED: "text-ok border-ok/40",
  REJECTED: "text-danger border-danger/40",
};

export default async function LeavesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const canReview = session.user.role === "ADMIN" || session.user.role === "MANAGER";

  const [myLeaves, teamLeaves] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    canReview
      ? prisma.leaveRequest.findMany({
          where: { userId: { not: session.user.id } },
          orderBy: { createdAt: "desc" },
          include: { user: true, reviewedBy: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Leaves</h1>
        {canReview && (
          <ExportExcelButton
            data={teamLeaves.map((l) => ({
              "Team member": l.user.name,
              Start: new Date(l.startDate).toLocaleDateString(),
              End: new Date(l.endDate).toLocaleDateString(),
              Reason: l.reason ?? "",
              Status: l.status,
              "Reviewed by": l.reviewedBy?.name ?? "",
            }))}
            filename="leave-requests.xlsx"
          />
        )}
      </div>
      <p className="text-base-400 text-sm mb-6">Request time off and track approval status.</p>

      <details className="card p-5 mb-6 group" open>
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> Request leave
        </summary>
        <form action={requestLeave} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div>
            <label className="label">Start date</label>
            <input name="startDate" type="date" className="input" required />
          </div>
          <div>
            <label className="label">End date</label>
            <input name="endDate" type="date" className="input" required />
          </div>
          <div>
            <label className="label">Reason</label>
            <input name="reason" className="input" placeholder="Optional" />
          </div>
          <div className="md:col-span-3">
            <SubmitButton idleLabel="Submit request" pendingLabel="Submitting…" />
          </div>
        </form>
      </details>

      <div className="card overflow-hidden overflow-x-auto mb-6">
        <div className="px-5 py-3 border-b border-base-700 text-sm font-display">My requests</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-5 py-3 font-normal">Dates</th>
              <th className="px-5 py-3 font-normal">Reason</th>
              <th className="px-5 py-3 font-normal">Status</th>
              <th className="px-5 py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {myLeaves.map((l) => {
              const cancelWithId = cancelLeave.bind(null, l.id);
              return (
                <tr key={l.id} className="border-b border-base-800 last:border-0">
                  <td className="px-5 py-3 text-xs">
                    {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-base-400">{l.reason ?? "—"}</td>
                  <td className="px-5 py-3"><span className={`pill ${STATUS_COLOR[l.status]}`}>{l.status}</span></td>
                  <td className="px-5 py-3">
                    {l.status === "PENDING" && (
                      <form action={cancelWithId}>
                        <SubmitButton idleLabel="Cancel" pendingLabel="Cancelling…" className="text-xs text-base-500 hover:text-danger bg-transparent" />
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {myLeaves.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-base-500">No leave requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canReview && (
        <div className="card overflow-hidden overflow-x-auto">
          <div className="px-5 py-3 border-b border-base-700 text-sm font-display">Team requests</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
                <th className="px-5 py-3 font-normal">Team member</th>
                <th className="px-5 py-3 font-normal">Dates</th>
                <th className="px-5 py-3 font-normal">Reason</th>
                <th className="px-5 py-3 font-normal">Status</th>
                <th className="px-5 py-3 font-normal">Review</th>
              </tr>
            </thead>
            <tbody>
              {teamLeaves.map((l) => (
                <tr key={l.id} className="border-b border-base-800 last:border-0">
                  <td className="px-5 py-3">{l.user.name}</td>
                  <td className="px-5 py-3 text-xs">
                    {new Date(l.startDate).toLocaleDateString()} – {new Date(l.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3 text-base-400">{l.reason ?? "—"}</td>
                  <td className="px-5 py-3"><span className={`pill ${STATUS_COLOR[l.status]}`}>{l.status}</span></td>
                  <td className="px-5 py-3">
                    {l.status === "PENDING" ? (
                      <LeaveReviewButtons leaveId={l.id} />
                    ) : (
                      <span className="text-xs text-base-500">{l.reviewedBy?.name ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
              {teamLeaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-base-500">No team requests yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

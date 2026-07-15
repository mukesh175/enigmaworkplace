import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logTime, deleteTimeEntry } from "@/lib/actions/time";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";

export default async function TimePage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const [projects, entries] = await Promise.all([
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.timeEntry.findMany({
      where: isAdmin ? {} : { userId: session?.user.id },
      orderBy: { date: "desc" },
      take: 50,
      include: { project: true, task: true, user: true },
    }),
  ]);

  const totalHours = entries.reduce((sum, e) => sum + e.minutes, 0) / 60;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Time</h1>
        <ExportExcelButton
          data={entries.map((e) => ({
            Date: new Date(e.date).toLocaleDateString(),
            "Team member": e.user.name,
            Project: e.project.name,
            Note: e.note ?? "",
            Hours: (e.minutes / 60).toFixed(2),
          }))}
          filename="time-entries.xlsx"
        />
      </div>
      <p className="text-base-400 text-sm mb-6">
        {isAdmin ? "All logged hours across the team." : "Your logged hours."} Total: {totalHours.toFixed(1)}h
      </p>

      <details className="card p-5 mb-6 group" open>
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> Log time
        </summary>
        <form action={logTime} className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
          <div className="md:col-span-2">
            <label className="label">Project</label>
            <select name="projectId" className="input" required>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Hours</label>
            <input name="hours" type="number" step="0.25" min="0.25" className="input" required />
          </div>
          <div>
            <label className="label">Date</label>
            <input name="date" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="md:col-span-4">
            <label className="label">Note</label>
            <input name="note" className="input" placeholder="What did you work on?" />
          </div>
          <div className="md:col-span-4">
            <SubmitButton idleLabel="Log time" pendingLabel="Logging…" />
          </div>
        </form>
      </details>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-5 py-3 font-normal">Date</th>
              {isAdmin && <th className="px-5 py-3 font-normal">Team member</th>}
              <th className="px-5 py-3 font-normal">Project</th>
              <th className="px-5 py-3 font-normal">Note</th>
              <th className="px-5 py-3 font-normal">Hours</th>
              <th className="px-5 py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => {
              const del = deleteTimeEntry.bind(null, e.id);
              return (
                <tr key={e.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                  <td className="px-5 py-3 text-base-400 font-mono text-xs">{new Date(e.date).toLocaleDateString()}</td>
                  {isAdmin && <td className="px-5 py-3">{e.user.name}</td>}
                  <td className="px-5 py-3">{e.project.name}</td>
                  <td className="px-5 py-3 text-base-400">{e.note ?? "—"}</td>
                  <td className="px-5 py-3 font-mono">{(e.minutes / 60).toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <form action={del}>
                      <button type="submit" className="text-base-500 hover:text-danger text-xs">✕</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {entries.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-5 py-8 text-center text-base-500">
                  No time logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

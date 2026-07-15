import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createProject } from "@/lib/actions/projects";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "text-ok border-ok/40",
  ON_HOLD: "text-warn border-warn/40",
  COMPLETED: "text-signal border-signal/40",
  ARCHIVED: "text-base-400 border-base-600",
};

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const [projects, clients] = await Promise.all([
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: true, tasks: true },
    }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Projects</h1>
        <ExportExcelButton
          data={projects.map((p) => ({
            Name: p.name,
            Client: p.client?.name ?? "",
            Status: p.status,
            Budget: p.budget ?? 0,
            Tasks: p.tasks.length,
            "Due date": p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "",
          }))}
          filename="projects.xlsx"
        />
      </div>
      <p className="text-base-400 text-sm mb-6">Everything in flight, organized by client.</p>

      {canManage && (
      <details className="card p-5 mb-6 group">
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> New project
        </summary>
        <form action={createProject} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Client</label>
            <select name="clientId" className="input">
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea name="description" className="input" rows={2} />
          </div>
          <div>
            <label className="label">Budget (INR)</label>
            <input name="budget" type="number" step="0.01" className="input" />
          </div>
          <div>
            <label className="label">Due date</label>
            <input name="dueDate" type="date" className="input" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton idleLabel="Create project" pendingLabel="Creating…" />
          </div>
        </form>
      </details>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const done = p.tasks.filter((t) => t.status === "DONE").length;
          const pct = p.tasks.length ? Math.round((done / p.tasks.length) * 100) : 0;
          return (
            <Link key={p.id} href={`/projects/${p.id}`} className="card p-5 hover:border-signal transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display text-base">{p.name}</h3>
                <span className={`pill ${STATUS_COLOR[p.status]}`}>{p.status.replace("_", " ")}</span>
              </div>
              <p className="text-base-400 text-xs mb-4">{p.client?.name ?? "No client"}</p>
              <div className="w-full h-1.5 bg-base-800 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-signal" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-base-500">{done}/{p.tasks.length} tasks complete</div>
            </Link>
          );
        })}
        {projects.length === 0 && (
          <p className="text-base-500 text-sm col-span-full">No projects yet — create one above.</p>
        )}
      </div>
    </div>
  );
}

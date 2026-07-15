import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteTask } from "@/lib/actions/tasks";
import { deleteProject, updateProject } from "@/lib/actions/projects";
import TaskStatusSelect from "@/components/TaskStatusSelect";
import SubmitButton from "@/components/SubmitButton";
import NewTaskModal from "@/components/NewTaskModal";

const COLUMNS = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "REVIEW", label: "Review" },
  { key: "DONE", label: "Done" },
];

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-base-400 border-base-600",
  MEDIUM: "text-signal border-signal/40",
  HIGH: "text-warn border-warn/40",
  URGENT: "text-danger border-danger/40",
};

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const canManage = session?.user.role === "ADMIN" || session?.user.role === "MANAGER";

  const [project, users, clients] = await Promise.all([
    prisma.project.findUnique({
      where: { id: params.id },
      include: {
        client: true,
        tasks: { include: { assignee: true }, orderBy: { createdAt: "asc" } },
      },
    }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  const deleteWithId = deleteProject.bind(null, project.id);
  const updateWithId = updateProject.bind(null, project.id);

  return (
    <div>
      <Link href="/projects" className="text-base-400 text-sm hover:text-signal">← Projects</Link>
      <div className="flex items-start justify-between mt-2 mb-6">
        <div>
          <h1 className="font-display text-2xl">{project.name}</h1>
          <p className="text-base-400 text-sm mt-1">{project.client?.name ?? "No client"} {project.description ? `· ${project.description}` : ""}</p>
        </div>
        {canManage && (
        <form action={deleteWithId}>
          <SubmitButton idleLabel="Delete project" pendingLabel="Deleting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger" />
        </form>
        )}
      </div>

      {canManage && (
      <details className="card p-5 mb-6 group">
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">✎</span> Edit project details
        </summary>
        <form action={updateWithId} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="label">Name</label>
            <input name="name" defaultValue={project.name} className="input" required />
          </div>
          <div>
            <label className="label">Client</label>
            <select name="clientId" className="input" defaultValue={project.clientId ?? ""}>
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea name="description" defaultValue={project.description ?? ""} className="input" rows={2} />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={project.status}>
              <option value="ACTIVE">Active</option>
              <option value="ON_HOLD">On hold / pending</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div>
            <label className="label">Budget (INR)</label>
            <input name="budget" type="number" step="0.01" defaultValue={project.budget ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Start date</label>
            <input name="startDate" type="date" defaultValue={project.startDate?.toISOString().slice(0, 10) ?? ""} className="input" />
          </div>
          <div>
            <label className="label">Due date</label>
            <input name="dueDate" type="date" defaultValue={project.dueDate?.toISOString().slice(0, 10) ?? ""} className="input" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton idleLabel="Save changes" pendingLabel="Saving…" />
          </div>
        </form>
      </details>
      )}

      {canManage && (
      <div className="mb-6">
        <NewTaskModal
          projects={[{ id: project.id, name: project.name }]}
          users={users.map((u) => ({ id: u.id, name: u.name }))}
          defaultProjectId={project.id}
        />
      </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => {
          const tasks = project.tasks.filter((t) => t.status === col.key);
          return (
            <div key={col.key} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-wider text-base-400">{col.label}</h3>
                <span className="text-xs font-mono text-base-500">{tasks.length}</span>
              </div>
              <div className="space-y-3">
                {tasks.map((t) => {
                  const deleteTaskWithId = deleteTask.bind(null, t.id, project.id);
                  return (
                    <div key={t.id} className="bg-base-800 border border-base-700 rounded-sm p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Link href={`/tasks/${t.id}`} className="text-sm hover:text-signal">{t.title}</Link>
                        <span className={`pill ${PRIORITY_COLOR[t.priority]} shrink-0`}>{t.priority}</span>
                      </div>
                      {t.description && <p className="text-xs text-base-400 mb-2">{t.description}</p>}
                      <div className="flex items-center justify-between text-xs text-base-500 mb-2">
                        <span>{t.assignee?.name ?? "Unassigned"}</span>
                        {t.dueDate && <span>{new Date(t.dueDate).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <TaskStatusSelect taskId={t.id} projectId={project.id} status={t.status} />
                        {canManage && (
                        <form action={deleteTaskWithId}>
                          <button type="submit" className="text-xs text-base-500 hover:text-danger">✕</button>
                        </form>
                        )}
                      </div>
                    </div>
                  );
                })}
                {tasks.length === 0 && <p className="text-xs text-base-600">No tasks</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import TaskStatusSelect from "@/components/TaskStatusSelect";
import AssigneeSelect from "@/components/AssigneeSelect";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";
import NewTaskModal from "@/components/NewTaskModal";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-base-400 border-base-600",
  MEDIUM: "text-signal border-signal/40",
  HIGH: "text-warn border-warn/40",
  URGENT: "text-danger border-danger/40",
};

const BOARD_COLUMNS = [
  { key: "TODO", label: "To do" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "REVIEW", label: "Review" },
  { key: "DONE", label: "Done" },
];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { q?: string; project?: string; assignee?: string; priority?: string; overdue?: string; hideDone?: string; view?: string };
}) {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") redirect("/my-tasks");

  const { q, project, assignee, priority, overdue, hideDone, view } = searchParams;
  const hideDoneOn = hideDone !== "off"; // defaults to on
  const boardView = view === "board";

  const where: any = {};
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (project) where.projectId = project;
  if (assignee) where.assigneeId = assignee;
  if (priority) where.priority = priority;
  if (overdue === "on") where.dueDate = { lt: new Date() };
  if (hideDoneOn) where.status = { not: "DONE" };

  const [tasks, projects, users] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { dueDate: "asc" },
      include: { project: { include: { client: true } }, assignee: true, _count: { select: { comments: true } } },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
  ]);

  const openCount = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Tasks</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-sm border border-base-600 overflow-hidden text-xs">
            <Link
              href={{ pathname: "/tasks", query: { ...searchParams, view: "board" } }}
              className={`px-3 py-1.5 flex items-center gap-1 ${boardView ? "bg-signal text-white" : "text-base-400 hover:text-base-100"}`}
            >
              ⊞ Board
            </Link>
            <Link
              href={{ pathname: "/tasks", query: { ...searchParams, view: "list" } }}
              className={`px-3 py-1.5 flex items-center gap-1 border-l border-base-600 ${!boardView ? "bg-signal text-white" : "text-base-400 hover:text-base-100"}`}
            >
              ☰ List
            </Link>
          </div>
          <ExportExcelButton
            data={tasks.map((t) => ({
              Title: t.title,
              Project: t.project.name,
              Client: t.project.client?.name ?? "",
              Priority: t.priority,
              Assignee: t.assignee?.name ?? "Unassigned",
              "Due date": t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "",
              Status: t.status,
            }))}
            filename="tasks.xlsx"
          />
          <NewTaskModal
            projects={projects.map((p) => ({ id: p.id, name: p.name }))}
            users={users.map((u) => ({ id: u.id, name: u.name }))}
            triggerLabel="+ New Task"
          />
        </div>
      </div>
      <p className="text-base-400 text-sm mb-6">Every task across all projects · {openCount} open</p>

      <form method="get" className="card p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="label">Search</label>
          <input name="q" defaultValue={q ?? ""} placeholder="Search tasks…" className="input" />
        </div>
        <div>
          <label className="label">Priority</label>
          <select name="priority" defaultValue={priority ?? ""} className="input">
            <option value="">All</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div>
          <label className="label">Project</label>
          <select name="project" defaultValue={project ?? ""} className="input">
            <option value="">All</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Assignee</label>
          <select name="assignee" defaultValue={assignee ?? ""} className="input">
            <option value="">All</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-base-300 pb-2">
          <input type="checkbox" name="overdue" defaultChecked={overdue === "on"} />
          Overdue only
        </label>
        <label className="flex items-center gap-2 text-sm text-base-300 pb-2">
          <input type="checkbox" name="hideDone" value="off" defaultChecked={!hideDoneOn} />
          Show done
        </label>
        <SubmitButton idleLabel="Apply" pendingLabel="Applying…" />
        <Link href="/tasks" className="btn-secondary text-sm">Reset</Link>
      </form>

      {boardView ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {BOARD_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div key={col.key} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wider text-base-400">{col.label}</h3>
                  <span className="text-xs font-mono text-base-500">{colTasks.length}</span>
                </div>
                <div className="space-y-3">
                  {colTasks.map((t) => {
                    const overdueCard = t.dueDate && t.dueDate < new Date() && t.status !== "DONE";
                    return (
                      <Link
                        key={t.id}
                        href={`/tasks/${t.id}`}
                        className="block bg-base-800 border border-base-700 rounded-sm p-3 hover:border-signal"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-sm">{t.title}</span>
                          <span className={`pill ${PRIORITY_COLOR[t.priority]} shrink-0`}>{t.priority}</span>
                        </div>
                        <p className="text-xs text-base-500 mb-2">{t.project.client?.name ?? "—"} · {t.project.name}</p>
                        <div className="flex items-center justify-between text-xs text-base-500">
                          <span>{t.assignee?.name ?? "Unassigned"}</span>
                          {t.dueDate && (
                            <span className={overdueCard ? "text-danger" : ""}>{new Date(t.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  {colTasks.length === 0 && <p className="text-xs text-base-600">No tasks</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
      <div className="card overflow-visible">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-4 py-3 font-normal">Title</th>
              <th className="px-4 py-3 font-normal">Project</th>
              <th className="px-4 py-3 font-normal">Priority</th>
              <th className="px-4 py-3 font-normal">Assignee</th>
              <th className="px-4 py-3 font-normal">Due</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Chat</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const overdueRow = t.dueDate && t.dueDate < new Date() && t.status !== "DONE";
              return (
                <tr key={t.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${t.id}`} className="hover:text-signal">{t.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-base-400 text-xs">
                    {t.project.client?.name ?? "—"} · {t.project.name}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <AssigneeSelect taskId={t.id} users={users} current={t.assigneeId} />
                  </td>
                  <td className={`px-4 py-3 text-xs ${overdueRow ? "text-danger" : "text-base-400"}`}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <TaskStatusSelect taskId={t.id} projectId={t.projectId} status={t.status} />
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${t.id}`} className="text-base-400 hover:text-signal text-xs">
                      💬 {t._count.comments > 0 ? t._count.comments : ""}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-base-500">No tasks match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
      )}
    </div>
  );
}

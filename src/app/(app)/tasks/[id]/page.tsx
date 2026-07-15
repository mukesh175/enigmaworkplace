import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteTask, updateTask } from "@/lib/actions/tasks";
import TaskStatusSelect from "@/components/TaskStatusSelect";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import SubmitButton from "@/components/SubmitButton";
import TaskDiscussionThread from "@/components/TaskDiscussionThread";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-base-400 border-base-600",
  MEDIUM: "text-signal border-signal/40",
  HIGH: "text-warn border-warn/40",
  URGENT: "text-danger border-danger/40",
};

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      project: { include: { client: true } },
      assignee: true,
      comments: { orderBy: { createdAt: "asc" }, include: { user: true, file: true, reactions: true } },
    },
  });
  if (!task) notFound();

  const allUsers = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    select: { id: true, name: true },
  });

  const canManage = session.user.role === "ADMIN" || session.user.role === "MANAGER";
  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== "DONE";
  const deleteWithId = deleteTask.bind(null, task.id, task.projectId);
  const updateWithId = updateTask.bind(null, task.id, task.projectId);

  return (
    <div className="max-w-3xl">
      <RealtimeRefresh channel={`task-${task.id}`} />
      <Link href={`/projects/${task.projectId}`} className="text-base-400 text-sm hover:text-signal">
        ← {task.project.name}
      </Link>

      <div className="card p-6 mt-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="font-display text-2xl">{task.title}</h1>
            <p className="text-base-400 text-sm mt-1">
              {task.project.client?.name ?? "No client"} · {task.project.name}
            </p>
          </div>
          <span className={`pill ${PRIORITY_COLOR[task.priority]} shrink-0`}>{task.priority}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div>
            <div className="label">Status</div>
            <TaskStatusSelect taskId={task.id} projectId={task.projectId} status={task.status} />
          </div>
          <div>
            <div className="label">Assignee</div>
            <div>{task.assignee?.name ?? "Unassigned"}</div>
          </div>
          <div>
            <div className="label">Due date</div>
            <div className={isOverdue ? "text-danger" : ""}>
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "—"}
              {isOverdue && " · overdue"}
            </div>
          </div>
          <div>
            <div className="label">Created</div>
            <div>{new Date(task.createdAt).toLocaleDateString()}</div>
          </div>
        </div>

        {task.description && (
          <div className="mb-6">
            <div className="label">Description</div>
            <p className="text-base-200 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>
        )}

        {(task.figmaLink || task.referenceUrl || task.isHourly) && (
          <div className="flex flex-wrap items-center gap-3 mb-6 text-sm">
            {task.figmaLink && (
              <a href={task.figmaLink} target="_blank" rel="noreferrer" className="text-signal hover:underline flex items-center gap-1">
                🔗 Figma
              </a>
            )}
            {task.referenceUrl && (
              <a href={task.referenceUrl} target="_blank" rel="noreferrer" className="text-signal hover:underline flex items-center gap-1">
                🔗 Reference link
              </a>
            )}
            {task.isHourly && <span className="pill text-ok border-ok/40">Hourly — billed via Time entries</span>}
          </div>
        )}

        {canManage && (
          <details className="mb-4 group">
            <summary className="cursor-pointer text-sm text-signal list-none flex items-center gap-2">
              <span className="group-open:rotate-45 transition-transform inline-block">+</span> Edit task details
            </summary>
            <form action={updateWithId} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="md:col-span-2">
                <label className="label">Title</label>
                <input name="title" defaultValue={task.title} className="input" required />
              </div>
              <div>
                <label className="label">Priority</label>
                <select name="priority" defaultValue={task.priority} className="input">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="label">Due date</label>
                <input
                  name="dueDate"
                  type="date"
                  defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Figma link</label>
                <input name="figmaLink" type="url" defaultValue={task.figmaLink ?? ""} placeholder="https://figma.com/file/…" className="input" />
              </div>
              <div>
                <label className="label">Reference URL</label>
                <input name="referenceUrl" type="url" defaultValue={task.referenceUrl ?? ""} placeholder="https://…" className="input" />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-start gap-3 border border-base-700 rounded-sm p-3 cursor-pointer">
                  <input type="checkbox" name="isHourly" defaultChecked={task.isHourly} className="mt-0.5" />
                  <span>
                    <span className="block text-sm font-medium">Hourly Task</span>
                    <span className="block text-xs text-base-500">Billed by the hour for this task, tracked via Time entries.</span>
                  </span>
                </label>
              </div>
              <div className="md:col-span-2">
                <label className="label">Description</label>
                <textarea name="description" defaultValue={task.description ?? ""} className="input" rows={3} />
              </div>
              <div className="md:col-span-2">
                <SubmitButton idleLabel="Save changes" pendingLabel="Saving…" />
              </div>
            </form>
          </details>
        )}

        {canManage && (
          <form action={deleteWithId}>
            <SubmitButton idleLabel="Delete task" pendingLabel="Deleting…" className="btn-secondary text-xs text-danger border-danger/40 hover:border-danger" />
          </form>
        )}
      </div>

      <div className="card p-6 mt-4">
        <h2 className="font-display text-base mb-4">Discussion</h2>
        <TaskDiscussionThread
          taskId={task.id}
          myId={session.user.id}
          mentionableUsers={allUsers}
          comments={task.comments.map((c) => ({
            id: c.id,
            content: c.content,
            createdAt: c.createdAt,
            userId: c.userId,
            user: { name: c.user.name, avatarColor: c.user.avatarColor },
            file: c.file ? { url: c.file.url, name: c.file.name, mimeType: c.file.mimeType } : null,
            reactions: c.reactions.map((r) => ({ emoji: r.emoji, userId: r.userId })),
          }))}
        />
      </div>
    </div>
  );
}

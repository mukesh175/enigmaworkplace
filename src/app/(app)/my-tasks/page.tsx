import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import TaskStatusSelect from "@/components/TaskStatusSelect";

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "text-base-400 border-base-600",
  MEDIUM: "text-signal border-signal/40",
  HIGH: "text-warn border-warn/40",
  URGENT: "text-danger border-danger/40",
};

export default async function MyTasksPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const tasks = await prisma.task.findMany({
    where: { assigneeId: session.user.id },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: { project: { include: { client: true } }, _count: { select: { comments: true } } },
  });

  const openCount = tasks.filter((t) => t.status !== "DONE").length;

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">My Tasks</h1>
      <p className="text-base-400 text-sm mb-6">
        Everything assigned to you · {openCount} open, {tasks.length - openCount} done.
      </p>

      <div className="card overflow-visible">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-4 py-3 font-normal">Title</th>
              <th className="px-4 py-3 font-normal">Priority</th>
              <th className="px-4 py-3 font-normal">Due</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Chat</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const overdue = t.dueDate && t.dueDate < new Date() && t.status !== "DONE";
              return (
                <tr key={t.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/tasks/${t.id}`} className="hover:text-signal">{t.title}</Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`pill ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                  </td>
                  <td className={`px-4 py-3 text-xs ${overdue ? "text-danger" : "text-base-400"}`}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}
                    {overdue && " · overdue"}
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
                <td colSpan={5} className="px-4 py-8 text-center text-base-500">No tasks assigned to you yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}

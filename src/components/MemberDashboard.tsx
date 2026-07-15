import Link from "next/link";
import { prisma } from "@/lib/prisma";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className="font-display text-3xl mt-1">{value}</div>
      {hint && <div className="text-xs text-base-400 mt-1">{hint}</div>}
    </div>
  );
}

export default async function MemberDashboard({ userId, name }: { userId: string; name: string }) {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);

  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // Monday = 1
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - (dayOfWeek - 1));

  const [myOpenTasks, totalTasks, doneTasks, hoursThisWeek, dueToday, teamCount] = await Promise.all([
    prisma.task.count({ where: { assigneeId: userId, status: { not: "DONE" } } }),
    prisma.task.count({ where: { assigneeId: userId } }),
    prisma.task.count({ where: { assigneeId: userId, status: "DONE" } }),
    prisma.timeEntry.aggregate({
      _sum: { minutes: true },
      where: { userId, date: { gte: startOfWeek } },
    }),
    prisma.task.findMany({
      where: { assigneeId: userId, dueDate: { gte: startOfToday, lt: endOfToday }, status: { not: "DONE" } },
      include: { project: { include: { client: true } } },
      orderBy: { priority: "desc" },
    }),
    prisma.user.count(),
  ]);

  const QUICK_LINKS = [
    { href: "/my-tasks", label: "My Tasks", icon: "☑" },
    { href: "/time", label: "Time", icon: "◷" },
    { href: "/chat", label: "Messages", icon: "◐" },
    { href: "/files", label: "Files", icon: "▢" },
    { href: "/team", label: "Team", icon: "◈" },
    { href: "/projects", label: "Projects", icon: "▣" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Good day, {name}!</h1>
      <p className="text-base-400 text-sm mb-6">
        {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="My Open Tasks" value={myOpenTasks} hint={`${doneTasks} done`} />
        <StatCard label="Total Tasks" value={totalTasks} hint="assigned to me" />
        <StatCard label="Hours This Week" value={((hoursThisWeek._sum.minutes ?? 0) / 60).toFixed(1) + "h"} hint="since Monday" />
        <StatCard label="Team Members" value={teamCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-base">Due Today</h2>
            <Link href="/my-tasks" className="text-signal text-xs hover:underline">View all</Link>
          </div>
          <div className="space-y-2 mt-3">
            {dueToday.length === 0 && <p className="text-base-500 text-sm">Nothing due today. 🎉</p>}
            {dueToday.map((t) => (
              <Link
                key={t.id}
                href={`/tasks/${t.id}`}
                className="flex items-center justify-between text-sm border-b border-base-800 pb-2 last:border-0 hover:text-signal"
              >
                <span>{t.title}</span>
                <span className="text-base-500 text-xs">{t.project.client?.name ?? t.project.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-base mb-3">Quick Links</h2>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_LINKS.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className="flex flex-col items-center justify-center gap-2 py-4 rounded-sm border border-base-700 hover:border-signal hover:text-signal text-base-300 text-xs"
              >
                <span className="text-lg">{q.icon}</span>
                {q.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

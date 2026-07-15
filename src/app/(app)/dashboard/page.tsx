import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import MemberDashboard from "@/components/MemberDashboard";
import RevenueChart from "@/components/RevenueChart";
import TaskStatusChart from "@/components/TaskStatusChart";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-5">
      <div className="label">{label}</div>
      <div className="font-display text-3xl mt-1">{value}</div>
      {hint && <div className="text-xs text-base-400 mt-1">{hint}</div>}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  if (session.user.role === "MEMBER") {
    return <MemberDashboard userId={session.user.id} name={session.user.name ?? "there"} />;
  }

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [
    clients,
    activeProjects,
    openTasks,
    unpaidInvoices,
    hoursThisWeek,
    team,
    recentTasks,
    recentProjects,
    paidInvoices,
    taskStatusGroups,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.task.count({ where: { status: { not: "DONE" } } }),
    prisma.invoice.findMany({ where: { status: { in: ["SENT", "OVERDUE"] } }, include: { items: true } }),
    prisma.timeEntry.aggregate({
      _sum: { minutes: true },
      where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.user.count(),
    prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { project: true, assignee: true },
    }),
    prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { client: true, tasks: true },
    }),
    prisma.invoice.findMany({
      where: { status: "PAID", issueDate: { gte: sixMonthsAgo } },
      include: { items: true },
    }),
    prisma.task.groupBy({ by: ["status"], _count: true }),
  ]);

  const unpaidTotal = unpaidInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity * it.rate, 0),
    0
  );

  // Bucket paid invoices into the last 6 calendar months.
  const monthBuckets: { label: string; revenue: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    monthBuckets.push({ label: d.toLocaleDateString(undefined, { month: "short" }), revenue: 0 });
  }
  for (const inv of paidInvoices) {
    const monthsAgo =
      (new Date().getFullYear() - inv.issueDate.getFullYear()) * 12 +
      (new Date().getMonth() - inv.issueDate.getMonth());
    const idx = 5 - monthsAgo;
    if (idx >= 0 && idx < 6) {
      monthBuckets[idx].revenue += inv.items.reduce((s, it) => s + it.quantity * it.rate, 0);
    }
  }

  const taskStatusData = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => ({
    status,
    count: taskStatusGroups.find((g) => g.status === status)?._count ?? 0,
  }));

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Overview</h1>
      <p className="text-base-400 text-sm mb-6">What's moving across the agency right now.</p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Clients" value={clients} />
        <StatCard label="Active projects" value={activeProjects} />
        <StatCard label="Open tasks" value={openTasks} />
        <StatCard label="Team" value={team} />
        <StatCard label="Hours (7d)" value={((hoursThisWeek._sum.minutes ?? 0) / 60).toFixed(1)} />
        <StatCard label="Unpaid" value={`₹${unpaidTotal.toFixed(0)}`} hint={`${unpaidInvoices.length} invoices`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-display text-base mb-2">Revenue, last 6 months</h2>
          <RevenueChart data={monthBuckets} />
        </div>
        <div className="card p-5">
          <h2 className="font-display text-base mb-2">Tasks by status</h2>
          <TaskStatusChart data={taskStatusData} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="font-display text-base mb-4">Recent projects</h2>
          <div className="space-y-3">
            {recentProjects.length === 0 && (
              <p className="text-base-500 text-sm">No projects yet — create one to get started.</p>
            )}
            {recentProjects.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-base-800 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-base-100">{p.name}</div>
                  <div className="text-base-500 text-xs">{p.client?.name ?? "No client"} · {p.tasks.length} tasks</div>
                </div>
                <span className="pill">{p.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-display text-base mb-4">Recent tasks</h2>
          <div className="space-y-3">
            {recentTasks.length === 0 && (
              <p className="text-base-500 text-sm">No tasks yet.</p>
            )}
            {recentTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-base-800 pb-3 last:border-0 last:pb-0">
                <div>
                  <div className="text-base-100">{t.title}</div>
                  <div className="text-base-500 text-xs">{t.project.name} · {t.assignee?.name ?? "Unassigned"}</div>
                </div>
                <span className="pill">{t.status.replace("_", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

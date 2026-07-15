import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RevenueChart from "@/components/RevenueChart";

const RANGES = [
  { id: "month", label: "By month (12mo)" },
  { id: "quarter", label: "By quarter" },
  { id: "6month", label: "By 6 months" },
  { id: "year", label: "By year" },
] as const;

export default async function RevenuePage({ searchParams }: { searchParams: { range?: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "MEMBER") redirect(session ? "/my-tasks" : "/login");

  const range = (RANGES.find((r) => r.id === searchParams.range)?.id ?? "month") as
    | "month"
    | "quarter"
    | "6month"
    | "year";

  const paidInvoices = await prisma.invoice.findMany({
    where: { status: "PAID" },
    include: { items: true, client: true },
    orderBy: { issueDate: "asc" },
  });

  const totalRevenue = paidInvoices.reduce(
    (sum, inv) => sum + inv.items.reduce((s, it) => s + it.quantity * it.rate, 0),
    0
  );

  function bucketKey(date: Date): string {
    if (range === "month") return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    if (range === "quarter") return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
    if (range === "6month") return date.getMonth() < 6 ? `H1 ${date.getFullYear()}` : `H2 ${date.getFullYear()}`;
    return String(date.getFullYear());
  }

  const buckets = new Map<string, number>();
  for (const inv of paidInvoices) {
    const key = bucketKey(inv.issueDate);
    const total = inv.items.reduce((s, it) => s + it.quantity * it.rate, 0);
    buckets.set(key, (buckets.get(key) ?? 0) + total);
  }
  const chartData = Array.from(buckets.entries()).map(([label, revenue]) => ({ label, revenue }));

  // Revenue by client, for the breakdown table
  const byClient = new Map<string, number>();
  for (const inv of paidInvoices) {
    const total = inv.items.reduce((s, it) => s + it.quantity * it.rate, 0);
    byClient.set(inv.client.name, (byClient.get(inv.client.name) ?? 0) + total);
  }
  const clientRows = Array.from(byClient.entries()).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Revenue</h1>
      <p className="text-base-400 text-sm mb-6">
        ₹{totalRevenue.toLocaleString()} total collected across {paidInvoices.length} paid invoices.
      </p>

      <div className="flex gap-2 mb-6">
        {RANGES.map((r) => (
          <Link
            key={r.id}
            href={`/revenue?range=${r.id}`}
            className={`pill ${range === r.id ? "text-signal border-signal" : ""}`}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="card p-5 mb-6">
        <h2 className="font-display text-base mb-2">Revenue over time</h2>
        {chartData.length === 0 ? (
          <p className="text-base-500 text-sm py-8 text-center">No paid invoices yet.</p>
        ) : (
          <RevenueChart data={chartData} />
        )}
      </div>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-5 py-3 font-normal">Client</th>
              <th className="px-5 py-3 font-normal text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {clientRows.map(([name, total]) => (
              <tr key={name} className="border-b border-base-800 last:border-0">
                <td className="px-5 py-3">{name}</td>
                <td className="px-5 py-3 text-right font-mono">₹{total.toLocaleString()}</td>
              </tr>
            ))}
            {clientRows.length === 0 && (
              <tr>
                <td colSpan={2} className="px-5 py-8 text-center text-base-500">No revenue recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

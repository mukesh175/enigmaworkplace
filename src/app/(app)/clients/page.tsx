import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/actions/clients";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";

export default async function ClientsPage() {
  const session = await getServerSession(authOptions);
  if (session?.user.role === "MEMBER") redirect("/my-tasks");

  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { projects: true, invoices: true },
  });

  const exportData = clients.map((c) => ({
    Name: c.name,
    Company: c.company ?? "",
    Email: c.email ?? "",
    Phone: c.phone ?? "",
    "GST Number": c.gstNumber ?? "",
    Projects: c.projects.length,
    Invoices: c.invoices.length,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Clients</h1>
        <ExportExcelButton data={exportData} filename="clients.xlsx" />
      </div>
      <p className="text-base-400 text-sm mb-6">Every organization you work with.</p>

      <details className="card p-5 mb-6 group">
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> New client
        </summary>
        <form action={createClient} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">Company</label>
            <input name="company" className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <input name="email" type="email" className="input" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input name="phone" className="input" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Notes</label>
            <textarea name="notes" className="input" rows={2} />
          </div>
          <div>
            <label className="label">GST number</label>
            <input name="gstNumber" className="input" placeholder="e.g. 27AAECH5241H1ZO" />
          </div>
          <div className="md:col-span-2">
            <label className="label">Billing address (for invoices)</label>
            <textarea name="billingAddress" className="input" rows={3} placeholder="Floor, building, street, city, district, state, PIN…" />
          </div>
          <div className="md:col-span-2">
            <SubmitButton idleLabel="Add client" pendingLabel="Adding…" />
          </div>
        </form>
      </details>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-5 py-3 font-normal">Name</th>
              <th className="px-5 py-3 font-normal">Company</th>
              <th className="px-5 py-3 font-normal">Contact</th>
              <th className="px-5 py-3 font-normal">Projects</th>
              <th className="px-5 py-3 font-normal">Invoices</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                <td className="px-5 py-3">
                  <Link href={`/clients/${c.id}`} className="hover:text-signal">{c.name}</Link>
                </td>
                <td className="px-5 py-3 text-base-400">{c.company ?? "—"}</td>
                <td className="px-5 py-3 text-base-400">{c.email ?? c.phone ?? "—"}</td>
                <td className="px-5 py-3 text-base-400">{c.projects.length}</td>
                <td className="px-5 py-3 text-base-400">{c.invoices.length}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-base-500">
                  No clients yet — add your first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { inviteTeamMember, updateTeamMember, deleteTeamMember } from "@/lib/actions/team";
import AttendanceSelect from "@/components/AttendanceSelect";
import SubmitButton from "@/components/SubmitButton";
import ExportExcelButton from "@/components/ExportExcelButton";

export default async function TeamPage() {
  const session = await getServerSession(authOptions);
  const isAdmin = session?.user.role === "ADMIN";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      attendance: { where: { date: today } },
      tasksAssigned: { where: { status: { not: "DONE" } } },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Team</h1>
        <ExportExcelButton
          data={users.map((u) => ({
            Name: u.name,
            Email: u.email,
            Title: u.title ?? "",
            Role: u.role,
            "Open tasks": u.tasksAssigned.length,
          }))}
          filename="team.xlsx"
        />
      </div>
      <p className="text-base-400 text-sm mb-6">Roster, roles and today's attendance.</p>

      {isAdmin && (
        <details className="card p-5 mb-6 group">
          <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
            <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> Invite team member
          </summary>
          <form action={inviteTeamMember} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" required />
            </div>
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" className="input" required />
            </div>
            <div>
              <label className="label">Temporary password</label>
              <input name="password" type="password" className="input" required minLength={6} />
            </div>
            <div>
              <label className="label">Title</label>
              <input name="title" className="input" placeholder="e.g. Designer" />
            </div>
            <div>
              <label className="label">Role</label>
              <select name="role" className="input" defaultValue="MEMBER">
                <option value="ADMIN">Admin</option>
                <option value="MANAGER">Manager</option>
                <option value="MEMBER">Member</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <SubmitButton idleLabel="Add to team" pendingLabel="Adding…" />
            </div>
          </form>
        </details>
      )}

      <div className="card overflow-visible">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700 rounded-t-sm overflow-hidden">
              <th className="px-5 py-3 font-normal">Name</th>
              <th className="px-5 py-3 font-normal">Role</th>
              <th className="px-5 py-3 font-normal">Open tasks</th>
              <th className="px-5 py-3 font-normal">Today</th>
              {isAdmin && <th className="px-5 py-3 font-normal">Manage</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono"
                      style={{ backgroundColor: u.avatarColor + "33", border: `1px solid ${u.avatarColor}` }}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div>{u.name}</div>
                      <div className="text-base-500 text-xs">{u.title ?? u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><span className="pill">{u.role}</span></td>
                <td className="px-5 py-3 text-base-400">{u.tasksAssigned.length}</td>
                <td className="px-5 py-3">
                  {isAdmin ? (
                    <AttendanceSelect userId={u.id} current={u.attendance[0]?.status ?? "PRESENT"} />
                  ) : (
                    <span className="pill">{u.attendance[0]?.status ?? "—"}</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-5 py-3 relative">
                    <details className="group">
                      <summary className="cursor-pointer text-xs text-base-400 hover:text-signal list-none">Edit ▾</summary>
                      <div className="absolute right-0 z-20 mt-2 w-72 card p-4 space-y-3 shadow-xl max-h-[70vh] overflow-y-auto">
                        <form action={updateTeamMember.bind(null, u.id)} className="space-y-3">
                          <div>
                            <label className="label">Name</label>
                            <input name="name" defaultValue={u.name} className="input" required />
                          </div>
                          <div>
                            <label className="label">Email</label>
                            <input name="email" type="email" defaultValue={u.email} className="input" required />
                          </div>
                          <div>
                            <label className="label">Title</label>
                            <input name="title" defaultValue={u.title ?? ""} className="input" />
                          </div>
                          <div>
                            <label className="label">Role</label>
                            <select name="role" className="input" defaultValue={u.role}>
                              <option value="ADMIN">Admin</option>
                              <option value="MANAGER">Manager</option>
                              <option value="MEMBER">Member</option>
                            </select>
                          </div>
                          <div>
                            <label className="label">New password (optional)</label>
                            <input name="password" type="password" className="input" placeholder="Leave blank to keep current" minLength={6} />
                          </div>
                          <SubmitButton idleLabel="Save" pendingLabel="Saving…" className="btn-primary w-full text-xs" />
                        </form>
                        {u.id !== session?.user.id && (
                          <form action={deleteTeamMember.bind(null, u.id)}>
                            <SubmitButton idleLabel="Remove from team" pendingLabel="Removing…" className="btn-secondary w-full text-xs text-danger border-danger/40 hover:border-danger" />
                          </form>
                        )}
                      </div>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

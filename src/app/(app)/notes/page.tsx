import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNote } from "@/lib/actions/notes";
import SubmitButton from "@/components/SubmitButton";
import NoteCard from "@/components/NoteCard";

export default async function NotesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const notes = await prisma.note.findMany({
    where: { OR: [{ userId: session.user.id }, { shared: true }] },
    include: { user: true },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Notes</h1>
        <form action={createNote}>
          <SubmitButton idleLabel="+ New Note" pendingLabel="Adding…" />
        </form>
      </div>
      <p className="text-base-400 text-sm mb-6">Personal and shared notes.</p>

      {notes.length === 0 ? (
        <p className="text-base-500 text-sm">No notes yet — click "+ New Note" to start one.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
            <NoteCard
              key={n.id}
              note={{
                id: n.id,
                content: n.content,
                color: n.color,
                pinned: n.pinned,
                shared: n.shared,
                updatedAt: n.updatedAt,
                user: { name: n.user.name },
              }}
              isMine={n.userId === session.user.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

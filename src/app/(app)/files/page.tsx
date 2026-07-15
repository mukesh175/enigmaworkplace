import { prisma } from "@/lib/prisma";
import { addFile, deleteFile } from "@/lib/actions/files";
import SubmitButton from "@/components/SubmitButton";

export default async function FilesPage() {
  const [files, projects] = await Promise.all([
    prisma.fileAsset.findMany({
      orderBy: { createdAt: "desc" },
      include: { uploadedBy: true, project: true },
    }),
    prisma.project.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl mb-1">Files</h1>
      <p className="text-base-400 text-sm mb-6">
        Shared links and assets. Paste a URL (Drive, Dropbox, S3, Vercel Blob, etc.) to file it here.
      </p>

      <details className="card p-5 mb-6 group" open>
        <summary className="cursor-pointer font-display text-base list-none flex items-center gap-2">
          <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> Add file
        </summary>
        <form action={addFile} className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" required />
          </div>
          <div>
            <label className="label">URL</label>
            <input name="url" type="url" className="input" required placeholder="https://…" />
          </div>
          <div>
            <label className="label">Project (optional)</label>
            <select name="projectId" className="input">
              <option value="">—</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <SubmitButton idleLabel="Add file" pendingLabel="Adding…" />
          </div>
        </form>
      </details>

      <div className="card overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-base-400 text-xs uppercase tracking-wider border-b border-base-700">
              <th className="px-5 py-3 font-normal">Name</th>
              <th className="px-5 py-3 font-normal">Project</th>
              <th className="px-5 py-3 font-normal">Uploaded by</th>
              <th className="px-5 py-3 font-normal">Date</th>
              <th className="px-5 py-3 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => {
              const del = deleteFile.bind(null, f.id);
              return (
                <tr key={f.id} className="border-b border-base-800 last:border-0 hover:bg-base-800/50">
                  <td className="px-5 py-3">
                    <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-signal">{f.name}</a>
                  </td>
                  <td className="px-5 py-3 text-base-400">{f.project?.name ?? "—"}</td>
                  <td className="px-5 py-3 text-base-400">{f.uploadedBy.name}</td>
                  <td className="px-5 py-3 text-base-400 text-xs">{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <form action={del}>
                      <button type="submit" className="text-base-500 hover:text-danger text-xs">✕</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {files.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-base-500">No files yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

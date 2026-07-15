"use client";

import { useState, useTransition } from "react";
import { createTask } from "@/lib/actions/tasks";
import Modal from "@/components/Modal";

type Option = { id: string; name: string };

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export default function NewTaskModal({
  projects,
  users,
  defaultProjectId,
  triggerClassName = "btn-primary",
  triggerLabel = "+ New Task",
}: {
  projects: Option[];
  users: Option[];
  defaultProjectId?: string;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isHourly, setIsHourly] = useState(false);

  function close() {
    if (isPending) return;
    setOpen(false);
    setPriority("MEDIUM");
    setDueDate("");
    setShowAdvanced(false);
    setIsHourly(false);
  }

  function submit(formData: FormData) {
    formData.set("priority", priority);
    formData.set("isHourly", isHourly ? "on" : "off");
    startTransition(async () => {
      await createTask(formData);
      close();
    });
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerLabel}
      </button>

      <Modal open={open} onClose={close} title="New Task">
        <form action={submit} className="space-y-5">
          <input
            name="title"
            placeholder="Task title…"
            required
            className="w-full bg-transparent border-b border-base-700 pb-2 text-lg placeholder-base-500 focus:outline-none focus:border-signal"
          />

          <div className="flex items-center gap-3">
            <span className="text-base-400 w-28 text-sm shrink-0">📁 Project</span>
            <select name="projectId" defaultValue={defaultProjectId} required className="input">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-base-400 w-28 text-sm shrink-0">🏷️ Priority</span>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`pill ${priority === p ? "text-signal border-signal" : "text-base-400"}`}
                >
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-base-400 w-28 text-sm shrink-0">✓ Status</span>
            <span className="pill text-signal border-signal">To Do</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-base-400 w-28 text-sm shrink-0">👤 Assignee</span>
            <select name="assigneeId" defaultValue="" className="input">
              <option value="">— Unassigned —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-base-400 w-28 text-sm shrink-0">📅 Due Date</span>
            <div className="flex-1 flex items-center gap-2">
              <input name="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
              {dueDate && (
                <button type="button" onClick={() => setDueDate("")} className="text-base-500 hover:text-danger">✕</button>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className="text-signal text-sm hover:underline"
          >
            {showAdvanced ? "Hide" : "Show"} advanced options
          </button>

          {showAdvanced && (
            <div className="card p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Figma Link</label>
                  <input name="figmaLink" type="url" placeholder="https://figma.com/file/…" className="input" />
                </div>
                <div>
                  <label className="label">Reference URL</label>
                  <input name="referenceUrl" type="url" placeholder="https://inspiration-site.com" className="input" />
                </div>
              </div>
              <label className="flex items-start gap-3 border border-base-700 rounded-sm p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isHourly}
                  onChange={(e) => setIsHourly(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">Hourly Task</span>
                  <span className="block text-xs text-base-500">Billed by the hour for this task, tracked via Time entries.</span>
                </span>
              </label>
            </div>
          )}

          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={4} className="input resize-none" placeholder="Add more detail…" />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-base-700">
            <button type="button" onClick={close} className="btn-secondary text-sm">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary text-sm disabled:opacity-60">
              {isPending ? "Creating…" : "Create Task"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

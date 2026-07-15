"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/lib/actions/tasks";

const STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export default function TaskStatusSelect({
  taskId,
  projectId,
  status,
}: {
  taskId: string;
  projectId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(() => {
          updateTaskStatus(taskId, projectId, e.target.value);
        })
      }
      className="input py-1 text-xs"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s.replace("_", " ")}</option>
      ))}
    </select>
  );
}

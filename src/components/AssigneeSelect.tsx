"use client";

import { useTransition } from "react";
import { updateTaskAssignee } from "@/lib/actions/tasks";

export default function AssigneeSelect({
  taskId,
  users,
  current,
}: {
  taskId: string;
  users: { id: string; name: string }[];
  current: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current ?? ""}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateTaskAssignee(taskId, e.target.value))}
      className="input py-1 text-xs"
    >
      <option value="">Unassigned</option>
      {users.map((u) => (
        <option key={u.id} value={u.id}>{u.name}</option>
      ))}
    </select>
  );
}

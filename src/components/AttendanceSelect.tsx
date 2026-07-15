"use client";

import { useTransition } from "react";
import { markAttendance } from "@/lib/actions/team";

const STATUSES = ["PRESENT", "ABSENT", "LEAVE", "HALF_DAY"];

export default function AttendanceSelect({ userId, current }: { userId: string; current: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current}
      disabled={isPending}
      onChange={(e) => {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("status", e.target.value);
        startTransition(() => markAttendance(fd));
      }}
      className="input text-xs py-1"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>{s.replace("_", " ")}</option>
      ))}
    </select>
  );
}

"use client";

import { useState, useTransition } from "react";
import { updatePinnedTeamMembers } from "@/lib/actions/profile";

export default function TeamSidebarPicker({
  members,
  initialPinned,
}: {
  members: { id: string; name: string; title: string | null }[];
  initialPinned: string[];
}) {
  const [pinned, setPinned] = useState<string[]>(initialPinned);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    const next = pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
    setPinned(next);
    startTransition(() => updatePinnedTeamMembers(next));
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-base mb-1">Team sidebar</h2>
      <p className="text-base-400 text-sm mb-4">
        Choose who appears in the floating team sidebar. Leave all unchecked to show everyone.
      </p>
      <div className="max-h-72 overflow-y-auto scroll-thin space-y-1 -mx-2 px-2">
        {members.map((m) => (
          <label
            key={m.id}
            className="flex items-center justify-between gap-3 px-2 py-2 rounded-sm hover:bg-base-800 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-8 h-8 rounded-full bg-base-700 flex items-center justify-center text-xs shrink-0">
                {m.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <div className="text-sm truncate">{m.name}</div>
                <div className="text-xs text-base-500 truncate">{m.title ?? "—"}</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pinned.includes(m.id)}
              onChange={() => toggle(m.id)}
              className="shrink-0"
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-base-500 mt-3">
        {pinned.length === 0 ? "Showing all team members in the sidebar." : `${pinned.length} pinned`}
      </p>
    </div>
  );
}

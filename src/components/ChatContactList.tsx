"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { startDirectMessage, createGroupChat } from "@/lib/actions/chat";
import SubmitButton from "@/components/SubmitButton";
import OnlineDot from "@/components/OnlineDot";

type Row = {
  key: string;
  conversationId: string | null;
  startUserId: string | null;
  title: string;
  subtitle: string;
  color: string;
  initial: string;
  lastMessage: string;
  lastAt: Date | string | null;
  unread: boolean;
  isGroup: boolean;
};

type SimpleUser = { id: string; name: string };

export default function ChatContactList({
  rows,
  allUsers,
  canCreateGroup,
}: {
  rows: Row[];
  allUsers: SimpleUser[];
  canCreateGroup: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.title.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <div className="p-4 border-b border-base-700">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg">Messages</h2>
        </div>
        <p className="text-xs text-base-500 mb-3">{rows.filter((r) => !r.isGroup).length} people</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search conversations…"
          className="input text-xs py-1.5"
        />
      </div>

      {canCreateGroup && (
        <details className="border-b border-base-700 group">
          <summary className="cursor-pointer px-4 py-2.5 text-xs text-base-400 uppercase tracking-wider list-none flex items-center gap-2 hover:text-signal">
            <span className="text-signal group-open:rotate-45 transition-transform inline-block">+</span> New group
          </summary>
          <form action={createGroupChat} className="px-4 pb-4 space-y-3">
            <input name="name" placeholder="Group name" className="input text-xs" required />
            <div className="max-h-40 overflow-y-auto scroll-thin space-y-1 border border-base-700 rounded-sm p-2">
              {allUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-2 text-xs text-base-300">
                  <input type="checkbox" name="memberIds" value={u.id} />
                  {u.name}
                </label>
              ))}
            </div>
            <SubmitButton idleLabel="Create group" pendingLabel="Creating…" className="btn-primary text-xs w-full py-1.5" />
          </form>
        </details>
      )}

      <div className="flex-1 overflow-y-auto scroll-thin">
        {filtered.map((r) =>
          r.conversationId ? (
            <Link
              key={r.key}
              href={`/chat/${r.conversationId}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-base-800 hover:bg-base-800/60"
            >
              <RowAvatar color={r.color} initial={r.initial} isGroup={r.isGroup} userId={r.startUserId} />
              <RowBody {...r} />
            </Link>
          ) : (
            <form key={r.key} action={startDirectMessage}>
              <input type="hidden" name="userId" value={r.startUserId ?? ""} />
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-base-800 hover:bg-base-800/60 text-left"
              >
                <RowAvatar color={r.color} initial={r.initial} isGroup={r.isGroup} userId={r.startUserId} />
                <RowBody {...r} />
              </button>
            </form>
          )
        )}
        {filtered.length === 0 && (
          <p className="text-base-500 text-sm p-4">
            {rows.length === 0 ? "No teammates yet — invite people from Team." : "No matches."}
          </p>
        )}
      </div>
    </>
  );
}

function RowAvatar({ color, initial, isGroup, userId }: { color: string; initial: string; isGroup: boolean; userId: string | null }) {
  return (
    <div className="relative shrink-0">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono"
        style={{ backgroundColor: color + "33", border: `1px solid ${color}` }}
      >
        {isGroup ? "◈" : initial}
      </div>
      {!isGroup && userId && <OnlineDot userId={userId} className="absolute -bottom-0.5 -right-0.5" />}
    </div>
  );
}

function RowBody({
  title,
  subtitle,
  lastMessage,
  lastAt,
  unread,
}: {
  title: string;
  subtitle: string;
  lastMessage: string;
  lastAt: Date | string | null;
  unread: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className={`text-sm truncate ${unread ? "text-base-100 font-medium" : "text-base-300"}`}>
          {title}
        </span>
        {lastAt && (
          <span className="text-[10px] text-base-500 shrink-0 ml-2" suppressHydrationWarning>
            {new Date(lastAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <p className="text-xs text-base-500 truncate">{lastAt ? lastMessage : subtitle}</p>
    </div>
  );
}

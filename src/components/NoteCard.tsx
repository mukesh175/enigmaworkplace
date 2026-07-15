"use client";

import { useState, useTransition } from "react";
import { updateNoteContent, updateNoteColor, toggleNotePin, toggleNoteShared, deleteNote } from "@/lib/actions/notes";

const COLORS = ["#FBBF24", "#4ADE80", "#60A5FA", "#F472B6", "#A78BFA", "#FB923C", "#F87171"];

export default function NoteCard({
  note,
  isMine,
}: {
  note: { id: string; content: string; color: string; pinned: boolean; shared: boolean; updatedAt: Date | string; user?: { name: string } };
  isMine: boolean;
}) {
  const [, startTransition] = useTransition();
  const [content, setContent] = useState(note.content);
  const [saved, setSaved] = useState(true);

  function handleBlur() {
    if (content !== note.content) {
      startTransition(() => updateNoteContent(note.id, content));
    }
    setSaved(true);
  }

  return (
    <div className="card p-4 border-t-4" style={{ borderTopColor: note.color }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex gap-1.5">
          {isMine &&
            COLORS.map((c) => (
              <button
                key={c}
                onClick={() => startTransition(() => updateNoteColor(note.id, c))}
                className="w-3.5 h-3.5 rounded-full border border-black/20"
                style={{ backgroundColor: c }}
                title="Set note color"
              />
            ))}
          {!isMine && <span className="text-xs text-base-500">{note.user?.name}</span>}
        </div>
        {isMine && (
          <div className="flex items-center gap-2 text-xs text-base-500">
            <button
              onClick={() => startTransition(() => toggleNoteShared(note.id))}
              className={note.shared ? "text-signal" : "hover:text-signal"}
              title={note.shared ? "Shared with everyone — click to make private" : "Make visible to everyone"}
            >
              👥
            </button>
            <button
              onClick={() => startTransition(() => toggleNotePin(note.id))}
              className={note.pinned ? "text-warn" : "hover:text-warn"}
              title={note.pinned ? "Unpin" : "Pin to top"}
            >
              📌
            </button>
            <button onClick={() => startTransition(() => deleteNote(note.id))} className="hover:text-danger" title="Delete">
              🗑
            </button>
          </div>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setSaved(false);
        }}
        onBlur={handleBlur}
        readOnly={!isMine}
        placeholder={isMine ? "Type a note…" : ""}
        rows={6}
        className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder-base-600"
      />

      <div className="flex items-center justify-between text-[10px] text-base-500 mt-2">
        <span>{new Date(note.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</span>
        {isMine && !saved && <span className="text-signal">Unsaved — click away to save</span>}
      </div>
    </div>
  );
}

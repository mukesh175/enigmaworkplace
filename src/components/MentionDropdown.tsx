"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type UserOption = { id: string; name: string };

export default function MentionDropdown({
  textareaRef,
  users,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  users: UserOption[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [triggerIndex, setTriggerIndex] = useState<number | null>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    function handleInput() {
      const value = el!.value;
      const cursor = el!.selectionStart ?? value.length;
      const uptoCursor = value.slice(0, cursor);
      const match = uptoCursor.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

      if (match) {
        const idx = uptoCursor.length - match[1].length - 1;
        setTriggerIndex(idx);
        setQuery(match[1]);
        const rect = el!.getBoundingClientRect();
        setPos({ top: rect.top, left: rect.left + 12 });
        setOpen(true);
      } else {
        setOpen(false);
      }
    }

    el.addEventListener("input", handleInput);
    el.addEventListener("keyup", handleInput);
    el.addEventListener("click", handleInput);
    return () => {
      el.removeEventListener("input", handleInput);
      el.removeEventListener("keyup", handleInput);
      el.removeEventListener("click", handleInput);
    };
  }, [textareaRef]);

  function select(user: UserOption) {
    const el = textareaRef.current;
    if (!el || triggerIndex === null) return;
    const value = el.value;
    const before = value.slice(0, triggerIndex);
    const after = value.slice(triggerIndex + 1 + query.length);
    const newValue = `${before}@${user.name} ${after}`;
    el.value = newValue;
    const newCursor = before.length + user.name.length + 2;
    el.setSelectionRange(newCursor, newCursor);
    el.focus();
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setOpen(false);
  }

  const filtered = users.filter((u) => u.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6);

  if (!open || !pos || filtered.length === 0 || typeof document === "undefined") return null;

  return createPortal(
    <div
      style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)", marginTop: -8 }}
      className="card p-1 shadow-xl z-50 w-56 max-h-48 overflow-y-auto scroll-thin"
    >
      {filtered.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => select(u)}
          className="w-full text-left text-sm px-3 py-2 rounded-sm hover:bg-base-800"
        >
          @{u.name}
        </button>
      ))}
    </div>,
    document.body
  );
}

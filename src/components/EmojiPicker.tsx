"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EMOJIS = [
  "😀", "😂", "😍", "🥳", "😎", "🤔", "😢", "😮", "🙏", "👍",
  "👎", "👏", "🔥", "🎉", "❤️", "✅", "❌", "🚀", "💡", "⚠️",
];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 224; // w-56
      const panelHeight = 176;
      // Keep the panel on-screen: prefer above the button, flip below if
      // there isn't room, and clamp horizontally to the viewport.
      const top = rect.top - panelHeight - 8 < 0 ? rect.bottom + 8 : rect.top - panelHeight - 8;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8);
      setPos({ top, left });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        className="shrink-0 w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal"
        title="Add an emoji"
      >
        🙂
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 224 }}
            className="card p-2 shadow-xl z-50 grid grid-cols-5 gap-1"
          >
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => {
                  onSelect(e);
                  setOpen(false);
                }}
                className="text-lg hover:bg-base-800 rounded-sm py-1"
              >
                {e}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TAGS = [
  { id: "NONE", label: "Message" },
  { id: "ANNOUNCEMENT", label: "Announcement" },
  { id: "DISCUSSION", label: "Discussion" },
  { id: "IDEA", label: "Idea" },
  { id: "IMPORTANT", label: "Important" },
  { id: "SUGGESTION", label: "Suggestion" },
] as const;

export default function PostTypeMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (tag: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const current = TAGS.find((t) => t.id === value) ?? TAGS[0];

  function toggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const panelWidth = 176; // w-44
      const panelHeight = 220;
      const top = rect.top - panelHeight - 8 < 0 ? rect.bottom + 8 : rect.top - panelHeight - 8;
      // Anchor the panel's right edge to the button's right edge, then clamp
      // so it never runs off either side of the viewport.
      const left = Math.min(Math.max(8, rect.right - panelWidth), window.innerWidth - panelWidth - 8);
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
        className="shrink-0 w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal text-xs"
        title={`Post type: ${current.label}`}
      >
        •••
      </button>

      {open && pos && typeof document !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, width: 176 }}
            className="card p-1 shadow-xl z-50"
          >
            {TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChange(t.id);
                  setOpen(false);
                }}
                className={`w-full text-left text-sm px-3 py-2 rounded-sm hover:bg-base-800 ${
                  t.id === value ? "text-signal" : "text-base-200"
                }`}
              >
                {t.label} {t.id === value && "✓"}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}

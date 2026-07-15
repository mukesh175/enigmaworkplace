"use client";

import { useState, useTransition } from "react";
import { getConversationMedia } from "@/lib/actions/chat";

type MediaItem = {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  uploadedBy: string;
  createdAt: Date | string;
};

export default function MediaPanel({ conversationId }: { conversationId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !items) {
      startTransition(async () => {
        const data = await getConversationMedia(conversationId);
        setItems(data);
      });
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal"
        title="Shared media"
      >
        🗂️
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 card p-3 shadow-xl z-30 max-h-80 overflow-y-auto scroll-thin">
          <div className="text-xs uppercase tracking-wider text-base-500 mb-2">Shared media</div>
          {isPending && <p className="text-xs text-base-500">Loading…</p>}
          {!isPending && items?.length === 0 && <p className="text-xs text-base-500">No files shared yet.</p>}
          {items?.map((f) => (
            <a
              key={f.id}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 py-2 border-b border-base-800 last:border-0 hover:text-signal text-xs"
            >
              {f.mimeType?.startsWith("image/") ? (
                <img src={f.url} alt={f.name} className="w-8 h-8 object-cover rounded-sm" />
              ) : (
                <span>📎</span>
              )}
              <div className="min-w-0">
                <div className="truncate">{f.name}</div>
                <div className="text-base-500">{f.uploadedBy}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

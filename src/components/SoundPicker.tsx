"use client";

import { useTransition } from "react";
import { SOUND_OPTIONS, playNotificationSound, type SoundId } from "@/lib/sounds";
import { updateNotificationSound } from "@/lib/actions/notifications";

export default function SoundPicker({ current }: { current: string }) {
  const [isPending, startTransition] = useTransition();

  function choose(id: SoundId) {
    playNotificationSound(id);
    const fd = new FormData();
    fd.set("sound", id);
    startTransition(() => updateNotificationSound(fd));
  }

  return (
    <div className="space-y-2">
      {SOUND_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          disabled={isPending}
          onClick={() => choose(opt.id)}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-sm border text-left ${
            current === opt.id
              ? "border-signal text-signal bg-base-800"
              : "border-base-600 text-base-200 hover:border-base-400"
          }`}
        >
          <span>{opt.label}</span>
          {current === opt.id && <span className="text-xs">Selected · tap to preview</span>}
        </button>
      ))}
    </div>
  );
}

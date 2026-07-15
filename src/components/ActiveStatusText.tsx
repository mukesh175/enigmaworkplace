"use client";

import { useOnlinePresence } from "@/components/PresenceProvider";

export default function ActiveStatusText({ userId }: { userId: string }) {
  const online = useOnlinePresence();
  const isOnline = online.has(userId);

  return (
    <div className={`text-[11px] ${isOnline ? "text-ok" : "text-base-500"}`}>
      {isOnline ? "● Active now" : "○ Offline"}
    </div>
  );
}

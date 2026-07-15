"use client";

import { useOnlinePresence } from "@/components/PresenceProvider";

export default function OnlineDot({ userId, className = "" }: { userId: string; className?: string }) {
  const online = useOnlinePresence();
  const isOnline = online.has(userId);

  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full border-2 border-base-900 ${
        isOnline ? "bg-ok" : "bg-base-600"
      } ${className}`}
      title={isOnline ? "Active now" : "Offline"}
    />
  );
}

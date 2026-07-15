"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getPusherClient } from "@/lib/pusherClient";

export default function RealtimeRefresh({
  channel,
  event = "update",
  fallbackPollMs = 20000,
}: {
  channel: string;
  event?: string;
  fallbackPollMs?: number;
}) {
  const router = useRouter();
  const pendingRef = useRef(false);

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const ch = pusher.subscribe(channel);
    const handler = () => router.refresh();
    ch.bind(event, handler);

    return () => {
      ch.unbind(event, handler);
      pusher.unsubscribe(channel);
    };
  }, [channel, event, router]);

  // Safety net in case a Pusher event is ever missed (network blip, etc.) —
  // deliberately slow (20s) since this is now a backup, not the primary path.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible" && !pendingRef.current) {
        pendingRef.current = true;
        router.refresh();
        setTimeout(() => { pendingRef.current = false; }, 1000);
      }
    }, fallbackPollMs);
    return () => clearInterval(id);
  }, [router, fallbackPollMs]);

  return null;
}

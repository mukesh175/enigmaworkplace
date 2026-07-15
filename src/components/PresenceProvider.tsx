"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getPusherClient } from "@/lib/pusherClient";

const PresenceContext = createContext<Set<string>>(new Set());

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState<Set<string>>(new Set());

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe("presence-online");

    channel.bind("pusher:subscription_succeeded", (members: any) => {
      const ids = new Set<string>();
      members.each((m: { id: string }) => ids.add(m.id));
      setOnline(ids);
    });
    channel.bind("pusher:member_added", (member: { id: string }) => {
      setOnline((prev) => new Set(prev).add(member.id));
    });
    channel.bind("pusher:member_removed", (member: { id: string }) => {
      setOnline((prev) => {
        const next = new Set(prev);
        next.delete(member.id);
        return next;
      });
    });

    return () => {
      pusher.unsubscribe("presence-online");
    };
  }, []);

  return <PresenceContext.Provider value={online}>{children}</PresenceContext.Provider>;
}

export function useOnlinePresence() {
  return useContext(PresenceContext);
}

"use client";

import { useEffect, useRef, useState } from "react";

type FileRef = { url: string; name: string } | null;
type MessageT = {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user: { name: string; avatarColor: string };
  file: FileRef;
};
type ParticipantT = { userId: string; lastReadAt: string | null };

export default function ChatMessages({
  conversationId,
  myId,
  initialMessages,
  initialParticipants,
}: {
  conversationId: string;
  myId: string;
  initialMessages: MessageT[];
  initialParticipants: ParticipantT[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [participants, setParticipants] = useState(initialParticipants);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(initialMessages.length);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`/api/conversations/${conversationId}/messages`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setMessages(data.messages);
        setParticipants(data.participants);
      } catch {
        // silently retry on next interval
      }
    }

    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [conversationId]);

  useEffect(() => {
    if (messages.length !== lastCountRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      lastCountRef.current = messages.length;
    }
  }, [messages.length]);

  const otherParticipants = participants.filter((p) => p.userId !== myId);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
      {messages.length === 0 && (
        <p className="text-base-500 text-sm text-center mt-10">No messages yet — say hello.</p>
      )}
      {messages.map((m, i) => {
        const mine = m.userId === myId;
        const isLastMine = mine && !messages.slice(i + 1).some((mm) => mm.userId === myId);
        const seen =
          isLastMine &&
          otherParticipants.every((p) => p.lastReadAt && new Date(p.lastReadAt) >= new Date(m.createdAt));

        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className="max-w-md">
              {!mine && <div className="text-xs text-base-500 mb-1">{m.user.name}</div>}
              <div
                className={`px-4 py-2 rounded-sm text-sm ${
                  mine ? "bg-signal text-base-950" : "bg-base-800 text-base-100 border border-base-700"
                }`}
              >
                {m.file && (
                  <a
                    href={m.file.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`flex items-center gap-2 mb-1 text-xs underline ${mine ? "text-base-950" : "text-signal"}`}
                  >
                    📎 {m.file.name}
                  </a>
                )}
                {m.content && <span>{m.content}</span>}
              </div>
              <div className={`text-[10px] text-base-500 mt-1 ${mine ? "text-right" : ""}`}>
                {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {isLastMine && <span className="ml-1">{seen ? "· Seen" : "· Sent"}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

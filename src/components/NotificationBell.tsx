"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMyNotifications, markAllNotificationsRead } from "@/lib/actions/notifications";
import { playNotificationSound, showDesktopNotification, type SoundId } from "@/lib/sounds";
import { getPusherClient } from "@/lib/pusherClient";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date | string;
};

export default function NotificationBell({
  userId,
  initialNotifications,
  initialUnreadCount,
  soundPreference,
  soundEnabled,
  soundVolume,
  desktopNotifications,
}: {
  userId: string;
  initialNotifications: Notification[];
  initialUnreadCount: number;
  soundPreference: SoundId;
  soundEnabled: boolean;
  soundVolume: number;
  desktopNotifications: boolean;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const prevUnreadRef = useRef(initialUnreadCount);
  const mountedAtRef = useRef(Date.now());

  const refresh = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    try {
      const r = await getMyNotifications();
      const isNew = r.unreadCount > prevUnreadRef.current && Date.now() - mountedAtRef.current > 1500;
      if (isNew) {
        playNotificationSound(soundPreference, soundEnabled, soundVolume);
        if (desktopNotifications) {
          const latest = r.notifications[0];
          if (latest) showDesktopNotification(latest.title, latest.body ?? undefined);
        }
      }
      setNotifications(r.notifications);
      prevUnreadRef.current = r.unreadCount;
      setUnreadCount(r.unreadCount);
    } finally {
      pendingRef.current = false;
    }
  }, [soundPreference, soundEnabled, soundVolume, desktopNotifications]);

  // Instant path: Pusher pushes the moment a notification is created.
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(`user-${userId}`);
    channel.bind("notification", refresh);
    return () => {
      channel.unbind("notification", refresh);
      pusher.unsubscribe(`user-${userId}`);
    };
  }, [userId, refresh]);

  // Slow safety-net poll in case a push event is ever missed.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 30000);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  }

  function go(link: string | null) {
    setOpen(false);
    if (link) router.push(link);
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-danger text-white text-[10px] flex items-center justify-center font-mono">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 card shadow-xl z-30 max-h-96 overflow-y-auto scroll-thin">
          <div className="px-4 py-3 border-b border-base-700 text-sm font-display">Notifications</div>
          {notifications.length === 0 && (
            <p className="text-base-500 text-sm p-4">You're all caught up.</p>
          )}
          {notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.link)}
              className={`w-full text-left px-4 py-3 border-b border-base-800 last:border-0 hover:bg-base-800/60 ${
                !n.read ? "bg-base-800/30" : ""
              }`}
            >
              <div className="text-sm text-base-100">{n.title}</div>
              {n.body && <div className="text-xs text-base-400 mt-0.5 truncate">{n.body}</div>}
              <div className="text-[10px] text-base-500 mt-1 font-mono" suppressHydrationWarning>
                {new Date(n.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

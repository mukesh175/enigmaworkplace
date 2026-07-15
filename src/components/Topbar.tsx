"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import SearchBox from "@/components/SearchBox";
import NotificationBell from "@/components/NotificationBell";
import { useMobileNav } from "@/components/MobileNavProvider";
import type { SoundId } from "@/lib/sounds";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: Date | string;
};

export default function Topbar({
  userId,
  name,
  role,
  avatarImageUrl,
  initialNotifications,
  initialUnreadCount,
  soundPreference,
  soundEnabled,
  soundVolume,
  desktopNotifications,
}: {
  userId: string;
  name: string;
  role: string;
  avatarImageUrl?: string | null;
  initialNotifications: Notification[];
  initialUnreadCount: number;
  soundPreference: SoundId;
  soundEnabled: boolean;
  soundVolume: number;
  desktopNotifications: boolean;
}) {
  const { setOpen } = useMobileNav();

  return (
    <header className="h-16 border-b border-base-700 flex items-center justify-between gap-2 px-3 md:px-6 bg-base-950 fixed top-0 left-0 md:left-60 right-0 z-30">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <button
          onClick={() => setOpen(true)}
          className="md:hidden shrink-0 w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center text-base-300"
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="max-w-[160px] sm:max-w-xs md:max-w-none">
          <SearchBox />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        <NotificationBell
          userId={userId}
          initialNotifications={initialNotifications}
          initialUnreadCount={initialUnreadCount}
          soundPreference={soundPreference}
          soundEnabled={soundEnabled}
          soundVolume={soundVolume}
          desktopNotifications={desktopNotifications}
        />
        <Link href="/settings" className="hidden sm:inline text-base-400 hover:text-signal text-xs">
          Settings
        </Link>
        <div className="text-right leading-tight hidden md:block">
          <div className="text-sm">{name}</div>
          <div className="text-[10px] uppercase tracking-widest text-base-400">{role}</div>
        </div>
        <div className="w-8 h-8 rounded-full bg-signal-dim border border-signal flex items-center justify-center font-mono text-xs shrink-0 overflow-hidden">
          {avatarImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarImageUrl} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="hidden sm:inline btn-secondary text-xs py-1.5"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}

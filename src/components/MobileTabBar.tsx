"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileNav } from "@/components/MobileNavProvider";

export default function MobileTabBar({ role, unreadCount }: { role: string; unreadCount: number }) {
  const pathname = usePathname();
  const { setOpen } = useMobileNav();
  const isMember = role === "MEMBER";

  const tabs = [
    { href: "/dashboard", label: "Home", icon: "◆" },
    { href: isMember ? "/my-tasks" : "/tasks", label: "Tasks", icon: "☑" },
    { href: "/chat", label: "Chat", icon: "◐", badge: unreadCount },
    { href: "/team", label: "Team", icon: "◈" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-base-900 border-t border-base-700 flex items-stretch h-16 print:hidden">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative ${
              active ? "text-signal" : "text-base-400"
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[10px]">{tab.label}</span>
            {!!tab.badge && (
              <span className="absolute top-1.5 right-1/4 w-4 h-4 rounded-full bg-danger text-white text-[9px] flex items-center justify-center font-mono">
                {tab.badge > 9 ? "9+" : tab.badge}
              </span>
            )}
          </Link>
        );
      })}
      <button
        onClick={() => setOpen(true)}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 text-base-400"
      >
        <span className="text-base">☰</span>
        <span className="text-[10px]">More</span>
      </button>
    </nav>
  );
}

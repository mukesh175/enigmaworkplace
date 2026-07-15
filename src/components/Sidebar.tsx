"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { useMobileNav } from "@/components/MobileNavProvider";

const NAV_ADMIN = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/clients", label: "Clients", icon: "◇" },
  { href: "/projects", label: "Projects", icon: "▣" },
  { href: "/tasks", label: "Tasks", icon: "☑" },
  { href: "/time", label: "Time", icon: "◷" },
  { href: "/invoices", label: "Invoices", icon: "▤" },
  { href: "/revenue", label: "Revenue", icon: "◈" },
  { href: "/payslips", label: "Payslips", icon: "▤" },
  { href: "/leaves", label: "Leaves", icon: "◔" },
  { href: "/team", label: "Team", icon: "◈" },
  { href: "/chat", label: "Chat", icon: "◐" },
  { href: "/files", label: "Files", icon: "▢" },
  { href: "/notes", label: "Notes", icon: "✎" },
  { href: "/integrations", label: "Integrations", icon: "⇄" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

const NAV_MEMBER = [
  { href: "/dashboard", label: "Dashboard", icon: "◆" },
  { href: "/my-tasks", label: "My Tasks", icon: "☑" },
  { href: "/projects", label: "Projects", icon: "▣" },
  { href: "/time", label: "Time", icon: "◷" },
  { href: "/payslips", label: "Payslips", icon: "▤" },
  { href: "/leaves", label: "Leaves", icon: "◔" },
  { href: "/team", label: "Team", icon: "◈" },
  { href: "/chat", label: "Messages", icon: "◐" },
  { href: "/files", label: "Files", icon: "▢" },
  { href: "/notes", label: "Notes", icon: "✎" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export default function Sidebar({ role, unreadCount }: { role: string; unreadCount: number }) {
  const pathname = usePathname();
  const { open, setOpen } = useMobileNav();
  const isMember = role === "MEMBER";
  const NAV = isMember ? NAV_MEMBER : NAV_ADMIN;

  // Close the mobile drawer automatically whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:sticky top-0 left-0 z-40 w-64 md:w-60 shrink-0 bg-base-900 border-r border-base-700 flex flex-col h-screen transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="px-5 py-6 border-b border-base-700 flex items-center justify-between">
          <div>
            <div className="bg-white rounded-sm px-3 py-2 inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.webp" alt="Enigma Nxt" className="h-7 w-auto" />
            </div>
            <div className="text-[10px] uppercase tracking-widest text-base-400 mt-1.5">
              {isMember ? "My Workspace" : "Workplace OS"}
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-base-400 hover:text-signal text-lg">
            ✕
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scroll-thin">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                  active
                    ? "bg-base-800 text-signal border border-base-600"
                    : "text-base-300 border border-transparent hover:bg-base-800 hover:text-base-100"
                }`}
              >
                <span className="text-xs w-4 text-center">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.href === "/chat" && unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-danger text-white text-[10px] flex items-center justify-center font-mono">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-base-700 flex items-center justify-between">
          <span className="text-[11px] text-base-500 font-mono">v1.0 · self-hosted</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="sm:hidden text-xs text-base-400 hover:text-danger"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

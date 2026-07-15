"use client";

import { usePathname } from "next/navigation";

export default function ChatPanes({ list, children }: { list: React.ReactNode; children: React.ReactNode }) {
  const pathname = usePathname();
  const isThread = pathname !== "/chat";

  return (
    <div className="card flex h-[calc(100vh-10rem)] md:h-[75vh] overflow-hidden">
      <div
        className={`w-full md:w-72 shrink-0 border-r border-base-700 flex-col bg-base-900 ${
          isThread ? "hidden md:flex" : "flex"
        }`}
      >
        {list}
      </div>
      <div className={`flex-1 min-w-0 flex-col ${isThread ? "flex" : "hidden md:flex"}`}>{children}</div>
    </div>
  );
}

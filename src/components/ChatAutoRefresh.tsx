"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function ChatAutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingRef = useRef(false);

  useEffect(() => {
    pendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    const id = setInterval(() => {
      // Skip this tick entirely if the previous refresh hasn't finished yet,
      // or the tab isn't visible — this is what prevents requests piling up.
      if (document.visibilityState === "visible" && !pendingRef.current) {
        startTransition(() => router.refresh());
      }
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}

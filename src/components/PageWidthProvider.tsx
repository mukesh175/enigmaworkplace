"use client";

import { createContext, useContext, useEffect, useState } from "react";

const PageWidthContext = createContext<{
  fullWidth: boolean;
  setFullWidth: (v: boolean) => void;
} | null>(null);

export function PageWidthProvider({ children }: { children: React.ReactNode }) {
  const [fullWidth, setFullWidth] = useState(false);
  return <PageWidthContext.Provider value={{ fullWidth, setFullWidth }}>{children}</PageWidthContext.Provider>;
}

export function usePageWidth() {
  const ctx = useContext(PageWidthContext);
  if (!ctx) throw new Error("usePageWidth must be used within PageWidthProvider");
  return ctx;
}

// Drop this at the top of any page that wants its <main> container to span
// the full width next to the sidebar instead of the default max-w-6xl.
// Automatically reverts to the default the moment the page unmounts (i.e.
// the person navigates elsewhere), so it never leaks into other pages.
export function FullWidthPage() {
  const { setFullWidth } = usePageWidth();
  useEffect(() => {
    setFullWidth(true);
    return () => setFullWidth(false);
  }, [setFullWidth]);
  return null;
}

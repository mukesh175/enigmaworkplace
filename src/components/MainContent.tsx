"use client";

import { usePageWidth } from "@/components/PageWidthProvider";

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { fullWidth } = usePageWidth();
  return (
    <main
      className={`pt-20 px-4 md:px-6 pb-20 md:pb-6 print:p-0 print:pt-0 print:max-w-none ${
        fullWidth ? "max-w-none" : "max-w-6xl mx-auto"
      }`}
    >
      {children}
    </main>
  );
}

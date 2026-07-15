"use client";

import { useState } from "react";

const SWATCHES = [
  { key: "--accent", label: "Accent", hint: "Buttons · Highlights" },
  { key: "--base-950", label: "Background", hint: "App background" },
  { key: "--base-900", label: "Surface", hint: "Cards · Panels" },
  { key: "--base-800", label: "Elevated", hint: "Modals · Popovers" },
  { key: "--base-800", label: "Input", hint: "Fields · Buttons" },
  { key: "--base-500", label: "Muted", hint: "Secondary text" },
  { key: "--base-100", label: "Text", hint: "Primary content" },
  { key: "--accent", label: "On Accent", hint: "Text on accent bg", fixed: "#ffffff" },
];

export default function BrandColours() {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(cssVar: string, idx: number, fixed?: string) {
    if (typeof window === "undefined") return;
    const value =
      fixed ?? (getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim() || cssVar);
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopied(`${idx}`);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-base mb-1">Brand colours</h2>
      <p className="text-base-400 text-sm mb-5">Click any swatch to copy the current hex value.</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {SWATCHES.map((s, i) => (
          <button
            key={`${s.key}-${i}`}
            type="button"
            onClick={() => copy(s.key, i, s.fixed)}
            className="text-left"
          >
            <span
              className="block h-16 rounded-sm border border-base-700 mb-2"
              style={{ backgroundColor: s.fixed ?? `var(${s.key})` }}
            />
            <div className="text-sm">{s.label}</div>
            <div className="text-[11px] text-base-500 font-mono">{copied === `${i}` ? "Copied!" : s.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

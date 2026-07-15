"use client";

import { useState, useTransition } from "react";
import { updateThemeMode, updateAccentColor } from "@/lib/actions/profile";
import { ACCENT_SWATCHES } from "@/lib/fonts";

export default function ThemeAccentPicker({
  themeMode,
  accentColor,
}: {
  themeMode: string;
  accentColor: string;
}) {
  const [mode, setMode] = useState(themeMode);
  const [accent, setAccent] = useState(accentColor.toLowerCase());
  const [, startTransition] = useTransition();

  function chooseMode(next: "dark" | "light") {
    setMode(next);
    startTransition(() => updateThemeMode(next));
  }

  function chooseAccent(hex: string) {
    setAccent(hex.toLowerCase());
    startTransition(() => updateAccentColor(hex));
  }

  return (
    <div className="card p-6">
      <h2 className="font-display text-base mb-1">Colour theme</h2>
      <p className="text-base-400 text-sm mb-5">Theme is applied instantly and synced to your account across devices.</p>

      <div className="label">Appearance</div>
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => chooseMode("dark")}
          className={`px-4 py-2 rounded-sm text-sm border font-medium ${
            mode === "dark" ? "bg-signal border-signal text-white" : "border-base-600 text-base-300 hover:border-base-400"
          }`}
        >
          Dark
        </button>
        <button
          type="button"
          onClick={() => chooseMode("light")}
          className={`px-4 py-2 rounded-sm text-sm border font-medium ${
            mode === "light" ? "bg-signal border-signal text-white" : "border-base-600 text-base-300 hover:border-base-400"
          }`}
        >
          Light
        </button>
      </div>

      <div className="label mb-3">Accent</div>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-4">
        {ACCENT_SWATCHES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => chooseAccent(s.hex)}
            title={s.label}
            className="flex flex-col items-center gap-1.5 group"
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-offset-2 ring-offset-base-900 transition"
              style={{
                backgroundColor: s.hex,
                boxShadow: accent === s.hex.toLowerCase() ? `0 0 0 2px ${s.hex}` : undefined,
              }}
            >
              {accent === s.hex.toLowerCase() && <span className="text-white text-xs">✓</span>}
            </span>
            <span className="text-[11px] text-base-400 group-hover:text-base-200">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

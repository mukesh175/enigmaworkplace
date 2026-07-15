"use client";

import { useState, useTransition } from "react";
import { updateFontPrefs } from "@/lib/actions/profile";
import { FONT_OPTIONS, FONT_WEIGHT_OPTIONS, FONT_SIZE_STEPS, fontCssVar, fontWeightValue } from "@/lib/fonts";

export default function FontPicker({
  fontFamily,
  fontWeight,
  fontSizeScale,
}: {
  fontFamily: string;
  fontWeight: string;
  fontSizeScale: number;
}) {
  const [family, setFamily] = useState(fontFamily);
  const [weight, setWeight] = useState(fontWeight);
  const [size, setSize] = useState(fontSizeScale);
  const [, startTransition] = useTransition();

  function chooseFamily(id: string) {
    setFamily(id);
    startTransition(() => updateFontPrefs({ fontFamily: id }));
  }
  function chooseWeight(id: string) {
    setWeight(id);
    startTransition(() => updateFontPrefs({ fontWeight: id }));
  }
  function chooseSize(v: number) {
    setSize(v);
    startTransition(() => updateFontPrefs({ fontSizeScale: v }));
  }

  const previewStyle = {
    fontFamily: `var(${fontCssVar(family)})`,
    fontWeight: fontWeightValue(weight),
  };

  return (
    <div className="card p-6">
      <h2 className="font-display text-base mb-1">Font style</h2>
      <p className="text-base-400 text-sm mb-5">Loaded on-demand · applied instantly across the whole app.</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-h-72 overflow-y-auto scroll-thin pr-1">
        {FONT_OPTIONS.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => chooseFamily(f.id)}
            className={`text-left px-3 py-3 rounded-sm border ${
              family === f.id ? "border-signal bg-base-800" : "border-base-700 hover:border-base-500"
            }`}
          >
            <div className="text-xl leading-none mb-1.5" style={{ fontFamily: `var(${f.cssVar})` }}>
              Aa
            </div>
            <div className="text-xs text-base-200">{f.label}{i === 0 ? " (Default)" : ""}</div>
            <div className="text-[10px] text-base-500">Rg · Sb · Bd</div>
          </button>
        ))}
      </div>

      <div className="card p-5 mb-6" style={previewStyle}>
        <div className="text-xl mb-1">The quick brown fox</div>
        <div className="text-sm text-base-400">Revenue · Projects · Invoices · Team · 0123456789</div>
      </div>

      <div className="label mb-2">Font weight</div>
      <div className="grid grid-cols-4 gap-2 mb-6">
        {FONT_WEIGHT_OPTIONS.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => chooseWeight(w.id)}
            className={`px-3 py-2 rounded-sm border text-center ${
              weight === w.id ? "border-signal bg-base-800 text-signal" : "border-base-700 text-base-300 hover:border-base-500"
            }`}
          >
            <div className="text-sm" style={{ fontWeight: w.value }}>Aa</div>
            <div className="text-xs">{w.label}</div>
            <div className="text-[10px] text-base-500">{w.value}</div>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="label mb-0">Font size</div>
        <button type="button" onClick={() => chooseSize(1.0)} className="text-xs text-signal hover:text-signal-soft">
          Reset to 1×
        </button>
      </div>
      <input
        type="range"
        min={FONT_SIZE_STEPS[0]}
        max={FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1]}
        step={0.05}
        value={size}
        onChange={(e) => chooseSize(Number(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-[11px] text-base-500 mt-1">
        {FONT_SIZE_STEPS.map((s) => (
          <button key={s} type="button" onClick={() => chooseSize(s)} className="hover:text-base-200">
            {s.toFixed(2)}×
          </button>
        ))}
      </div>
      <p className="text-xs text-base-500 mt-2">Scales all text across the app.</p>
    </div>
  );
}

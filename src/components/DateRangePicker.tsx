"use client";

import { DATE_RANGE_PRESETS, resolveDateRange, type DateRangePresetId, type DateRange } from "@/lib/meta";

export default function DateRangePicker({
  preset,
  customRange,
  onChange,
}: {
  preset: DateRangePresetId;
  customRange: DateRange;
  onChange: (preset: DateRangePresetId, customRange: DateRange) => void;
}) {
  const resolved = resolveDateRange(preset, customRange);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={preset}
        onChange={(e) => onChange(e.target.value as DateRangePresetId, customRange)}
        className="input text-xs w-auto"
      >
        {DATE_RANGE_PRESETS.map((p) => (
          <option key={p.id} value={p.id}>{p.label}</option>
        ))}
      </select>

      {preset === "custom" ? (
        <>
          <input
            type="date"
            value={customRange.since}
            max={customRange.until}
            onChange={(e) => onChange("custom", { ...customRange, since: e.target.value })}
            className="input text-xs w-auto"
          />
          <span className="text-base-500 text-xs">to</span>
          <input
            type="date"
            value={customRange.until}
            min={customRange.since}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onChange("custom", { ...customRange, until: e.target.value })}
            className="input text-xs w-auto"
          />
        </>
      ) : (
        <span className="text-base-500 text-xs">
          {resolved.since === resolved.until ? resolved.since : `${resolved.since} → ${resolved.until}`}
        </span>
      )}
    </div>
  );
}

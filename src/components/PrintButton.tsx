"use client";

export default function PrintButton({ label = "Print" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn-secondary text-xs">
      {label}
    </button>
  );
}

export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-base-700 border-t-signal rounded-full animate-spin" />
        <p className="text-base-500 text-sm">Loading…</p>
      </div>
    </div>
  );
}

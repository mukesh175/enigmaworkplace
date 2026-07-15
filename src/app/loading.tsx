export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-base-700 border-t-signal rounded-full animate-spin" />
        <p className="text-base-500 text-sm font-display">Enigma Workplace</p>
      </div>
    </div>
  );
}

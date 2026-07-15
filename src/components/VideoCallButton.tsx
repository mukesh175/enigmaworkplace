"use client";

export default function VideoCallButton({ onStart }: { onStart: () => void }) {
  function handleClick() {
    window.open("https://meet.google.com/new", "_blank", "noopener,noreferrer");
    onStart();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal"
      title="Start a Google Meet"
    >
      📹
    </button>
  );
}

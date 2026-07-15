export const SOUND_OPTIONS = [
  { id: "chime", label: "Chime" },
  { id: "ping", label: "Ping" },
  { id: "pop", label: "Pop" },
  { id: "none", label: "Silent" },
] as const;

export type SoundId = (typeof SOUND_OPTIONS)[number]["id"];

let ctx: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    ctx = new AudioCtx();
  }
  return ctx;
}

function tone(freq: number, startAt: number, duration: number, gainPeak: number) {
  const audioCtx = getContext();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  const t0 = audioCtx.currentTime + startAt;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

// volume: 0..1, applied as a multiplier on each tone's peak gain
export function playNotificationSound(sound: SoundId, enabled = true, volume = 0.6) {
  if (!enabled || sound === "none") return;
  const audioCtx = getContext();
  if (!audioCtx) return;
  if (audioCtx.state === "suspended") audioCtx.resume();

  const v = Math.max(0, Math.min(1, volume));

  if (sound === "chime") {
    tone(660, 0, 0.18, 0.15 * v);
    tone(880, 0.12, 0.22, 0.15 * v);
  } else if (sound === "ping") {
    tone(1000, 0, 0.15, 0.15 * v);
  } else if (sound === "pop") {
    tone(320, 0, 0.08, 0.2 * v);
  }
}

export function showDesktopNotification(title: string, body?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/icons/icon-192.png" });
  } catch (err) {
    console.error("Desktop notification failed:", err);
  }
}

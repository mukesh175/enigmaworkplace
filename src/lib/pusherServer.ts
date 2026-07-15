import Pusher from "pusher";

let instance: Pusher | null = null;

export function getPusherServer(): Pusher | null {
  if (!process.env.PUSHER_APP_ID) return null; // gracefully no-op if not configured yet
  if (!instance) {
    instance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true,
    });
  }
  return instance;
}

// Fire-and-forget: realtime is a nice-to-have. If Pusher is down or
// misconfigured, we never want that to break the actual message/notification
// being saved — the app already works fine via revalidatePath as a fallback.
export async function pusherTrigger(channel: string, event: string, data: unknown = {}) {
  try {
    const pusher = getPusherServer();
    if (!pusher) return;
    await pusher.trigger(channel, event, data);
  } catch (err) {
    console.error("Pusher trigger failed:", err);
  }
}

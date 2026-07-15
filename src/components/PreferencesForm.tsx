"use client";

import { useEffect, useState, useTransition } from "react";
import { updatePreferences } from "@/lib/actions/notifications";
import { playNotificationSound, showDesktopNotification } from "@/lib/sounds";

export default function PreferencesForm({
  soundEnabled,
  soundVolume,
  desktopNotifications,
  autoLogoutMinutes,
}: {
  soundEnabled: boolean;
  soundVolume: number;
  desktopNotifications: boolean;
  autoLogoutMinutes: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [volume, setVolume] = useState(soundVolume);
  const [desktopChecked, setDesktopChecked] = useState(desktopNotifications);
  const [testSent, setTestSent] = useState(false);
  // Start with a value that matches what the server renders (it has no
  // window), then correct it after mount. Reading Notification.permission
  // directly in useState's initializer caused a hydration mismatch, since
  // that branch evaluates differently on the server vs. the browser.
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if ("Notification" in window) {
      setDesktopPermission(Notification.permission);
    }
  }, []);

  async function requestPermission() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const perm = await Notification.requestPermission();
    setDesktopPermission(perm);
  }

  function sendTestNotification() {
    showDesktopNotification("Test notification", "If you can see this, desktop notifications are working.");
    setTestSent(true);
    setTimeout(() => setTestSent(false), 4000);
  }

  function handleSubmit(formData: FormData) {
    // A disabled checkbox is silently excluded from FormData by the browser,
    // so we set the value explicitly from state instead of relying on the
    // input's own submission — otherwise saving while permission isn't
    // granted would reset this setting to off.
    formData.set("desktopNotifications", desktopChecked ? "on" : "off");
    startTransition(() => updatePreferences(formData));
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <label className="flex items-center justify-between">
        <span className="text-sm">Play sound on new notifications</span>
        <input type="checkbox" name="soundEnabled" defaultChecked={soundEnabled} />
      </label>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">Volume</span>
          <span className="text-xs text-base-500 font-mono">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range"
          name="soundVolume"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            playNotificationSound("ping", true, v);
          }}
          className="w-full"
        />
      </div>

      <div>
        <label className="flex items-center justify-between">
          <span className="text-sm">Desktop notifications</span>
          <input
            type="checkbox"
            checked={desktopChecked}
            onChange={(e) => setDesktopChecked(e.target.checked)}
            disabled={desktopPermission !== "granted"}
          />
        </label>

        {desktopPermission !== "granted" ? (
          <button type="button" onClick={requestPermission} className="btn-secondary text-xs mt-2">
            {desktopPermission === "unsupported" ? "Not supported in this browser" : "Allow desktop notifications"}
          </button>
        ) : (
          <>
            <button type="button" onClick={sendTestNotification} className="btn-secondary text-xs mt-2">
              {testSent ? "Test sent — check for a popup" : "Send test notification"}
            </button>
            {testSent && (
              <p className="text-xs text-base-500 mt-2">
                If nothing appeared: many operating systems suppress notification popups while this browser tab
                is the one you're actively looking at — try switching to another window right after clicking,
                or check your OS's notification center/history to confirm it actually arrived.
              </p>
            )}
          </>
        )}
        {desktopPermission === "denied" && (
          <p className="text-xs text-warn mt-2">
            Blocked at the browser level. You'll need to allow notifications for this site in your browser's
            site settings (usually via the padlock icon next to the address bar), then reload this page.
          </p>
        )}
      </div>

      <div>
        <label className="label">Auto sign-out after inactivity</label>
        <select name="autoLogoutMinutes" defaultValue={autoLogoutMinutes} className="input">
          <option value={0}>Off</option>
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>1 hour</option>
        </select>
      </div>

      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}

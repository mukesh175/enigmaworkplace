"use client";

import { useEffect, useState } from "react";

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setInstallPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!installPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 card p-4 max-w-xs shadow-xl">
      <p className="text-sm mb-3">Install Enigma Workplace as an app for quicker access?</p>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            installPrompt.prompt();
            await installPrompt.userChoice;
            setInstallPrompt(null);
          }}
          className="btn-primary text-xs flex-1"
        >
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="btn-secondary text-xs">
          Not now
        </button>
      </div>
    </div>
  );
}

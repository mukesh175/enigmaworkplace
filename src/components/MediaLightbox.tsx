"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type LightboxFile = { url: string; name: string; mimeType: string | null } | null;

export default function MediaLightbox({ file, onClose }: { file: LightboxFile; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!file) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, onClose]);

  if (!file || typeof document === "undefined") return null;

  const isImage = file.mimeType?.startsWith("image/");

  // Cross-origin links (our files live on Vercel Blob, a different domain
  // than the app) silently ignore the `download` attribute in every browser,
  // so a plain <a download> just opens the file instead of saving it. This
  // fetches the actual bytes and triggers a save dialog without navigating
  // away from the page at all.
  async function handleDownload() {
    if (!file) return;
    setDownloading(true);
    try {
      const res = await fetch(file.url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(file.url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div className="max-w-3xl max-h-[85vh] w-full flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <div className="w-full flex items-center justify-between mb-3 text-white">
          <span className="text-sm truncate">{file.name}</span>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={handleDownload} disabled={downloading} className="btn-primary text-xs disabled:opacity-60">
              {downloading ? "Downloading…" : "Download"}
            </button>
            <button onClick={onClose} className="btn-secondary text-xs">Close</button>
          </div>
        </div>

        {isImage ? (
          <img src={file.url} alt={file.name} className="max-w-full max-h-[70vh] rounded-sm object-contain" />
        ) : (
          <div className="card p-10 flex flex-col items-center gap-3 w-full">
            <span className="text-4xl">📄</span>
            <p className="text-base-300 text-sm">Preview isn't available for this file type.</p>
            <button onClick={handleDownload} disabled={downloading} className="btn-primary text-sm disabled:opacity-60">
              {downloading ? "Downloading…" : `Download ${file.name}`}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

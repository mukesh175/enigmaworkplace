"use client";

import { useEffect, useState } from "react";
import { AD_PREVIEW_FORMATS, type AdPreviewFormat } from "@/lib/meta";
import { getMetaAdPreview } from "@/lib/actions/integrations";

export default function AdPreviewModal({
  adId,
  adName,
  clientId,
  onClose,
}: {
  adId: string;
  adName?: string;
  clientId?: string;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<AdPreviewFormat>("MOBILE_FEED_STANDARD");
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getMetaAdPreview(adId, format, clientId).then((result) => {
      if (cancelled) return;
      setHtml(result.html);
      setError(result.error);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [adId, format, clientId]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto scroll-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-display text-base truncate pr-4">{adName ?? "Ad preview"}</h3>
          <button type="button" onClick={onClose} className="text-base-400 hover:text-base-100 text-lg leading-none">
            ×
          </button>
        </div>

        <select
          value={format}
          onChange={(e) => setFormat(e.target.value as AdPreviewFormat)}
          className="input text-xs w-auto mb-4"
        >
          {AD_PREVIEW_FORMATS.map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>

        <div className="flex justify-center bg-base-950 rounded-sm p-3 min-h-[300px] items-center">
          {loading ? (
            <p className="text-base-500 text-sm">Loading preview…</p>
          ) : error ? (
            <p className="text-danger text-sm text-center">Couldn't load preview: {error}</p>
          ) : html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="text-base-500 text-sm">No preview available.</p>
          )}
        </div>
      </div>
    </div>
  );
}

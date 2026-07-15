"use client";

import { useRef, useState, useTransition } from "react";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import { updateAvatarImage } from "@/lib/actions/profile";

const MAX_DIMENSION = 512;
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Downscales/re-encodes the image client-side before it ever reaches the
// network — keeps uploads fast and avoids storing full-resolution phone
// photos just to display a small circular avatar.
async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" });
}

export default function ProfileImageUpload({
  name,
  avatarColor,
  avatarImageUrl,
}: {
  name: string;
  avatarColor: string;
  avatarImageUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarImageUrl);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFile(file: File) {
    setError(null);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image is larger than 5MB.");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      const compressed = await compressImage(file);
      const result = await uploadFileWithProgress(compressed, setProgress);
      setPreview(result.url);
      startTransition(() => updateAvatarImage(result.url));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setPreview(null);
    setError(null);
    startTransition(() => updateAvatarImage(null));
  }

  return (
    <div>
      <div className="relative inline-block">
        <span
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-display shrink-0 overflow-hidden bg-cover bg-center"
          style={{ backgroundColor: avatarColor, color: "#1a1c1c" }}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={name} className="w-full h-full object-cover" />
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
        </span>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          title="Change profile photo"
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-signal border-2 border-base-900 flex items-center justify-center text-white text-xs"
        >
          ✎
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-2">
        {uploading ? (
          <p className="text-xs text-base-500">Uploading… {progress}%</p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-xs text-base-500">JPG, PNG or WebP · Max 5MB · Auto-compressed</p>
            {preview && (
              <button type="button" onClick={handleRemove} className="text-xs text-danger hover:underline">
                Remove
              </button>
            )}
          </div>
        )}
        {error && <p className="text-xs text-danger mt-1">{error}</p>}
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { postTaskComment, attachFileToTaskComment } from "@/lib/actions/tasks";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import EmojiPicker from "@/components/EmojiPicker";

export default function TaskCommentComposer({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearPendingFile() {
    if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    setPendingFile(null);
    setFilePreviewUrl(null);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setPendingFile(file);
    setFilePreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  }

  async function submit(formData: FormData) {
    const content = String(formData.get("content") || "").trim();

    if (pendingFile) {
      setUploadProgress(0);
      try {
        const uploaded = await uploadFileWithProgress(pendingFile, setUploadProgress);
        const attachFd = new FormData();
        attachFd.set("fileUrl", uploaded.url);
        attachFd.set("fileName", uploaded.name);
        attachFd.set("fileSize", String(uploaded.size));
        attachFd.set("mimeType", uploaded.mimeType || "");
        attachFd.set("caption", content);
        startTransition(() => attachFileToTaskComment(taskId, attachFd));
        clearPendingFile();
      } catch (err: any) {
        setUploadError(err.message || "Upload failed");
        setUploadProgress(null);
        return;
      }
    } else {
      if (!content) return;
      startTransition(() => postTaskComment(taskId, formData));
    }

    if (textareaRef.current) textareaRef.current.value = "";
  }

  function insertEmoji(emoji: string) {
    if (textareaRef.current) {
      const el = textareaRef.current;
      const start = el.selectionStart ?? el.value.length;
      el.value = el.value.slice(0, start) + emoji + el.value.slice(start);
      el.focus();
    }
  }

  const busy = isPending || uploadProgress !== null;

  return (
    <div>
      {uploadError && (
        <div className="flex items-center justify-between mb-2 text-xs text-danger">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="hover:text-base-100">✕</button>
        </div>
      )}

      {uploadProgress !== null && (
        <div className="mb-2">
          <div className="flex items-center gap-2 text-xs text-signal mb-1">
            <span className="animate-spin">⏳</span> Uploading… {uploadProgress}%
          </div>
          <div className="w-full h-1 bg-base-800 rounded-full overflow-hidden">
            <div className="h-full bg-signal transition-all" style={{ width: `${uploadProgress}%` }} />
          </div>
        </div>
      )}

      {pendingFile && uploadProgress === null && (
        <div className="mb-2 inline-flex items-center gap-2 bg-base-800 border border-base-700 rounded-sm px-3 py-2 relative">
          {filePreviewUrl ? (
            <img src={filePreviewUrl} alt={pendingFile.name} className="w-10 h-10 object-cover rounded-sm" />
          ) : (
            <span className="text-lg">📎</span>
          )}
          <span className="text-xs text-base-300 max-w-[10rem] truncate">{pendingFile.name}</span>
          <button
            type="button"
            onClick={clearPendingFile}
            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-danger text-white text-[10px] flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      <form action={submit} className="flex items-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal disabled:opacity-50"
          title="Attach a file"
        >
          📎
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
        <EmojiPicker onSelect={insertEmoji} />

        <textarea
          ref={textareaRef}
          name="content"
          rows={1}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 120) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={busy ? "Posting…" : pendingFile ? "Add a caption… (optional)" : "Add a comment… (Shift+Enter for new line)"}
          disabled={busy}
          className="input flex-1 min-w-0 resize-none py-2"
        />
        <button type="submit" disabled={busy} className="shrink-0 btn-primary disabled:opacity-50">
          {busy ? "Posting…" : "Post"}
        </button>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  postTaskComment,
  attachFileToTaskComment,
  editTaskComment,
  deleteTaskComment,
  toggleTaskCommentReaction,
  generateAndShareMeetLinkForTask,
} from "@/lib/actions/tasks";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import EmojiPicker from "@/components/EmojiPicker";
import MediaLightbox, { type LightboxFile } from "@/components/MediaLightbox";
import { linkify } from "@/lib/linkify";
import MentionDropdown from "@/components/MentionDropdown";

export type TaskDiscussionComment = {
  id: string;
  content: string;
  createdAt: Date | string;
  userId: string;
  user: { name: string; avatarColor: string };
  file: { url: string; name: string; mimeType: string | null } | null;
  reactions: { emoji: string; userId: string }[];
};

export default function TaskDiscussionThread({
  taskId,
  myId,
  comments,
  mentionableUsers,
}: {
  taskId: string;
  myId: string;
  comments: TaskDiscussionComment[];
  mentionableUsers: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [meetLoading, setMeetLoading] = useState(false);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [lightboxFile, setLightboxFile] = useState<LightboxFile>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [comments.length]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

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

  function saveEdit() {
    if (!editing) return;
    const fd = new FormData();
    fd.set("content", editing.content);
    startTransition(async () => {
      await editTaskComment(editing.id, taskId, fd);
      setEditing(null);
    });
  }

  async function handleStartMeet() {
    setMeetLoading(true);
    const result = await generateAndShareMeetLinkForTask(taskId);
    setMeetLoading(false);
    if (result.error) setUploadError(result.error);
  }

  const busy = isPending || uploadProgress !== null;
  const q = searchQuery.trim().toLowerCase();
  const visibleComments = q ? comments.filter((c) => c.content.toLowerCase().includes(q)) : comments;

  return (
    <>
      <MediaLightbox file={lightboxFile} onClose={() => setLightboxFile(null)} />

      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={() => {
            setSearchOpen((o) => !o);
            if (searchOpen) setSearchQuery("");
          }}
          className="text-xs text-base-500 hover:text-signal flex items-center gap-1"
        >
          🔍 {searchOpen ? "Close search" : "Search this discussion"}
        </button>
      </div>
      {searchOpen && (
        <div className="mb-3">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comments…"
            className="input text-sm"
          />
          {q && <p className="text-xs text-base-500 mt-1">{visibleComments.length} match{visibleComments.length === 1 ? "" : "es"}</p>}
        </div>
      )}

      <div className="space-y-4 mb-5 max-h-[28rem] overflow-y-auto scroll-thin pr-1">
        {visibleComments.length === 0 && (
          <p className="text-base-500 text-sm text-center py-6">
            {q ? "No comments match your search." : "No comments yet — start the discussion below."}
          </p>
        )}
        {visibleComments.map((c) => {
          const mine = c.userId === myId;
          const reactionCounts = c.reactions.reduce<Record<string, number>>((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
          }, {});
          const myReactions = new Set(c.reactions.filter((r) => r.userId === myId).map((r) => r.emoji));

          return (
            <div key={c.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-md">
                {!mine && <div className="text-xs text-base-500 mb-1">{c.user.name}</div>}

                {editing?.id === c.id ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editing.content}
                      onChange={(e) => setEditing({ id: c.id, content: e.target.value })}
                      className="input text-sm flex-1"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <button onClick={saveEdit} className="btn-primary text-xs px-2 py-1">Save</button>
                      <button onClick={() => setEditing(null)} className="btn-secondary text-xs px-2 py-1">✕</button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`px-4 py-2 rounded-sm text-sm ${
                      mine ? "bg-signal text-white" : "bg-base-800 text-base-100 border border-base-700"
                    }`}
                  >
                    {c.file && (
                      <button type="button" onClick={() => setLightboxFile(c.file)} className="block mb-1 text-left w-full">
                        {c.file.mimeType?.startsWith("image/") ? (
                          <img src={c.file.url} alt={c.file.name} className="max-w-full rounded-sm max-h-56" />
                        ) : (
                          <span className={`flex items-center gap-2 text-xs underline ${mine ? "text-white" : "text-signal"}`}>
                            📎 {c.file.name}
                          </span>
                        )}
                      </button>
                    )}
                    {c.content && (
                      <span className="whitespace-pre-wrap">{linkify(c.content, mine ? "text-white" : "text-signal", mentionableUsers.map((u) => u.name))}</span>
                    )}
                  </div>
                )}

                {Object.keys(reactionCounts).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => startTransition(() => toggleTaskCommentReaction(c.id, taskId, emoji))}
                        className={`text-xs px-1.5 py-0.5 rounded-full border ${
                          myReactions.has(emoji) ? "border-signal text-signal" : "border-base-600 text-base-300"
                        }`}
                      >
                        {emoji} {count}
                      </button>
                    ))}
                  </div>
                )}

                <div className={`flex items-center gap-2 text-[10px] text-base-500 mt-1 ${mine ? "justify-end" : ""}`}>
                  <span suppressHydrationWarning>
                    {new Date(c.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                    <EmojiPicker onSelect={(e) => startTransition(() => toggleTaskCommentReaction(c.id, taskId, e))} />
                    {mine && (
                      <>
                        <button onClick={() => setEditing({ id: c.id, content: c.content })} className="hover:text-signal">Edit</button>
                        <button onClick={() => startTransition(() => deleteTaskComment(c.id, taskId))} className="hover:text-danger">Delete</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

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

      <form action={submit} className="flex flex-col md:flex-row md:items-end gap-2">
        <div className="flex items-end gap-2 order-2 md:order-1 flex-1 min-w-0">
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
            placeholder={busy ? "Posting…" : pendingFile ? "Add a caption… (optional)" : "Add a comment…"}
            disabled={busy}
            className="input flex-1 min-w-0 resize-none py-2"
          />
          <button type="submit" disabled={busy} className="shrink-0 btn-primary disabled:opacity-50">
            {busy ? "Posting…" : "Post"}
          </button>
        </div>

        <div className="flex items-center gap-2 order-1 md:order-2 shrink-0">
          <button
            type="button"
            disabled={meetLoading}
            onClick={handleStartMeet}
            className="shrink-0 w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal disabled:opacity-50"
            title="Start a Google Meet and share the link"
          >
            {meetLoading ? "…" : "📹"}
          </button>
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
        </div>
      </form>
      <MentionDropdown textareaRef={textareaRef} users={mentionableUsers} />
    </>
  );
}

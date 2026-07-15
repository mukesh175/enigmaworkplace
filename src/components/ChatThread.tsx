"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  sendMessage,
  attachFileAndSend,
  editMessage,
  deleteMessage,
  toggleReaction,
  generateAndShareMeetLink,
} from "@/lib/actions/chat";
import { uploadFileWithProgress } from "@/lib/uploadWithProgress";
import PostTypeMenu from "@/components/PostTypeMenu";
import EmojiPicker from "@/components/EmojiPicker";
import MediaLightbox, { type LightboxFile } from "@/components/MediaLightbox";
import { linkify } from "@/lib/linkify";
import MentionDropdown from "@/components/MentionDropdown";

const TAG_COLOR: Record<string, string> = {
  ANNOUNCEMENT: "text-danger border-danger/40",
  DISCUSSION: "text-signal border-signal/40",
  IDEA: "text-warn border-warn/40",
  IMPORTANT: "text-danger border-danger/40",
  SUGGESTION: "text-ok border-ok/40",
};

export type ThreadMessage = {
  id: string;
  content: string;
  tag: string;
  editedAt: Date | string | null;
  deletedAt: Date | string | null;
  createdAt: Date | string;
  userId: string;
  user: { name: string; avatarColor: string };
  file: { url: string; name: string; mimeType: string | null } | null;
  replyTo: { id: string; content: string; user: { name: string } } | null;
  reactions: { emoji: string; userId: string }[];
};

export default function ChatThread({
  conversationId,
  myId,
  messages,
  otherReadTimes,
  mentionableUsers,
}: {
  conversationId: string;
  myId: string;
  messages: ThreadMessage[];
  otherReadTimes: (Date | string | null)[];
  mentionableUsers: { id: string; name: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [meetLoading, setMeetLoading] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; author: string; preview: string } | null>(null);
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [tag, setTag] = useState("NONE");
  const [lightboxFile, setLightboxFile] = useState<LightboxFile>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, conversationId]);

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
        startTransition(() => attachFileAndSend(conversationId, attachFd));
        clearPendingFile();
      } catch (err: any) {
        setUploadError(err.message || "Upload failed");
        setUploadProgress(null);
        return;
      }
    } else {
      if (!content) return;
      formData.set("tag", tag);
      if (replyTo) formData.set("replyToId", replyTo.id);
      startTransition(() => sendMessage(conversationId, formData));
    }

    if (textareaRef.current) textareaRef.current.value = "";
    setReplyTo(null);
    setTag("NONE");
  }

  function insertEmoji(emoji: string) {
    if (textareaRef.current) {
      const el = textareaRef.current;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      el.value = el.value.slice(0, start) + emoji + el.value.slice(end);
      el.focus();
    }
  }

  function saveEdit() {
    if (!editing) return;
    const fd = new FormData();
    fd.set("content", editing.content);
    startTransition(async () => {
      await editMessage(editing.id, conversationId, fd);
      setEditing(null);
    });
  }

  async function handleStartMeet() {
    setMeetLoading(true);
    const result = await generateAndShareMeetLink(conversationId);
    setMeetLoading(false);
    if (result.error) setUploadError(result.error);
  }

  const busy = isPending || uploadProgress !== null;
  const q = searchQuery.trim().toLowerCase();
  const visibleMessages = q ? messages.filter((m) => m.content.toLowerCase().includes(q)) : messages;

  return (
    <>
      <MediaLightbox file={lightboxFile} onClose={() => setLightboxFile(null)} />

      <div className="px-4 md:px-6 pt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setSearchOpen((o) => !o);
            if (searchOpen) setSearchQuery("");
          }}
          className="text-xs text-base-500 hover:text-signal flex items-center gap-1"
        >
          🔍 {searchOpen ? "Close search" : "Search this chat"}
        </button>
      </div>
      {searchOpen && (
        <div className="px-4 md:px-6 pb-2">
          <input
            autoFocus
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search messages…"
            className="input text-sm"
          />
          {q && <p className="text-xs text-base-500 mt-1">{visibleMessages.length} match{visibleMessages.length === 1 ? "" : "es"}</p>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto scroll-thin px-4 md:px-6 py-5 space-y-4">
        {visibleMessages.length === 0 && (
          <p className="text-base-500 text-sm text-center mt-10">
            {q ? "No messages match your search." : "No messages yet — say hello."}
          </p>
        )}
        {visibleMessages.map((m, i) => {
          const mine = m.userId === myId;
          const isLastMine = mine && !visibleMessages.slice(i + 1).some((mm) => mm.userId === myId);
          const seen = isLastMine
            ? otherReadTimes.length > 0 && otherReadTimes.every((t) => t && new Date(t) >= new Date(m.createdAt))
              ? "Seen"
              : "Sent"
            : null;
          const isDeleted = !!m.deletedAt;

          const reactionCounts = m.reactions.reduce<Record<string, number>>((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
            return acc;
          }, {});
          const myReactions = new Set(m.reactions.filter((r) => r.userId === myId).map((r) => r.emoji));

          return (
            <div key={m.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-md">
                {!mine && <div className="text-xs text-base-500 mb-1">{m.user.name}</div>}

                {!isDeleted && m.tag !== "NONE" && (
                  <span className={`pill ${TAG_COLOR[m.tag] ?? ""} mb-1 inline-block`}>{m.tag}</span>
                )}

                {!isDeleted && m.replyTo && (
                  <div className="text-xs text-base-500 border-l-2 border-base-600 pl-2 mb-1">
                    {m.replyTo.user.name}: {m.replyTo.content.slice(0, 60)}
                  </div>
                )}

                {editing?.id === m.id ? (
                  <div className="flex gap-2">
                    <textarea
                      value={editing.content}
                      onChange={(e) => setEditing({ id: m.id, content: e.target.value })}
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
                      isDeleted
                        ? "bg-transparent border border-dashed border-base-700 text-base-500 italic"
                        : mine
                        ? "bg-signal text-white"
                        : "bg-base-800 text-base-100 border border-base-700"
                    }`}
                  >
                    {isDeleted ? (
                      "This message was deleted"
                    ) : (
                      <>
                        {m.file && (
                          <button
                            type="button"
                            onClick={() => setLightboxFile(m.file)}
                            className="block mb-1 text-left w-full"
                          >
                            {m.file.mimeType?.startsWith("image/") ? (
                              <img src={m.file.url} alt={m.file.name} className="max-w-full rounded-sm max-h-56" />
                            ) : (
                              <span className={`flex items-center gap-2 text-xs underline ${mine ? "text-white" : "text-signal"}`}>
                                📎 {m.file.name}
                              </span>
                            )}
                          </button>
                        )}
                        {m.content && (
                          <span className="whitespace-pre-wrap">
                            {linkify(m.content, mine ? "text-white" : "text-signal", mentionableUsers.map((u) => u.name))}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}

                {!isDeleted && Object.keys(reactionCounts).length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <button
                        key={emoji}
                        onClick={() => startTransition(() => toggleReaction(m.id, conversationId, emoji))}
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
                  <span suppressHydrationWarning>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  {!isDeleted && m.editedAt && <span>(edited)</span>}
                  {seen && <span>· {seen}</span>}

                  {!isDeleted && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                      <EmojiPicker onSelect={(e) => startTransition(() => toggleReaction(m.id, conversationId, e))} />
                      <button
                        onClick={() => setReplyTo({ id: m.id, author: m.user.name, preview: m.content || m.file?.name || "" })}
                        className="hover:text-signal"
                      >
                        Reply
                      </button>
                      {mine && (
                        <>
                          <button onClick={() => setEditing({ id: m.id, content: m.content })} className="hover:text-signal">
                            Edit
                          </button>
                          <button
                            onClick={() => startTransition(() => deleteMessage(m.id, conversationId))}
                            className="hover:text-danger"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-base-700">
        {uploadError && (
          <div className="flex items-center justify-between px-4 pt-3 text-xs text-danger">
            <span>
              {uploadError}
              {uploadError.includes("Settings") && (
                <>
                  {" "}
                  <a href="/settings" className="underline hover:text-white">Go to Settings →</a>
                </>
              )}
            </span>
            <button onClick={() => setUploadError(null)} className="hover:text-base-100">✕</button>
          </div>
        )}

        {replyTo && (
          <div className="flex items-center justify-between px-4 pt-3 text-xs">
            <div className="text-base-400">
              Replying to <span className="text-signal">{replyTo.author}</span>: {replyTo.preview.slice(0, 60)}
            </div>
            <button onClick={() => setReplyTo(null)} className="text-base-500 hover:text-danger">✕</button>
          </div>
        )}

        {uploadProgress !== null && (
          <div className="px-4 pt-3">
            <div className="flex items-center gap-2 text-xs text-signal mb-1">
              <span className="animate-spin">⏳</span> Uploading… {uploadProgress}%
            </div>
            <div className="w-full h-1 bg-base-800 rounded-full overflow-hidden">
              <div className="h-full bg-signal transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          </div>
        )}

        {pendingFile && uploadProgress === null && (
          <div className="px-4 pt-3">
            <div className="inline-flex items-center gap-2 bg-base-800 border border-base-700 rounded-sm px-3 py-2 relative">
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
          </div>
        )}

        <form action={submit} className="p-3 md:p-4 flex flex-col md:flex-row md:items-end gap-2">
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
              placeholder={busy ? "Sending…" : pendingFile ? "Add a caption… (optional)" : "Type a message…"}
              disabled={busy}
              className="input flex-1 min-w-0 resize-none py-2"
            />
            <button type="submit" disabled={busy} className="shrink-0 btn-primary disabled:opacity-50">
              {busy ? "Sending…" : "Send"}
            </button>
          </div>

          <div className="flex items-center gap-2 order-1 md:order-2 shrink-0">
            <button
              type="button"
              disabled={meetLoading}
              onClick={handleStartMeet}
              className="w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal disabled:opacity-50"
              title="Start a Google Meet and share the link"
            >
              {meetLoading ? "…" : "📹"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-sm border border-base-600 flex items-center justify-center hover:border-signal text-base-300 hover:text-signal disabled:opacity-50"
              title="Attach a file"
            >
              📎
            </button>
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <EmojiPicker onSelect={insertEmoji} />
            <PostTypeMenu value={tag} onChange={setTag} />
            {tag !== "NONE" && (
              <span className="shrink-0 pill text-signal border-signal/40">
                {tag}
                <button type="button" onClick={() => setTag("NONE")} className="ml-1 hover:text-danger">✕</button>
              </span>
            )}
          </div>
        </form>
        <MentionDropdown textareaRef={textareaRef} users={mentionableUsers} />
      </div>
    </>
  );
}

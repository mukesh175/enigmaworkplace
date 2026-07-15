"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

export default function ChatComposerFields({
  placeholder = "Type a message… Enter to send",
  pendingLabel = "Sending…",
  buttonLabel = "Send",
}: {
  placeholder?: string;
  pendingLabel?: string;
  buttonLabel?: string;
}) {
  const { pending } = useFormStatus();
  const inputRef = useRef<HTMLInputElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending) {
      inputRef.current?.form?.reset();
      inputRef.current?.focus();
    }
    wasPending.current = pending;
  }, [pending]);

  return (
    <>
      <input
        ref={inputRef}
        name="content"
        autoComplete="off"
        placeholder={pending ? pendingLabel : placeholder}
        className="input flex-1"
        disabled={pending}
      />
      <button type="submit" disabled={pending} className="btn-primary shrink-0 disabled:opacity-50">
        {pending ? pendingLabel : buttonLabel}
      </button>
    </>
  );
}

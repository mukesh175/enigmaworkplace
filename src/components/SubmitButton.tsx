"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({
  idleLabel,
  pendingLabel,
  className = "btn-primary",
}: {
  idleLabel: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

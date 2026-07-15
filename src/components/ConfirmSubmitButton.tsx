"use client";

import { useFormStatus } from "react-dom";

export default function ConfirmSubmitButton({
  idleLabel,
  pendingLabel,
  confirmMessage,
  className = "btn-secondary text-xs",
}: {
  idleLabel: string;
  pendingLabel: string;
  confirmMessage: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault();
      }}
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}

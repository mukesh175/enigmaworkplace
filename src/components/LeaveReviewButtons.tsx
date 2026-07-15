"use client";

import { useTransition } from "react";
import { reviewLeave } from "@/lib/actions/leaves";

export default function LeaveReviewButtons({ leaveId }: { leaveId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      <button
        disabled={isPending}
        onClick={() => startTransition(() => reviewLeave(leaveId, "APPROVED"))}
        className="text-xs text-ok hover:underline disabled:opacity-50"
      >
        Approve
      </button>
      <button
        disabled={isPending}
        onClick={() => startTransition(() => reviewLeave(leaveId, "REJECTED"))}
        className="text-xs text-danger hover:underline disabled:opacity-50"
      >
        Reject
      </button>
    </div>
  );
}

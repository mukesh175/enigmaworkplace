"use client";

import { useState, useTransition } from "react";
import { updateNotificationPrefs } from "@/lib/actions/profile";

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="w-11 h-6 rounded-full transition-colors shrink-0 p-0.5"
      style={{ backgroundColor: checked ? "var(--accent)" : "var(--base-600)" }}
    >
      <span
        className="block w-5 h-5 rounded-full bg-white transition-transform duration-150 ease-out"
        style={{ transform: checked ? "translateX(20px)" : "translateX(0px)" }}
      />
    </button>
  );
}

export default function NotificationPrefsForm({
  dmNotifPref,
  groupNotifPref,
  threadReplyPref,
  taskUpdateAlerts,
  pushNotifications,
  emailNotifications,
}: {
  dmNotifPref: string;
  groupNotifPref: string;
  threadReplyPref: string;
  taskUpdateAlerts: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [taskUpdates, setTaskUpdates] = useState(taskUpdateAlerts);
  const [push, setPush] = useState(pushNotifications);
  const [email, setEmail] = useState(emailNotifications);

  function handleSubmit(formData: FormData) {
    formData.set("taskUpdateAlerts", taskUpdates ? "on" : "off");
    formData.set("pushNotifications", push ? "on" : "off");
    formData.set("emailNotifications", email ? "on" : "off");
    startTransition(() => updateNotificationPrefs(formData));
  }

  return (
    <form action={handleSubmit} className="card p-6">
      <h2 className="font-display text-base mb-1">Notification preferences</h2>

      <div className="divide-y divide-base-700 mt-4">
        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm">Personal / DM messages</div>
            <div className="text-xs text-base-500">Direct messages sent to you</div>
          </div>
          <select
            name="dmNotifPref"
            defaultValue={dmNotifPref}
            className="input w-auto text-sm"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="all">All messages</option>
            <option value="mentions">Mentions only</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm">Group chat</div>
            <div className="text-xs text-base-500">Messages in shared channels & groups</div>
          </div>
          <select
            name="groupNotifPref"
            defaultValue={groupNotifPref}
            className="input w-auto text-sm"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="all">All messages</option>
            <option value="mentions">Mentions only</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm">Thread replies</div>
            <div className="text-xs text-base-500">Replies in conversation threads</div>
          </div>
          <select
            name="threadReplyPref"
            defaultValue={threadReplyPref}
            className="input w-auto text-sm"
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
          >
            <option value="all">All replies</option>
            <option value="mentions">Mentions only</option>
            <option value="none">None</option>
          </select>
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm">Project & task updates</div>
            <div className="text-xs text-base-500">Assignments, status changes, deadlines</div>
          </div>
          <Toggle checked={taskUpdates} onChange={setTaskUpdates} />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm">Push notifications</div>
            <div className="text-xs text-base-500">Browser & mobile push alerts</div>
          </div>
          <Toggle checked={push} onChange={setPush} />
        </div>

        <div className="flex items-center justify-between py-3">
          <div>
            <div className="text-sm">Email notifications</div>
            <div className="text-xs text-base-500">Notification emails via Resend</div>
          </div>
          <Toggle checked={email} onChange={setEmail} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-xs text-base-500">{isPending ? "Saving…" : "Changes save instantly."}</p>
        <button type="submit" className="btn-secondary text-xs">
          Save now
        </button>
      </div>
    </form>
  );
}

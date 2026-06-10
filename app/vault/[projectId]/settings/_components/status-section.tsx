"use client";

/**
 * SHRP-096 Day 6-8 — Engagement lifecycle control.
 *
 * Three states: active | launched | archived (see migration 0013's
 * CHECK constraint on projects.status). The visible distinction:
 *   - active   → currently being worked on; default state.
 *   - launched → handed off to the client. Visible on the dashboard
 *                under the "Launched" section. Status flip is usually
 *                paired with generating the Custody Record.
 *   - archived → still visible (no archived_at set yet) but marked done.
 *                If the user wants it hidden from the dashboard, the
 *                Archive section below does the legacy archived_at thing.
 *
 * We keep `status` independent of `archived_at` for now — they answer
 * different questions ("what stage is this in" vs "should it show on
 * the dashboard"). The Archive section is responsible for archived_at;
 * this section only flips status.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { CircleDot, CheckCircle2, Archive } from "lucide-react";

type Status = "active" | "launched" | "archived";

const OPTIONS: ReadonlyArray<{
  value: Status;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
}> = [
  {
    value: "active",
    label: "Active",
    description: "You're still building. This is the default.",
    icon: CircleDot,
    badgeClass: "bg-sherpa-50 text-sherpa-700 ring-sherpa-200",
  },
  {
    value: "launched",
    label: "Launched",
    description: "Handed off to the client. Time to generate the Custody Record.",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  {
    value: "archived",
    label: "Archived",
    description: "Project is over. Keep the credentials for the record.",
    icon: Archive,
    badgeClass: "bg-slate-100 text-slate-600 ring-slate-200",
  },
];

export function EngagementStatusSection({
  projectId,
  initialStatus,
}: {
  projectId: string;
  initialStatus: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = React.useState<Status>(initialStatus);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  const dirty = status !== initialStatus;

  async function persist() {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error: upErr } = await supabase
        .from("projects")
        .update({ status })
        .eq("id", projectId);
      if (upErr) throw upErr;
      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "engagement_status_changed",
        actor: "user",
        metadata: { from: initialStatus, to: status },
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {OPTIONS.map((opt) => {
          const selected = status === opt.value;
          const Icon = opt.icon;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={
                "flex flex-col items-start gap-1 rounded-lg border px-3 py-3 text-left transition " +
                (selected
                  ? "border-sherpa-400 bg-sherpa-50/70 ring-1 ring-sherpa-300"
                  : "border-slate-200 bg-white hover:border-slate-300")
              }
            >
              <span
                className={
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 " +
                  opt.badgeClass
                }
              >
                <Icon className="h-3 w-3" />
                {opt.label}
              </span>
              <p className="mt-1 text-xs leading-snug text-slate-500">
                {opt.description}
              </p>
            </button>
          );
        })}
      </div>

      {error && <Callout tone="danger">{error}</Callout>}
      {saved && !dirty && !error && (
        <p className="text-xs text-emerald-700">Status updated.</p>
      )}

      <div className="flex justify-end">
        <Button onClick={persist} disabled={!dirty || saving}>
          {saving ? "Updating..." : "Update status"}
        </Button>
      </div>
    </div>
  );
}

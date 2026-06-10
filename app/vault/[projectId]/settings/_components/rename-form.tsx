"use client";

/**
 * SHRP-096 Day 6-8 — Engagement details form.
 *
 * Originally RenameProjectForm (SHRP-014): name + description only.
 * Extended to edit the engagement-flavored columns from migration 0013:
 * client_name and launch_date. Status lives in its own section so the
 * lifecycle change feels deliberate.
 *
 * Export name kept (RenameProjectForm) to minimise churn — the settings
 * page imports it under that symbol. Internally we treat it as
 * EditEngagementForm.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { Check } from "lucide-react";

export function RenameProjectForm({
  projectId,
  initialName,
  initialDescription,
  initialClientName,
  initialLaunchDate,
}: {
  projectId: string;
  initialName: string;
  initialDescription: string;
  initialClientName: string;
  initialLaunchDate: string; // "YYYY-MM-DD" or ""
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [clientName, setClientName] = React.useState(initialClientName);
  const [launchDate, setLaunchDate] = React.useState(initialLaunchDate);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    name.trim() !== initialName.trim() ||
    description.trim() !== initialDescription.trim() ||
    clientName.trim() !== initialClientName.trim() ||
    launchDate !== initialLaunchDate;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Engagement name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error: upErr } = await supabase
        .from("projects")
        .update({
          name: name.trim(),
          description: description.trim() || null,
          client_name: clientName.trim() || null,
          launch_date: launchDate || null,
        })
        .eq("id", projectId);
      if (upErr) throw upErr;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "project_renamed",
        actor: "user",
        metadata: {
          name_changed: name.trim() !== initialName.trim(),
          description_changed: description.trim() !== initialDescription.trim(),
          client_name_changed: clientName.trim() !== initialClientName.trim(),
          launch_date_changed: launchDate !== initialLaunchDate,
        },
      });

      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="project-name">Engagement name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={120}
        />
      </div>
      <div>
        <Label htmlFor="client-name">
          Client name <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="client-name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder='e.g. "Brushfire Coffee Roasters"'
          maxLength={120}
        />
        <p className="mt-1 text-xs text-slate-500">
          Shown on the Custody Record at launch.
        </p>
      </div>
      <div>
        <Label htmlFor="launch-date">
          Target launch date <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="launch-date"
          type="date"
          value={launchDate}
          onChange={(e) => setLaunchDate(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="project-desc">
          Notes <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One sentence to remind future-you."
          maxLength={200}
        />
      </div>
      {error && <Callout tone="danger">{error}</Callout>}
      {saved && !dirty && !error && (
        <p className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <Check className="h-3 w-3" /> Saved.
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}

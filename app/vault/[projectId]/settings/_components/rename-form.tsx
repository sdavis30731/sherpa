"use client";

/**
 * RenameProjectForm — SHRP-014
 *
 * Updates name and (optional) description. Audit-logs the change so the
 * user history shows it. Saves are idempotent: if nothing changed, the
 * button is disabled.
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
}: {
  projectId: string;
  initialName: string;
  initialDescription: string;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const dirty =
    name.trim() !== initialName.trim() ||
    description.trim() !== initialDescription.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (!name.trim()) {
      setError("Project name can't be empty.");
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
        <Label htmlFor="project-name">Project name</Label>
        <Input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="project-desc">
          Description <span className="font-normal text-slate-400">(optional)</span>
        </Label>
        <Input
          id="project-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One sentence to remind future-you."
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

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { PaywallDialog } from "@/components/paywall-dialog";

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [paywall, setPaywall] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data, error: insErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
        })
        .select("id")
        .single();

      if (insErr) {
        // The 0002 migration raises 'free_tier_limit' as the message on the
        // BEFORE INSERT trigger. Postgrest surfaces it in `message`.
        if (
          insErr.message?.includes("free_tier_limit") ||
          insErr.code === "P0001"
        ) {
          setPaywall(true);
          onOpenChange(false);
          return;
        }
        throw insErr;
      }
      router.push(`/vault/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="Create a project"
        description="Group the credentials for one app. You can rename it later."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="EcoVerse, Quiet Hours, …"
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
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? "Creating..." : "Create project"}
            </Button>
          </div>
        </form>
      </Dialog>
      <PaywallDialog open={paywall} onOpenChange={setPaywall} />
    </>
  );
}

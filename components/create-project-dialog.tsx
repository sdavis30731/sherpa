"use client";

/**
 * SHRP-096 Day 6-8 — "New engagement" dialog.
 *
 * Originally "Create a project" (single-tenant credential bucket). Path A
 * keeps the routes/DB column `projects` for now but renames everything
 * the user sees to "engagement" and surfaces the engagement-flavored
 * fields added in migration 0013: `client_name` and `launch_date`.
 * `status` defaults to 'active' via the column default — the lifecycle
 * control lives on the engagement detail/settings page.
 *
 * Symbol name kept as CreateProjectDialog to minimise the blast radius
 * across the codebase — only the visible copy changes. We'll rename the
 * symbol when we cut the multi-tenant migration in v1.1.
 */

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
  const [clientName, setClientName] = React.useState("");
  const [launchDate, setLaunchDate] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [paywall, setPaywall] = React.useState(false);

  // Reset state when the dialog re-opens — otherwise stale values from a
  // half-finished previous open would persist.
  React.useEffect(() => {
    if (open) {
      setError(null);
    } else {
      setName("");
      setClientName("");
      setLaunchDate("");
    }
  }, [open]);

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
          client_name: clientName.trim() || null,
          launch_date: launchDate || null,
          // status defaults to 'active' (see migration 0013).
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
      setError(err instanceof Error ? err.message : "Could not create engagement.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title="New engagement"
        description="One engagement = one client project. Credentials live inside it; you can hand it off cleanly when you launch."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project-name">
              Engagement name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="project-name"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "Brushfire Website Rebuild"'
              maxLength={120}
            />
            <p className="mt-1 text-xs text-slate-500">
              How you refer to the engagement internally.
            </p>
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
              Shown on the Custody Record. Skip this if you and the client are the same person.
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
            <p className="mt-1 text-xs text-slate-500">
              Used to flag overdue rotations near launch and on the Custody Record.
            </p>
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
              {loading ? "Creating..." : "Create engagement"}
            </Button>
          </div>
        </form>
      </Dialog>
      <PaywallDialog open={paywall} onOpenChange={setPaywall} />
    </>
  );
}

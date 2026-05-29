"use client";

/**
 * DeleteProjectSection — SHRP-014
 *
 * Hard-deletes a project. The DELETE on public.projects cascades to:
 *   - credentials (ON DELETE CASCADE from 0001)
 *   - mcp_tokens   (ON DELETE CASCADE from 0001 — effectively revokes them)
 *   - rotation_events via the credentials cascade
 *   - audit_log entries scoped to this project become project_id=NULL after
 *     migration 0004, so the USER-LEVEL audit trail survives
 *
 * Before the destructive delete we write one user-level audit entry naming
 * the project being deleted, so the user can later see what happened.
 *
 * Confirmation gate: type the project name. No keyboard auto-complete on
 * the field — the user has to actually look at the name and type it.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { Trash2 } from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
  credentialCount: number;
  activeTokenCount: number;
}

export function DeleteProjectSection({
  projectId,
  projectName,
  credentialCount,
  activeTokenCount,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
    }
  }, [open]);

  const matches = typed.trim() === projectName;

  async function onConfirm() {
    setError(null);
    setWorking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Audit FIRST so the row exists even after the project_id column gets
      // SET NULL by the cascade. project_id will be NULL on this row after
      // the delete, but metadata captures the name.
      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "project_deleted",
        actor: "user",
        metadata: {
          project_name: projectName,
          credential_count: credentialCount,
          active_token_count: activeTokenCount,
        },
      });

      // Cascade-deletes credentials, mcp_tokens, rotation_events.
      // Sets audit_log.project_id to NULL for surviving audit rows.
      const { error: delErr } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);
      if (delErr) throw delErr;

      router.push("/vault");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
      setWorking(false);
    }
  }

  return (
    <>
      <div className="space-y-3 text-sm text-slate-700">
        <p>
          Permanently delete <strong>{projectName}</strong>. This removes the
          project, all <strong>{credentialCount}</strong> stored credential
          {credentialCount === 1 ? "" : "s"}, and revokes{" "}
          <strong>{activeTokenCount}</strong> active MCP token
          {activeTokenCount === 1 ? "" : "s"}. The user-level audit trail of
          what happened is preserved.
        </p>
        <p className="text-xs text-slate-500">
          Looking for a softer option? Archive the project instead — same
          hidden-from-list effect, fully recoverable.
        </p>
        <Button variant="danger" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete project
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => !working && setOpen(o)}
        title="Delete this project?"
        description="This cannot be undone."
        className="max-w-md"
      >
        <div className="space-y-4">
          <Callout tone="warning" title="You're about to permanently delete:">
            <ul className="mt-1 list-disc pl-5 text-sm">
              <li>The project <strong>{projectName}</strong></li>
              <li>{credentialCount} stored credential{credentialCount === 1 ? "" : "s"}</li>
              <li>{activeTokenCount} active MCP token{activeTokenCount === 1 ? "" : "s"} (anything using them will stop working immediately)</li>
            </ul>
          </Callout>

          <div>
            <Label htmlFor="confirm-project">
              Type <span className="font-mono text-slate-900">{projectName}</span> to confirm
            </Label>
            <Input
              id="confirm-project"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {error && <Callout tone="danger">{error}</Callout>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={!matches || working}>
              <Trash2 className="h-4 w-4" />
              {working ? "Deleting..." : "Delete project"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

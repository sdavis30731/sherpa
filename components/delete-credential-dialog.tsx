"use client";

/**
 * DeleteCredentialDialog — SHRP-013
 *
 * Soft-deletes a credential after the user types the label to confirm.
 * Soft delete sets deleted_at; the row stays in the database for 30 days
 * (hard-purged by the function in migration 0003) so a deletion remains
 * recoverable in that window.
 *
 * The "type the label" gate prevents an absent-minded click from torching
 * a credential that's hard to replace.
 */

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { AlertTriangle } from "lucide-react";
import type { CredentialView } from "@/app/vault/[projectId]/_components/credential-row";

export function DeleteCredentialDialog({
  cred,
  open,
  onOpenChange,
  onDeleted,
}: {
  cred: CredentialView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const [typed, setTyped] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTyped("");
      setError(null);
    }
  }, [open]);

  const matches = typed.trim() === cred.label;

  async function onConfirm() {
    setError(null);
    setWorking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error: upErr } = await supabase
        .from("credentials")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", cred.id);
      if (upErr) throw upErr;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: cred.project_id,
        credential_id: cred.id,
        action: "credential_deleted",
        actor: "user",
        metadata: { label: cred.label, service: cred.service, env: cred.env },
      });

      onDeleted?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete credential"
      description="This soft-deletes the credential. It's recoverable for 30 days."
      className="max-w-md"
    >
      <div className="space-y-4">
        <Callout tone="warning" title="Type the label to confirm.">
          You&apos;re about to delete <strong>{cred.label}</strong>. Anything that uses
          this key from now on will need to be reconfigured with a new credential.
        </Callout>

        <div>
          <Label htmlFor="confirm-label">
            Type <span className="font-mono text-slate-900">{cred.label}</span> to confirm
          </Label>
          <Input
            id="confirm-label"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={working}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={!matches || working}
          >
            <AlertTriangle className="h-4 w-4" />
            {working ? "Deleting..." : "Delete credential"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

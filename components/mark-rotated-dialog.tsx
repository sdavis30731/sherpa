"use client";

/**
 * MarkRotatedDialog — SHRP-027
 *
 * For the case where the user rotated a key OUTSIDE Sherpa (in the service
 * dashboard) and just wants to update the tracker without changing the
 * stored ciphertext. The Edit dialog already handles the "paste new value"
 * path; this is the "I already updated it elsewhere" path.
 *
 * On confirm:
 *   - UPDATE credentials SET last_rotated_at = now()
 *   - INSERT INTO rotation_events (source='manual')
 *   - INSERT INTO audit_log (action='credential_rotated_externally')
 *
 * We surface a deliberate warning that the stored value may now be stale,
 * since the most common mistake is hitting this button without also
 * pasting the new value into Sherpa.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getService } from "@/lib/services";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { ExternalLink, Pencil, RotateCw } from "lucide-react";
import type { CredentialView } from "@/app/vault/[projectId]/_components/credential-row";

export function MarkRotatedDialog({
  cred,
  open,
  onOpenChange,
  onDone,
  onOpenEdit,
}: {
  cred: CredentialView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
  /** Callback to open the Edit dialog (so the user can paste a new value instead). */
  onOpenEdit?: () => void;
}) {
  const router = useRouter();
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const service = getService(cred.service);

  React.useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function onConfirm() {
    setError(null);
    setWorking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const now = new Date().toISOString();

      const { error: upErr } = await supabase
        .from("credentials")
        .update({ last_rotated_at: now })
        .eq("id", cred.id);
      if (upErr) throw upErr;

      await supabase.from("rotation_events").insert({
        credential_id: cred.id,
        user_id: user.id,
        source: "manual",
      });

      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: cred.project_id,
        credential_id: cred.id,
        action: "credential_rotated_externally",
        actor: "user",
        metadata: { service: cred.service, env: cred.env },
      });

      onDone?.();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the rotation.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !working && onOpenChange(o)}
      title="Mark this as rotated?"
      description={`Use this if you've already rotated the key in ${service?.name ?? "the service"} and just want to reset the tracker.`}
      className="max-w-md"
    >
      <div className="space-y-4">
        <Callout tone="warning" title="Did you also update the stored value?">
          If your new key is different from the one stored in Sherpa, marking
          this without pasting the new value will leave you with a stale
          ciphertext — anything pulling the key from Sherpa will keep using
          the old (now invalid) one.
        </Callout>

        {service?.dashboardUrl && (
          <a
            href={service.dashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-sherpa-600 hover:underline"
          >
            Open {service.name} dashboard <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              onOpenChange(false);
              onOpenEdit?.();
            }}
            disabled={working}
          >
            <Pencil className="h-4 w-4" /> Open Edit to paste new value
          </Button>
          <Button onClick={onConfirm} disabled={working}>
            <RotateCw className="h-4 w-4" />
            {working ? "Recording..." : "Mark as rotated"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

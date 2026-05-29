"use client";

/**
 * EditCredentialDialog — SHRP-013
 *
 * Lets the user rename a credential, change its environment, and (optionally)
 * paste a NEW value to rotate it. The current value is NEVER pre-filled —
 * we don't have it decrypted on this screen, and showing it would be a
 * security regression. The label says "leave blank to keep current".
 *
 * On save:
 *   - Always updates label and env.
 *   - If a new value was pasted, encrypts it, updates ciphertext, updates
 *     last_rotated_at, and inserts a rotation_events row.
 *   - Writes audit_log with action='credential_edited' or 'credential_rotated'.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { encrypt } from "@/lib/crypto";
import { ENVIRONMENTS, getService, type Environment } from "@/lib/services";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { Lock } from "lucide-react";
import type { CredentialView } from "@/app/vault/[projectId]/_components/credential-row";

export function EditCredentialDialog({
  cred,
  open,
  onOpenChange,
  onSaved,
}: {
  cred: CredentialView;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const vault = useVaultKey();
  const service = getService(cred.service);

  const [label, setLabel] = React.useState(cred.label);
  const [env, setEnv] = React.useState<Environment>(cred.env);
  const [newValue, setNewValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Re-sync state when the dialog reopens against a different credential.
  React.useEffect(() => {
    if (open) {
      setLabel(cred.label);
      setEnv(cred.env);
      setNewValue("");
      setError(null);
    }
  }, [open, cred.label, cred.env]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!label.trim()) {
      setError("Label can't be empty.");
      return;
    }

    const rotating = newValue.trim().length > 0;
    if (rotating && !vault.key) {
      router.push(`/vault/unlock?next=/vault/${cred.project_id}`);
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Build the patch.
      const patch: {
        label: string;
        env: Environment;
        ciphertext?: string;
        last_rotated_at?: string;
      } = {
        label: label.trim(),
        env,
      };

      if (rotating) {
        const ciphertext = await encrypt(newValue.trim(), vault.key!);
        patch.ciphertext = ciphertext;
        patch.last_rotated_at = new Date().toISOString();
      }

      const { error: upErr } = await supabase
        .from("credentials")
        .update(patch)
        .eq("id", cred.id);
      if (upErr) throw upErr;

      if (rotating) {
        await supabase.from("rotation_events").insert({
          credential_id: cred.id,
          user_id: user.id,
          source: "manual",
        });
        await supabase.from("audit_log").insert({
          user_id: user.id,
          project_id: cred.project_id,
          credential_id: cred.id,
          action: "credential_rotated",
          actor: "user",
        });
      } else {
        await supabase.from("audit_log").insert({
          user_id: user.id,
          project_id: cred.project_id,
          credential_id: cred.id,
          action: "credential_edited",
          actor: "user",
          metadata: { label_changed: label.trim() !== cred.label, env_changed: env !== cred.env },
        });
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit credential"
      description={service ? `${service.name} · ${cred.label}` : cred.label}
      className="max-w-lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit-label">Label</Label>
          <Input
            id="edit-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="edit-env">Environment</Label>
          <select
            id="edit-env"
            value={env}
            onChange={(e) => setEnv(e.target.value as Environment)}
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
          >
            {ENVIRONMENTS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="edit-value">
            New value <span className="font-normal text-slate-400">(optional — paste to rotate)</span>
          </Label>
          <textarea
            id="edit-value"
            rows={3}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Leave blank to keep the current value."
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
            spellCheck={false}
            autoComplete="off"
          />
          {newValue && !vault.key && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
              <Lock className="h-3 w-3" /> Vault is locked — we&apos;ll ask you to unlock before saving the new value.
            </p>
          )}
          {newValue && (
            <p className="mt-1 text-xs text-slate-500">
              Saving with a new value also records a rotation event so the
              tracker resets.
            </p>
          )}
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : newValue ? "Save & rotate" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

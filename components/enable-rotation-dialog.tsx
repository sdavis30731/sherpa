"use client";

/**
 * SHRP-051i — Enable auto-rotation dialog.
 *
 * The agency clicks the "Enable auto-rotation" button on a credential
 * row. The dialog opens, decrypts the source credential client-side
 * (using the vault key), then renders the policy-setup form:
 *
 *   - Actor secret (optional; required for Stripe restricted keys)
 *   - Target platform (Vercel only for v1)
 *   - Vercel access token
 *   - Vercel project ID + team ID (team optional)
 *   - Env var name
 *   - Environments (multi-select)
 *   - Trigger redeploy on rotation (default true)
 *   - Rotation interval (days)
 *   - Provider metadata (JSON for Stripe scope, etc.)
 *
 * On submit, all secrets travel as plaintext over HTTPS to
 * /api/credentials/[id]/rotation-policy which wraps them with
 * ROTATION_MASTER_KEY before insert. This is the one moment in the
 * normally-zero-knowledge flow where plaintext touches our server —
 * documented honestly in the dialog so the agency opts in
 * with full understanding.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useVaultKey } from "@/lib/vault-context";
import { decrypt } from "@/lib/crypto";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { Loader2, Zap, ShieldAlert } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialId: string;
  credentialLabel: string;
  credentialService: string;
  credentialCiphertext: string;
  onSaved?: () => void;
}

type Env = "production" | "preview" | "development";

const ENVS: ReadonlyArray<Env> = ["production", "preview", "development"];

const SCOPE_HINTS: Record<string, string> = {
  stripe: `For Stripe restricted keys, paste the scope JSON Stripe shows on the key's settings page, e.g.:
[
  { "permission_group": "rak_charge_read", "resource": "charge" }
]`,
};

export function EnableRotationDialog({
  open,
  onOpenChange,
  credentialId,
  credentialLabel,
  credentialService,
  credentialCiphertext,
  onSaved,
}: Props) {
  const router = useRouter();
  const vault = useVaultKey();

  const [sourcePlaintext, setSourcePlaintext] = React.useState<string | null>(
    null,
  );
  const [decryptError, setDecryptError] = React.useState<string | null>(null);

  const [actorSecret, setActorSecret] = React.useState("");
  const [vercelToken, setVercelToken] = React.useState("");
  const [vercelProjectId, setVercelProjectId] = React.useState("");
  const [vercelTeamId, setVercelTeamId] = React.useState("");
  const [envVarName, setEnvVarName] = React.useState("");
  const [envs, setEnvs] = React.useState<Set<Env>>(new Set(["production"]));
  const [triggerRedeploy, setTriggerRedeploy] = React.useState(true);
  const [intervalDays, setIntervalDays] = React.useState(90);
  const [metadataJson, setMetadataJson] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Decrypt source plaintext when dialog opens.
  React.useEffect(() => {
    if (!open) {
      setSourcePlaintext(null);
      setDecryptError(null);
      setError(null);
      setSubmitting(false);
      return;
    }
    if (!vault.key) {
      router.push(`/vault/unlock?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    (async () => {
      try {
        const pt = await decrypt(credentialCiphertext, vault.key!);
        setSourcePlaintext(pt);
      } catch (err) {
        setDecryptError(
          err instanceof Error
            ? err.message
            : "Could not decrypt the credential.",
        );
      }
    })();
  }, [open, vault.key, credentialCiphertext, router]);

  function toggleEnv(env: Env) {
    setEnvs((prev) => {
      const next = new Set(prev);
      if (next.has(env)) next.delete(env);
      else next.add(env);
      return next;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!sourcePlaintext) {
      setError("No source plaintext — decryption hasn't completed.");
      return;
    }
    if (!vercelToken.trim() || !vercelProjectId.trim() || !envVarName.trim()) {
      setError("Vercel token, project ID, and env var name are all required.");
      return;
    }
    if (envs.size === 0) {
      setError("Pick at least one environment.");
      return;
    }
    if (intervalDays < 1 || intervalDays > 365) {
      setError("Interval must be between 1 and 365 days.");
      return;
    }
    let metadata: Record<string, unknown> = {};
    if (metadataJson.trim()) {
      try {
        const parsed = JSON.parse(metadataJson.trim());
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("metadata must be a JSON object");
        }
        metadata = parsed as Record<string, unknown>;
      } catch (err) {
        setError(
          err instanceof Error
            ? `Metadata isn't valid JSON: ${err.message}`
            : "Metadata isn't valid JSON.",
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/credentials/${credentialId}/rotation-policy`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_secret: sourcePlaintext,
            actor_secret: actorSecret.trim() || undefined,
            target_platform: "vercel",
            target_project_ref: vercelProjectId.trim(),
            target_team_ref: vercelTeamId.trim() || undefined,
            target_env_var_name: envVarName.trim(),
            target_env_var_environments: Array.from(envs),
            target_trigger_redeploy: triggerRedeploy,
            target_secret: vercelToken.trim(),
            interval_days: intervalDays,
            metadata,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
          details?: string;
        };
        throw new Error(
          body.message ?? body.details ?? body.error ?? `HTTP ${res.status}`,
        );
      }
      onSaved?.();
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save policy.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!submitting) onOpenChange(o);
      }}
      title="Enable auto-rotation"
      description={`Rotate ${credentialLabel} automatically every N days. SherpaKeys generates a new ${credentialService} key, pushes it to your deployment target, verifies it works, and revokes the old one. Failures roll back.`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {decryptError && (
          <Callout tone="danger" title="Could not decrypt credential">
            {decryptError}
          </Callout>
        )}

        {!sourcePlaintext && !decryptError && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Decrypting credential locally…
          </div>
        )}

        <Callout tone="warning" title="Honest threat model">
          <p className="text-xs leading-relaxed">
            Auto-rotation requires SherpaKeys to hold this credential
            (and the keys below) encrypted with a server-side key. If
            our server were compromised along with our DB, an attacker
            could decrypt these. Credentials NOT marked auto-rotating
            stay zero-knowledge.
          </p>
        </Callout>

        {/* ────── Stripe / actor section ────── */}
        {credentialService === "stripe" && (
          <section className="space-y-2">
            <div>
              <Label htmlFor="actor-secret">
                Stripe standard secret key (actor){" "}
                <span className="text-red-500">*</span>
              </Label>
              <Input
                id="actor-secret"
                type="password"
                autoComplete="off"
                value={actorSecret}
                onChange={(e) => setActorSecret(e.target.value)}
                placeholder="sk_live_…"
              />
              <p className="mt-1 text-xs text-slate-500">
                Stripe restricted-key rotation needs the standard secret
                to authenticate create + revoke calls. Get it from
                Stripe → Developers → API keys.
              </p>
            </div>
            <div>
              <Label htmlFor="metadata-scope">Restricted-key scope (JSON)</Label>
              <textarea
                id="metadata-scope"
                value={metadataJson}
                onChange={(e) => setMetadataJson(e.target.value)}
                rows={5}
                spellCheck={false}
                autoComplete="off"
                placeholder={SCOPE_HINTS.stripe}
                className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                The new restricted key will carry these scopes. Open
                Stripe → API Keys → click the existing restricted key →
                copy the scope JSON.
              </p>
            </div>
          </section>
        )}

        {/* ────── Vercel target section ────── */}
        <section className="space-y-3 border-t border-slate-200 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Deployment target (Vercel)
          </div>
          <div>
            <Label htmlFor="vercel-token">
              Vercel access token <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vercel-token"
              type="password"
              autoComplete="off"
              value={vercelToken}
              onChange={(e) => setVercelToken(e.target.value)}
              placeholder="Generated at vercel.com/account/tokens"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="vercel-project">
                Vercel project ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="vercel-project"
                value={vercelProjectId}
                onChange={(e) => setVercelProjectId(e.target.value)}
                placeholder="prj_…"
              />
            </div>
            <div>
              <Label htmlFor="vercel-team">Vercel team ID (optional)</Label>
              <Input
                id="vercel-team"
                value={vercelTeamId}
                onChange={(e) => setVercelTeamId(e.target.value)}
                placeholder="team_…"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="env-var-name">
              Env var name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="env-var-name"
              value={envVarName}
              onChange={(e) => setEnvVarName(e.target.value.toUpperCase())}
              placeholder="STRIPE_SECRET_KEY"
              className="font-mono"
            />
          </div>
          <div>
            <Label>Environments</Label>
            <div className="mt-1 flex flex-wrap gap-2">
              {ENVS.map((env) => {
                const checked = envs.has(env);
                return (
                  <button
                    type="button"
                    key={env}
                    onClick={() => toggleEnv(env)}
                    className={
                      "rounded-full border px-3 py-1 text-xs font-medium transition " +
                      (checked
                        ? "border-sherpa-400 bg-sherpa-50 text-sherpa-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")
                    }
                  >
                    {env}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={triggerRedeploy}
              onChange={(e) => setTriggerRedeploy(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-sherpa-500"
            />
            <span>
              Trigger a redeploy after the env var is updated, so the
              new key takes effect immediately.
            </span>
          </label>
        </section>

        {/* ────── Schedule ────── */}
        <section className="space-y-2 border-t border-slate-200 pt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Schedule
          </div>
          <div>
            <Label htmlFor="interval">Rotate every (days)</Label>
            <Input
              id="interval"
              type="number"
              min={1}
              max={365}
              value={intervalDays}
              onChange={(e) =>
                setIntervalDays(parseInt(e.target.value, 10) || 0)
              }
            />
            <p className="mt-1 text-xs text-slate-500">
              Typical: 30 (high security), 60–90 (most apps), 180
              (low-velocity services).
            </p>
          </div>
        </section>

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting || !sourcePlaintext}>
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {submitting ? "Saving..." : "Enable auto-rotation"}
          </Button>
        </div>

        <p className="text-center text-[11px] text-slate-500">
          <ShieldAlert className="-mt-0.5 mr-0.5 inline h-3 w-3" />
          You can disable or delete this policy at any time. Disabling
          stops scheduled rotations; deleting also clears the wrapped
          credentials from our server.
        </p>
      </form>
    </Dialog>
  );
}

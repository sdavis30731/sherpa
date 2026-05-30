"use client";

/**
 * Authorize agents — SHRP-040 (client side)
 *
 * When the user clicks "Authorize agents for N hours":
 *   1. Browser fetches all credentials (ciphertexts) for this project.
 *   2. Browser decrypts each with the vault key (held in VaultKeyProvider
 *      context — requires the vault to be unlocked first).
 *   3. Browser generates a fresh 32-byte session key K_s.
 *   4. Browser re-encrypts each plaintext credential with K_s.
 *   5. Browser uploads K_s + the list of session-encrypted credentials
 *      to /api/agent-sessions. Server wraps K_s with its master key and
 *      stores everything.
 *
 * The vault key never leaves the browser. The plaintext credentials
 * exist only in the browser, briefly, during the re-encrypt loop.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { decrypt, encrypt, toBase64 } from "@/lib/crypto";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Timer,
  Trash2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActiveSession {
  id: string;
  expires_at: string;
  authorized_at: string;
  last_used_at: string | null;
}

const TTL_OPTIONS: { hours: number; label: string }[] = [
  { hours: 1, label: "1 hour" },
  { hours: 8, label: "8 hours" },
  { hours: 24, label: "24 hours" },
  { hours: 24 * 7, label: "7 days (max)" },
];

interface Props {
  projectId: string;
  initialSession: ActiveSession | null;
}

export function AuthorizeAgentsSection({ projectId, initialSession }: Props) {
  const router = useRouter();
  const vault = useVaultKey();

  const [session, setSession] = React.useState<ActiveSession | null>(initialSession);
  const [ttl, setTtl] = React.useState(24);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Live countdown to expiry
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (!session) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [session]);

  const expired = session ? new Date(session.expires_at).getTime() < now : false;
  const msRemaining = session
    ? Math.max(0, new Date(session.expires_at).getTime() - now)
    : 0;

  async function authorize() {
    setError(null);
    if (!vault.key) {
      router.push(`/vault/unlock?next=/vault/${projectId}/settings/agents`);
      return;
    }
    setWorking(true);
    try {
      // 1. Fetch all credentials with their ciphertexts.
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: creds, error: credsErr } = await supabase
        .from("credentials")
        .select("id, ciphertext")
        .eq("project_id", projectId)
        .is("deleted_at", null);
      if (credsErr) throw credsErr;
      const credentials = (creds ?? []) as Array<{ id: string; ciphertext: string }>;

      if (credentials.length === 0) {
        throw new Error(
          "No credentials in this project yet. Add one before authorizing agents.",
        );
      }

      // 2. Generate a fresh session key K_s.
      const sessionKeyRaw = new Uint8Array(32);
      crypto.getRandomValues(sessionKeyRaw);
      const sessionKey = await crypto.subtle.importKey(
        "raw",
        sessionKeyRaw as BufferSource,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"],
      );

      // 3. For each credential: decrypt with vault key, re-encrypt with K_s.
      const sessionCreds: Array<{ credential_id: string; session_ciphertext: string }> = [];
      for (const c of credentials) {
        const plaintext = await decrypt(c.ciphertext, vault.key);
        const sessionCiphertext = await encrypt(plaintext, sessionKey);
        sessionCreds.push({
          credential_id: c.id,
          session_ciphertext: sessionCiphertext,
        });
      }

      // 4. Upload K_s + session-encrypted credentials.
      const res = await fetch("/api/agent-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          ttl_hours: ttl,
          session_key_b64: toBase64(sessionKeyRaw),
          credentials: sessionCreds,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { id: string; expires_at: string };

      setSession({
        id: data.id,
        expires_at: data.expires_at,
        authorized_at: new Date().toISOString(),
        last_used_at: null,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not authorize");
    } finally {
      setWorking(false);
    }
  }

  async function revoke() {
    if (!confirm("Revoke agent access immediately? Any in-flight agent call will fail.")) return;
    setError(null);
    setWorking(true);
    try {
      const res = await fetch(
        `/api/agent-sessions?project_id=${encodeURIComponent(projectId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      setSession(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not revoke");
    } finally {
      setWorking(false);
    }
  }

  const hasActiveSession = session && !expired;

  return (
    <Card
      className={cn(
        hasActiveSession ? "border-emerald-300" : "border-amber-200",
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {hasActiveSession ? (
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-amber-600" />
          )}
          Agent authorization
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {!hasActiveSession && (
          <>
            <Callout tone="info">
              Outside an authorization window, the Sherpa server cannot
              decrypt your credentials. AI agents calling{" "}
              <code className="rounded bg-white px-1 font-mono text-xs">
                sherpa_call_api
              </code>{" "}
              will get "agents not currently authorized" until you turn it on.
            </Callout>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Authorize for
              </label>
              <div className="grid grid-cols-4 gap-2">
                {TTL_OPTIONS.map((opt) => (
                  <button
                    key={opt.hours}
                    type="button"
                    onClick={() => setTtl(opt.hours)}
                    disabled={working}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm font-medium transition",
                      ttl === opt.hours
                        ? "border-sherpa-500 bg-sherpa-50 text-sherpa-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-sherpa-300",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {!vault.key && (
              <Callout tone="warning" title="Vault is locked.">
                You&apos;ll be asked to unlock with your passphrase before
                authorizing (the browser needs your vault key to re-encrypt
                credentials for the session).
              </Callout>
            )}

            {error && <Callout tone="danger">{error}</Callout>}

            <Button onClick={authorize} disabled={working} fullWidth>
              <Lock className="h-4 w-4" />
              {working
                ? "Re-encrypting and uploading..."
                : `Authorize agents for ${TTL_OPTIONS.find((o) => o.hours === ttl)?.label}`}
            </Button>
          </>
        )}

        {hasActiveSession && (
          <>
            <Callout tone="success" title="Agents are authorized.">
              <p className="mb-1">
                Until <strong>{new Date(session.expires_at).toLocaleString()}</strong>,
                the MCP server can decrypt your credentials to make API calls on
                your behalf.
              </p>
              <p className="inline-flex items-center gap-1 text-xs">
                <Timer className="h-3 w-3" />
                Time remaining:{" "}
                <strong>{formatDuration(msRemaining)}</strong>
              </p>
              {session.last_used_at && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs">
                  <Clock className="h-3 w-3" />
                  Last used: {new Date(session.last_used_at).toLocaleString()}
                </p>
              )}
            </Callout>

            {error && <Callout tone="danger">{error}</Callout>}

            <Button onClick={revoke} variant="danger" disabled={working}>
              <Trash2 className="h-4 w-4" />
              {working ? "Revoking..." : "Revoke agent access now"}
            </Button>
          </>
        )}

        {session && expired && (
          <Callout tone="warning" title="Authorization expired.">
            The session ended at {new Date(session.expires_at).toLocaleString()}.
            Re-authorize above to give agents access again.
          </Callout>
        )}
      </CardBody>
    </Card>
  );
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "expired";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

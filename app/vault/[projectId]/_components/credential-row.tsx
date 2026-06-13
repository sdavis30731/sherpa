"use client";

/**
 * CredentialRow — SHRP-012 + SHRP-013 + SHRP-027
 *
 * Renders a single credential as a row with:
 *   - env chip + rotation status pill (shared logic from lib/rotation)
 *   - Reveal button (eye) → decrypts client-side, shows value for 10s
 *   - Copy button → writes plaintext to clipboard, overwrites after 30s
 *   - Mark-rotated button → records an external rotation (SHRP-027)
 *   - Edit button → opens the Edit Credential dialog
 *   - Delete button → opens the Delete confirmation dialog
 *
 * Every reveal / copy / mark-rotated / edit / delete writes an audit_log entry.
 *
 * The row root has id={`cred-${id}`} so the URL ?credential=X can scroll
 * to it (see scroll-to-credential.tsx).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { decrypt } from "@/lib/crypto";
import { ENVIRONMENTS, getService, type Environment } from "@/lib/services";
import { evaluateRotation, type RotationStatus } from "@/lib/rotation";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { EditCredentialDialog } from "@/components/edit-credential-dialog";
import { DeleteCredentialDialog } from "@/components/delete-credential-dialog";
import { MarkRotatedDialog } from "@/components/mark-rotated-dialog";
import { RotateNowDialog } from "@/components/rotate-now-dialog";
import { EnableRotationDialog } from "@/components/enable-rotation-dialog";
import { useOpenPlaybook } from "@/components/playbook-context";
import { getPlaybook } from "@/lib/playbooks";
import { RiskBadge } from "@/components/risk-badge";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Pencil,
  Trash2,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Lock,
  RotateCw,
  Zap,
  BookOpen,
  Hourglass,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CredentialView {
  id: string;
  project_id: string;
  service: string;
  env: Environment;
  label: string;
  ciphertext: string;
  last_rotated_at: string | null;
  created_at: string;
  /** SHRP-051 — vault_key (default) or agency_sealed_box (post-rotation, awaiting re-wrap). */
  ciphertext_format?: "vault_key" | "agency_sealed_box";
  /** SHRP-051 — true if a rotation_policy exists for this credential. */
  auto_rotates?: boolean;
}

const REVEAL_SECONDS = 10;
const COPY_SECONDS = 30;

export function CredentialRow({
  cred,
  risk = null,
}: {
  cred: CredentialView;
  risk?: import("@/lib/risk-rules").RiskRule | null;
}) {
  const router = useRouter();
  const vault = useVaultKey();
  const { open: openPlaybook } = useOpenPlaybook();
  const playbookAvailable = Boolean(getPlaybook(cred.service));

  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [revealLeft, setRevealLeft] = React.useState(0);
  const [copyLeft, setCopyLeft] = React.useState(0);
  const [copied, setCopied] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [rotating, setRotating] = React.useState(false);
  // SHRP-051 — manual auto-rotation trigger dialog (different from
  // mark-as-rotated, which is just a timestamp update).
  const [rotateNow, setRotateNow] = React.useState(false);
  const [enableRotation, setEnableRotation] = React.useState(false);

  const rewrapPending = cred.ciphertext_format === "agency_sealed_box";

  const service = getService(cred.service);
  const rotationDays = service?.rotationDays ?? 180;
  const info = evaluateRotation(cred.last_rotated_at, rotationDays, cred.created_at);
  const envChip =
    ENVIRONMENTS.find((e) => e.id === cred.env)?.color ?? "bg-slate-100 text-slate-700";

  // Single tick: count both timers down each second.
  React.useEffect(() => {
    if (revealLeft === 0 && copyLeft === 0) return;
    const id = setInterval(() => {
      setRevealLeft((n) => (n > 0 ? n - 1 : 0));
      setCopyLeft((n) => (n > 0 ? n - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [revealLeft, copyLeft]);

  React.useEffect(() => {
    if (revealLeft === 0 && revealed) setRevealed(null);
  }, [revealLeft, revealed]);

  React.useEffect(() => {
    if (copyLeft === 0 && copied) {
      setCopied(false);
      if (typeof document !== "undefined" && document.hasFocus()) {
        navigator.clipboard.writeText("cleared by Sherpa").catch(() => {});
      }
    }
  }, [copyLeft, copied]);

  async function requireVaultKey(): Promise<CryptoKey | null> {
    if (vault.key) return vault.key;
    router.push(`/vault/unlock?next=/vault/${cred.project_id}`);
    return null;
  }

  async function logAudit(action: string, metadata?: Record<string, unknown>) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: cred.project_id,
        credential_id: cred.id,
        action,
        actor: "user",
        metadata: metadata ?? null,
      });
    } catch {
      /* never block on audit failure */
    }
  }

  async function onReveal() {
    setError(null);
    const key = await requireVaultKey();
    if (!key) return;
    try {
      const plaintext = await decrypt(cred.ciphertext, key);
      setRevealed(plaintext);
      setRevealLeft(REVEAL_SECONDS);
      void logAudit("credential_revealed");
    } catch {
      setError("Could not decrypt. Your vault key may not match this credential.");
    }
  }

  function onHide() {
    setRevealed(null);
    setRevealLeft(0);
  }

  async function onCopy() {
    setError(null);
    const key = await requireVaultKey();
    if (!key) return;
    try {
      const plaintext = await decrypt(cred.ciphertext, key);
      await navigator.clipboard.writeText(plaintext);
      setCopied(true);
      setCopyLeft(COPY_SECONDS);
      void logAudit("credential_copied");
    } catch {
      setError("Could not decrypt or write to clipboard.");
    }
  }

  return (
    <>
      <li id={`cred-${cred.id}`} className="px-6 py-3 transition-colors duration-300">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-slate-900">
                {cred.label}
              </span>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${envChip}`}
              >
                {cred.env}
              </span>
              {rewrapPending && (
                <span
                  title="This credential was rotated and is awaiting re-wrap. Unlock your vault on this device to complete it."
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200"
                >
                  <Hourglass className="h-3 w-3" />
                  Re-wrap pending
                </span>
              )}
              {cred.auto_rotates && !rewrapPending && (
                <span
                  title="Auto-rotation is enabled for this credential."
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sherpa-50 px-2 py-0.5 text-[10px] font-semibold text-sherpa-700 ring-1 ring-sherpa-200"
                >
                  <Zap className="h-3 w-3" />
                  Auto-rotates
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              <Clock className="-mt-0.5 mr-1 inline h-3 w-3" />
              {cred.last_rotated_at
                ? `Rotated ${new Date(cred.last_rotated_at).toLocaleDateString()}${
                    info.status === "overdue" && info.daysOverdue > 0
                      ? ` · ${info.daysOverdue}d overdue`
                      : ""
                  }`
                : "Never rotated"}
            </div>
          </div>

          {risk && (
            <RiskBadge
              rule={risk}
              projectId={cred.project_id}
              credentialId={cred.id}
            />
          )}

          <StatusPill status={info.status} />

          <div className="flex items-center gap-1">
            <IconButton
              title={revealed ? `Hide (${revealLeft}s)` : "Reveal"}
              onClick={revealed ? onHide : onReveal}
            >
              {!vault.key ? (
                <Lock className="h-4 w-4" />
              ) : revealed ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </IconButton>
            <IconButton
              title={copied ? `Clipboard clears in ${copyLeft}s` : "Copy"}
              onClick={onCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : !vault.key ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </IconButton>
            <IconButton
              title={playbookAvailable ? "Open playbook" : "Playbook coming soon"}
              onClick={() => openPlaybook(cred.service, "overview")}
              className={playbookAvailable ? undefined : "opacity-60"}
            >
              <BookOpen className="h-4 w-4" />
            </IconButton>
            {cred.auto_rotates ? (
              <IconButton
                title="Rotate now (auto-rotation enabled)"
                onClick={() => setRotateNow(true)}
                className="text-sherpa-600 hover:text-sherpa-700"
              >
                <Zap className="h-4 w-4" />
              </IconButton>
            ) : (
              <IconButton
                title="Enable auto-rotation"
                onClick={() => setEnableRotation(true)}
                className="text-slate-400 hover:text-sherpa-600"
              >
                <Zap className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton
              title="Mark as rotated"
              onClick={() => setRotating(true)}
              className={info.status === "overdue" ? "text-red-600 hover:text-red-700" : undefined}
            >
              <RotateCw className="h-4 w-4" />
            </IconButton>
            <IconButton title="Edit" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </IconButton>
            <IconButton
              title="Delete"
              onClick={() => setDeleting(true)}
              className="hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          </div>
        </div>

        {revealed && (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <code className="break-all font-mono text-xs text-emerald-900">
                {revealed}
              </code>
              <div className="flex shrink-0 items-center gap-2 text-xs text-emerald-700">
                <Clock className="h-3 w-3" /> Hiding in {revealLeft}s
              </div>
            </div>
          </div>
        )}

        {copied && (
          <p className="mt-2 text-xs text-slate-500">
            Copied. Clipboard will be cleared in {copyLeft}s (only if this tab
            stays focused).
          </p>
        )}

        {error && (
          <div className="mt-2">
            <Callout tone="danger">{error}</Callout>
          </div>
        )}
      </li>

      <EditCredentialDialog
        cred={cred}
        open={editing}
        onOpenChange={setEditing}
        onSaved={() => router.refresh()}
      />
      <DeleteCredentialDialog
        cred={cred}
        open={deleting}
        onOpenChange={setDeleting}
        onDeleted={() => router.refresh()}
      />
      <MarkRotatedDialog
        cred={cred}
        open={rotating}
        onOpenChange={setRotating}
        onDone={() => router.refresh()}
        onOpenEdit={() => setEditing(true)}
      />
      <RotateNowDialog
        credentialId={cred.id}
        credentialLabel={cred.label}
        serviceName={service?.name ?? cred.service}
        open={rotateNow}
        onOpenChange={setRotateNow}
      />
      <EnableRotationDialog
        credentialId={cred.id}
        credentialLabel={cred.label}
        credentialService={cred.service}
        credentialCiphertext={cred.ciphertext}
        open={enableRotation}
        onOpenChange={setEnableRotation}
        onSaved={() => router.refresh()}
      />
    </>
  );
}

function StatusPill({ status }: { status: RotationStatus }) {
  const cfg = {
    ok: { label: "OK", className: "bg-emerald-50 text-emerald-700", Icon: CheckCircle2 },
    due: { label: "Due soon", className: "bg-amber-50 text-amber-700", Icon: Clock },
    overdue: { label: "Overdue", className: "bg-red-50 text-red-700", Icon: AlertTriangle },
    unknown: { label: "New", className: "bg-slate-100 text-slate-600", Icon: Clock },
  }[status];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${cfg.className}`}
    >
      <Icon className="h-3 w-3" /> {cfg.label}
    </span>
  );
}

function IconButton({
  children,
  title,
  onClick,
  className,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
        className,
      )}
    >
      {children}
    </button>
  );
}

"use client";

/**
 * SHRP-051 — Rotate now dialog.
 *
 * Confirms the rotation, calls /api/credentials/[id]/rotate-now, and
 * displays the orchestrator's step-by-step audit timeline + rollback
 * summary when it finishes. The orchestrator runs server-side and
 * returns the full audit in the response so we don't need a separate
 * polling round-trip.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import {
  CheckCircle2,
  XCircle,
  RotateCw,
  Loader2,
  ShieldAlert,
  AlertTriangle,
} from "lucide-react";

type Step = {
  step: string;
  at: string;
  ok: boolean;
  reason?: string;
};

type OrchestratorResult = {
  ok: boolean;
  status: "succeeded" | "rolled_back" | "failed";
  steps: Step[];
  rolled_back_steps?: Step[];
  old_key_id?: string | null;
  new_key_id?: string | null;
  message: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialId: string;
  credentialLabel: string;
  serviceName: string;
}

export function RotateNowDialog({
  open,
  onOpenChange,
  credentialId,
  credentialLabel,
  serviceName,
}: Props) {
  const router = useRouter();
  const [running, setRunning] = React.useState(false);
  const [result, setResult] = React.useState<OrchestratorResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      // Reset state for next time.
      setResult(null);
      setError(null);
      setRunning(false);
    }
  }, [open]);

  async function onRotate() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(
        `/api/credentials/${credentialId}/rotate-now`,
        { method: "POST" },
      );
      const body = (await res.json().catch(() => ({}))) as
        | OrchestratorResult
        | { error: string; message?: string };
      if (res.status === 503 || res.status === 404 || res.status === 409) {
        const msg = (body as { message?: string }).message ?? `HTTP ${res.status}`;
        setError(msg);
        return;
      }
      setResult(body as OrchestratorResult);
      // Even on failure the orchestrator returns a structured result;
      // refresh so the credentials list shows the new rotation date.
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setRunning(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!running) onOpenChange(o);
      }}
      title={result ? "Rotation complete" : "Rotate now"}
      description={
        result
          ? undefined
          : `This will generate a new ${serviceName} key, push it to your deployment target, verify it works, then revoke the old key. If anything fails, we roll back.`
      }
    >
      <div className="space-y-4">
        {!result && !error && (
          <>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <strong>{credentialLabel}</strong> · {serviceName}
            </div>
            <Callout tone="info" title="What happens during rotation">
              <ul className="list-disc pl-5 text-xs leading-relaxed">
                <li>We verify your current key still works.</li>
                <li>We generate a new key at {serviceName}.</li>
                <li>
                  We push the new key to your deployment target&apos;s env
                  vars.
                </li>
                <li>We verify the new key works.</li>
                <li>We revoke the old key.</li>
                <li>
                  We re-encrypt the new key for your vault. You&apos;ll see a
                  &quot;re-wrap pending&quot; pill until you next unlock.
                </li>
              </ul>
            </Callout>
          </>
        )}

        {error && (
          <Callout tone="danger" title="Could not start rotation">
            <p className="text-xs leading-relaxed">{error}</p>
          </Callout>
        )}

        {result && <ResultPanel result={result} />}

        <div className="flex justify-end gap-2 pt-2">
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          ) : (
            <>
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={running}
              >
                Cancel
              </Button>
              <Button onClick={onRotate} disabled={running}>
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="h-4 w-4" />
                )}
                {running ? "Rotating..." : "Rotate now"}
              </Button>
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function ResultPanel({ result }: { result: OrchestratorResult }) {
  const tone =
    result.status === "succeeded"
      ? "success"
      : result.status === "rolled_back"
        ? "warning"
        : "danger";
  const title =
    result.status === "succeeded"
      ? "Rotation succeeded"
      : result.status === "rolled_back"
        ? "Rotation rolled back"
        : "Rotation failed";

  return (
    <div className="space-y-3">
      <Callout tone={tone} title={title}>
        <p className="text-xs leading-relaxed">{result.message}</p>
      </Callout>

      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Step-by-step
        </div>
        <ol className="space-y-1.5 text-xs">
          {result.steps.map((step, i) => (
            <li
              key={`${step.step}-${i}`}
              className="flex items-start gap-2 rounded-md bg-slate-50 px-2 py-1.5"
            >
              <StepIcon ok={step.ok} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800">
                  {prettyStep(step.step)}
                </div>
                {step.reason && (
                  <div className="text-[11px] text-slate-500">
                    {step.reason}
                  </div>
                )}
              </div>
              <div className="shrink-0 text-[10px] text-slate-400">
                {new Date(step.at).toLocaleTimeString()}
              </div>
            </li>
          ))}
        </ol>
      </div>

      {result.rolled_back_steps && result.rolled_back_steps.length > 0 && (
        <div>
          <div className="mb-1 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Rollback steps
          </div>
          <ol className="space-y-1.5 text-xs">
            {result.rolled_back_steps.map((step, i) => (
              <li
                key={`rb-${step.step}-${i}`}
                className="flex items-start gap-2 rounded-md bg-amber-50 px-2 py-1.5"
              >
                <StepIcon ok={step.ok} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-800">
                    Rollback: {prettyStep(step.step)}
                  </div>
                  {step.reason && (
                    <div className="text-[11px] text-slate-500">
                      {step.reason}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {result.status === "succeeded" && (
        <p className="text-[11px] text-slate-500">
          Your new key is in the deployment target&apos;s env vars. Unlock
          your vault to complete the re-wrap so you can reveal/copy it
          locally.
        </p>
      )}
      {result.status === "failed" && result.steps.some(
        (s) => s.step === "update_vault" && !s.ok,
      ) && (
        <div className="rounded-md border-2 border-red-200 bg-red-50 p-3 text-xs text-red-900">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <strong>Manual attention required:</strong> the new key is in
              your deployment target but the vault didn&apos;t accept it.
              Check the deployment target&apos;s env vars manually and add
              the new value to your vault.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepIcon({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
  ) : (
    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-600" />
  );
}

function prettyStep(step: string): string {
  return step
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

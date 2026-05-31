"use client";

/**
 * Import-from-.env dialog — SHRP-009b
 *
 * Three steps inside one dialog:
 *   1. Paste — a textarea where the user dumps their .env content.
 *   2. Preview — each parsed entry is shown with the detected service +
 *      key type + confidence. The user can include/exclude per row,
 *      override the detected service / key type, and set the env.
 *   3. Importing — credentials are encrypted in-browser and batch-inserted.
 *
 * Never decrypts anything. Vault key is held in context for the encryption.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { encrypt } from "@/lib/crypto";
import { parseEnv, type EnvEntry } from "@/lib/envParser";
import { detectKey } from "@/lib/keyDetect";
import { SERVICES, ENVIRONMENTS, getService, type Environment } from "@/lib/services";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { Upload, AlertTriangle, ArrowLeft, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { worstRisk, type RiskCredentialInput } from "@/lib/risk-rules";
import { RiskBadge } from "@/components/risk-badge";
import { clearPendingImport } from "@/lib/pending-import";

type Step = "paste" | "preview" | "importing" | "done";

interface PreviewRow {
  envKey: string; // original .env key like NEXT_PUBLIC_SUPABASE_URL
  value: string; // plaintext, will be encrypted before insert
  serviceId: string;
  keyTypeId: string;
  env: Environment;
  confidence: number; // from keyDetect
  include: boolean;
}

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported?: (count: number) => void;
  /**
   * Pre-fill the textarea with this text and skip directly to the preview
   * step. Used by SHRP-041b for the landing-page → signup handoff so the
   * user doesn't have to paste their .env twice.
   */
  initialText?: string;
}

export function ImportEnvDialog({
  projectId,
  open,
  onOpenChange,
  onImported,
  initialText,
}: Props) {
  const router = useRouter();
  const vault = useVaultKey();

  const [step, setStep] = React.useState<Step>("paste");
  const [pastedText, setPastedText] = React.useState("");
  const [rows, setRows] = React.useState<PreviewRow[]>([]);
  const [parseWarnings, setParseWarnings] = React.useState<string[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [importedCount, setImportedCount] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setStep("paste");
      setPastedText(initialText ?? "");
      setRows([]);
      setParseWarnings([]);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If the dialog opens with initialText, advance straight to the preview.
  // (Run after the first render so pastedText is already populated.)
  const advancedRef = React.useRef(false);
  React.useEffect(() => {
    if (open && initialText && !advancedRef.current && pastedText === initialText) {
      advancedRef.current = true;
      onParse();
    }
    if (!open) advancedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialText, pastedText]);

  function onParse() {
    const result = parseEnv(pastedText);
    if (result.entries.length === 0) {
      setError(
        result.warnings.length > 0
          ? "Couldn't find any valid KEY=VALUE lines. Check the warnings below."
          : "Nothing to import. Paste your .env content above.",
      );
      setParseWarnings(result.warnings.map((w) => `Line ${w.line}: ${w.reason}`));
      return;
    }
    setError(null);
    setParseWarnings(result.warnings.map((w) => `Line ${w.line}: ${w.reason}`));

    // Build preview rows by running each entry through keyDetect and falling
    // back to "custom" for ambiguous ones.
    const previewRows: PreviewRow[] = result.entries.map((e: EnvEntry) => {
      const detection = detectKey(e.value);
      const envGuess = guessEnvFromKeyName(e.key);
      return {
        envKey: e.key,
        value: e.value,
        serviceId: detection?.serviceId ?? "custom",
        keyTypeId: detection?.keyTypeId ?? "other",
        env: envGuess,
        confidence: detection?.confidence ?? 0,
        include: true,
      };
    });
    setRows(previewRows);
    setStep("preview");
  }

  async function onImport() {
    setError(null);
    const included = rows.filter((r) => r.include);
    if (included.length === 0) {
      setError("Select at least one credential to import.");
      return;
    }
    if (!vault.key) {
      router.push(`/vault/unlock?next=/vault/${projectId}`);
      return;
    }
    setStep("importing");
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Encrypt each value with the vault key in this browser tab.
      const payloads: Array<{
        project_id: string;
        user_id: string;
        service: string;
        env: string;
        label: string;
        ciphertext: string;
        last_rotated_at: string;
      }> = [];

      for (const row of included) {
        const ciphertext = await encrypt(row.value, vault.key);
        const keyTypeLabel = labelForKeyType(row.serviceId, row.keyTypeId);
        payloads.push({
          project_id: projectId,
          user_id: user.id,
          service: row.serviceId,
          env: row.env,
          label: `${row.envKey} · ${keyTypeLabel}`,
          ciphertext,
          last_rotated_at: new Date().toISOString(),
        });
      }

      const { error: insErr } = await supabase.from("credentials").insert(payloads);
      if (insErr) throw insErr;

      const servicesTouched = Array.from(new Set(included.map((r) => r.serviceId)));
      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "credentials_imported",
        actor: "user",
        metadata: { count: included.length, services: servicesTouched },
      });

      // Clear any landing-page pending import — we've consumed it.
      clearPendingImport();

      setImportedCount(included.length);
      setStep("done");
      onImported?.(included.length);
      // Small delay so the success message is visible before refreshing.
      setTimeout(() => {
        router.refresh();
        onOpenChange(false);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  }

  function updateRow(index: number, patch: Partial<PreviewRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function toggleAll(include: boolean) {
    setRows((prev) => prev.map((r) => ({ ...r, include })));
  }

  const includedCount = rows.filter((r) => r.include).length;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={titleFor(step)}
      description={descriptionFor(step)}
      className="max-w-4xl"
    >
      {step === "paste" && (
        <div className="space-y-4">
          <Callout tone="info">
            Paste the contents of your <code className="font-mono text-xs">.env</code>{" "}
            file. Sherpa will identify each key, suggest a service and key type,
            and let you confirm before importing. Your values stay in your
            browser until they&apos;re encrypted.
          </Callout>

          <div>
            <Label htmlFor="env-paste">.env contents</Label>
            <textarea
              id="env-paste"
              rows={12}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`# Paste your .env file here\nSTRIPE_SECRET_KEY=sk_live_...\nNEXT_PUBLIC_SUPABASE_URL=https://...\n...`}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-xs shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
              spellCheck={false}
              autoComplete="off"
              autoFocus
            />
          </div>

          {error && <Callout tone="danger">{error}</Callout>}

          {parseWarnings.length > 0 && (
            <Callout tone="warning" title="Some lines couldn't be parsed">
              <ul className="list-disc pl-4 text-xs">
                {parseWarnings.slice(0, 5).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {parseWarnings.length > 5 && (
                  <li>…and {parseWarnings.length - 5} more</li>
                )}
              </ul>
            </Callout>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button onClick={onParse} disabled={!pastedText.trim()}>
              <Upload className="h-4 w-4" /> Parse and preview
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <Callout tone="info">
            Sherpa found <strong>{rows.length}</strong> credential
            {rows.length === 1 ? "" : "s"} in your file. Review and adjust the
            service / key type for each before importing.
          </Callout>

          <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
            <span>
              <strong>{includedCount}</strong> of {rows.length} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="font-medium text-sherpa-600 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="font-medium text-slate-500 hover:underline"
              >
                Select none
              </button>
            </div>
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-md border border-slate-200">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-2 py-2 font-medium">Include</th>
                  <th className="px-2 py-2 font-medium">Env key (label)</th>
                  <th className="px-2 py-2 font-medium">Detected</th>
                  <th className="px-2 py-2 font-medium">Risk</th>
                  <th className="px-2 py-2 font-medium">Service</th>
                  <th className="px-2 py-2 font-medium">Key type</th>
                  <th className="px-2 py-2 font-medium">Env</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, i) => {
                  const service = getService(row.serviceId);
                  const masked = mask(row.value);

                  // Evaluate risk against all OTHER rows so we catch cross-credential rules.
                  const others: RiskCredentialInput[] = rows
                    .filter((_, j) => j !== i)
                    .map((o) => ({
                      service: o.serviceId,
                      keyType: o.keyTypeId,
                      env: o.env,
                      value: o.value,
                      envKeyName: o.envKey,
                    }));
                  const risk = worstRisk(
                    {
                      service: row.serviceId,
                      keyType: row.keyTypeId,
                      env: row.env,
                      value: row.value,
                      envKeyName: row.envKey,
                    },
                    { siblings: others },
                  );

                  return (
                    <tr
                      key={i}
                      className={cn(!row.include && "opacity-50")}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={(e) =>
                            updateRow(i, { include: e.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-sherpa-500"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="font-mono font-medium text-slate-800">
                          {row.envKey}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {masked}
                        </div>
                      </td>
                      <td className="px-2 py-1.5">
                        <ConfidencePill confidence={row.confidence} />
                      </td>
                      <td className="px-2 py-1.5">
                        {risk ? (
                          <RiskBadge rule={risk} showFixLink={false} />
                        ) : (
                          <span className="text-[10px] text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.serviceId}
                          onChange={(e) =>
                            updateRow(i, {
                              serviceId: e.target.value,
                              keyTypeId:
                                getService(e.target.value)?.keyTypes[0]?.id ??
                                "other",
                            })
                          }
                          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                        >
                          {SERVICES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.keyTypeId}
                          onChange={(e) => updateRow(i, { keyTypeId: e.target.value })}
                          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                        >
                          {(service?.keyTypes ?? []).map((kt) => (
                            <option key={kt.id} value={kt.id}>
                              {kt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <select
                          value={row.env}
                          onChange={(e) =>
                            updateRow(i, { env: e.target.value as Environment })
                          }
                          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs"
                        >
                          {ENVIRONMENTS.map((env) => (
                            <option key={env.id} value={env.id}>
                              {env.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!vault.key && (
            <Callout tone="warning" title="Vault is locked.">
              <Lock className="inline h-3 w-3" /> You&apos;ll be asked to unlock
              before the import can run.
            </Callout>
          )}

          {error && <Callout tone="danger">{error}</Callout>}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("paste")}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={onImport} disabled={includedCount === 0}>
              <Upload className="h-4 w-4" />
              Import {includedCount} credential{includedCount === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="space-y-4 py-8 text-center">
          <Upload className="mx-auto h-8 w-8 animate-pulse text-sherpa-500" />
          <p className="text-sm text-slate-600">
            Encrypting and saving {includedCount} credential
            {includedCount === 1 ? "" : "s"}...
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-4 py-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            ✓
          </div>
          <div>
            <p className="text-base font-semibold text-slate-900">
              Imported {importedCount} credential{importedCount === 1 ? "" : "s"}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Your vault now contains them, encrypted with your passphrase.
            </p>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------------- helpers ----------------

function titleFor(step: Step): string {
  if (step === "paste") return "Import from .env";
  if (step === "preview") return "Review and confirm";
  if (step === "importing") return "Importing...";
  return "Done";
}

function descriptionFor(step: Step): string {
  if (step === "paste") return "Paste your .env file and Sherpa will identify each key.";
  if (step === "preview") return "Adjust services or environments before importing.";
  return "";
}

function mask(value: string): string {
  if (value.length <= 12) return "•".repeat(value.length);
  return value.slice(0, 6) + "•".repeat(Math.min(value.length - 10, 16)) + value.slice(-4);
}

function ConfidencePill({ confidence }: { confidence: number }) {
  if (confidence >= 0.9) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        ✓ Strong
      </span>
    );
  }
  if (confidence >= 0.6) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
        ? Likely
      </span>
    );
  }
  if (confidence > 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
        Maybe
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
      <AlertTriangle className="h-2.5 w-2.5" /> Unknown
    </span>
  );
}

function guessEnvFromKeyName(name: string): Environment {
  const lower = name.toLowerCase();
  if (lower.includes("_test") || lower.includes("staging") || lower.includes("dev_")) {
    return "staging";
  }
  if (lower.includes("local")) return "dev";
  return "production";
}

function labelForKeyType(serviceId: string, keyTypeId: string): string {
  const svc = getService(serviceId);
  return svc?.keyTypes.find((t) => t.id === keyTypeId)?.label ?? keyTypeId;
}

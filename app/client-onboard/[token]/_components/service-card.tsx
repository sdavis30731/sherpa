"use client";

/**
 * SHRP-107f — One credential card on the client onboarding page.
 *
 * Renders the per-service beginner walkthrough (from lib/stack-guides.ts),
 * a paste field with optional pattern validation, and a Save button.
 * Save calls the parent's submit-callback, which seals the plaintext
 * with the agency's public key BEFORE the value leaves the browser.
 *
 * After successful save the card collapses to a "done" pill so the
 * client can see progress at a glance.
 */

import * as React from "react";
import {
  getStackGuide,
  type StackGuide,
} from "@/lib/stack-guides";
import { plainServiceDescription } from "@/lib/custody-plain-language";
import {
  CheckCircle2,
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";

type ServiceState = "todo" | "submitting" | "done" | "error";

interface Props {
  serviceId: string;
  agencyName: string;
  agencyPrimaryColor: string;
  state: ServiceState;
  error: string | null;
  onSubmit: (args: {
    keyType: string;
    label: string;
    plaintext: string;
  }) => Promise<{ ok: boolean; error?: string }>;
}

export function ServiceCard({
  serviceId,
  agencyName,
  agencyPrimaryColor,
  state,
  error,
  onSubmit,
}: Props) {
  const guide: StackGuide | null = getStackGuide(serviceId);
  const displayName = guide?.display_name ?? serviceId;
  const description = plainServiceDescription(serviceId, displayName);

  // Default expanded until done; once done, collapse but allow re-open.
  const [expanded, setExpanded] = React.useState(state !== "done");
  React.useEffect(() => {
    if (state === "done") setExpanded(false);
  }, [state]);

  const [value, setValue] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [showWarning, setShowWarning] = React.useState(false);

  function handleChange(v: string) {
    setValue(v);
    if (guide?.validate_pattern && v.length > 8) {
      setShowWarning(!guide.validate_pattern.test(v.trim()));
    } else {
      setShowWarning(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    const r = await onSubmit({
      keyType: guide?.key_type_default ?? "",
      label: label.trim() || `${displayName} (from client)`,
      plaintext: value.trim(),
    });
    if (r.ok) {
      // Wipe the plaintext from memory once the parent has it sealed.
      setValue("");
      setLabel("");
    }
  }

  const isSubmitting = state === "submitting";
  const isDone = state === "done";

  return (
    <div
      className={
        "rounded-2xl border bg-white shadow-sm transition " +
        (isDone ? "border-emerald-200" : "border-slate-200")
      }
    >
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        <span
          className={
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-sm font-bold text-white " +
            (isDone ? "bg-emerald-500" : "")
          }
          style={!isDone ? { background: agencyPrimaryColor } : undefined}
        >
          {isDone ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            displayName.slice(0, 1).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-slate-900">
            {displayName}
          </div>
          <div className="truncate text-xs text-slate-500">{description}</div>
        </div>
        {isDone ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3 w-3" /> Done
          </span>
        ) : (
          <span className="text-slate-400">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4">
          {guide?.what_we_need && (
            <p className="mb-4 text-sm text-slate-700 leading-relaxed">
              <strong>What {agencyName} needs:</strong> {guide.what_we_need}
            </p>
          )}

          {guide ? (
            <ol className="space-y-3">
              {guide.beginner.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: agencyPrimaryColor }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-700 leading-relaxed">
                      {step.body}
                    </p>
                    {step.url && (
                      <a
                        href={step.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-medium hover:underline"
                        style={{ color: agencyPrimaryColor }}
                      >
                        Open {new URL(step.url).host}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-slate-600">
              We don&apos;t have a step-by-step guide for {displayName} yet
              — your agency will tell you where to grab the key.
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-3 border-t border-slate-100 pt-4"
          >
            <div>
              <label
                htmlFor={`paste-${serviceId}`}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                {guide?.paste_label ?? `Paste your ${displayName} key`}
              </label>
              <textarea
                id={`paste-${serviceId}`}
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                rows={3}
                spellCheck={false}
                autoComplete="off"
                placeholder={guide?.paste_placeholder ?? ""}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
              {showWarning && (
                <div className="mt-1 flex items-start gap-1.5 text-xs text-amber-700">
                  <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    That doesn&apos;t look like a {displayName} key.
                    Double-check before saving — your agency will let you
                    know if anything&apos;s off.
                  </span>
                </div>
              )}
            </div>
            <div>
              <label
                htmlFor={`label-${serviceId}`}
                className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
              >
                Label{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id={`label-${serviceId}`}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`e.g. "Production"`}
                disabled={isSubmitting}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50"
              />
            </div>
            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                {error}
              </p>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!value.trim() || isSubmitting}
                className="inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: agencyPrimaryColor }}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmitting ? "Encrypting & saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

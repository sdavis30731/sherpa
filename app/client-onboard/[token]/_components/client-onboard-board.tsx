"use client";

/**
 * SHRP-107f — Client onboarding interactive board.
 *
 * Renders inside the agency-branded page. State machine:
 *   1. Pick experience level (rendered once on first land)
 *   2. Walk through one card per requested service
 *      - Beginner track shows step-by-step guide
 *      - Paste field → encrypts in browser with X25519 sealed box
 *        (lib/keypair.ts) → POST ciphertext to /api/client-onboard
 *      - Card marks "done" with a green check
 *   3. When all cards done, "Send to agency" button enables
 *      → POST /api/client-onboard/.../complete → success screen
 *
 * Crypto: every credential is sealed with sealForAgency() BEFORE it
 * leaves the browser. Server only ever sees ciphertext. The agency
 * decrypts later when they unlock their vault.
 */

import * as React from "react";
import { sealForAgency } from "@/lib/keypair";
import { ServiceCard } from "./service-card";
import {
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Send,
  Loader2,
} from "lucide-react";

type Level = "beginner" | "intermediate" | "expert";

interface Props {
  token: string;
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyPrimaryColor: string;
  agencyPublicKey: string;
  clientFirstName: string;
  clientName: string;
  engagementName: string;
  personalMessage: string;
  requestedServices: string[];
  initialExperienceLevel: Level | null;
  footerText: string | null;
}

type ServiceState = "todo" | "submitting" | "done" | "error";

export function ClientOnboardBoard({
  token,
  agencyName,
  agencyLogoUrl,
  agencyPrimaryColor,
  agencyPublicKey,
  clientFirstName,
  engagementName,
  personalMessage,
  requestedServices,
  initialExperienceLevel,
  footerText,
}: Props) {
  const [level, setLevel] = React.useState<Level | null>(
    initialExperienceLevel,
  );
  const [serviceStates, setServiceStates] = React.useState<
    Record<string, ServiceState>
  >(() =>
    Object.fromEntries(requestedServices.map((s) => [s, "todo" as ServiceState])),
  );
  const [serviceErrors, setServiceErrors] = React.useState<
    Record<string, string | null>
  >({});
  const [submittingComplete, setSubmittingComplete] = React.useState(false);
  const [completeError, setCompleteError] = React.useState<string | null>(null);
  const [allDone, setAllDone] = React.useState(false);

  const doneCount = Object.values(serviceStates).filter(
    (s) => s === "done",
  ).length;
  const totalCount = requestedServices.length;
  const everyDone = doneCount === totalCount && totalCount > 0;

  /** Encrypt + POST for one service. */
  async function submitOneCredential(args: {
    service: string;
    keyType: string;
    label: string;
    plaintext: string;
  }): Promise<{ ok: boolean; error?: string }> {
    setServiceStates((prev) => ({ ...prev, [args.service]: "submitting" }));
    setServiceErrors((prev) => ({ ...prev, [args.service]: null }));
    try {
      // The crypto-critical step. The plaintext NEVER leaves this
      // function — only the sealed ciphertext does.
      const ciphertext = await sealForAgency(args.plaintext, agencyPublicKey);
      const res = await fetch(
        `/api/client-onboard/${token}/submit-credential`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            service: args.service,
            key_type: args.keyType,
            label: args.label,
            env: "production",
            ciphertext_b64: ciphertext,
          }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(body.details ?? body.error ?? `HTTP ${res.status}`);
      }
      setServiceStates((prev) => ({ ...prev, [args.service]: "done" }));
      return { ok: true };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not submit.";
      setServiceStates((prev) => ({ ...prev, [args.service]: "error" }));
      setServiceErrors((prev) => ({ ...prev, [args.service]: message }));
      return { ok: false, error: message };
    }
  }

  async function onSendToAgency() {
    setSubmittingComplete(true);
    setCompleteError(null);
    try {
      const res = await fetch(`/api/client-onboard/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experience_level: level }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(body.details ?? body.error ?? `HTTP ${res.status}`);
      }
      setAllDone(true);
    } catch (err) {
      setCompleteError(
        err instanceof Error ? err.message : "Could not finalize.",
      );
    } finally {
      setSubmittingComplete(false);
    }
  }

  // ─── Done state ────────────────────────────────────────────────
  if (allDone) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            {clientFirstName ? `Thanks, ${clientFirstName}!` : "Thanks!"}
          </h1>
          <p className="mt-3 text-base text-slate-600 leading-relaxed">
            Your credentials have been sent to{" "}
            <strong>{agencyName}</strong>. Everything you pasted was
            encrypted in your browser first — only they can read it.
          </p>
          <p className="mt-2 text-sm text-slate-500">
            You can close this tab. We&apos;ll let your agency know
            you&apos;re all set.
          </p>
          {footerText && (
            <p className="mt-8 text-[11px] text-slate-400">{footerText}</p>
          )}
        </div>
      </div>
    );
  }

  // ─── Experience-level picker ─────────────────────────────────
  if (!level) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-12">
        <BrandBar
          agencyName={agencyName}
          agencyLogoUrl={agencyLogoUrl}
          engagementName={engagementName}
        />
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">
            {clientFirstName
              ? `Hi ${clientFirstName} — welcome.`
              : "Hi — welcome."}
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            <strong>{agencyName}</strong> is starting work on{" "}
            <strong>{engagementName}</strong> and needs access to a few
            of your accounts. We&apos;ll walk you through each one.
          </p>
          {personalMessage.trim() && (
            <blockquote
              className="mt-5 rounded-lg p-4 text-sm text-slate-800 leading-relaxed"
              style={{
                background: "rgba(15, 23, 42, 0.03)",
                borderLeft: `3px solid ${agencyPrimaryColor}`,
                whiteSpace: "pre-wrap",
              }}
            >
              {personalMessage.trim()}
            </blockquote>
          )}
          <div className="mt-8">
            <p className="text-sm font-semibold text-slate-900">
              How comfortable are you doing this kind of thing?
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Your answer changes how detailed the guides are. You can
              skip a step at any time.
            </p>
            <div className="mt-3 space-y-2">
              <LevelChoice
                level="beginner"
                title="Show me each click"
                body="Step-by-step guides with every link, button, and screen named. Recommended."
                onPick={setLevel}
                color={agencyPrimaryColor}
              />
              <LevelChoice
                level="intermediate"
                title="I've done it once or twice"
                body="A short paragraph + the URL. You'll figure it out from there. (Coming soon — for now, same as Beginner.)"
                onPick={setLevel}
                color={agencyPrimaryColor}
                disabled
              />
              <LevelChoice
                level="expert"
                title="I do this all the time"
                body="Just give me the URL. (Coming soon — for now, same as Beginner.)"
                onPick={setLevel}
                color={agencyPrimaryColor}
                disabled
              />
            </div>
          </div>
        </div>
        <PrivacyStripe agencyName={agencyName} />
      </div>
    );
  }

  // ─── Main board: one card per service ──────────────────────────
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <BrandBar
        agencyName={agencyName}
        agencyLogoUrl={agencyLogoUrl}
        engagementName={engagementName}
      />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Progress
            </div>
            <div className="mt-0.5 text-base font-semibold text-slate-900">
              {doneCount} of {totalCount} accounts ready
            </div>
          </div>
          <div className="relative h-2 w-32 overflow-hidden rounded-full bg-slate-100">
            <div
              className="absolute inset-y-0 left-0 transition-all"
              style={{
                width: `${totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100)}%`,
                background: agencyPrimaryColor,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {requestedServices.map((serviceId) => (
          <ServiceCard
            key={serviceId}
            serviceId={serviceId}
            agencyName={agencyName}
            agencyPrimaryColor={agencyPrimaryColor}
            state={serviceStates[serviceId] ?? "todo"}
            error={serviceErrors[serviceId] ?? null}
            onSubmit={(args) =>
              submitOneCredential({ service: serviceId, ...args })
            }
          />
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold text-slate-900">
              {everyDone
                ? "Everything's ready to send."
                : `Finish the remaining ${totalCount - doneCount} and you're done.`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {everyDone
                ? `Click below to let ${agencyName} know.`
                : `${agencyName} will receive everything at once.`}
            </p>
          </div>
          <button
            type="button"
            onClick={onSendToAgency}
            disabled={!everyDone || submittingComplete}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: agencyPrimaryColor }}
          >
            {submittingComplete ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submittingComplete ? "Sending..." : `Send to ${agencyName}`}
            {!submittingComplete && <ChevronRight className="h-3 w-3" />}
          </button>
        </div>
        {completeError && (
          <p className="mt-3 text-xs text-red-700">{completeError}</p>
        )}
      </div>

      <PrivacyStripe agencyName={agencyName} />
      {footerText && (
        <p className="mt-6 text-center text-[11px] text-slate-400">
          {footerText}
        </p>
      )}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function BrandBar({
  agencyName,
  agencyLogoUrl,
  engagementName,
}: {
  agencyName: string;
  agencyLogoUrl: string | null;
  engagementName: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {agencyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agencyLogoUrl}
          alt={`${agencyName} logo`}
          className="h-10 w-10 rounded-lg object-contain ring-1 ring-slate-200 bg-white"
        />
      ) : (
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white text-base font-bold">
          {agencyName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">
          {agencyName}
        </div>
        <div className="text-xs text-slate-500">
          Engagement · {engagementName}
        </div>
      </div>
    </div>
  );
}

function LevelChoice({
  level,
  title,
  body,
  onPick,
  color,
  disabled,
}: {
  level: Level;
  title: string;
  body: string;
  onPick: (l: Level) => void;
  color: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(level)}
      disabled={disabled}
      className="group flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
        style={{ background: color }}
      >
        <ChevronRight className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">{title}</div>
        <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">
          {body}
        </p>
      </div>
    </button>
  );
}

function PrivacyStripe({ agencyName }: { agencyName: string }) {
  return (
    <div className="mt-8 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <strong>How this is kept private:</strong> every credential is
        encrypted in this browser before it leaves your machine. Only{" "}
        <strong>{agencyName}</strong> can decrypt them — SherpaKeys
        (the tool you&apos;re using right now) cannot.
      </div>
    </div>
  );
}

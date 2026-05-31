"use client";

/**
 * .env analyzer — SHRP-041a / 041f
 *
 * The hero experience on the landing page. The visitor pastes their .env
 * (or, more often, a redacted one or our sample), the browser runs
 * parseEnv + keyDetect + intrinsic-risk lookup + risk-rules, and the result
 * appears inline below the textarea. NOTHING leaves the browser. No signup,
 * no email gate, no anything before value.
 *
 * The whole point: aha BEFORE friction. And — because pasting real secrets
 * to a stranger's site on first encounter is a big ask — we lead with a
 * redacted-friendly framing. Every detected credential now shows an
 * intrinsic-risk explanation (what it CAN do, what makes it dangerous)
 * so the analyzer educates even when nothing is misconfigured.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { parseEnv } from "@/lib/envParser";
import { detectKey } from "@/lib/keyDetect";
import { worstRisk, type RiskCredentialInput } from "@/lib/risk-rules";
import {
  getService,
  getIntrinsicRisk,
  type IntrinsicLevel,
} from "@/lib/services";
import { savePendingImport } from "@/lib/pending-import";
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  ClipboardPaste,
  Sparkles,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE = `# A redacted sample — not your real keys. Edit freely.
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

STRIPE_SECRET_KEY=sk_live_REDACTED_REDACTED_REDACTED
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_REDACTED_REDACTED
STRIPE_WEBHOOK_SECRET=whsec_REDACTED_REDACTED_REDACTED

GITHUB_TOKEN=ghp_REDACTED_REDACTED_REDACTED
OPENAI_API_KEY=sk-REDACTED_REDACTED_REDACTED
RESEND_API_KEY=re_REDACTED_REDACTED_REDACTED`;

function guessEnv(name: string): "dev" | "staging" | "production" {
  const lower = name.toLowerCase();
  if (lower.includes("_test") || lower.includes("staging")) return "staging";
  if (lower.includes("local") || lower.includes("_dev")) return "dev";
  return "production";
}

interface AnalysisRow {
  envKey: string;
  value: string;
  serviceId: string;
  serviceName: string;
  keyTypeId: string;
  confidence: number;
  intrinsicLevel: IntrinsicLevel;
  intrinsicWhy: string;
  risk: ReturnType<typeof worstRisk>;
}

export function EnvAnalyzer() {
  const router = useRouter();
  // Start with the sample already loaded — visitors see what the tool does
  // BEFORE we ask them to do anything. They can edit/clear freely.
  const [text, setText] = React.useState(SAMPLE);
  const [usingSample, setUsingSample] = React.useState(true);

  // Live analysis derived from the textarea content.
  const analysis = React.useMemo(() => analyze(text), [text]);

  function onChangeText(next: string) {
    setText(next);
    if (next !== SAMPLE) setUsingSample(false);
  }

  function onSaveToVault() {
    if (text.trim()) savePendingImport(text);
    router.push("/signup?intent=import");
  }

  return (
    <div className="space-y-6">
      {/* Lead with the lowered ask: redacted or sample is fine */}
      <div className="rounded-xl border border-sherpa-200 bg-sherpa-50/60 px-4 py-3 text-center text-sm text-slate-700">
        <ShieldCheck className="mr-1.5 inline h-4 w-4 text-emerald-600" />
        <strong className="font-semibold">Try it risk-free.</strong> Paste a{" "}
        <strong>redacted</strong> .env (replace the secret bits with{" "}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
          REDACTED
        </code>
        ), use our sample below, or paste your real .env — your choice.{" "}
        <span className="text-slate-500">
          Nothing leaves your browser either way.
        </span>
      </div>

      <div className="relative">
        <label htmlFor="env-paste" className="sr-only">
          Paste your .env contents
        </label>
        <textarea
          id="env-paste"
          rows={10}
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          placeholder="Paste a .env here — redacted is fine"
          className="block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-slate-800 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-2 focus:ring-sherpa-500/40"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          {usingSample ? (
            <button
              type="button"
              onClick={() => {
                setText("");
                setUsingSample(false);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <EyeOff className="h-3 w-3" /> Clear and paste my own
            </button>
          ) : text.length === 0 ? (
            <button
              type="button"
              onClick={() => {
                setText(SAMPLE);
                setUsingSample(true);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
            >
              <Sparkles className="h-3 w-3" /> Use sample
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setText("");
                setUsingSample(false);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>
          Your values stay in your browser. The analysis runs entirely
          client-side — we couldn&apos;t see your keys even if we wanted to.
        </span>
      </div>

      {analysis.rows.length > 0 && (
        <AnalysisResult
          analysis={analysis}
          onSaveToVault={onSaveToVault}
          usingSample={usingSample}
        />
      )}
    </div>
  );
}

function analyze(text: string): {
  rows: AnalysisRow[];
  warningsCount: number;
  byService: Map<string, number>;
  configRiskCounts: { critical: number; high: number; medium: number; low: number };
  intrinsicCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
} {
  if (!text.trim()) {
    return {
      rows: [],
      warningsCount: 0,
      byService: new Map(),
      configRiskCounts: { critical: 0, high: 0, medium: 0, low: 0 },
      intrinsicCounts: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    };
  }

  const parsed = parseEnv(text);
  const rows: AnalysisRow[] = parsed.entries.map((e) => {
    const detection = detectKey(e.value);
    const serviceId = detection?.serviceId ?? "custom";
    const serviceName = getService(serviceId)?.name ?? "Unknown";
    const keyTypeId = detection?.keyTypeId ?? "other";
    const env = guessEnv(e.key);
    const intrinsic = getIntrinsicRisk(serviceId, keyTypeId);

    const input: RiskCredentialInput = {
      service: serviceId,
      keyType: keyTypeId,
      env,
      value: e.value,
      envKeyName: e.key,
    };

    // Build siblings for cross-credential rules
    const others: RiskCredentialInput[] = parsed.entries
      .filter((o) => o.key !== e.key)
      .map((o) => {
        const od = detectKey(o.value);
        return {
          service: od?.serviceId ?? "custom",
          keyType: od?.keyTypeId ?? "other",
          env: guessEnv(o.key),
          value: o.value,
          envKeyName: o.key,
        };
      });

    return {
      envKey: e.key,
      value: e.value,
      serviceId,
      serviceName,
      keyTypeId,
      confidence: detection?.confidence ?? 0,
      intrinsicLevel: intrinsic.level,
      intrinsicWhy: intrinsic.why,
      risk: worstRisk(input, { siblings: others }),
    };
  });

  const byService = new Map<string, number>();
  for (const r of rows) {
    byService.set(r.serviceId, (byService.get(r.serviceId) ?? 0) + 1);
  }

  const configRiskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of rows) {
    if (r.risk) configRiskCounts[r.risk.severity] += 1;
  }

  const intrinsicCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const r of rows) {
    intrinsicCounts[r.intrinsicLevel] += 1;
  }

  return {
    rows,
    warningsCount: parsed.warnings.length,
    byService,
    configRiskCounts,
    intrinsicCounts,
  };
}

function AnalysisResult({
  analysis,
  onSaveToVault,
  usingSample,
}: {
  analysis: ReturnType<typeof analyze>;
  onSaveToVault: () => void;
  usingSample: boolean;
}) {
  const { rows, byService, configRiskCounts, intrinsicCounts } = analysis;
  const totalConfigRisks =
    configRiskCounts.critical +
    configRiskCounts.high +
    configRiskCounts.medium +
    configRiskCounts.low;
  const hasCritical = configRiskCounts.critical > 0;
  const hasIntrinsicCritical = intrinsicCounts.critical > 0;

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <div className="text-2xl font-bold text-slate-900">{rows.length}</div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {rows.length === 1 ? "credential" : "credentials"} found
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div>
            <div className="text-2xl font-bold text-slate-900">{byService.size}</div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              {byService.size === 1 ? "service" : "services"}
            </div>
          </div>
          <div className="h-10 w-px bg-slate-200" />
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <div
                className={cn(
                  "text-2xl font-bold",
                  hasIntrinsicCritical
                    ? "text-red-700"
                    : intrinsicCounts.high > 0
                      ? "text-orange-700"
                      : "text-slate-900",
                )}
              >
                {intrinsicCounts.critical + intrinsicCounts.high}
              </div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                high-power keys
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
              {intrinsicCounts.critical > 0 && (
                <IntrinsicChip level="critical" count={intrinsicCounts.critical} />
              )}
              {intrinsicCounts.high > 0 && (
                <IntrinsicChip level="high" count={intrinsicCounts.high} />
              )}
              {intrinsicCounts.medium > 0 && (
                <IntrinsicChip level="medium" count={intrinsicCounts.medium} />
              )}
              {intrinsicCounts.low > 0 && (
                <IntrinsicChip level="low" count={intrinsicCounts.low} />
              )}
              {intrinsicCounts.info > 0 && (
                <IntrinsicChip level="info" count={intrinsicCounts.info} />
              )}
            </div>
          </div>
        </div>

        {/* Configuration issues banner — separate from intrinsic baseline */}
        {hasCritical ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Stop.</strong> You have a configuration problem that
                could leak a credential into your client-side code. Check the
                CRITICAL rows below before you deploy.
              </div>
            </div>
          </div>
        ) : totalConfigRisks > 0 ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>{totalConfigRisks}</strong>{" "}
                configuration {totalConfigRisks === 1 ? "issue" : "issues"}{" "}
                worth a look — see the rows marked &ldquo;Misconfig&rdquo;
                below.
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                No configuration issues detected. The risk levels below
                describe what each key{" "}
                <em className="italic">does</em> — not whether you&apos;ve
                misconfigured it.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-credential table — Key | Service | Risk | Why */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Key</th>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Risk</th>
              <th className="px-4 py-2 font-medium">Why</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-4 py-2 align-top font-mono text-xs font-medium text-slate-800">
                  {row.envKey}
                </td>
                <td className="px-4 py-2 align-top">
                  <div className="flex items-center gap-2">
                    <div
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
                      style={{
                        backgroundColor:
                          getService(row.serviceId)?.color ?? "#64748B",
                      }}
                    >
                      {row.serviceName.slice(0, 1)}
                    </div>
                    <span className="text-xs text-slate-700">
                      {row.serviceName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2 align-top">
                  <div className="flex flex-col gap-1">
                    <IntrinsicBadge level={row.intrinsicLevel} />
                    {row.risk && (
                      <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-800 ring-1 ring-red-200 bg-red-50">
                        <AlertTriangle className="h-3 w-3" /> Misconfig
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2 align-top text-xs text-slate-600">
                  <div>{row.intrinsicWhy}</div>
                  {row.risk && (
                    <div className="mt-1.5 rounded bg-red-50 p-1.5 text-[11px] text-red-800">
                      <strong className="font-semibold">Misconfigured:</strong>{" "}
                      {row.risk.message}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save CTA — phrased differently if they're on the sample */}
      <div className="rounded-xl border border-sherpa-200 bg-gradient-to-br from-sherpa-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-sherpa-900">
              <ClipboardPaste className="h-4 w-4" />
              {usingSample
                ? "Like what you see? Sign up and bring your real .env."
                : "Save this analysis to your vault"}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {usingSample
                ? "When you sign up, paste your actual .env — encrypted in your browser, rotation reminders, agents that can use it without seeing it. Free for your first project."
                : "Sign up to encrypt these credentials, get rotation reminders, and let your AI agents use them without ever seeing the keys."}{" "}
              {!usingSample && (
                <strong>Free for your first project.</strong>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onSaveToVault}
            className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
          >
            {usingSample ? "Sign up free" : "Save and sign up"}{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Small components ----------------

const INTRINSIC_STYLES: Record<
  IntrinsicLevel,
  { label: string; class: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  critical: {
    label: "Critical",
    class: "bg-red-100 text-red-800 ring-red-200",
    Icon: AlertCircle,
  },
  high: {
    label: "High",
    class: "bg-orange-100 text-orange-800 ring-orange-200",
    Icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    class: "bg-amber-100 text-amber-800 ring-amber-200",
    Icon: AlertTriangle,
  },
  low: {
    label: "Low",
    class: "bg-slate-100 text-slate-700 ring-slate-200",
    Icon: Info,
  },
  info: {
    label: "Public",
    class: "bg-sky-100 text-sky-800 ring-sky-200",
    Icon: Info,
  },
};

function IntrinsicBadge({ level }: { level: IntrinsicLevel }) {
  const s = INTRINSIC_STYLES[level];
  const Icon = s.Icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${s.class}`}
    >
      <Icon className="h-3 w-3" /> {s.label}
    </span>
  );
}

function IntrinsicChip({ level, count }: { level: IntrinsicLevel; count: number }) {
  const s = INTRINSIC_STYLES[level];
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wide ring-1 ${s.class}`}
    >
      {count} {s.label.toLowerCase()}
    </span>
  );
}

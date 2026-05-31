"use client";

/**
 * .env analyzer — SHRP-041a
 *
 * The hero experience on the landing page. The visitor pastes their .env,
 * the browser runs parseEnv + keyDetect + risk-rules, and the result
 * appears inline below the textarea. NOTHING leaves the browser. No
 * signup, no signup gate, no email capture before value.
 *
 * The whole point: aha BEFORE friction.
 */

import * as React from "react";
import Link from "next/link";
import { parseEnv } from "@/lib/envParser";
import { detectKey } from "@/lib/keyDetect";
import { worstRisk, type RiskCredentialInput } from "@/lib/risk-rules";
import { getService } from "@/lib/services";
import { ShieldCheck, AlertTriangle, AlertCircle, Info, ArrowRight, ClipboardPaste, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE = `# Paste yours here — or click "Try with sample" below
NEXT_PUBLIC_SUPABASE_URL=https://abc123.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

STRIPE_SECRET_KEY=sk_live_abcdefghij1234567890ABCDEFGHIJ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_abcdefghij1234567890ABCDEFGHIJ
STRIPE_WEBHOOK_SECRET=whsec_abcdefghij1234567890abcdef1234567890

GITHUB_TOKEN=ghp_abcdefghij1234567890ABCDEFGHIJklm
OPENAI_API_KEY=sk-abcdefghij1234567890ABCDEFGHIJKLM
RESEND_API_KEY=re_abcdefghij1234567890ABCDEFGHIJ`;

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
  risk: ReturnType<typeof worstRisk>;
}

export function EnvAnalyzer() {
  const [text, setText] = React.useState("");

  // Live analysis derived from the textarea content.
  const analysis = React.useMemo(() => analyze(text), [text]);

  return (
    <div className="space-y-6">
      <div className="relative">
        <label htmlFor="env-paste" className="sr-only">
          Paste your .env contents
        </label>
        <textarea
          id="env-paste"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={SAMPLE}
          className="block w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3 font-mono text-xs leading-relaxed text-slate-800 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-2 focus:ring-sherpa-500/40"
          spellCheck={false}
          autoComplete="off"
        />
        <div className="absolute bottom-3 right-3 flex gap-2">
          {text.length === 0 ? (
            <>
              <button
                type="button"
                onClick={() => setText(SAMPLE)}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
              >
                <Sparkles className="h-3 w-3" /> Try with sample
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setText("")}
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

      {analysis.rows.length > 0 && <AnalysisResult analysis={analysis} />}
    </div>
  );
}

function analyze(text: string): {
  rows: AnalysisRow[];
  warningsCount: number;
  byService: Map<string, number>;
  riskCounts: { critical: number; high: number; medium: number; low: number };
} {
  if (!text.trim()) {
    return {
      rows: [],
      warningsCount: 0,
      byService: new Map(),
      riskCounts: { critical: 0, high: 0, medium: 0, low: 0 },
    };
  }

  const parsed = parseEnv(text);
  const rows: AnalysisRow[] = parsed.entries.map((e) => {
    const detection = detectKey(e.value);
    const serviceId = detection?.serviceId ?? "custom";
    const serviceName = getService(serviceId)?.name ?? "Unknown";
    const keyTypeId = detection?.keyTypeId ?? "other";
    const env = guessEnv(e.key);

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
      risk: worstRisk(input, { siblings: others }),
    };
  });

  const byService = new Map<string, number>();
  for (const r of rows) {
    byService.set(r.serviceId, (byService.get(r.serviceId) ?? 0) + 1);
  }

  const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of rows) {
    if (r.risk) riskCounts[r.risk.severity] += 1;
  }

  return {
    rows,
    warningsCount: parsed.warnings.length,
    byService,
    riskCounts,
  };
}

function AnalysisResult({
  analysis,
}: {
  analysis: ReturnType<typeof analyze>;
}) {
  const { rows, byService, riskCounts } = analysis;
  const totalRisks =
    riskCounts.critical + riskCounts.high + riskCounts.medium + riskCounts.low;
  const hasCritical = riskCounts.critical > 0;

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
                  hasCritical ? "text-red-700" : totalRisks > 0 ? "text-amber-700" : "text-emerald-700",
                )}
              >
                {totalRisks}
              </div>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                risk{totalRisks === 1 ? "" : "s"} flagged
              </div>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
              {riskCounts.critical > 0 && (
                <SeverityChip severity="critical" count={riskCounts.critical} />
              )}
              {riskCounts.high > 0 && (
                <SeverityChip severity="high" count={riskCounts.high} />
              )}
              {riskCounts.medium > 0 && (
                <SeverityChip severity="medium" count={riskCounts.medium} />
              )}
              {riskCounts.low > 0 && (
                <SeverityChip severity="low" count={riskCounts.low} />
              )}
              {totalRisks === 0 && (
                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  No issues detected
                </span>
              )}
            </div>
          </div>
        </div>

        {hasCritical && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <strong>Stop.</strong> You have credentials in your .env that
                could compromise your app or move real money. See the list
                below — anything marked CRITICAL needs attention before you
                deploy.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-credential table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-600">
            <tr>
              <th className="px-4 py-2 font-medium">Env key</th>
              <th className="px-4 py-2 font-medium">Service</th>
              <th className="px-4 py-2 font-medium">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50/60">
                <td className="px-4 py-2 font-mono text-xs font-medium text-slate-800">
                  {row.envKey}
                </td>
                <td className="px-4 py-2">
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
                <td className="px-4 py-2">
                  {row.risk ? (
                    <div className="flex items-start gap-1.5">
                      <RiskInlineBadge severity={row.risk.severity} />
                      <span className="text-xs text-slate-600">
                        {row.risk.message}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save CTA */}
      <div className="rounded-xl border border-sherpa-200 bg-gradient-to-br from-sherpa-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-sherpa-900">
              <ClipboardPaste className="h-4 w-4" />
              Save this analysis to your vault
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Sign up to encrypt these credentials, get rotation reminders,
              and let your AI agents use them without ever seeing the keys.
              <strong> Free for your first project.</strong>
            </p>
          </div>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
          >
            Sign up free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function SeverityChip({
  severity,
  count,
}: {
  severity: "critical" | "high" | "medium" | "low";
  count: number;
}) {
  const styles = {
    critical: "bg-red-100 text-red-800 ring-red-200",
    high: "bg-orange-100 text-orange-800 ring-orange-200",
    medium: "bg-amber-100 text-amber-800 ring-amber-200",
    low: "bg-slate-100 text-slate-700 ring-slate-200",
  }[severity];
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 font-semibold uppercase tracking-wide ring-1 ${styles}`}
    >
      {count} {severity}
    </span>
  );
}

function RiskInlineBadge({
  severity,
}: {
  severity: "critical" | "high" | "medium" | "low";
}) {
  const styles = {
    critical: { Icon: AlertCircle, class: "bg-red-100 text-red-800 ring-red-200", label: "Critical" },
    high: { Icon: AlertTriangle, class: "bg-orange-100 text-orange-800 ring-orange-200", label: "High" },
    medium: { Icon: AlertTriangle, class: "bg-amber-100 text-amber-800 ring-amber-200", label: "Medium" },
    low: { Icon: Info, class: "bg-slate-100 text-slate-700 ring-slate-200", label: "Note" },
  }[severity];
  const Icon = styles.Icon;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${styles.class}`}
    >
      <Icon className="h-3 w-3" /> {styles.label}
    </span>
  );
}

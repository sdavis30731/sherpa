/**
 * RiskBadge — SHRP-010c
 *
 * A small colored pill that surfaces a risk-rule finding, plus an optional
 * "Fix this" link that deep-links to the matching playbook section.
 *
 * Used in:
 *   - The .env import preview table (SHRP-009b)
 *   - The credential row on /vault/[projectId] (this story)
 */

"use client";

import * as React from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RiskRule } from "@/lib/risk-rules";

interface Props {
  rule: RiskRule;
  /** Project id and credential service so we can build a deep link to the playbook. */
  serviceId?: string;
  projectId?: string;
  credentialId?: string;
  /** Show the message text inline (default: only on hover via title). */
  inline?: boolean;
  /** Show the "Fix this" link (default true). */
  showFixLink?: boolean;
}

const STYLES: Record<RiskRule["severity"], { className: string; Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  critical: {
    className: "bg-red-100 text-red-800 ring-1 ring-red-200",
    Icon: AlertCircle,
    label: "Critical",
  },
  high: {
    className: "bg-orange-100 text-orange-800 ring-1 ring-orange-200",
    Icon: AlertTriangle,
    label: "High",
  },
  medium: {
    className: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    Icon: AlertTriangle,
    label: "Medium",
  },
  low: {
    className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    Icon: Info,
    label: "Note",
  },
};

export function RiskBadge({
  rule,
  serviceId,
  projectId,
  credentialId,
  inline = false,
  showFixLink = true,
}: Props) {
  const style = STYLES[rule.severity];
  const Icon = style.Icon;

  const fixHref =
    projectId && credentialId
      ? `/vault/${projectId}?credential=${credentialId}&playbook=${rule.playbookSection}`
      : null;

  if (inline) {
    return (
      <div
        className={cn(
          "rounded-md px-3 py-2 text-xs",
          style.className,
        )}
      >
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div className="flex-1">
            <div className="font-semibold uppercase tracking-wide text-[10px]">
              {style.label} · {rule.id}
            </div>
            <div className="mt-0.5 leading-relaxed">{rule.message}</div>
            {showFixLink && fixHref && (
              <a
                href={fixHref}
                className="mt-1 inline-block font-medium underline-offset-2 hover:underline"
              >
                Open playbook →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Compact pill mode (default) — for use in tables and credential rows.
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold",
        style.className,
      )}
      title={rule.message}
    >
      <Icon className="h-3 w-3" />
      {style.label}
      {showFixLink && fixHref && (
        <a
          href={fixHref}
          className="ml-1 underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Fix
        </a>
      )}
    </span>
  );
}

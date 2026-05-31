"use client";

/**
 * Audit log filter pills — SHRP-028
 *
 * Filters live in the URL (search params) so a view is shareable and
 * survives refresh. Three filter dimensions:
 *   - Time range (last hour, day, week, month, all)
 *   - Category (credentials, project, agents, security, all)
 *   - Actor (you, agents, everyone)
 */

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { AUDIT_CATEGORIES, type AuditCategory } from "@/lib/audit-actions";
import { cn } from "@/lib/utils";

type Range = "hour" | "day" | "week" | "month" | "all";

const RANGES: Array<{ id: Range; label: string }> = [
  { id: "hour", label: "Last hour" },
  { id: "day", label: "Last 24h" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "Last 30 days" },
  { id: "all", label: "All time" },
];

const ACTORS: Array<{ id: "user" | "agent" | "all"; label: string }> = [
  { id: "all", label: "Everyone" },
  { id: "user", label: "You" },
  { id: "agent", label: "Agents" },
];

export function AuditFilters({
  projectId,
  currentRange,
  currentCategory,
  currentActor,
}: {
  projectId: string;
  currentRange: Range;
  currentCategory: AuditCategory | "all";
  currentActor: "user" | "agent" | "all";
}) {
  const router = useRouter();
  const pathname = usePathname();

  function navigate(updates: Record<string, string>) {
    const params = new URLSearchParams();
    const next = {
      range: updates.range ?? currentRange,
      category: updates.category ?? currentCategory,
      actor: updates.actor ?? currentActor,
    };
    if (next.range !== "day") params.set("range", next.range);
    if (next.category !== "all") params.set("category", next.category);
    if (next.actor !== "all") params.set("actor", next.actor);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="space-y-3">
      <FilterRow label="Time">
        {RANGES.map((opt) => (
          <FilterPill
            key={opt.id}
            active={currentRange === opt.id}
            onClick={() => navigate({ range: opt.id })}
            label={opt.label}
          />
        ))}
      </FilterRow>
      <FilterRow label="Category">
        <FilterPill
          active={currentCategory === "all"}
          onClick={() => navigate({ category: "all" })}
          label="All"
        />
        {AUDIT_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat.id}
            active={currentCategory === cat.id}
            onClick={() => navigate({ category: cat.id })}
            label={cat.label}
          />
        ))}
      </FilterRow>
      <FilterRow label="Actor">
        {ACTORS.map((opt) => (
          <FilterPill
            key={opt.id}
            active={currentActor === opt.id}
            onClick={() => navigate({ actor: opt.id })}
            label={opt.label}
          />
        ))}
      </FilterRow>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs font-medium transition",
        active
          ? "bg-sherpa-500 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-700 hover:border-sherpa-300 hover:bg-sherpa-50",
      )}
    >
      {label}
    </button>
  );
}

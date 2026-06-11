import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * SHRP-102 — Reusable breadcrumb.
 *
 * Teaches the data model by repetition: every detail page in the
 * agency dashboard shows [Agency] → [Client] → [Engagement] → [Section]
 * so a non-developer reader can never lose track of where they are or
 * what holds what.
 *
 * Segments are rendered in order. Each segment can either be a Link
 * (clickable, takes you up the hierarchy) or a static span (current
 * location). The last segment is always rendered as a static span
 * regardless of whether href was passed — you don't link to yourself.
 *
 * Visual: small slate text, chevron separators, truncates segment text
 * gracefully on narrow viewports.
 */
export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

export function Breadcrumb({
  segments,
  className,
}: {
  segments: BreadcrumbSegment[];
  className?: string;
}) {
  if (segments.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex flex-wrap items-center gap-1 text-xs text-slate-500",
        className,
      )}
    >
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        const isFirst = i === 0;
        return (
          <React.Fragment key={`${i}-${seg.label}`}>
            {!isFirst && (
              <ChevronRight
                className="h-3 w-3 shrink-0 text-slate-400"
                aria-hidden="true"
              />
            )}
            {seg.href && !isLast ? (
              <Link
                href={seg.href}
                className="max-w-[18ch] truncate rounded px-1 py-0.5 transition hover:bg-slate-100 hover:text-slate-800 sm:max-w-[24ch]"
              >
                {seg.label}
              </Link>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={cn(
                  "max-w-[18ch] truncate px-1 py-0.5 sm:max-w-[28ch]",
                  isLast && "font-medium text-slate-700",
                )}
              >
                {seg.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

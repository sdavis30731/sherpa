"use client";

/**
 * Reusable building blocks for playbook content. Keeping these in one place
 * means every playbook looks consistent and we can restyle globally.
 */

import * as React from "react";
import Link from "next/link";
import { ExternalLink, Copy, Check, ArrowRight } from "lucide-react";
import { Callout } from "@/components/ui/callout";
import type { Section } from "@/lib/playbooks";

export function PlaybookSection({
  id,
  title,
  children,
}: {
  id: Section;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={`playbook-${id}`}
      className="space-y-3 border-b border-slate-100 px-6 py-5 last:border-b-0"
    >
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="space-y-3 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

/** Numbered step list — for rotation / revoke procedures. */
export function PlaybookSteps({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-700">
      {children}
    </ol>
  );
}

/** Bullet list for general points. */
export function PlaybookList({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
      {children}
    </ul>
  );
}

/**
 * External link to a service dashboard, with a Copy button. Vibe coders
 * often want to send the link to themselves on a different machine.
 */
export function DashboardLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    await navigator.clipboard.writeText(href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
      <Link
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 font-mono text-slate-700 hover:text-sherpa-700 hover:underline"
      >
        {children} <ExternalLink className="h-3 w-3" />
      </Link>
      <button
        type="button"
        onClick={copy}
        title="Copy URL"
        aria-label="Copy URL"
        className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
      >
        {copied ? (
          <Check className="h-3 w-3 text-emerald-600" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </span>
  );
}

/** Highlighted pitfall — uses the existing Callout in warning tone. */
export function Pitfall({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Callout tone="warning" title={title}>
      {children}
    </Callout>
  );
}

/** Strong-tone DANGER block — used for the kind of mistakes that lose money. */
export function Danger({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Callout tone="danger" title={title}>
      {children}
    </Callout>
  );
}

/** A code-style chip for inline key prefixes like sk_live_. */
export function KeyChip({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[12px] text-slate-800">
      {children}
    </code>
  );
}

/** Compact "→ Next: Foo" callout used at the end of a section. */
export function NextSection({
  section,
  label,
  onJump,
}: {
  section: Section;
  label: string;
  onJump: (s: Section) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onJump(section)}
      className="inline-flex items-center gap-1 text-xs font-medium text-sherpa-600 hover:underline"
    >
      <ArrowRight className="h-3 w-3" /> {label}
    </button>
  );
}

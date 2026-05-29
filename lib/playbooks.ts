/**
 * Playbook registry — SHRP-015
 *
 * Each playbook is a TSX file at content/playbooks/[service].tsx that
 * exports:
 *   - `meta: PlaybookMeta` — structured metadata (rotation interval, etc.)
 *   - `default` React component — the body, composed of <PlaybookSection> blocks
 *
 * The registry is a plain TS map. This is intentional — it keeps the system
 * type-safe, avoids any MDX/build-step indirection, and lets each playbook
 * use our existing Callout / Button / Link components naturally.
 *
 * Section IDs are stable enums (Section type below) so deep links survive
 * playbook rewrites: /vault/[projectId]?credential=X&playbook=rotation
 * always means "open the rotation section of whatever playbook the
 * credential's service has".
 */

import type * as React from "react";
import StripePlaybook, { meta as stripeMeta } from "@/content/playbooks/stripe";

export type Section =
  | "overview"
  | "find"
  | "scopes"
  | "rotation"
  | "revoke"
  | "pitfalls";

export const SECTION_LABELS: Record<Section, string> = {
  overview: "Overview",
  find: "Where to find each key",
  scopes: "Recommended scopes",
  rotation: "How to rotate",
  revoke: "How to revoke if leaked",
  pitfalls: "Common pitfalls",
};

export interface PlaybookMeta {
  /** Matches lib/services.ts Service.id */
  service: string;
  name: string;
  /** Date this playbook was last reviewed against the actual provider dashboard. */
  lastReviewed: string;
  /** Default section to open when the URL doesn't specify one. */
  defaultSection?: Section;
}

export interface Playbook {
  meta: PlaybookMeta;
  Body: React.ComponentType;
}

const REGISTRY: Record<string, Playbook> = {
  stripe: { meta: stripeMeta, Body: StripePlaybook },
};

export function getPlaybook(serviceId: string): Playbook | null {
  return REGISTRY[serviceId] ?? null;
}

export function listAvailablePlaybooks(): PlaybookMeta[] {
  return Object.values(REGISTRY).map((p) => p.meta);
}

/** Validate a string from a URL param into a known Section. */
export function parseSection(input: string | null | undefined): Section | null {
  if (!input) return null;
  return (Object.keys(SECTION_LABELS) as Section[]).includes(input as Section)
    ? (input as Section)
    : null;
}

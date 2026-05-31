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
import StripePlaybook, {
  meta as stripeMeta,
  rotationSteps as stripeRotation,
} from "@/content/playbooks/stripe";
import GitHubPlaybook, {
  meta as githubMeta,
  rotationSteps as githubRotation,
} from "@/content/playbooks/github";
import SupabasePlaybook, {
  meta as supabaseMeta,
  rotationSteps as supabaseRotation,
} from "@/content/playbooks/supabase";
import VercelPlaybook, {
  meta as vercelMeta,
  rotationSteps as vercelRotation,
} from "@/content/playbooks/vercel";

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

/**
 * Per-key-type rotation guidance used by the sherpa_rotate MCP tool
 * (SHRP-033). Each entry covers one credential type for the service. The
 * dashboardUrl gives the agent a direct place to send the user, and the
 * steps are short, ordered instructions in plain language.
 *
 * supportsProgrammaticRotation is a hint for the agent — true means the
 * service exposes an API call that could fully automate this in a future
 * Sherpa Rotation Pack (SHRP-037b). For SHRP-033 (guided), the value
 * doesn't gate anything; the agent just surfaces it.
 */
export interface RotationGuide {
  keyType: string;
  title: string;
  dashboardUrl: string;
  supportsProgrammaticRotation: boolean;
  steps: string[];
  /** Optional one-line warning shown above the steps. */
  warning?: string;
}

export interface Playbook {
  meta: PlaybookMeta;
  Body: React.ComponentType;
  /** Ordered guides covering each key type for this service. */
  rotationSteps: RotationGuide[];
}

const REGISTRY: Record<string, Playbook> = {
  stripe: { meta: stripeMeta, Body: StripePlaybook, rotationSteps: stripeRotation },
  github: { meta: githubMeta, Body: GitHubPlaybook, rotationSteps: githubRotation },
  supabase: { meta: supabaseMeta, Body: SupabasePlaybook, rotationSteps: supabaseRotation },
  vercel: { meta: vercelMeta, Body: VercelPlaybook, rotationSteps: vercelRotation },
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

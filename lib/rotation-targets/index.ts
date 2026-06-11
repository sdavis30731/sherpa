/**
 * SHRP-051 — Rotation target registry.
 *
 * v1 supports Vercel only. The adapter pattern makes adding Railway,
 * Render, GitHub Actions secrets, Heroku, and plain .env file
 * generation each a 1-day follow-up.
 */

import type { RotationTarget } from "./types";
import { vercelTarget } from "./vercel";

const REGISTRY: Record<string, RotationTarget> = {
  vercel: vercelTarget,
};

export function getRotationTarget(id: string): RotationTarget | null {
  return REGISTRY[id.toLowerCase()] ?? null;
}

export const SUPPORTED_TARGETS = Object.keys(REGISTRY);

export type { RotationTarget, TargetResult } from "./types";

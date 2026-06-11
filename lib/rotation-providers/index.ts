/**
 * SHRP-051 — Rotation provider registry.
 *
 * Adapters land here. The orchestrator looks up by provider id (which
 * matches lib/services.ts service id). For v1, Stripe is the canonical
 * reference; Cloudflare/Resend/Vercel-as-source follow as 1-day adds.
 */

import type { RotationProvider } from "./types";
import { stripeProvider } from "./stripe";

const REGISTRY: Record<string, RotationProvider> = {
  stripe: stripeProvider,
};

export function getRotationProvider(id: string): RotationProvider | null {
  return REGISTRY[id.toLowerCase()] ?? null;
}

export const SUPPORTED_PROVIDERS = Object.keys(REGISTRY);

export type { RotationProvider, ProviderResult } from "./types";

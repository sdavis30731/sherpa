/**
 * SHRP-051 — Rotation provider interface.
 *
 * Every provider adapter implements this shape. The orchestrator
 * (lib/rotation-orchestrator.ts) is provider-agnostic — it only
 * touches providers through this interface. Adding a new provider is
 * implementing this interface and registering it in
 * lib/rotation-providers/index.ts.
 *
 * Convention: provider adapters NEVER throw on expected failures
 * (network errors, auth failures, provider 4xx). They return
 * `{ ok: false, reason: '...' }` so the orchestrator can decide
 * between retry and rollback. Throw only on programmer errors
 * (malformed input, missing env vars).
 */

export type ProviderResult<T = void> =
  | ({ ok: true } & T)
  | { ok: false; reason: string };

export interface RotationProvider {
  /** Stable id matching lib/services.ts (e.g. 'stripe'). */
  id: string;

  /**
   * Generate a new credential at the provider with the same
   * capabilities as the current one.
   *
   * Inputs:
   *   - actorSecret: the higher-privilege credential used to
   *     authenticate the create call. For providers where source
   *     rotates itself, the orchestrator passes the source as the
   *     actor.
   *   - currentSecret: the credential being replaced. Adapters use
   *     it to look up scopes or otherwise carry capabilities over.
   *   - metadata: provider-specific config from
   *     rotation_policies.metadata (e.g. Stripe scope array).
   *
   * Returns the new credential's id (used later for revocation) +
   * the new plaintext secret (which the orchestrator will encrypt
   * before storage).
   */
  generateNewKey(input: {
    actorSecret: string;
    currentSecret: string;
    metadata: Record<string, unknown>;
  }): Promise<
    ProviderResult<{
      newKeyId: string;
      newSecret: string;
      newMetadata?: Record<string, unknown>;
    }>
  >;

  /**
   * Verify a credential actually works. Should make the cheapest
   * possible benign API call (e.g. Stripe GET /v1/balance) and check
   * for a 2xx response. Called twice during a rotation:
   *   1. Before doing anything, to confirm the OLD credential still
   *      works (catches the "Stripe already revoked this on us"
   *      case before we try anything destructive).
   *   2. After pushing the new credential to the target platform, to
   *      confirm the NEW credential works before we revoke the old.
   */
  verifyKey(secret: string): Promise<ProviderResult>;

  /**
   * Revoke a credential. Idempotent — calling on an already-revoked
   * key should still return `ok: true`.
   */
  revokeKey(input: {
    actorSecret: string;
    keyId: string;
  }): Promise<ProviderResult>;
}

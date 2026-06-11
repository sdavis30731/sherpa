/**
 * SHRP-051 — Rotation target interface.
 *
 * A "target" is the deployment platform where the new credential
 * needs to land for the agency's running app to pick it up. v1
 * supports Vercel env vars. Railway, Render, GitHub Actions secrets,
 * and Heroku follow as 1-day adapters.
 *
 * Same shape contract as RotationProvider: never throw on expected
 * failures, return `{ ok: false, reason }` so the orchestrator can
 * decide between retry and rollback.
 */

export type TargetResult<T = void> =
  | ({ ok: true } & T)
  | { ok: false; reason: string };

export interface RotationTarget {
  /** Stable id e.g. 'vercel'. */
  id: string;

  /**
   * Read the current value of the env var at the deployment target.
   * Returns the OLD value verbatim — the orchestrator captures it for
   * the rollback path before pushing anything new.
   *
   * Implementations should return ok:true with value:null if the env
   * var simply doesn't exist yet (that's still a recoverable state).
   */
  getEnvVar(input: {
    targetSecret: string;
    projectRef: string;
    teamRef?: string | null;
    envVarName: string;
    environments: string[];
  }): Promise<
    TargetResult<{
      value: string | null;
      remoteId: string | null;
    }>
  >;

  /**
   * Update the env var at the deployment target with the new value.
   * remoteId is what the previous getEnvVar() returned and lets
   * implementations PATCH instead of POST when possible.
   */
  updateEnvVar(input: {
    targetSecret: string;
    projectRef: string;
    teamRef?: string | null;
    envVarName: string;
    environments: string[];
    value: string;
    remoteId: string | null;
  }): Promise<TargetResult>;

  /**
   * Restore the env var to a previous value. Used by the orchestrator
   * during rollback. Conceptually the same as updateEnvVar with the
   * old value, but adapters MAY do something extra here (e.g. log a
   * rollback event, mark the env var with metadata).
   */
  rollbackEnvVar(input: {
    targetSecret: string;
    projectRef: string;
    teamRef?: string | null;
    envVarName: string;
    environments: string[];
    value: string;
    remoteId: string | null;
  }): Promise<TargetResult>;

  /**
   * Trigger a redeploy so the new env var actually takes effect on
   * the running app. The orchestrator calls this AFTER a successful
   * verification step, when the policy has target_trigger_redeploy.
   *
   * Implementations should be best-effort — if the redeploy trigger
   * itself fails, the rotation still succeeded (env var is updated)
   * and the agency can redeploy manually.
   */
  triggerRedeploy?(input: {
    targetSecret: string;
    projectRef: string;
    teamRef?: string | null;
  }): Promise<TargetResult>;
}

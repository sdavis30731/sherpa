/**
 * SHRP-051 — Vercel deployment target adapter.
 *
 * Vercel exposes a clean REST API for project env vars:
 *   GET    /v9/projects/{idOrName}/env       — list
 *   POST   /v10/projects/{idOrName}/env      — create
 *   PATCH  /v9/projects/{idOrName}/env/{id}  — update
 *   DELETE /v9/projects/{idOrName}/env/{id}  — delete
 *
 * Team-scoped projects require ?teamId=… query param. Personal
 * projects don't need it.
 *
 * Auth: Authorization: Bearer <user-or-team-token>.
 *
 * Redeploy: POST /v13/deployments with the project source — for v1
 * we use the simpler 'redeploy last successful build' pattern via
 * /v13/deployments?forceNew=1 with the previous deployment's url.
 * Falls back gracefully if redeploy fails (the env var update is
 * the rotation; the redeploy is a convenience).
 */

import type { RotationTarget } from "./types";

const VERCEL_API = "https://api.vercel.com";

interface VercelEnvRow {
  id: string;
  type: "plain" | "encrypted" | "secret" | "system";
  key: string;
  value?: string;
  target: string[]; // ["production"], ["preview"], etc.
}

function withTeam(path: string, teamRef: string | null | undefined): string {
  if (!teamRef) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}teamId=${encodeURIComponent(teamRef)}`;
}

async function vercelRequest(args: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  token: string;
  body?: unknown;
}): Promise<{
  ok: boolean;
  status: number;
  body: unknown;
  reason?: string;
}> {
  try {
    const init: RequestInit = {
      method: args.method,
      headers: {
        Authorization: `Bearer ${args.token}`,
        "Content-Type": "application/json",
      },
    };
    if (args.body && args.method !== "GET") {
      init.body = JSON.stringify(args.body);
    }
    const res = await fetch(`${VERCEL_API}${args.path}`, init);
    const text = await res.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
    if (!res.ok) {
      const msg =
        typeof parsed === "object" && parsed && "error" in parsed
          ? (parsed as { error?: { message?: string } }).error?.message
          : null;
      return {
        ok: false,
        status: res.status,
        body: parsed,
        reason: `vercel_${res.status}${msg ? `: ${msg}` : ""}`,
      };
    }
    return { ok: true, status: res.status, body: parsed };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: null,
      reason: `network: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }
}

/**
 * Find the env var row matching name + environments. Vercel can have
 * multiple env var rows with the same key if they're scoped to
 * different environments — we look for the row that targets the same
 * set of environments the rotation policy is asking us to update.
 */
function findEnvRow(
  rows: VercelEnvRow[],
  name: string,
  environments: string[],
): VercelEnvRow | null {
  const wanted = new Set(environments);
  return (
    rows.find((r) => {
      if (r.key !== name) return false;
      // Match if the env var's targets are a superset of ours OR
      // exactly equal — Vercel sometimes returns ["production",
      // "preview"] when we asked for ["production"].
      const got = new Set(r.target);
      for (const t of wanted) if (!got.has(t)) return false;
      return true;
    }) ?? null
  );
}

export const vercelTarget: RotationTarget = {
  id: "vercel",

  async getEnvVar({
    targetSecret,
    projectRef,
    teamRef,
    envVarName,
    environments,
  }) {
    // Need decrypt=true to get the current value back, not just metadata.
    const res = await vercelRequest({
      method: "GET",
      path: withTeam(
        `/v9/projects/${encodeURIComponent(projectRef)}/env?decrypt=true`,
        teamRef,
      ),
      token: targetSecret,
    });
    if (!res.ok) return { ok: false, reason: res.reason ?? "get_failed" };
    const envs = (res.body as { envs?: VercelEnvRow[] }).envs ?? [];
    const row = findEnvRow(envs, envVarName, environments);
    if (!row) {
      return { ok: true, value: null, remoteId: null };
    }
    return {
      ok: true,
      value: row.value ?? null,
      remoteId: row.id,
    };
  },

  async updateEnvVar({
    targetSecret,
    projectRef,
    teamRef,
    envVarName,
    environments,
    value,
    remoteId,
  }) {
    if (remoteId) {
      const res = await vercelRequest({
        method: "PATCH",
        path: withTeam(
          `/v9/projects/${encodeURIComponent(projectRef)}/env/${encodeURIComponent(remoteId)}`,
          teamRef,
        ),
        token: targetSecret,
        body: { value },
      });
      return res.ok
        ? { ok: true }
        : { ok: false, reason: res.reason ?? "update_failed" };
    }
    // No existing row — create it.
    const res = await vercelRequest({
      method: "POST",
      path: withTeam(
        `/v10/projects/${encodeURIComponent(projectRef)}/env`,
        teamRef,
      ),
      token: targetSecret,
      body: {
        key: envVarName,
        value,
        type: "encrypted",
        target: environments,
      },
    });
    return res.ok
      ? { ok: true }
      : { ok: false, reason: res.reason ?? "create_failed" };
  },

  async rollbackEnvVar(args) {
    // Implementation-identical to updateEnvVar — the audit log
    // records the rollback context (orchestrator logs the
    // 'rollback_target' step explicitly).
    return this.updateEnvVar(args);
  },

  async triggerRedeploy({ targetSecret, projectRef, teamRef }) {
    // Find the last successful production deployment and trigger a
    // fresh build from it. Best-effort — if this fails, the rotation
    // still succeeded.
    const listRes = await vercelRequest({
      method: "GET",
      path: withTeam(
        `/v6/deployments?projectId=${encodeURIComponent(projectRef)}&target=production&state=READY&limit=1`,
        teamRef,
      ),
      token: targetSecret,
    });
    if (!listRes.ok) {
      return { ok: false, reason: listRes.reason ?? "list_deployments_failed" };
    }
    const deployments = (listRes.body as {
      deployments?: Array<{ uid: string; url: string }>;
    }).deployments ?? [];
    const last = deployments[0];
    if (!last) {
      return {
        ok: false,
        reason: "no_prior_deployment_to_redeploy",
      };
    }
    const redeployRes = await vercelRequest({
      method: "POST",
      path: withTeam("/v13/deployments", teamRef),
      token: targetSecret,
      body: {
        deploymentId: last.uid,
        name: projectRef,
        target: "production",
      },
    });
    return redeployRes.ok
      ? { ok: true }
      : { ok: false, reason: redeployRes.reason ?? "redeploy_failed" };
  },
};

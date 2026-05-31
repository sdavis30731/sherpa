import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import {
  getAuditActionMeta,
  SEVERITY_STYLES,
  type AuditCategory,
} from "@/lib/audit-actions";
import { ChevronLeft, Activity } from "lucide-react";
import { AuditFilters } from "./_components/audit-filters";

const PAGE_SIZE = 200;

type Range = "hour" | "day" | "week" | "month" | "all";

const RANGE_MS: Record<Range, number | null> = {
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  all: null,
};

interface AuditRow {
  id: string;
  action: string;
  actor: string;
  created_at: string;
  credential_id: string | null;
  metadata: Record<string, unknown> | null;
}

interface CredentialLite {
  id: string;
  label: string;
  service: string;
}

interface TokenLite {
  id: string;
  name: string;
}

function parseRange(input: string | null): Range {
  const valid = ["hour", "day", "week", "month", "all"] as const;
  return (valid.includes(input as Range) ? (input as Range) : "day") as Range;
}

function parseCategory(input: string | null): AuditCategory | "all" {
  const valid = ["credential", "project", "agent", "security", "all"];
  return (valid.includes(input ?? "") ? input : "all") as AuditCategory | "all";
}

function parseActor(input: string | null): "user" | "agent" | "all" {
  if (input === "user" || input === "agent") return input;
  return "all";
}

export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ range?: string; category?: string; actor?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;

  const range = parseRange(sp.range ?? null);
  const category = parseCategory(sp.category ?? null);
  const actorFilter = parseActor(sp.actor ?? null);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/vault/${projectId}/audit`);

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  // Build the query
  let query = supabase
    .from("audit_log")
    .select("id, action, actor, created_at, credential_id, metadata")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  const rangeMs = RANGE_MS[range];
  if (rangeMs !== null) {
    const since = new Date(Date.now() - rangeMs).toISOString();
    query = query.gte("created_at", since);
  }

  if (actorFilter === "user") {
    query = query.eq("actor", "user");
  } else if (actorFilter === "agent") {
    query = query.like("actor", "mcp_token:%");
  }

  const { data: rawRows, error } = await query;
  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Callout tone="danger">Could not load audit log: {error.message}</Callout>
      </main>
    );
  }
  let rows = (rawRows ?? []) as AuditRow[];

  // Category filter (applied in-memory because the action→category mapping
  // lives in code, not the DB)
  if (category !== "all") {
    rows = rows.filter((r) => getAuditActionMeta(r.action).category === category);
  }

  // Pull related credentials and tokens so we can show friendlier labels.
  const credentialIds = Array.from(
    new Set(rows.map((r) => r.credential_id).filter((id): id is string => Boolean(id))),
  );
  const tokenIds = Array.from(
    new Set(
      rows
        .map((r) => {
          const m = r.actor.match(/^mcp_token:(.+)$/);
          return m?.[1] ?? null;
        })
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [credResult, tokenResult] = await Promise.all([
    credentialIds.length > 0
      ? supabase
          .from("credentials")
          .select("id, label, service")
          .in("id", credentialIds)
      : Promise.resolve({ data: [] as CredentialLite[] }),
    tokenIds.length > 0
      ? supabase.from("mcp_tokens").select("id, name").in("id", tokenIds)
      : Promise.resolve({ data: [] as TokenLite[] }),
  ]);
  const credentialsById = new Map(
    ((credResult.data as CredentialLite[]) ?? []).map((c) => [c.id, c]),
  );
  const tokensById = new Map(
    ((tokenResult.data as TokenLite[]) ?? []).map((t) => [t.id, t]),
  );

  // Suspicious-pattern detection: >10 reveals in any 5-minute window
  // covered by the current view.
  const reveals = rows.filter((r) => r.action === "credential_revealed");
  const suspiciousReveals = detectSuspiciousReveals(reveals, 10, 5 * 60 * 1000);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/vault/${projectId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" /> Back to {project.name}
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-5 w-5 text-sherpa-500" />
        <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
      </div>
      <p className="mb-6 text-sm text-slate-600">
        Every reveal, copy, rotation, and agent call against{" "}
        <strong>{project.name}</strong> is recorded here. Sherpa never sees your
        credentials in plaintext, but it remembers what happened with each.
      </p>

      {suspiciousReveals && (
        <div className="mb-4">
          <Callout tone="warning" title="Suspicious reveal pattern detected">
            We saw <strong>{suspiciousReveals.count} reveals</strong> in a
            5-minute window around{" "}
            <strong>{new Date(suspiciousReveals.at).toLocaleString()}</strong>.
            That's heavier than typical use. If it wasn&apos;t you, consider
            locking the vault and rotating any revealed credentials.
          </Callout>
        </div>
      )}

      <AuditFilters
        projectId={projectId}
        currentRange={range}
        currentCategory={category}
        currentActor={actorFilter}
      />

      <div className="mt-6">
        {rows.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nothing in this window</CardTitle>
            </CardHeader>
            <CardBody>
              <Callout tone="info">
                No activity in this view yet. Try widening the time range or
                changing filters.
              </Callout>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>
                {rows.length === PAGE_SIZE
                  ? `Latest ${PAGE_SIZE} events`
                  : `${rows.length} event${rows.length === 1 ? "" : "s"}`}
              </CardTitle>
            </CardHeader>
            <CardBody className="!p-0">
              <ul className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <AuditRowItem
                    key={row.id}
                    row={row}
                    projectId={projectId}
                    credential={
                      row.credential_id
                        ? credentialsById.get(row.credential_id) ?? null
                        : null
                    }
                    token={extractTokenName(row.actor, tokensById)}
                  />
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}

function extractTokenName(
  actor: string,
  tokensById: Map<string, TokenLite>,
): string | null {
  const m = actor.match(/^mcp_token:(.+)$/);
  if (!m) return null;
  return tokensById.get(m[1]!)?.name ?? "Agent";
}

function AuditRowItem({
  row,
  projectId,
  credential,
  token,
}: {
  row: AuditRow;
  projectId: string;
  credential: CredentialLite | null;
  token: string | null;
}) {
  const meta = getAuditActionMeta(row.action);
  const Icon = meta.icon;
  const subtitle = buildSubtitle(row, credential, token);

  const link = credential
    ? `/vault/${projectId}?credential=${credential.id}`
    : null;

  const inner = (
    <li className="group flex items-start gap-3 px-6 py-3 transition hover:bg-slate-50/60">
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${SEVERITY_STYLES[meta.severity]}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-900">
            {meta.label}
          </span>
          <span className="shrink-0 text-[10px] uppercase tracking-wide text-slate-400">
            {meta.category}
          </span>
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate text-xs text-slate-600">{subtitle}</div>
        )}
      </div>
      <div className="shrink-0 text-right text-xs text-slate-500">
        {formatRelative(new Date(row.created_at))}
        <div className="text-[10px] text-slate-400">
          {new Date(row.created_at).toLocaleTimeString()}
        </div>
      </div>
    </li>
  );

  if (link) {
    return (
      <Link href={link} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

function buildSubtitle(
  row: AuditRow,
  credential: CredentialLite | null,
  token: string | null,
): string | null {
  const parts: string[] = [];
  if (credential) parts.push(`${credential.label}`);
  if (token) parts.push(`by ${token}`);
  else parts.push("by you");

  // Action-specific metadata
  if (row.metadata && typeof row.metadata === "object") {
    const m = row.metadata as Record<string, unknown>;
    if (row.action === "agent_call_api") {
      const svc = typeof m.service === "string" ? m.service : "";
      const method = typeof m.method === "string" ? m.method : "";
      const path = typeof m.path === "string" ? m.path : "";
      const status = typeof m.status === "number" ? m.status : null;
      const apiParts = [svc, method, path].filter(Boolean).join(" ");
      if (apiParts) parts.push(apiParts);
      if (status !== null) parts.push(`→ ${status}`);
    } else if (row.action === "agents_authorized") {
      if (typeof m.ttl_hours === "number") {
        parts.push(`for ${m.ttl_hours}h`);
      }
    } else if (row.action === "credentials_imported") {
      if (typeof m.count === "number") parts.push(`${m.count} credentials`);
    } else if (row.action === "rate_limit_exceeded") {
      const window = typeof m.window === "string" ? m.window : null;
      if (window) parts.push(`${window} window`);
    }
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatRelative(then: Date): string {
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return then.toLocaleDateString();
}

function detectSuspiciousReveals(
  reveals: AuditRow[],
  threshold: number,
  windowMs: number,
): { at: string; count: number } | null {
  if (reveals.length < threshold) return null;
  // Sort ascending so the sliding window is natural.
  const times = reveals
    .map((r) => new Date(r.created_at).getTime())
    .sort((a, b) => a - b);

  let left = 0;
  for (let right = 0; right < times.length; right++) {
    while (times[right]! - times[left]! > windowMs) left++;
    const inWindow = right - left + 1;
    if (inWindow >= threshold) {
      return {
        at: new Date(times[right]!).toISOString(),
        count: inWindow,
      };
    }
  }
  return null;
}

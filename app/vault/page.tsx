import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import {
  Plus,
  Briefcase,
  CalendarDays,
  CircleDot,
  CheckCircle2,
  Archive,
  Users,
  AlertTriangle,
  Bell,
  ArrowRight,
} from "lucide-react";
import { VaultHomeActions } from "./_components/vault-home-actions";
import {
  NeedsAttentionCard,
  type OverdueItem,
} from "./_components/needs-attention-card";
import { PendingImportBanner } from "./_components/pending-import-banner";
import { SampleDataButton } from "./_components/sample-data-button";
import { getService, type Environment } from "@/lib/services";
import { evaluateRotation } from "@/lib/rotation";

/**
 * SHRP-096 Day 6-8 — Engagement dashboard.
 *
 * Renames the home from "Your projects" to "Your engagements" and surfaces
 * the engagement-flavored columns from migration 0013 (client_name,
 * launch_date, status). Each card shows the engagement name, the client
 * name, a launch-date chip, and a status pill. Active engagements list
 * first; launched engagements get their own collapsed-feeling section
 * below; archived ones still hide behind archived_at (legacy mechanism).
 *
 * Empty state offers two paths: create the first engagement, or seed a
 * sample Brushfire Coffee engagement so the user can see the Custody
 * Record flow end-to-end without typing anything.
 */
type EngagementRow = {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  launch_date: string | null;
  status: "active" | "launched" | "archived";
  created_at: string;
  archived_at: string | null;
};

export default async function VaultHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vault");

  const { data: profile } = await supabase
    .from("users")
    .select("argon_salt, sentinel_ciphertext, plan")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.argon_salt || !profile?.sentinel_ciphertext) {
    redirect("/vault/setup");
  }

  const { data: projectsRaw } = await supabase
    .from("projects")
    .select(
      "id, name, description, client_name, launch_date, status, created_at, archived_at",
    )
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const projects = (projectsRaw ?? []) as EngagementRow[];

  // Same overdue-rotation calculation as before — independent of the new
  // engagement columns.
  const projectIds = projects.map((p) => p.id);
  const credentialsResult = projectIds.length
    ? await supabase
        .from("credentials")
        .select("id, project_id, service, env, label, last_rotated_at, created_at")
        .in("project_id", projectIds)
        .is("deleted_at", null)
    : { data: [] as never[] };

  const projectsById = new Map(projects.map((p) => [p.id, p]));
  const credentialCounts = new Map<string, number>();
  const allItems: (OverdueItem & { sortKey: number })[] = [];

  for (const c of credentialsResult.data ?? []) {
    credentialCounts.set(
      c.project_id,
      (credentialCounts.get(c.project_id) ?? 0) + 1,
    );
    const project = projectsById.get(c.project_id);
    if (!project) continue;
    const service = getService(c.service);
    const interval = service?.rotationDays ?? 180;
    const info = evaluateRotation(c.last_rotated_at, interval, c.created_at);
    if (info.status === "overdue" || info.status === "due") {
      allItems.push({
        credentialId: c.id,
        projectId: c.project_id,
        projectName: project.client_name || project.name,
        service: c.service,
        env: c.env as Environment,
        label: c.label,
        daysOverdue: info.daysOverdue,
        isDueSoon: info.status === "due",
        sortKey:
          info.status === "overdue"
            ? 1_000_000 + info.daysOverdue
            : info.daysSinceRotation ?? 0,
      });
    }
  }

  const attentionItems: OverdueItem[] = allItems
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 10)
    .map(({ sortKey: _ignore, ...rest }) => rest);

  const plan = profile.plan as "free" | "lifetime" | "founders";

  // Partition by status. Active is the primary list; launched is shown
  // separately because the engagement is past the handoff moment but
  // still worth seeing at a glance. Archived stays hidden behind the
  // legacy archived_at filter at the SQL layer.
  const active = projects.filter((p) => p.status !== "launched");
  const launched = projects.filter((p) => p.status === "launched");

  // SHRP-102c — control-center stats. Distinct clients across all
  // non-archived engagements; attention count (overdue + drafts); and
  // pending approvals so the dashboard hero can show "what's waiting
  // on you" at a glance.
  const distinctClients = new Set(
    projects
      .map((p) => p.client_name?.trim())
      .filter((n): n is string => !!n && n.length > 0),
  ).size;

  // Drafts that exist but haven't been issued yet — sweeping the
  // custody_assertions jsonb across this user's projects. Cheap because
  // we have the rows in hand already.
  const { data: assertionRows } = await supabase
    .from("projects")
    .select("id, custody_assertions")
    .is("archived_at", null);
  const draftCustodyCount = (assertionRows ?? []).filter((r) => {
    const c = (r as { custody_assertions?: Record<string, unknown> | null })
      .custody_assertions;
    if (!c || typeof c !== "object") return false;
    const saved =
      (c as { saved_at?: unknown }).saved_at ??
      (c as { issued_at?: unknown }).issued_at; // legacy
    const issuedFlag =
      (c as { issued?: unknown }).issued === true ||
      (Boolean((c as { saved_at?: unknown }).saved_at) &&
        Boolean((c as { issued_at?: unknown }).issued_at));
    return Boolean(saved) && !issuedFlag;
  }).length;

  const attentionTotal = attentionItems.length + draftCustodyCount;

  const nowIso = new Date().toISOString();
  const { count: pendingApprovalsCount } = await supabase
    .from("pending_approvals")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .gt("expires_at", nowIso);

  // Agency name for the hero greeting. RLS-scoped; one row per user.
  const { data: agencyRow } = await supabase
    .from("agency_profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  const agencyName =
    (agencyRow as { name?: string | null } | null)?.name?.trim() ||
    "Your agency";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <PendingImportBanner />

      {/* SHRP-102c — Control-center hero. Replaces the bare "Your
          engagements" title. Identity is set by the IdentityRibbon in
          the vault layout; this hero answers "what's the state of my
          agency right now?" at a glance. */}
      <section className="mb-8">
        <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sherpa-600">
              Agency control center
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">
              Welcome back to {agencyName}.
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {plan === "free"
                ? "Free: 2 engagements included. $19/month per additional engagement."
                : "Unlimited engagements."}
            </p>
          </div>
          {projects.length > 0 && <VaultHomeActions />}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<Briefcase className="h-4 w-4" />}
            label="Engagements"
            value={active.length}
            sub={
              distinctClients > 0
                ? `for ${distinctClients} client${distinctClients === 1 ? "" : "s"}`
                : "no clients named yet"
            }
            tone="info"
          />
          <StatCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Need your attention"
            value={attentionTotal}
            sub={
              attentionTotal === 0
                ? "all clear"
                : `${attentionItems.length} rotation${attentionItems.length === 1 ? "" : "s"} · ${draftCustodyCount} draft${draftCustodyCount === 1 ? "" : "s"}`
            }
            tone={attentionTotal > 0 ? "warning" : "muted"}
          />
          <StatCard
            icon={<Bell className="h-4 w-4" />}
            label="Approvals pending"
            value={pendingApprovalsCount ?? 0}
            sub={
              (pendingApprovalsCount ?? 0) > 0
                ? "agent actions waiting on you"
                : "nothing waiting"
            }
            tone={(pendingApprovalsCount ?? 0) > 0 ? "amber" : "muted"}
            href="/vault/approvals"
          />
        </div>
      </section>

      <NeedsAttentionCard items={attentionItems} />

      {projects.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Start your first engagement</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Callout tone="info" title="What's an engagement?">
              One engagement = one client project. Hold their API keys,
              webhook secrets, and DNS records here while you build. When
              you launch, generate a Custody Record that proves nothing
              got lost in the handoff.
            </Callout>
            <div className="flex flex-wrap items-center gap-2">
              <NewEngagementInlineButton />
              <SampleDataButton />
            </div>
          </CardBody>
        </Card>
      ) : (
        <>
          {active.length > 0 ? (
            <EngagementGrid
              engagements={active}
              credentialCounts={credentialCounts}
            />
          ) : (
            <p className="text-sm text-slate-500">
              No active engagements. All your engagements are launched —
              nice work.
            </p>
          )}

          {launched.length > 0 && (
            <section className="mt-10">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Launched
                </h2>
                <span className="text-xs text-slate-400">
                  {launched.length} engagement{launched.length === 1 ? "" : "s"}
                </span>
              </div>
              <EngagementGrid
                engagements={launched}
                credentialCounts={credentialCounts}
              />
            </section>
          )}
        </>
      )}
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  tone: "info" | "warning" | "amber" | "muted";
  href?: string;
}) {
  const palette = {
    info: {
      border: "border-sherpa-200",
      bg: "bg-sherpa-50/60",
      icon: "text-sherpa-600",
      value: "text-sherpa-900",
    },
    warning: {
      border: "border-amber-200",
      bg: "bg-amber-50/70",
      icon: "text-amber-600",
      value: "text-amber-900",
    },
    amber: {
      border: "border-amber-300",
      bg: "bg-amber-50",
      icon: "text-amber-700",
      value: "text-amber-900",
    },
    muted: {
      border: "border-slate-200",
      bg: "bg-white",
      icon: "text-slate-400",
      value: "text-slate-900",
    },
  }[tone];

  const inner = (
    <div
      className={`flex h-full items-start justify-between gap-3 rounded-2xl border p-4 ${palette.border} ${palette.bg}`}
    >
      <div className="min-w-0">
        <div className={`flex items-center gap-1.5 ${palette.icon}`}>
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider">
            {label}
          </span>
        </div>
        <div className={`mt-1 text-3xl font-bold tracking-tight ${palette.value}`}>
          {value}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-600">{sub}</div>
      </div>
      {href && (
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}

function EngagementGrid({
  engagements,
  credentialCounts,
}: {
  engagements: EngagementRow[];
  credentialCounts: Map<string, number>;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {engagements.map((p) => (
        <EngagementCard
          key={p.id}
          engagement={p}
          credentialCount={credentialCounts.get(p.id) ?? 0}
        />
      ))}
    </div>
  );
}

function EngagementCard({
  engagement,
  credentialCount,
}: {
  engagement: EngagementRow;
  credentialCount: number;
}) {
  return (
    <Link
      href={`/vault/${engagement.id}`}
      className="group relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sherpa-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0 text-sherpa-500" />
            <div className="truncate text-base font-semibold text-slate-900 group-hover:text-sherpa-700">
              {engagement.name}
            </div>
          </div>
          {engagement.client_name && (
            <p className="mt-0.5 truncate text-sm text-slate-600">
              for {engagement.client_name}
            </p>
          )}
        </div>
        <StatusPill status={engagement.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
        {engagement.launch_date && (
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatLaunchDate(engagement.launch_date, engagement.status)}
          </span>
        )}
        <span>
          {credentialCount} credential{credentialCount === 1 ? "" : "s"}
        </span>
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: EngagementRow["status"] }) {
  if (status === "launched") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" />
        Launched
      </span>
    );
  }
  if (status === "archived") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
        <Archive className="h-3 w-3" />
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sherpa-50 px-2 py-0.5 text-xs font-medium text-sherpa-700 ring-1 ring-sherpa-200">
      <CircleDot className="h-3 w-3" />
      Active
    </span>
  );
}

/**
 * Phrase the launch date relative to today.
 *   - Future date, active:    "Launches in 12d"
 *   - Today, active:          "Launches today"
 *   - Past date, active:      "Launch was 3d ago"
 *   - Any date, launched:     "Launched Mar 12"
 *   - Any date, archived:     "Was Mar 12"
 */
function formatLaunchDate(
  launchDate: string,
  status: EngagementRow["status"],
): string {
  // Parse as a date-only value in the user's timezone. Postgres `date`
  // columns come back as "YYYY-MM-DD" strings — appending T00:00 keeps
  // them on the same calendar day across DST.
  const target = new Date(`${launchDate}T00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  const niceDate = target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  if (status === "launched") return `Launched ${niceDate}`;
  if (status === "archived") return `Was ${niceDate}`;

  if (diffDays > 0) return `Launches in ${diffDays}d`;
  if (diffDays === 0) return "Launches today";
  return `Launch was ${Math.abs(diffDays)}d ago`;
}

function NewEngagementInlineButton() {
  return (
    <button
      data-action="open-new-project"
      className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
    >
      <Plus className="h-4 w-4" /> Create your first engagement
    </button>
  );
}

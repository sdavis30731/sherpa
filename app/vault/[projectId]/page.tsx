import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { getService } from "@/lib/services";
import { worstRisk, type RiskCredentialInput, type RiskRule } from "@/lib/risk-rules";
import { ProjectActions } from "./_components/project-actions";
import { CredentialRow, type CredentialView } from "./_components/credential-row";
import { ScrollToCredential } from "./_components/scroll-to-credential";
import { PlaybookProvider } from "@/components/playbook-context";
import {
  ChevronLeft,
  KeyRound,
  CalendarDays,
  CircleDot,
  CheckCircle2,
  Archive,
  Sparkles,
  Eye,
} from "lucide-react";
import { Suspense } from "react";

/**
 * SHRP-096 Day 6-8 — Engagement detail page.
 *
 * Renders the engagement metadata header (name, client, launch date,
 * status badge) above the existing service-grouped credential list.
 * If the row was seeded via the "Use sample data" button on the
 * dashboard (custody_assertions.is_sample === true), we show a banner
 * pointing the user to the existing Custody Record preview HTML so
 * they can see the end-state without filling anything in.
 */
type EngagementRow = {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  launch_date: string | null;
  status: "active" | "launched" | "archived";
  custody_assertions: Record<string, unknown> | null;
  created_at: string;
};

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/vault/${projectId}`);

  const { data: profile } = await supabase
    .from("users")
    .select("argon_salt, sentinel_ciphertext")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.argon_salt) redirect("/vault/setup");

  const { data: projectRaw } = await supabase
    .from("projects")
    .select(
      "id, name, description, client_name, launch_date, status, custody_assertions, created_at",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!projectRaw) notFound();
  const project = projectRaw as EngagementRow;

  const { data: credentials } = await supabase
    .from("credentials")
    .select("id, project_id, service, env, label, ciphertext, last_rotated_at, created_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("service");

  const credList = (credentials ?? []) as CredentialView[];

  const riskInputs: RiskCredentialInput[] = credList.map((c) => {
    const days =
      c.last_rotated_at != null
        ? Math.floor(
            (Date.now() - new Date(c.last_rotated_at).getTime()) / 86_400_000,
          )
        : null;
    const svc = getService(c.service);
    return {
      service: c.service,
      keyType: svc?.keyTypes[0]?.id ?? "other",
      env: c.env,
      value: "",
      daysSinceRotation: days,
    };
  });
  const credentialRisks: Record<string, RiskRule | null> = Object.fromEntries(
    credList.map((c, i) => {
      const siblings = riskInputs.filter((_, j) => j !== i);
      return [c.id, worstRisk(riskInputs[i]!, { siblings })];
    }),
  );

  const grouped = groupByService(credList);
  const credentialServiceMap = Object.fromEntries(
    credList.map((c) => [c.id, c.service]),
  );

  const isSample = Boolean(
    project.custody_assertions &&
      typeof project.custody_assertions === "object" &&
      (project.custody_assertions as { is_sample?: unknown }).is_sample === true,
  );

  return (
    <PlaybookProvider>
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Suspense fallback={null}>
          <ScrollToCredential credentialServiceMap={credentialServiceMap} />
        </Suspense>
        <Link
          href="/vault"
          className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
        >
          <ChevronLeft className="h-4 w-4" /> All engagements
        </Link>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="truncate text-2xl font-bold text-slate-900">
                {project.name}
              </h1>
              <StatusPill status={project.status} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
              {project.client_name && (
                <span>
                  for <strong className="text-slate-800">{project.client_name}</strong>
                </span>
              )}
              {project.launch_date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                  {formatLaunchDate(project.launch_date, project.status)}
                </span>
              )}
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-slate-600">{project.description}</p>
            )}
          </div>
          <ProjectActions projectId={project.id} />
        </div>

        {isSample && (
          <div className="mb-6">
            <Callout tone="info" title="This is a sample engagement.">
              <div className="space-y-2">
                <p>
                  Add credentials to see how the vault feels, or jump
                  straight to a finished Custody Record to see what
                  you&apos;ll hand off to a client at launch.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Link
                    href="/sample-custody-record.html"
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sherpa-600"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview a finished Custody Record
                  </Link>
                  <Link
                    href={`/vault/${project.id}/settings`}
                    className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Edit engagement details
                  </Link>
                </div>
              </div>
            </Callout>
          </div>
        )}

        {grouped.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>This engagement is empty.</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Callout tone="info">
                Add the API keys, webhook secrets, and DNS records you&apos;re
                taking on for this client. Everything is encrypted in your
                browser before it leaves.
              </Callout>
              <button
                data-action="open-add-credential"
                className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
              >
                <KeyRound className="h-4 w-4" /> Add the first credential
              </button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ serviceId, items }) => (
              <ServiceGroup
                key={serviceId}
                serviceId={serviceId}
                items={items}
                risks={credentialRisks}
              />
            ))}
          </div>
        )}
      </main>
    </PlaybookProvider>
  );
}

function groupByService(rows: CredentialView[]) {
  const map = new Map<string, CredentialView[]>();
  for (const r of rows) {
    const list = map.get(r.service) ?? [];
    list.push(r);
    map.set(r.service, list);
  }
  return Array.from(map.entries()).map(([serviceId, items]) => ({ serviceId, items }));
}

function ServiceGroup({
  serviceId,
  items,
  risks,
}: {
  serviceId: string;
  items: CredentialView[];
  risks: Record<string, RiskRule | null>;
}) {
  const service = getService(serviceId);
  const name = service?.name ?? serviceId;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: service?.color ?? "#64748B" }}
          >
            {name.slice(0, 1)}
          </span>
          <CardTitle>{name}</CardTitle>
          <span className="ml-auto text-xs text-slate-400">
            {items.length} credential{items.length === 1 ? "" : "s"}
          </span>
        </div>
      </CardHeader>
      <CardBody className="!p-0">
        <ul className="divide-y divide-slate-100">
          {items.map((c) => (
            <CredentialRow key={c.id} cred={c} risk={risks[c.id] ?? null} />
          ))}
        </ul>
      </CardBody>
    </Card>
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

function formatLaunchDate(
  launchDate: string,
  status: EngagementRow["status"],
): string {
  const target = new Date(`${launchDate}T00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86_400_000,
  );
  const niceDate = target.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (status === "launched") return `Launched ${niceDate}`;
  if (status === "archived") return `Was ${niceDate}`;
  if (diffDays > 0) return `Launches in ${diffDays} day${diffDays === 1 ? "" : "s"}`;
  if (diffDays === 0) return "Launches today";
  return `Launch was ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} ago`;
}

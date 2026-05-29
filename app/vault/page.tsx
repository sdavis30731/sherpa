import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Plus, Folder } from "lucide-react";
import { VaultHomeActions } from "./_components/vault-home-actions";
import {
  NeedsAttentionCard,
  type OverdueItem,
} from "./_components/needs-attention-card";
import { getService, type Environment } from "@/lib/services";
import { evaluateRotation } from "@/lib/rotation";

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

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, created_at, archived_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  // Fetch all non-deleted credentials inside non-archived projects so we can
  // compute the overdue widget. We resolve the per-service rotationDays from
  // lib/services.ts at the JS layer rather than duplicating it in the DB.
  const projectIds = (projects ?? []).map((p) => p.id);
  const credentialsResult = projectIds.length
    ? await supabase
        .from("credentials")
        .select("id, project_id, service, env, label, last_rotated_at, created_at")
        .in("project_id", projectIds)
        .is("deleted_at", null)
    : { data: [] as never[] };

  const projectsById = new Map((projects ?? []).map((p) => [p.id, p]));
  const allItems: (OverdueItem & { sortKey: number })[] = [];

  for (const c of credentialsResult.data ?? []) {
    const project = projectsById.get(c.project_id);
    if (!project) continue;
    const service = getService(c.service);
    const interval = service?.rotationDays ?? 180;
    const info = evaluateRotation(c.last_rotated_at, interval, c.created_at);
    if (info.status === "overdue" || info.status === "due") {
      allItems.push({
        credentialId: c.id,
        projectId: c.project_id,
        projectName: project.name,
        service: c.service,
        env: c.env as Environment,
        label: c.label,
        daysOverdue: info.daysOverdue,
        isDueSoon: info.status === "due",
        // Sort overdue items by days-overdue desc, then due-soon by closest to overdue.
        sortKey: info.status === "overdue" ? 1_000_000 + info.daysOverdue : info.daysSinceRotation ?? 0,
      });
    }
  }

  const attentionItems: OverdueItem[] = allItems
    .sort((a, b) => b.sortKey - a.sortKey)
    .slice(0, 10) // cap the widget at 10 — keeps the page calm
    .map(({ sortKey: _ignore, ...rest }) => rest);

  const plan = profile.plan as "free" | "lifetime" | "founders";

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <NeedsAttentionCard items={attentionItems} />

      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your projects</h1>
          <p className="mt-1 text-sm text-slate-600">
            {plan === "free"
              ? "Free tier: 1 project. Upgrade to Lifetime for unlimited."
              : "Lifetime — unlimited projects."}
          </p>
        </div>
        <VaultHomeActions />
      </div>

      {projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/vault/${p.id}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sherpa-300 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-sherpa-500" />
                <div className="text-base font-semibold text-slate-900 group-hover:text-sherpa-700">
                  {p.name}
                </div>
              </div>
              {p.description && (
                <p className="mt-1 text-sm text-slate-600">{p.description}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                Created {new Date(p.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <Callout tone="info" title="You don't have a project yet.">
              A project is just a name for one of your apps. Create one and
              start adding the API keys, webhook secrets, and DNS records you
              keep losing track of.
            </Callout>
            <div className="flex items-center gap-2">
              <NewProjectInlineButton />
            </div>
          </CardBody>
        </Card>
      )}
    </main>
  );
}

function NewProjectInlineButton() {
  return (
    <button
      data-action="open-new-project"
      className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
    >
      <Plus className="h-4 w-4" /> Create your first project
    </button>
  );
}

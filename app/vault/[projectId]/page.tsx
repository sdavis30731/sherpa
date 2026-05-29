import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { getService } from "@/lib/services";
import { ProjectActions } from "./_components/project-actions";
import { CredentialRow, type CredentialView } from "./_components/credential-row";
import { ScrollToCredential } from "./_components/scroll-to-credential";
import { PlaybookProvider } from "@/components/playbook-context";
import { ChevronLeft, KeyRound } from "lucide-react";
import { Suspense } from "react";

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

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, created_at")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  // Include ciphertext so the client can decrypt on demand. RLS guarantees
  // we only see the rows we own; without the vault key the ciphertext is
  // just bytes.
  const { data: credentials } = await supabase
    .from("credentials")
    .select("id, project_id, service, env, label, ciphertext, last_rotated_at, created_at")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("service");

  const credList = (credentials ?? []) as CredentialView[];
  const grouped = groupByService(credList);
  // Map credential id → service id so the ScrollToCredential island can
  // open the right playbook when ?playbook=... is in the URL.
  const credentialServiceMap = Object.fromEntries(
    credList.map((c) => [c.id, c.service]),
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
        <ChevronLeft className="h-4 w-4" /> All projects
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
          {project.description && (
            <p className="mt-1 text-sm text-slate-600">{project.description}</p>
          )}
        </div>
        <ProjectActions projectId={project.id} />
      </div>

        {grouped.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Your vault is empty.</CardTitle>
            </CardHeader>
            <CardBody className="space-y-4">
              <Callout tone="info">
                Add your first API key, webhook secret, or password. It&apos;s
                encrypted in your browser before it leaves.
              </Callout>
              <button
                data-action="open-add-credential"
                className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
              >
                <KeyRound className="h-4 w-4" /> Add your first credential
              </button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ serviceId, items }) => (
              <ServiceGroup key={serviceId} serviceId={serviceId} items={items} />
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

function ServiceGroup({ serviceId, items }: { serviceId: string; items: CredentialView[] }) {
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
            <CredentialRow key={c.id} cred={c} />
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

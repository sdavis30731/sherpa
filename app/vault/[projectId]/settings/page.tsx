import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Bot, ArrowRight } from "lucide-react";
import { RenameProjectForm } from "./_components/rename-form";
import { ArchiveProjectSection } from "./_components/archive-section";
import { DeleteProjectSection } from "./_components/delete-section";
import { EngagementStatusSection } from "./_components/status-section";

type EngagementRow = {
  id: string;
  name: string;
  description: string | null;
  client_name: string | null;
  launch_date: string | null;
  status: "active" | "launched" | "archived";
  archived_at: string | null;
  created_at: string;
};

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/vault/${projectId}/settings`);

  const { data: projectRaw } = await supabase
    .from("projects")
    .select(
      "id, name, description, client_name, launch_date, status, archived_at, created_at",
    )
    .eq("id", projectId)
    .maybeSingle();
  if (!projectRaw) notFound();
  const project = projectRaw as EngagementRow;

  const [{ count: credentialCount }, { count: tokenCount }] = await Promise.all([
    supabase
      .from("credentials")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("deleted_at", null),
    supabase
      .from("mcp_tokens")
      .select("id", { count: "exact", head: true })
      .eq("project_id", projectId)
      .is("revoked_at", null),
  ]);

  const displayName = project.client_name?.trim() || project.name;

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href={`/vault/${projectId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" /> Back to {displayName}
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-slate-900">Engagement settings</h1>
      <p className="mb-8 text-sm text-slate-600">
        Edit the engagement details, change its lifecycle status, or archive it.
      </p>

      <div className="space-y-6">
        <Link
          href={`/vault/${project.id}/settings/agents`}
          className="block rounded-2xl border border-sherpa-200 bg-sherpa-50/50 p-5 shadow-sm transition hover:border-sherpa-400 hover:bg-sherpa-50"
        >
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sherpa-500 text-white">
              <Bot className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-slate-900">
                AI Agent access
              </div>
              <p className="text-sm text-slate-600">
                Generate MCP tokens to let Claude, Cursor, or Cowork use this
                engagement&apos;s credentials — without seeing them.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-sherpa-500" />
          </div>
        </Link>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardBody>
            <RenameProjectForm
              projectId={project.id}
              initialName={project.name}
              initialDescription={project.description ?? ""}
              initialClientName={project.client_name ?? ""}
              initialLaunchDate={project.launch_date ?? ""}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardBody>
            <EngagementStatusSection
              projectId={project.id}
              initialStatus={project.status}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Archive</CardTitle>
          </CardHeader>
          <CardBody>
            <ArchiveProjectSection
              projectId={project.id}
              projectName={project.name}
              archivedAt={project.archived_at}
            />
          </CardBody>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="border-red-100">
            <CardTitle className="text-red-700">Danger zone</CardTitle>
          </CardHeader>
          <CardBody>
            <DeleteProjectSection
              projectId={project.id}
              projectName={project.name}
              credentialCount={credentialCount ?? 0}
              activeTokenCount={tokenCount ?? 0}
            />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

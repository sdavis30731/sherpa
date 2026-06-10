import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft } from "lucide-react";
import { CustodyEditForm } from "./_components/custody-edit-form";
import {
  normalizeCustody,
  reconcileServices,
  type CustodyAssertions,
} from "@/lib/custody";

/**
 * SHRP-096 Day 9-10 — Custody Record wizard (edit mode).
 *
 * Loads the engagement, the agency profile (for branding context), and
 * the list of distinct services in the engagement's credentials. Hands
 * everything to the client form, which writes back to
 * projects.custody_assertions on submit.
 */
type EngagementRow = {
  id: string;
  name: string;
  client_name: string | null;
  launch_date: string | null;
  status: "active" | "launched" | "archived";
  custody_assertions: Record<string, unknown> | null;
};

export default async function CustodyEditPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/vault/${projectId}/custody/edit`);

  const { data: projectRaw } = await supabase
    .from("projects")
    .select("id, name, client_name, launch_date, status, custody_assertions")
    .eq("id", projectId)
    .maybeSingle();
  if (!projectRaw) notFound();
  const project = projectRaw as EngagementRow;

  const { data: agencyRaw } = await supabase
    .from("agency_profiles")
    .select("name")
    .eq("user_id", user.id)
    .maybeSingle();
  const agencyName = (agencyRaw as { name?: string | null } | null)?.name ?? "";

  const { data: creds } = await supabase
    .from("credentials")
    .select("service")
    .eq("project_id", projectId)
    .is("deleted_at", null);

  const distinctServices = Array.from(
    new Set((creds ?? []).map((c) => c.service)),
  );

  // Normalize the saved blob (or `{}` for a fresh engagement) into a
  // predictable shape, then reconcile per-service rows against what's
  // actually in the vault right now.
  const existing: CustodyAssertions = normalizeCustody(project.custody_assertions);
  existing.services = reconcileServices(existing.services ?? [], distinctServices);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/vault/${projectId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" /> Back to engagement
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Custody Record</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fill in the ownership details for this engagement. When you save,
          the record becomes available at a shareable view that you can
          export to PDF and hand to your client.
        </p>
      </div>

      <CustodyEditForm
        projectId={project.id}
        engagementName={project.name}
        clientName={project.client_name ?? ""}
        launchDate={project.launch_date ?? ""}
        agencyName={agencyName}
        initial={existing}
        hasNoCredentials={distinctServices.length === 0}
      />
    </main>
  );
}

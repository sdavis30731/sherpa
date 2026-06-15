import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CustodyEditForm } from "./_components/custody-edit-form";
import { GenerateCard } from "./_components/generate-card";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import {
  normalizeCustody,
  reconcileServices,
  isIssued,
  type CustodyAssertions,
} from "@/lib/custody";
import { Callout } from "@/components/ui/callout";
import { Eye } from "lucide-react";

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
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ ungenerated?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;
  const fromUngeneratedView = sp.ungenerated === "1";

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
  const agencyCrumbLabel = agencyName.trim() || "Your agency";

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
  const alreadyIssued = isIssued(existing);

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Breadcrumb
        className="mb-3"
        segments={[
          { label: agencyCrumbLabel, href: "/vault" },
          { label: "Engagements", href: "/vault" },
          { label: project.client_name?.trim() || "—" },
          { label: project.name, href: `/vault/${projectId}` },
          { label: "Custody Record" },
          { label: "Edit" },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Custody Record</h1>
        <p className="mt-1 text-sm text-slate-600">
          Fill in the ownership details for this engagement. When you&apos;re
          ready, generate the Custody Record — the rendered document with the
          attestation seal and verify URL is produced at that moment.
        </p>
      </div>

      {fromUngeneratedView && !alreadyIssued && (
        <div className="mb-6">
          <Callout tone="info" title="Generate to view">
            The rendered Custody Record only exists once you generate it.
            Fill out the form below, then click <strong>Generate</strong>{" "}
            to produce the signed, dated, verifiable document.
          </Callout>
        </div>
      )}

      {alreadyIssued && (
        <div className="mb-6">
          <Callout tone="success" title="Already generated">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span>
                This Custody Record was issued and is permanently available.
                Edit the form below to update; future revisions are free.
              </span>
              <Link
                href={`/vault/${projectId}/custody/view`}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Eye className="h-3 w-3" />
                Open record
              </Link>
            </div>
          </Callout>
        </div>
      )}

      {!alreadyIssued && (
        <div className="mb-6">
          <GenerateCard
            projectId={project.id}
            clientName={project.client_name ?? ""}
            hasSavedDraft={Boolean(existing.saved_at)}
          />
        </div>
      )}

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

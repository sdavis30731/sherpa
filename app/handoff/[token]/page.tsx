import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/agency";
import { ClaimFlow } from "./_components/claim-flow";

/**
 * SHRP-100d — Client-facing handoff claim page.
 *
 * Public route. Loads the handoff via the admin client + token,
 * stamps first_opened_at, pulls the agency brand, and renders an
 * agency-branded landing that walks the client through:
 *
 *   1. (If not signed in) Sign up / Log in.
 *   2. (If no vault yet) Set vault passphrase + generate keypair.
 *   3. Confirm acceptance — POST /api/handoff/[token]/accept.
 *
 * Once accepted, the page shows a "we'll let your agency know"
 * confirmation. The agency completes the cryptographic transfer in
 * their browser via SHRP-100f.
 */

export const dynamic = "force-dynamic";

export default async function HandoffClaimPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const admin = createAdminClient();
  const { data: handoffRaw, error } = await admin
    .from("engagement_handoffs")
    .select(
      "id, project_id, agency_user_id, client_email, client_name, agency_message, opted_in_to_paid_vault, status, started_at, expires_at, revoked_at, accepted_at, first_opened_at",
    )
    .eq("token", token)
    .maybeSingle();
  if (error || !handoffRaw) notFound();
  const handoff = handoffRaw as {
    id: string;
    project_id: string;
    agency_user_id: string;
    client_email: string;
    client_name: string | null;
    agency_message: string | null;
    opted_in_to_paid_vault: boolean;
    status: string;
    started_at: string;
    expires_at: string;
    revoked_at: string | null;
    accepted_at: string | null;
    first_opened_at: string | null;
  };

  if (handoff.revoked_at) {
    return (
      <SimpleNotice
        title="This handoff has been revoked."
        body="Your agency cancelled this transfer. Reach out to them for a new claim link."
      />
    );
  }
  if (new Date(handoff.expires_at).getTime() < Date.now()) {
    return (
      <SimpleNotice
        title="This link has expired."
        body="The 30-day claim window has passed. Reach out to your agency for a new link."
      />
    );
  }

  // Stamp first_opened_at on the very first land.
  if (!handoff.first_opened_at) {
    await admin
      .from("engagement_handoffs")
      .update({ first_opened_at: new Date().toISOString() } as never)
      .eq("id", handoff.id)
      .is("first_opened_at", null);
  }

  // Load agency identity for branding + project for context.
  const [{ data: agencyRaw }, { data: projectRaw }] = await Promise.all([
    admin
      .from("agency_profiles")
      .select("name, logo_url, primary_color, accent_color")
      .eq("user_id", handoff.agency_user_id)
      .maybeSingle(),
    admin
      .from("projects")
      .select("name, client_name, custody_assertions")
      .eq("id", handoff.project_id)
      .maybeSingle(),
  ]);
  const agency = (agencyRaw as {
    name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    accent_color?: string | null;
  } | null) ?? null;
  const project = projectRaw as {
    name: string;
    client_name: string | null;
    custody_assertions: Record<string, unknown> | null;
  } | null;

  // Check if there's an authenticated user already (returning visitor
  // who finished signup elsewhere then came back to this URL).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userPublicKey: string | null = null;
  if (user) {
    const { data: u } = await supabase
      .from("users")
      .select("public_key")
      .eq("id", user.id)
      .maybeSingle();
    userPublicKey =
      (u as { public_key?: string | null } | null)?.public_key ?? null;
  }

  const agencyName = agency?.name?.trim() || "Your agency";
  const primaryColor = agency?.primary_color || DEFAULT_PRIMARY_COLOR;

  return (
    <main className="min-h-full bg-slate-50">
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --handoff-primary: ${primaryColor}; }`,
        }}
      />
      <ClaimFlow
        token={token}
        agencyName={agencyName}
        agencyLogoUrl={agency?.logo_url ?? null}
        agencyPrimaryColor={primaryColor}
        clientEmail={handoff.client_email}
        clientName={handoff.client_name ?? ""}
        engagementName={project?.name ?? "Your engagement"}
        agencyMessage={handoff.agency_message ?? ""}
        optedInToPaidVault={handoff.opted_in_to_paid_vault}
        custodyIssuedAt={
          project?.custody_assertions && typeof project.custody_assertions === "object"
            ? ((project.custody_assertions as { issued_at?: unknown }).issued_at as
                | string
                | undefined) ?? null
            : null
        }
        initialStatus={handoff.status}
        signedIn={!!user}
        signedInEmail={user?.email ?? null}
        hasKeypair={!!userPublicKey}
      />
    </main>
  );
}

function SimpleNotice({ title, body }: { title: string; body: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{body}</p>
        <p className="mt-6 text-[11px] text-slate-400">
          Powered by Sherpa<span className="text-sherpa-500">Keys</span>
        </p>
      </div>
    </main>
  );
}

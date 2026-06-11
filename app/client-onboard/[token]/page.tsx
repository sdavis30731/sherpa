import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PRIMARY_COLOR } from "@/lib/agency";
import { ClientOnboardBoard } from "./_components/client-onboard-board";

/**
 * SHRP-107f — Client credential onboarding page.
 *
 * No-auth public route. The signed token in the URL is the bearer
 * credential. We load the credential_request + agency_profiles +
 * project + agency public_key via the admin client (bypasses RLS,
 * scoped by token).
 *
 * On first open we stamp first_opened_at. The interactive board on
 * the page handles experience-level pick + per-service paste +
 * X25519 sealed-box encryption in the client's browser.
 *
 * The agency public key is essential — without it the browser can't
 * encrypt anything. If the agency hasn't generated a keypair yet
 * (existing user pre-SHRP-107c lazy-migrate), we render a soft
 * holding screen asking them to unlock their vault first. Should be
 * rare in practice.
 */

export const dynamic = "force-dynamic";

export default async function ClientOnboardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const admin = createAdminClient();

  const { data: requestRaw, error } = await admin
    .from("credential_requests")
    .select(
      "id, user_id, project_id, requested_services, client_email, client_name, client_message, experience_level, created_at, expires_at, email_sent_at, first_opened_at, submitted_at, revoked_at, engagement_label",
    )
    .eq("token", token)
    .maybeSingle();
  if (error || !requestRaw) notFound();
  const request = requestRaw as {
    id: string;
    user_id: string;
    project_id: string;
    requested_services: string[];
    client_email: string;
    client_name: string | null;
    client_message: string | null;
    experience_level: "beginner" | "intermediate" | "expert" | null;
    created_at: string;
    expires_at: string;
    email_sent_at: string | null;
    first_opened_at: string | null;
    submitted_at: string | null;
    revoked_at: string | null;
    engagement_label: string | null;
  };

  if (request.revoked_at) {
    return (
      <SimpleNotice
        title="This link has been revoked."
        body="Your agency cancelled this request. Reach out to them for a new link."
      />
    );
  }
  if (new Date(request.expires_at).getTime() < Date.now()) {
    return (
      <SimpleNotice
        title="This link has expired."
        body="The 14-day window has passed. Reach out to your agency for a new link."
      />
    );
  }
  if (request.submitted_at) {
    return (
      <SimpleNotice
        title="You're all set."
        body="Your credentials have already been received. Your agency has them safely. If you need to send anything else, ask them for a new link."
      />
    );
  }

  // Stamp first_opened_at on the very first land (race-tolerant —
  // only set if null).
  if (!request.first_opened_at) {
    await admin
      .from("credential_requests")
      .update({ first_opened_at: new Date().toISOString() } as never)
      .eq("id", request.id)
      .is("first_opened_at", null);
  }

  // Pull agency identity + branding + public key.
  const [{ data: agencyRaw }, { data: userRaw }] = await Promise.all([
    admin
      .from("agency_profiles")
      .select("name, logo_url, primary_color, accent_color, footer_text")
      .eq("user_id", request.user_id)
      .maybeSingle(),
    admin
      .from("users")
      .select("public_key, keypair_algo")
      .eq("id", request.user_id)
      .maybeSingle(),
  ]);
  const agency = (agencyRaw as {
    name?: string | null;
    logo_url?: string | null;
    primary_color?: string | null;
    accent_color?: string | null;
    footer_text?: string | null;
  } | null) ?? null;
  const userRow = userRaw as {
    public_key: string | null;
    keypair_algo: string | null;
  } | null;

  // Get project info (client_name might differ from request.client_name).
  const { data: projectRaw } = await admin
    .from("projects")
    .select("name, client_name")
    .eq("id", request.project_id)
    .maybeSingle();
  const project = projectRaw as {
    name: string;
    client_name: string | null;
  } | null;

  if (!userRow?.public_key) {
    return (
      <SimpleNotice
        title="Your agency needs to finish their setup."
        body="Reach out to them so they can unlock their vault — that creates the encryption key your credentials get wrapped with. We can't accept anything here until that's done."
      />
    );
  }

  const agencyName = agency?.name?.trim() || "Your agency";
  const primaryColor = agency?.primary_color || DEFAULT_PRIMARY_COLOR;
  const clientFirstName =
    (request.client_name?.trim() || project?.client_name?.trim() || "")
      .split(/\s+/)[0] ?? "";

  return (
    <main className="min-h-full bg-slate-50">
      {/* Inline theme variables keyed on the agency's brand color so the
          page reads as the agency's, not SherpaKeys'. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `:root { --client-onboard-primary: ${primaryColor}; }`,
        }}
      />
      <ClientOnboardBoard
        token={token}
        agencyName={agencyName}
        agencyLogoUrl={agency?.logo_url ?? null}
        agencyPrimaryColor={primaryColor}
        agencyPublicKey={userRow.public_key}
        clientFirstName={clientFirstName}
        clientName={request.client_name ?? project?.client_name ?? ""}
        engagementName={request.engagement_label ?? project?.name ?? ""}
        personalMessage={request.client_message ?? ""}
        requestedServices={request.requested_services ?? []}
        initialExperienceLevel={request.experience_level}
        footerText={agency?.footer_text ?? null}
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

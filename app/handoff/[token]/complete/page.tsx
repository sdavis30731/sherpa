import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompleteFlow } from "./_components/complete-flow";

/**
 * SHRP-100f — Agency-facing handoff completion page.
 *
 * Authenticated route. The agency lands here from the "Complete
 * transfer" button on engagement settings. Server-side does a
 * pre-flight (auth, ownership, handoff status) and hands off to the
 * client component which:
 *
 *   1. Requires vault unlock (redirects to /vault/unlock if locked).
 *   2. Fetches /api/handoff/[token]/rekey-info to get the client's
 *      public key + the engagement's credential ciphertexts.
 *   3. For each credential: decrypt with vault key → seal for client
 *      public key. Progress bar updates per credential.
 *   4. POSTs the bundle to /api/handoff/[token]/complete which
 *      performs the atomic ownership flip.
 *   5. Success screen + link to /vault.
 */

export const dynamic = "force-dynamic";

export default async function CompleteHandoffPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/handoff/${token}/complete`)}`);
  }

  const { data: handoffRaw } = await supabase
    .from("engagement_handoffs")
    .select("id, project_id, agency_user_id, status, client_email, client_name")
    .eq("token", token)
    .maybeSingle();
  if (!handoffRaw) notFound();
  const handoff = handoffRaw as {
    id: string;
    project_id: string;
    agency_user_id: string;
    status: string;
    client_email: string;
    client_name: string | null;
  };

  if (handoff.agency_user_id !== user.id) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <CompleteFlow
        token={token}
        projectId={handoff.project_id}
        clientEmail={handoff.client_email}
        clientName={handoff.client_name ?? ""}
        initialStatus={handoff.status}
      />
    </main>
  );
}

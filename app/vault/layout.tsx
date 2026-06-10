import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Settings } from "lucide-react";

/**
 * Vault layout — gates every /vault/* route.
 *
 * Order of redirects (each falls through to the next if satisfied):
 *   1. Not signed in → /login?next=/vault.
 *   2. Agency not onboarded (agency_profiles.onboarded_at IS NULL) →
 *      /agency/setup. This is the post-signup landing for SHRP-096
 *      Day 3-4. Once they finish the agency form we set onboarded_at
 *      and bounce them back.
 *   3. Vault not initialised (no passphrase yet) → page-level redirects
 *      send the user to /vault/setup. The layout doesn't redirect at
 *      this step because some /vault/* pages (e.g. /vault/setup itself)
 *      must remain reachable in this state.
 *
 * The header now shows the agency name (when onboarded) plus a Settings
 * link to /agency/settings. SHRP-096 Day 4-5.
 */
export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/vault");

  // Agency onboarding gate.
  const { data: agencyProfile } = await supabase
    .from("agency_profiles")
    .select("name, logo_url, onboarded_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!agencyProfile?.onboarded_at) {
    redirect("/agency/setup");
  }

  // Passphrase state — used by the data-attribute below; page-level
  // redirects handle the actual gating for /vault/setup vs /vault.
  const { data: profile } = await supabase
    .from("users")
    .select("argon_salt, sentinel_ciphertext")
    .eq("id", user.id)
    .maybeSingle();
  const hasPassphrase = Boolean(profile?.argon_salt && profile?.sentinel_ciphertext);

  const agencyName = agencyProfile.name?.trim() || "Your agency";
  const logoUrl = agencyProfile.logo_url;

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${agencyName} logo`}
                className="h-8 w-8 rounded object-contain ring-1 ring-slate-200"
              />
            ) : null}
            <div className="text-lg font-bold tracking-tight text-slate-900">
              {agencyName}
            </div>
            <span className="hidden text-xs text-slate-400 sm:inline">
              · powered by SherpaKeys
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/agency/settings"
              className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <form action="/auth/logout" method="post">
              <button className="text-sm text-slate-600 hover:text-slate-900">
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div data-has-passphrase={hasPassphrase} className="bg-slate-50 min-h-full">
        {children}
      </div>
    </>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgencyProfileForm } from "../_components/agency-profile-form";
import type { AgencyProfile } from "@/lib/agency";
import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_ACCENT_COLOR,
} from "@/lib/agency";

/**
 * SHRP-096 Day 3-4 — Post-signup agency onboarding.
 *
 * Loads the agency_profiles row (auto-created by the on_user_created
 * trigger in 0013_agency_lite.sql) and hands it to the shared client
 * form in setup mode. Once the form submits successfully, it sets
 * onboarded_at on the row and redirects to /vault.
 *
 * If the user is already onboarded, we bounce them to /agency/settings
 * — the editable surface — so they don't accidentally re-onboard.
 */
export default async function AgencySetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agency/setup");

  const { data: profileRow } = await supabase
    .from("agency_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  // If for any reason the trigger didn't fire, insert one ourselves
  // so the form has something to write back to. Defensive but cheap.
  let profile: AgencyProfile;
  if (!profileRow) {
    const { data: inserted, error } = await supabase
      .from("agency_profiles")
      .insert({ user_id: user.id })
      .select("*")
      .maybeSingle();
    if (error || !inserted) {
      throw new Error(
        `Could not create agency profile: ${error?.message ?? "no row returned"}`,
      );
    }
    profile = inserted as AgencyProfile;
  } else {
    profile = profileRow as AgencyProfile;
  }

  // Already onboarded? Send them to settings instead of forcing re-entry.
  if (profile.onboarded_at) {
    redirect("/agency/settings");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Set up your agency
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          This appears on your dashboard and on every Custody Record you
          hand to a client. You can change it anytime under{" "}
          <span className="font-medium text-slate-700">Settings</span>.
        </p>
      </div>

      <AgencyProfileForm
        mode="setup"
        initialProfile={{
          ...profile,
          primary_color: profile.primary_color || DEFAULT_PRIMARY_COLOR,
          accent_color: profile.accent_color || DEFAULT_ACCENT_COLOR,
        }}
      />
    </main>
  );
}

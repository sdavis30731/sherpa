import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AgencyProfileForm } from "../_components/agency-profile-form";
import type { AgencyProfile } from "@/lib/agency";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
} from "@/lib/agency";
import { Breadcrumb } from "@/components/ui/breadcrumb";

/**
 * SHRP-096 Day 4-5 — Edit-mode counterpart to /agency/setup.
 *
 * Same form, but:
 *   - Doesn't redirect onboarded users away (this IS the onboarded
 *     surface).
 *   - Doesn't redirect un-onboarded users either — sending people who
 *     haven't onboarded to settings would be confusing. Instead we
 *     bounce them to /agency/setup, the right first-run surface.
 *   - On save, leaves onboarded_at alone and stays on the page.
 */
export default async function AgencySettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/agency/settings");

  const { data: profileRow } = await supabase
    .from("agency_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profileRow) redirect("/agency/setup");

  const profile = profileRow as AgencyProfile;
  if (!profile.onboarded_at) {
    redirect("/agency/setup");
  }

  const agencyName = profile.name?.trim() || "Your agency";

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <Breadcrumb
        className="mb-3"
        segments={[
          { label: agencyName, href: "/vault" },
          { label: "Settings" },
        ]}
      />
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Agency settings
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Update your agency name, logo, and brand color. Changes apply to
          your dashboard and every future Custody Record you generate.
        </p>
      </div>

      <AgencyProfileForm
        mode="settings"
        initialProfile={{
          ...profile,
          primary_color: profile.primary_color || DEFAULT_PRIMARY_COLOR,
          accent_color: profile.accent_color || DEFAULT_ACCENT_COLOR,
        }}
      />
    </main>
  );
}

"use client";

/**
 * SHRP-096 Day 6-8 — "Use sample data" button.
 *
 * Lets a new user see a populated engagement without typing anything.
 * Creates a single engagement row for "Brushfire Website Rebuild" /
 * "Brushfire Coffee Roasters", launch date two weeks out, with a
 * sentinel in custody_assertions so the detail page can render a
 * "This is a sample" banner and link the existing sample Custody
 * Record preview.
 *
 * We don't seed credentials — those need client-side encryption with
 * the user's vault key, and seeding inert ciphertext would be a lie.
 * The detail page nudges the user to add their first real credential.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Sparkles } from "lucide-react";

export function SampleDataButton() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onClick() {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      // Launch date: two weeks from today, in YYYY-MM-DD.
      const launch = new Date();
      launch.setDate(launch.getDate() + 14);
      const launchDateIso = launch.toISOString().slice(0, 10);

      const { data, error: insErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: "Brushfire Website Rebuild",
          description:
            "Shopify storefront rebuild — coffee subscriptions + wholesale ordering.",
          client_name: "Brushfire Coffee Roasters",
          launch_date: launchDateIso,
          status: "active",
          custody_assertions: {
            is_sample: true,
            seeded_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (insErr) {
        if (
          insErr.message?.includes("free_tier_limit") ||
          insErr.code === "P0001"
        ) {
          setError(
            "You're at the free-tier engagement limit. Archive one or upgrade to add the sample.",
          );
          return;
        }
        throw insErr;
      }
      router.push(`/vault/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the sample engagement.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full space-y-2">
      <Button variant="secondary" onClick={onClick} disabled={loading}>
        <Sparkles className="h-4 w-4" />
        {loading ? "Setting up…" : "Or try a sample engagement"}
      </Button>
      {error && (
        <Callout tone="danger" className="mt-2">
          {error}
        </Callout>
      )}
    </div>
  );
}

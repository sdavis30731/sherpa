"use client";

/**
 * Pending-import banner — SHRP-041b
 *
 * When a user finishes signup with a stashed .env from the landing page
 * analyzer, this banner appears at the top of /vault. It asks for a
 * project name, creates the project, then redirects to the project page
 * with continue_import=1 so the import dialog auto-opens pre-filled.
 *
 * If the user dismisses the banner, the stashed text is cleared so they
 * don't see it again on the next page load.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { loadPendingImport, clearPendingImport } from "@/lib/pending-import";
import { parseEnv } from "@/lib/envParser";
import { Callout } from "@/components/ui/callout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

export function PendingImportBanner() {
  const router = useRouter();
  const [pendingText, setPendingText] = React.useState<string | null>(null);
  const [credentialCount, setCredentialCount] = React.useState(0);
  const [projectName, setProjectName] = React.useState("");
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Check localStorage on mount only — we don't want to chase the value
  // through re-renders.
  React.useEffect(() => {
    const text = loadPendingImport();
    if (!text) return;
    const parsed = parseEnv(text);
    if (parsed.entries.length === 0) {
      clearPendingImport();
      return;
    }
    setPendingText(text);
    setCredentialCount(parsed.entries.length);
    // Suggest a friendly default name
    setProjectName("My first project");
  }, []);

  async function onCreateAndImport(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!projectName.trim()) {
      setError("Give the project a name first.");
      return;
    }
    setWorking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { data: project, error: insErr } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName.trim(),
          description: "Imported from .env on landing page",
        })
        .select("id")
        .single();
      if (insErr || !project) {
        // Detect the free-tier limit error and surface it as friendly text.
        if (insErr?.message?.includes("free_tier_limit")) {
          setError(
            "You already have a project — open it and use 'Import .env' to finish.",
          );
          setWorking(false);
          return;
        }
        throw insErr ?? new Error("Could not create project");
      }
      // Keep pending-import in localStorage — the project page will pick it
      // up via the continue_import URL parameter and clear it after import.
      router.push(`/vault/${project.id}?continue_import=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
      setWorking(false);
    }
  }

  function onDismiss() {
    clearPendingImport();
    setPendingText(null);
  }

  if (!pendingText) return null;

  return (
    <div className="mb-6 rounded-2xl border-2 border-sherpa-200 bg-gradient-to-br from-sherpa-50 to-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-sherpa-500 text-white">
            <Upload className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Finish your import
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              We held onto the <strong>{credentialCount} credential
              {credentialCount === 1 ? "" : "s"}</strong> you pasted on the
              landing page. Name your first project and we&apos;ll bring you
              to a preview where you can confirm and import.
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          title="Dismiss (the pasted text will be cleared)"
          className="rounded p-1 text-slate-400 hover:bg-white hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={onCreateAndImport} className="mt-4 space-y-3">
        <div>
          <Label htmlFor="pending-import-name">Project name</Label>
          <Input
            id="pending-import-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. EcoVerse"
            autoFocus
            required
          />
        </div>
        {error && <Callout tone="danger">{error}</Callout>}
        <Button type="submit" disabled={working}>
          {working ? "Creating project…" : "Create project and import"}
        </Button>
      </form>
    </div>
  );
}

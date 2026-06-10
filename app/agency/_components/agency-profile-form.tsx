"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  AGENCY_LOGO_BUCKET,
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  buildAgencyLogoUrl,
  safeImageExtension,
  type AgencyProfile,
} from "@/lib/agency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Upload, X } from "lucide-react";

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

type Mode = "setup" | "settings";

interface Props {
  mode: Mode;
  initialProfile: AgencyProfile;
}

/**
 * Shared form for both /agency/setup (first run) and /agency/settings
 * (edit mode). The only behavioral differences are:
 *
 *   - Submit copy: "Save and continue" vs "Save changes".
 *   - On success, setup sets onboarded_at to now() and redirects to
 *     /vault. Settings leaves onboarded_at alone and stays on page
 *     (with a "Saved." flash).
 *
 * All file uploads go through the browser Supabase client, which
 * carries the user's JWT, so RLS on storage.objects gates writes to
 * `{user_id}/...` paths.
 */
export function AgencyProfileForm({ mode, initialProfile }: Props) {
  const router = useRouter();
  const [name, setName] = React.useState(initialProfile.name ?? "");
  const [primaryColor, setPrimaryColor] = React.useState(
    initialProfile.primary_color || DEFAULT_PRIMARY_COLOR,
  );
  const [footerText, setFooterText] = React.useState(
    initialProfile.footer_text ?? "",
  );

  // Logo state. We track the current public URL (what's saved) and the
  // pending file (what's about to be uploaded). On submit we upload first,
  // then update the row to point at the new URL.
  const [currentLogoUrl, setCurrentLogoUrl] = React.useState<string | null>(
    initialProfile.logo_url,
  );
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = React.useState<string | null>(
    null,
  );
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedFlash, setSavedFlash] = React.useState(false);

  // Build the object-URL preview for the pending upload. Revoke on unmount
  // / on file change so we don't leak handles.
  React.useEffect(() => {
    if (!pendingFile) {
      setPendingPreview(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPendingPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const previewUrl = pendingPreview ?? currentLogoUrl;
  const nameOk = name.trim().length > 0;

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image (PNG, JPG, SVG, or WebP).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Logo must be 2MB or smaller.");
      return;
    }
    setPendingFile(file);
  }

  function clearPendingLogo() {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameOk) {
      setError("Give your agency a name.");
      return;
    }

    setError(null);
    setSubmitting(true);
    setSavedFlash(false);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in.");

      // 1. If there's a pending logo, upload it. Path: {user_id}/logo.{ext}.
      //    upsert: true so re-uploading replaces the prior file.
      let logoUrlToSave: string | null = currentLogoUrl;
      if (pendingFile) {
        const ext = safeImageExtension(pendingFile.name);
        const filePath = `${user.id}/logo.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(AGENCY_LOGO_BUCKET)
          .upload(filePath, pendingFile, {
            upsert: true,
            contentType: pendingFile.type,
            cacheControl: "3600",
          });
        if (upErr) throw upErr;
        // Stamp a cache-busting query so the dashboard reflects the swap
        // immediately (the public URL is stable across overwrites).
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        logoUrlToSave = `${buildAgencyLogoUrl(supabaseUrl, filePath)}?v=${Date.now()}`;
      }

      // 2. Update the agency_profiles row. Setup mode stamps onboarded_at.
      const updates: {
        name: string;
        primary_color: string;
        accent_color: string;
        footer_text: string | null;
        logo_url: string | null;
        onboarded_at?: string;
      } = {
        name: name.trim(),
        primary_color: primaryColor,
        accent_color: DEFAULT_ACCENT_COLOR,
        footer_text: footerText.trim() || null,
        logo_url: logoUrlToSave,
      };
      if (mode === "setup") {
        updates.onboarded_at = new Date().toISOString();
      }

      const { error: rowErr } = await supabase
        .from("agency_profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (rowErr) throw rowErr;

      // 3. Done. Setup → /vault. Settings → stay + flash.
      if (mode === "setup") {
        router.push("/vault");
        router.refresh();
      } else {
        setCurrentLogoUrl(logoUrlToSave);
        clearPendingLogo();
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
        router.refresh();
      }
    } catch (err) {
      console.error("Agency profile save failed:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "string"
            ? err
            : "Could not save. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="agency-name">
              Agency name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="agency-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Studio"
              autoComplete="organization"
              required
              maxLength={120}
            />
            <p className="mt-1 text-xs text-slate-500">
              Shown on your dashboard and on every Custody Record you hand to a client.
            </p>
          </div>

          <div>
            <Label>Logo</Label>
            <div className="mt-1 flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt="Agency logo preview"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">No logo</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    {previewUrl ? "Replace logo" : "Upload logo"}
                  </Button>
                  {pendingFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearPendingLogo}
                    >
                      <X className="h-4 w-4" />
                      Discard
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  PNG, JPG, SVG, or WebP. Max 2MB. Square or roughly square works best.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                  onChange={onPickLogo}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <div>
            <Label htmlFor="primary-color">Primary color</Label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="primary-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-md border border-slate-300 bg-white p-1"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                pattern="^#[0-9a-fA-F]{6}$"
                className="max-w-[12ch] font-mono uppercase"
              />
              <div
                className="ml-2 rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Preview
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Used as the accent color on your Custody Record and your dashboard nav.
            </p>
          </div>

          <div>
            <Label htmlFor="footer-text">Footer text (optional)</Label>
            <Input
              id="footer-text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder='e.g. "Prepared by Acme Studio · acmestudio.com"'
              maxLength={200}
            />
            <p className="mt-1 text-xs text-slate-500">
              Appears at the bottom of every Custody Record. Leave blank to use a sensible default.
            </p>
          </div>
        </CardBody>
      </Card>

      {error && <Callout tone="danger">{error}</Callout>}
      {savedFlash && (
        <Callout tone="success">Saved.</Callout>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={submitting || !nameOk}>
          {submitting
            ? "Saving..."
            : mode === "setup"
              ? "Save and continue"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}


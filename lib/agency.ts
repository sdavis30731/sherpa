/**
 * SHRP-096 — Agency profile helpers.
 *
 * The agency_profiles table holds one row per user (auto-created by trigger
 * on signup). It carries the agency-level identity that the user populates
 * during onboarding: name, logo URL, brand colors, footer text.
 *
 * Constants live here so the migration filename, the Supabase Storage
 * bucket name, and the URL builders all use the same string.
 */

/**
 * Supabase Storage bucket holding agency logos.
 *
 * Public read; writes scoped to `{user_id}/...` via RLS (see migration
 * 0014_agency_logos_storage.sql).
 */
export const AGENCY_LOGO_BUCKET = "agency-logos" as const;

/** Default primary color when the user hasn't picked one yet (sherpa-500). */
export const DEFAULT_PRIMARY_COLOR = "#1f6feb" as const;

/** Default accent color (sherpa-700). */
export const DEFAULT_ACCENT_COLOR = "#0c2a63" as const;

/**
 * Shape of the agency_profiles row used by the UI. Mirrors the columns
 * declared in 0013_agency_lite.sql. Keep these in sync with the schema.
 */
export type AgencyProfile = {
  id: string;
  user_id: string;
  name: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  footer_text: string | null;
  onboarded_at: string | null; // ISO timestamp once the user finishes /agency/setup
  created_at: string;
  updated_at: string;
};

/**
 * Build the public URL for an agency logo. The bucket is public, so the
 * URL is stable as long as the file exists. Storing the URL on the row
 * (rather than reconstructing it every render) lets us swap storage
 * providers later without rewriting templates.
 */
export function buildAgencyLogoUrl(
  supabaseUrl: string,
  filePath: string,
): string {
  // Trim trailing slash if present so we don't end up with `//storage/...`.
  const base = supabaseUrl.replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${AGENCY_LOGO_BUCKET}/${filePath}`;
}

/**
 * Sanitize a file extension we're about to use as a path component.
 * Lowercase, alphanumeric only, max 5 chars (jpeg is the longest legit
 * extension we accept). Returns "png" as a safe fallback.
 */
export function safeImageExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  if (dot < 0) return "png";
  const raw = filename.slice(dot + 1).toLowerCase();
  const cleaned = raw.replace(/[^a-z0-9]/g, "").slice(0, 5);
  if (!cleaned) return "png";
  // Allowlist — refuse anything that isn't an image extension.
  const allowed = new Set(["png", "jpg", "jpeg", "webp", "svg", "gif"]);
  return allowed.has(cleaned) ? cleaned : "png";
}

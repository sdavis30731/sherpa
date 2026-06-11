/**
 * SHRP-096 Day 9-11 — Custody Record data shape + helpers.
 *
 * The agency fills in the wizard at /vault/[projectId]/custody/edit and we
 * persist the result into projects.custody_assertions (jsonb, declared in
 * migration 0013). The view page at /vault/[projectId]/custody/view reads
 * the same shape and renders the Custody Record using the agency's
 * branding (logo + primary color + footer text from agency_profiles).
 *
 * Path A scope, intentional limits:
 *   - No multi-row audit log section yet — the v1 viewer renders the
 *     engagement's audit_log automatically. Manual log curation is v1.1.
 *   - No score badge yet. The sample has a 0–100 trust score on the
 *     cover; we don't generate one until we have signal beyond what the
 *     agency claims. v1.1.
 *   - Signature block is single-side: agency principal only. Client
 *     counter-sign is v1.1, when we add the share link.
 *
 * Sentinel:
 *   - { is_sample: true } gets seeded by the "Use sample data" button on
 *     the dashboard. We preserve that flag through the form so the view
 *     page can still surface a "sample" banner even after editing.
 */

export type CustodyServiceAssertion = {
  /** Stable service id from lib/services.ts (e.g. "stripe", "supabase"). */
  service_id: string;
  /** Display name override; falls back to lib/services.ts lookup. */
  service_name?: string;
  account_owner_email: string;
  billing_owner_email: string;
  /** Free-text comma-or-newline list. We split on render. */
  admins_raw: string;
  /** "client" | "agency" | "shared" | "" — left blank means unknown. */
  transfer_status: TransferStatus;
  exception_note: string;
};

export type TransferStatus = "" | "complete" | "scheduled" | "exception";

export type CustodyDomain = {
  primary_domain: string;
  registrar: string;
  owner_email: string;
  /** Free-text. e.g. "Auto-renew enabled" or a renewal date. */
  notes: string;
};

export type CustodyHosting = {
  platform: string;
  billing_owner_email: string;
  notes: string;
};

export type CustodyIssuer = {
  name: string;
  role: string;
};

export type CustodyAssertions = {
  /** Sentinel from the sample-data seeder. Preserved across edits. */
  is_sample?: boolean;
  seeded_at?: string;

  issued_by?: CustodyIssuer;

  /**
   * SHRP-098 — semantic split.
   *   - saved_at: stamped every time the agency saves the edit form.
   *     A Custody Record with saved_at but no issued_at is a DRAFT.
   *   - issued_at: stamped only when the agency clicks "Issue Custody
   *     Record" and confirms the (free-during-founding-cohort) charge.
   *     Once set, the document is the official one — view renders
   *     clean, no watermark. Edits after issuing are allowed but the
   *     issued_at stays put (re-issues would belong to a new revision
   *     model we don't have yet).
   *
   * Before SHRP-098, issued_at was being used for both senses. Rows
   * created prior to this change will have issued_at populated by the
   * form save; we treat those rows as Draft (Issue still required to
   * make them official). The normalizer migrates that data on read.
   */
  saved_at?: string;
  issued_at?: string;

  domain?: CustodyDomain;
  hosting?: CustodyHosting;
  services?: CustodyServiceAssertion[];
  handoff_notes?: string;
};

/** Fresh shell for a brand-new Custody Record (no prior data). */
export const EMPTY_CUSTODY: CustodyAssertions = {
  issued_by: { name: "", role: "" },
  saved_at: undefined,
  issued_at: undefined,
  domain: { primary_domain: "", registrar: "", owner_email: "", notes: "" },
  hosting: { platform: "", billing_owner_email: "", notes: "" },
  services: [],
  handoff_notes: "",
};

/**
 * Normalize whatever's in projects.custody_assertions today (could be `{}`,
 * could be `{ is_sample: true }`, could be a full assertion blob) into a
 * predictable shape with all sub-objects present so the form components
 * don't have to defensively check every field.
 */
export function normalizeCustody(
  raw: Record<string, unknown> | null | undefined,
): CustodyAssertions {
  const safe = (raw ?? {}) as Partial<CustodyAssertions> & {
    is_sample?: boolean;
    seeded_at?: string;
  };

  // SHRP-098 backward-compat migration on read:
  // Before SHRP-098, the form save stamped `issued_at` directly. After
  // SHRP-098 we split it: `saved_at` for form save, `issued_at` only
  // for the explicit Issue action. A row from the old world that has
  // issued_at populated is actually a draft (the agency never went
  // through the new Issue flow), so we slide that timestamp into
  // saved_at and clear issued_at unless an explicit `issued` flag is
  // present in the blob.
  let savedAt = safe.saved_at;
  let issuedAt = safe.issued_at;
  if (issuedAt && !savedAt && (safe as { issued?: boolean }).issued !== true) {
    savedAt = issuedAt;
    issuedAt = undefined;
  }

  return {
    is_sample: safe.is_sample ?? false,
    seeded_at: safe.seeded_at,
    issued_by: { ...EMPTY_CUSTODY.issued_by!, ...(safe.issued_by ?? {}) },
    saved_at: savedAt,
    issued_at: issuedAt,
    domain: { ...EMPTY_CUSTODY.domain!, ...(safe.domain ?? {}) },
    hosting: { ...EMPTY_CUSTODY.hosting!, ...(safe.hosting ?? {}) },
    services: Array.isArray(safe.services) ? safe.services : [],
    handoff_notes: safe.handoff_notes ?? "",
  };
}

/** A Custody Record has been officially issued if issued_at is set. */
export function isIssued(c: CustodyAssertions): boolean {
  return Boolean(c.issued_at);
}

/** A Custody Record has been saved as a draft at least once. */
export function isDrafted(c: CustodyAssertions): boolean {
  return Boolean(c.saved_at);
}

/**
 * Reconcile the saved per-service assertions with the engagement's current
 * credential list. For each distinct service id in the credentials, ensure
 * we have an assertion row — if it already exists, keep it; if not, seed
 * a blank one. Drops orphan rows whose service is no longer in the
 * engagement (the credential was removed) so the form stays in sync.
 */
export function reconcileServices(
  existing: CustodyServiceAssertion[],
  serviceIdsInEngagement: string[],
): CustodyServiceAssertion[] {
  const byId = new Map(existing.map((s) => [s.service_id, s]));
  const result: CustodyServiceAssertion[] = [];
  for (const id of serviceIdsInEngagement) {
    const found = byId.get(id);
    if (found) {
      result.push(found);
    } else {
      result.push({
        service_id: id,
        account_owner_email: "",
        billing_owner_email: "",
        admins_raw: "",
        transfer_status: "",
        exception_note: "",
      });
    }
  }
  return result;
}

/**
 * Did the agency fill in enough to issue a credible Custody Record?
 * The view page uses this to decide whether to render a "Draft" banner.
 *
 * Threshold (intentionally loose for v1): agency has named themselves
 * (issued_by.name) AND each per-service row has at least an account_owner.
 */
export function isComplete(c: CustodyAssertions): boolean {
  if (!c.issued_by?.name?.trim()) return false;
  if (!c.services || c.services.length === 0) return false;
  return c.services.every((s) => s.account_owner_email.trim().length > 0);
}

/**
 * Split an admin-list freeform string ("a@x.com, b@y.com\nc@z.io") into
 * trimmed emails for rendering. Empty strings filtered.
 */
export function parseAdminList(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Pretty-format the transfer_status for the view page. */
export function transferStatusLabel(s: TransferStatus): string {
  switch (s) {
    case "complete":
      return "Complete";
    case "scheduled":
      return "Scheduled";
    case "exception":
      return "Exception — see note";
    default:
      return "Not set";
  }
}

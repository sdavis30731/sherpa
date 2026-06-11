import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react";
import { PrintButton } from "./_components/print-button";
import { IssueButton } from "./_components/issue-button";
import {
  normalizeCustody,
  parseAdminList,
  transferStatusLabel,
  isIssued,
  type CustodyAssertions,
} from "@/lib/custody";
import { getService } from "@/lib/services";

/**
 * SHRP-096 Day 10-11 — Rendered Custody Record.
 *
 * Server component. Reads the engagement, agency profile, and saved
 * custody_assertions, then renders the document. The page is two layers:
 *
 *   - Toolbar (top, hidden on print): Back, Edit, Export PDF.
 *   - .custody-record (the document itself): cover band, executive
 *     summary, per-service ownership cards, domain & hosting, handoff
 *     notes, signature block, footer watermark.
 *
 * Branding is pulled live from agency_profiles. We inline a <style> block
 * keyed on the agency's primary_color so the cover gradient and accents
 * pick up the agency's color without a build step.
 *
 * Print: @media print rules hide everything except the document and set
 * @page Letter with a footer. Browser print -> "Save as PDF" gives the
 * agency a real PDF in 5 seconds.
 */
type EngagementRow = {
  id: string;
  name: string;
  client_name: string | null;
  launch_date: string | null;
  status: "active" | "launched" | "archived";
  custody_assertions: Record<string, unknown> | null;
};

type AgencyProfileRow = {
  name: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  footer_text: string | null;
};

export default async function CustodyViewPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/vault/${projectId}/custody/view`);

  const { data: projectRaw } = await supabase
    .from("projects")
    .select("id, name, client_name, launch_date, status, custody_assertions")
    .eq("id", projectId)
    .maybeSingle();
  if (!projectRaw) notFound();
  const project = projectRaw as EngagementRow;

  const { data: agencyRaw } = await supabase
    .from("agency_profiles")
    .select("name, logo_url, primary_color, accent_color, footer_text")
    .eq("user_id", user.id)
    .maybeSingle();
  const agency =
    (agencyRaw as AgencyProfileRow | null) ?? {
      name: null,
      logo_url: null,
      primary_color: "#1f6feb",
      accent_color: "#0c2a63",
      footer_text: null,
    };

  const custody: CustodyAssertions = normalizeCustody(project.custody_assertions);
  const issued = isIssued(custody);

  const issuedAt = custody.issued_at ? new Date(custody.issued_at) : null;
  const savedAt = custody.saved_at ? new Date(custody.saved_at) : null;
  const launchDate = project.launch_date
    ? new Date(`${project.launch_date}T00:00`)
    : null;

  const services = custody.services ?? [];
  const exceptionsCount = services.filter(
    (s) => s.transfer_status === "exception" || s.exception_note.trim().length > 0,
  ).length;
  const completeTransferCount = services.filter(
    (s) => s.transfer_status === "complete",
  ).length;

  const docTitle = `${project.client_name || project.name} — Credential Custody Record`;
  const footerLine =
    agency.footer_text?.trim() ||
    `Prepared by ${agency.name || "Your agency"} using SherpaKeys`;

  return (
    <>
      {/* ──────────── Draft CTA banner (screen only) ──────────── */}
      {!issued && (
        <div className="custody-draft-banner bg-amber-50 border-b border-amber-200 px-6 py-3 print:hidden">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>
                <strong>Draft.</strong> Issue the record to remove the
                watermark and stamp the official date.
              </span>
            </div>
            <IssueButton
              projectId={projectId}
              clientName={project.client_name ?? ""}
            />
          </div>
        </div>
      )}

      {/* ──────────── Toolbar (screen only) ──────────── */}
      <div className="custody-toolbar bg-slate-100 px-6 py-3 print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <Link
            href={`/vault/${projectId}`}
            className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Back to engagement
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {issued ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                Issued{" "}
                {issuedAt
                  ? issuedAt.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
              </span>
            ) : savedAt ? (
              <span className="text-xs text-slate-500">
                Last saved{" "}
                {savedAt.toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            ) : null}
            <Link
              href={`/vault/${projectId}/custody/edit`}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Link>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Inline CSS — agency-color theme + print rules. Kept in the page
          so we don't have to plumb dynamic CSS variables through Tailwind. */}
      <style
        dangerouslySetInnerHTML={{
          __html: buildCss({
            primary: agency.primary_color || "#1f6feb",
            accent: agency.accent_color || "#0c2a63",
          }),
        }}
      />

      <article className={"custody-record " + (issued ? "is-issued" : "is-draft")}>
        {/* ──────────── Cover ──────────── */}
        <section className="cr-cover">
          <div className="cr-cover-brandbar">
            {agency.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agency.logo_url}
                alt={`${agency.name ?? "Agency"} logo`}
                className="cr-cover-logo"
              />
            ) : (
              <span className="cr-cover-logo-mark">
                {(agency.name || "A").slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="cr-cover-brand-name">
              {agency.name || "Your agency"}
            </span>
          </div>

          <span className="cr-cover-chip">
            Go-Live Credential Custody Record
            {custody.is_sample ? " · Sample" : ""}
          </span>

          <h1 className="cr-cover-title">
            {project.client_name || project.name}
            {project.client_name && (
              <>
                <br />
                <span className="cr-cover-title-sub">{project.name}</span>
              </>
            )}
          </h1>

          <p className="cr-cover-subtitle">
            A signed, dated record of who owns each production account, what
            was rotated at handoff, and what exceptions remain
            {project.client_name ? ` — prepared for ${project.client_name}` : ""}
            {agency.name ? ` by ${agency.name}` : ""}.
          </p>

          <div className="cr-cover-meta">
            <div>
              <div className="lbl">Client</div>
              <div className="val">{project.client_name || "—"}</div>
            </div>
            <div>
              <div className="lbl">Agency</div>
              <div className="val">{agency.name || "—"}</div>
            </div>
            <div>
              <div className="lbl">Engagement</div>
              <div className="val">{project.name}</div>
            </div>
            <div>
              <div className="lbl">Launch date</div>
              <div className="val">
                {launchDate
                  ? launchDate.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>
            </div>
            <div>
              <div className="lbl">Issued by</div>
              <div className="val">
                {custody.issued_by?.name || "—"}
                {custody.issued_by?.role
                  ? `, ${custody.issued_by.role}`
                  : ""}
              </div>
            </div>
            <div>
              <div className="lbl">Issued</div>
              <div className="val">
                {issuedAt
                  ? issuedAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>
            </div>
          </div>

          {!issued && (
            <div className="cr-cover-draft">
              Draft — not yet issued. Issue the record to remove the
              watermark and stamp the official date.
            </div>
          )}
        </section>

        {/* ──────────── Executive summary ──────────── */}
        <section className="cr-page">
          <div className="cr-section-header">
            <span className="cr-eyebrow">Executive summary</span>
            <h2>What your client should know.</h2>
            <p className="cr-sub">
              A non-technical summary of credential custody as of the issue
              date.
            </p>
          </div>

          <div className="cr-exec-grid">
            <div className="cr-exec-card">
              <div className="num">
                {completeTransferCount}
                {services.length > 0 ? ` / ${services.length}` : ""}
              </div>
              <div className="lbl">Transfers complete</div>
              <div className="body">
                {services.length === 0
                  ? "No services in the engagement vault yet."
                  : `Account ownership transferred to the client across ${completeTransferCount} of ${services.length} production services.`}
              </div>
            </div>
            <div className="cr-exec-card">
              <div className="num">{exceptionsCount}</div>
              <div className="lbl">Documented exceptions</div>
              <div className="body">
                {exceptionsCount === 0
                  ? "No outstanding exceptions at the issue date."
                  : "Time-bound, client-revocable exceptions documented per service."}
              </div>
            </div>
            <div className="cr-exec-card">
              <div className="num">{services.length}</div>
              <div className="lbl">Production services</div>
              <div className="body">
                Services covered by this record. Per-service detail follows.
              </div>
            </div>
          </div>

          {(custody.domain?.primary_domain || custody.hosting?.platform) && (
            <div className="cr-twocol">
              {custody.domain?.primary_domain && (
                <div>
                  <div className="cr-col-h">Domain &amp; registrar</div>
                  <ul className="cr-pill-list">
                    <li>
                      <strong>Primary domain:</strong>{" "}
                      {custody.domain.primary_domain}
                    </li>
                    {custody.domain.registrar && (
                      <li>
                        <strong>Registrar:</strong> {custody.domain.registrar}
                      </li>
                    )}
                    {custody.domain.owner_email && (
                      <li>
                        <strong>Owner:</strong> {custody.domain.owner_email}
                      </li>
                    )}
                    {custody.domain.notes && <li>{custody.domain.notes}</li>}
                  </ul>
                </div>
              )}
              {custody.hosting?.platform && (
                <div>
                  <div className="cr-col-h">Hosting</div>
                  <ul className="cr-pill-list">
                    <li>
                      <strong>Platform:</strong> {custody.hosting.platform}
                    </li>
                    {custody.hosting.billing_owner_email && (
                      <li>
                        <strong>Billing owner:</strong>{" "}
                        {custody.hosting.billing_owner_email}
                      </li>
                    )}
                    {custody.hosting.notes && <li>{custody.hosting.notes}</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {custody.handoff_notes?.trim() && (
            <div className="cr-callout info">
              <div className="lbl">Handoff notes</div>
              <div className="body">{custody.handoff_notes}</div>
            </div>
          )}
        </section>

        {/* ──────────── Per-service pages ──────────── */}
        {services.map((svc) => {
          const def = getService(svc.service_id);
          const displayName =
            svc.service_name || def?.name || svc.service_id;
          const admins = parseAdminList(svc.admins_raw);
          const statusLabel = transferStatusLabel(svc.transfer_status);
          return (
            <section key={svc.service_id} className="cr-page">
              <div className="cr-svc-banner">
                <span
                  className="cr-svc-logo"
                  style={{ background: def?.color ?? "#64748B" }}
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
                <div className="cr-svc-name">
                  <h3>{displayName}</h3>
                  <span className="role">Custody assertion</span>
                </div>
                <span
                  className={
                    "cr-svc-status " +
                    (svc.transfer_status === "complete"
                      ? "green"
                      : svc.transfer_status === "exception"
                        ? "amber"
                        : svc.transfer_status === "scheduled"
                          ? "amber"
                          : "muted")
                  }
                >
                  {statusLabel}
                </span>
              </div>

              <div className="cr-kv-grid">
                <div className="cr-kv">
                  <span className="k">Account owner</span>
                  <span className="v">{svc.account_owner_email || "—"}</span>
                </div>
                <div className="cr-kv">
                  <span className="k">Billing owner</span>
                  <span className="v">{svc.billing_owner_email || "—"}</span>
                </div>
              </div>

              {admins.length > 0 && (
                <>
                  <div className="cr-block-title">Current admin access</div>
                  <ul className="cr-admin-list">
                    {admins.map((a) => (
                      <li key={a}>
                        <span className="who">{a}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {svc.exception_note.trim() && (
                <div
                  className={
                    "cr-svc-exception " +
                    (svc.transfer_status === "complete" ? "green" : "")
                  }
                >
                  <div className="lbl">
                    {svc.transfer_status === "complete"
                      ? "Note"
                      : "Exception — documented"}
                  </div>
                  <div className="body">{svc.exception_note}</div>
                </div>
              )}
            </section>
          );
        })}

        {/* ──────────── Signature ──────────── */}
        <section className="cr-page">
          <div className="cr-section-header">
            <span className="cr-eyebrow">Signature</span>
            <h2>Signed attestation.</h2>
            <p className="cr-sub">
              Agency principal&apos;s attestation that the assertions above
              are accurate as of the issue date.
            </p>
          </div>

          <div className="cr-sig-row">
            <div className="cr-sig-pad">
              <div className="cr-sig-line">
                {custody.issued_by?.name || "— pending signature —"}
              </div>
              <div className="cr-sig-label">Signed by Agency Principal</div>
              <div className="cr-sig-name">
                {custody.issued_by?.name || "—"}
              </div>
              <div className="cr-sig-role">
                {custody.issued_by?.role || "—"}
                {agency.name ? ` · ${agency.name}` : ""}
                {issuedAt
                  ? ` · ${issuedAt.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}`
                  : ""}
              </div>
            </div>
            <div className="cr-sig-pad">
              <div className="cr-sig-line cr-sig-pending">
                — pending client signature —
              </div>
              <div className="cr-sig-label">Acknowledged by Client</div>
              <div className="cr-sig-name">
                {project.client_name || "Client"}
              </div>
            </div>
          </div>

          <div className="cr-footer-watermark">
            <div>{footerLine}</div>
            <div className="watermark-sub">
              Document title: {docTitle}
            </div>
          </div>
        </section>
      </article>
    </>
  );
}

/**
 * Build the page CSS with the agency's brand color baked in. Kept in JS
 * rather than as a static stylesheet because the cover gradient and
 * accent text need to be themed per-agency.
 */
function buildCss({
  primary,
  accent,
}: {
  primary: string;
  accent: string;
}): string {
  return `
:root {
  --cr-ink: #0f172a;
  --cr-body: #334155;
  --cr-muted: #64748b;
  --cr-light: #94a3b8;
  --cr-hairline: #e2e8f0;
  --cr-tint: #f8fafc;
  --cr-tint-2: #f1f5f9;
  --cr-primary: ${primary};
  --cr-accent: ${accent};
  --cr-primary-tint: ${hexWithAlpha(primary, 0.08)};
  --cr-green: #047857;
  --cr-green-tint: #d1fae5;
  --cr-amber: #b45309;
  --cr-amber-tint: #fef3c7;
}

.custody-record {
  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
  color: var(--cr-body);
  font-size: 10.5pt;
  line-height: 1.5;
  max-width: 8.5in;
  margin: 0 auto;
  padding: 24px 0 60px;
}

/* SHRP-098 — DRAFT watermark for un-issued records. Overlaid on each
   page via ::after pseudo-element. Visible on screen and in print.
   The .is-draft class is set on the .custody-record root from the
   server (issued_at not set on custody_assertions). */
.custody-record.is-draft .cr-cover,
.custody-record.is-draft .cr-page {
  position: relative;
}
.custody-record.is-draft .cr-cover::after,
.custody-record.is-draft .cr-page::after {
  content: "DRAFT";
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 110pt;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: rgba(220, 38, 38, 0.10);
  transform: rotate(-22deg);
  pointer-events: none;
  z-index: 50;
  user-select: none;
}
.custody-record.is-draft .cr-cover::after {
  /* Brighter watermark on the dark cover so it reads through the
     gradient instead of disappearing into it. */
  color: rgba(255, 255, 255, 0.18);
}

.custody-record h1,
.custody-record h2,
.custody-record h3,
.custody-record h4 {
  color: var(--cr-ink);
  font-weight: 700;
  margin: 0;
  line-height: 1.15;
}

.cr-cover {
  color: #fff;
  background:
    linear-gradient(135deg, ${accent} 0%, ${primary} 60%, ${lighten(primary, 0.15)} 100%);
  padding: 0.7in 0.65in 0.6in 0.65in;
  border-radius: 6px;
  margin-bottom: 20px;
  position: relative;
  overflow: hidden;
}
.cr-cover::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 88% 18%, rgba(255,255,255,0.10) 0, transparent 35%),
    radial-gradient(circle at 8% 92%, rgba(255,255,255,0.06) 0, transparent 40%);
  pointer-events: none;
}
.cr-cover > * { position: relative; z-index: 1; }

.cr-cover-brandbar {
  display: flex;
  align-items: center;
  gap: 12pt;
  font-size: 11pt;
  font-weight: 600;
  color: rgba(255,255,255,0.92);
}
.cr-cover-logo {
  width: 36pt;
  height: 36pt;
  border-radius: 8pt;
  background: rgba(255,255,255,0.95);
  object-fit: contain;
  padding: 4pt;
}
.cr-cover-logo-mark {
  width: 32pt; height: 32pt;
  border-radius: 8pt;
  background: rgba(255,255,255,0.18);
  border: 1pt solid rgba(255,255,255,0.32);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12pt;
  letter-spacing: 0.05em;
}
.cr-cover-brand-name { color: #fff; }
.cr-cover-chip {
  display: inline-block;
  background: rgba(255,255,255,0.14);
  border: 1pt solid rgba(255,255,255,0.30);
  border-radius: 999pt;
  padding: 4pt 11pt;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(255,255,255,0.95);
  margin-top: 22pt;
}
.cr-cover-title {
  margin-top: 10pt;
  font-size: 28pt;
  font-weight: 800;
  line-height: 1.08;
  color: #fff;
  letter-spacing: -0.02em;
}
.cr-cover-title-sub {
  font-weight: 500;
  font-size: 16pt;
  color: rgba(255,255,255,0.88);
}
.cr-cover-subtitle {
  margin-top: 12pt;
  font-size: 11pt;
  color: rgba(255,255,255,0.88);
  font-weight: 500;
  line-height: 1.4;
  max-width: 5in;
}
.cr-cover-meta {
  margin-top: 22pt;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  column-gap: 18pt;
  row-gap: 10pt;
  border-top: 1pt solid rgba(255,255,255,0.18);
  padding-top: 14pt;
}
.cr-cover-meta div .lbl {
  font-size: 7pt;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgba(255,255,255,0.62);
}
.cr-cover-meta div .val {
  margin-top: 2pt;
  color: #fff;
  font-weight: 600;
  font-size: 9.5pt;
}
.cr-cover-draft {
  margin-top: 22pt;
  background: rgba(255,255,255,0.92);
  color: ${darken(primary, 0.3)};
  border-radius: 6pt;
  padding: 10pt 14pt;
  font-size: 9pt;
  font-weight: 600;
}

.cr-page {
  background: #fff;
  border-radius: 6px;
  border: 1px solid var(--cr-hairline);
  padding: 0.7in 0.65in;
  margin-bottom: 16px;
}
.cr-section-header {
  border-bottom: 1pt solid var(--cr-hairline);
  padding-bottom: 14pt;
  margin-bottom: 22pt;
}
.cr-section-header h2 {
  font-size: 22pt;
  color: var(--cr-ink);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-top: 4pt;
}
.cr-section-header .cr-sub {
  margin-top: 6pt;
  color: var(--cr-muted);
  font-size: 10pt;
  max-width: 5.5in;
}
.cr-eyebrow {
  display: block;
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: var(--cr-primary);
}

.cr-exec-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  column-gap: 10pt;
  margin-bottom: 22pt;
}
.cr-exec-card {
  background: var(--cr-tint);
  border: 1pt solid var(--cr-hairline);
  border-radius: 8pt;
  padding: 12pt 13pt;
}
.cr-exec-card .num {
  color: var(--cr-primary);
  font-size: 22pt;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.02em;
}
.cr-exec-card .lbl {
  margin-top: 7pt;
  font-size: 8pt;
  color: var(--cr-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
}
.cr-exec-card .body {
  margin-top: 4pt;
  font-size: 9pt;
  color: var(--cr-body);
  line-height: 1.4;
}

.cr-twocol {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 22pt;
  margin-top: 6pt;
}
.cr-col-h {
  font-size: 9pt;
  font-weight: 700;
  color: var(--cr-ink);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 8pt;
}
.cr-pill-list { margin: 0; padding: 0; list-style: none; }
.cr-pill-list li {
  padding: 6pt 0;
  border-bottom: 1pt solid var(--cr-hairline);
  font-size: 9.5pt;
  color: var(--cr-body);
}
.cr-pill-list li:last-child { border-bottom: 0; }
.cr-pill-list li strong { color: var(--cr-ink); }

.cr-callout {
  border-radius: 6pt;
  padding: 12pt 14pt;
  margin-top: 16pt;
}
.cr-callout.info {
  background: var(--cr-primary-tint);
  border: 1pt solid ${hexWithAlpha(primary, 0.25)};
  border-left: 3pt solid var(--cr-primary);
  color: ${darken(primary, 0.35)};
}
.cr-callout .lbl {
  font-size: 8pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: inherit;
}
.cr-callout .body {
  margin-top: 4pt;
  font-size: 9.5pt;
  line-height: 1.45;
  color: inherit;
}

.cr-svc-banner {
  display: flex;
  align-items: center;
  gap: 14pt;
  padding-bottom: 14pt;
  margin-bottom: 18pt;
  border-bottom: 1pt solid var(--cr-hairline);
}
.cr-svc-logo {
  width: 40pt; height: 40pt;
  border-radius: 8pt;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 11pt;
  color: #fff;
  letter-spacing: 0.04em;
}
.cr-svc-name { flex: 1; display: flex; flex-direction: column; }
.cr-svc-name h3 {
  font-size: 17pt;
  color: var(--cr-ink);
  font-weight: 800;
}
.cr-svc-name .role {
  margin-top: 2pt;
  font-size: 9pt;
  color: var(--cr-muted);
}
.cr-svc-status {
  border-radius: 999pt;
  padding: 5pt 13pt;
  font-size: 8.5pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  border: 1pt solid;
}
.cr-svc-status.green {
  background: var(--cr-green-tint);
  border-color: #6ee7b7;
  color: var(--cr-green);
}
.cr-svc-status.amber {
  background: var(--cr-amber-tint);
  border-color: #fcd34d;
  color: var(--cr-amber);
}
.cr-svc-status.muted {
  background: var(--cr-tint);
  border-color: var(--cr-hairline);
  color: var(--cr-muted);
}

.cr-kv-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 22pt;
  row-gap: 12pt;
}
.cr-kv { display: flex; flex-direction: column; }
.cr-kv .k {
  font-size: 7.5pt;
  font-weight: 800;
  color: var(--cr-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.cr-kv .v {
  margin-top: 3pt;
  color: var(--cr-ink);
  font-size: 10pt;
  font-weight: 600;
}
.cr-admin-list {
  margin-top: 4pt;
  padding: 0;
  list-style: none;
  font-size: 9.5pt;
}
.cr-admin-list li {
  padding: 4pt 0;
  border-bottom: 1pt solid var(--cr-hairline);
}
.cr-admin-list li:last-child { border-bottom: 0; }
.cr-admin-list .who {
  font-family: "JetBrains Mono", "SF Mono", Menlo, monospace;
  font-size: 9pt;
  color: var(--cr-ink);
}

.cr-block-title {
  margin-top: 18pt;
  margin-bottom: 8pt;
  font-size: 9pt;
  font-weight: 800;
  color: var(--cr-ink);
  text-transform: uppercase;
  letter-spacing: 0.14em;
}

.cr-svc-exception {
  background: var(--cr-primary-tint);
  border: 1pt solid ${hexWithAlpha(primary, 0.25)};
  border-left: 3pt solid var(--cr-primary);
  border-radius: 6pt;
  padding: 11pt 13pt;
  margin-top: 14pt;
  color: ${darken(primary, 0.35)};
}
.cr-svc-exception.green {
  background: var(--cr-green-tint);
  border-color: #6ee7b7;
  border-left-color: var(--cr-green);
  color: var(--cr-green);
}
.cr-svc-exception .lbl {
  font-size: 7.5pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.14em;
}
.cr-svc-exception .body {
  margin-top: 4pt;
  font-size: 9.5pt;
  line-height: 1.45;
  color: inherit;
}

.cr-sig-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 28pt;
  margin-top: 18pt;
}
.cr-sig-pad {
  border: 1pt solid var(--cr-hairline);
  border-radius: 6pt;
  padding: 14pt 16pt 16pt 16pt;
  background: var(--cr-tint);
}
.cr-sig-line {
  margin-top: 18pt;
  border-bottom: 1.4pt solid var(--cr-ink);
  height: 30pt;
  display: flex;
  align-items: flex-end;
  padding-bottom: 4pt;
  font-family: "Snell Roundhand", "Brush Script MT", cursive;
  font-style: italic;
  font-size: 17pt;
  color: var(--cr-ink);
}
.cr-sig-line.cr-sig-pending {
  font-family: inherit;
  font-style: normal;
  font-size: 9pt;
  font-weight: 500;
  color: var(--cr-muted);
  padding-bottom: 8pt;
}
.cr-sig-label {
  margin-top: 8pt;
  font-size: 8pt;
  color: var(--cr-muted);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 700;
}
.cr-sig-name {
  margin-top: 2pt;
  color: var(--cr-ink);
  font-weight: 700;
  font-size: 10pt;
}
.cr-sig-role {
  margin-top: 1pt;
  color: var(--cr-muted);
  font-size: 9pt;
}

.cr-footer-watermark {
  margin-top: 30pt;
  padding-top: 14pt;
  border-top: 1pt solid var(--cr-hairline);
  text-align: center;
  color: var(--cr-light);
  font-size: 8.5pt;
}
.cr-footer-watermark .watermark-sub {
  margin-top: 4pt;
  font-size: 8pt;
}

/* ──────────── Screen layout ──────────── */
@media screen {
  body { background: #e2e8f0; }
}

/* ──────────── Print rules ──────────── */
@media print {
  @page {
    size: Letter;
    margin: 0.65in 0.6in;
  }
  body { background: #fff !important; }
  .custody-toolbar, .custody-draft-banner { display: none !important; }
  .custody-record {
    max-width: none;
    padding: 0;
    margin: 0;
  }
  .cr-page { page-break-before: always; border: 0; box-shadow: none; padding: 0; }
  .cr-cover { page-break-after: always; }
  .cr-kv-grid, .cr-exec-card, .cr-svc-banner, .cr-sig-row, .cr-svc-exception {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  /* Boost watermark contrast for print — the screen version is
     intentionally subtle but printed pages need it more visible to
     survive a hand-off as an "obviously DRAFT" document. */
  .custody-record.is-draft .cr-page::after {
    color: rgba(220, 38, 38, 0.18);
  }
  html, body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}
`;
}

/* ──────────── Tiny color utils ──────────── */

function hexWithAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex(
    Math.min(255, Math.round(r + (255 - r) * amount)),
    Math.min(255, Math.round(g + (255 - g) * amount)),
    Math.min(255, Math.round(b + (255 - b) * amount)),
  );
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return toHex(
    Math.max(0, Math.round(r * (1 - amount))),
    Math.max(0, Math.round(g * (1 - amount))),
    Math.max(0, Math.round(b * (1 - amount))),
  );
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const cleaned = hex.replace("#", "");
  const full =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((c) => c + c)
          .join("")
      : cleaned;
  const num = parseInt(full || "1f6feb", 16);
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}

function toHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")
  );
}

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";

/**
 * SHRP-105f — Public Custody Record verification page.
 *
 * Anyone (with no auth) can hit /verify/SKR-2026-XXXXXXXX and confirm
 * "This Custody Record was issued by [Agency] for [Client] on [Date]."
 * This is the trust anchor that distinguishes a paid, attested record
 * from a screenshot of a draft. Clients learn to ask for the verify
 * URL the same way they learn to ask for a SOC 2 report.
 *
 * The page never exposes credentials, the Custody Record contents, or
 * any details an attacker could use. It confirms only:
 *   - the attestation ID is real
 *   - which agency issued it
 *   - which client it was issued for (display name only)
 *   - when it was issued
 *
 * Server-rendered with no client-side JavaScript so the trust signal
 * is as plain and uncacheable as possible.
 */

export const dynamic = "force-dynamic";

export default async function VerifyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const normalized = id.trim().toUpperCase();

  // Format gate — reject anything that doesn't look like an ID. Keeps
  // the page off the radar of generic id-bashing crawlers.
  if (!/^SKR-\d{4}-[A-Z0-9]{6,16}$/.test(normalized)) {
    return <Notice ok={false} message="That isn't a valid SherpaKeys Custody Record ID." />;
  }

  const admin = createAdminClient();
  const { data: projectRaw } = await admin
    .from("projects")
    .select("id, name, client_name, custody_assertions, user_id, attestation_id")
    .eq("attestation_id", normalized)
    .maybeSingle();

  if (!projectRaw) {
    return <Notice ok={false} message="We don't have a Custody Record with that ID. Double-check the link or ask your agency for a fresh one." />;
  }

  const project = projectRaw as {
    id: string;
    name: string;
    client_name: string | null;
    custody_assertions: Record<string, unknown> | null;
    user_id: string;
    attestation_id: string;
  };
  const issuedAt =
    project.custody_assertions && typeof project.custody_assertions === "object"
      ? ((project.custody_assertions as { issued_at?: unknown }).issued_at as
          | string
          | undefined)
      : undefined;
  const issuedBy =
    project.custody_assertions && typeof project.custody_assertions === "object"
      ? ((project.custody_assertions as { issued_by?: unknown }).issued_by as
          | { name?: string; role?: string }
          | undefined)
      : undefined;

  if (!issuedAt) {
    // Record exists but hasn't been issued — somehow they got hold of
    // the ID without an issued record. Treat as invalid.
    return <Notice ok={false} message="That Custody Record hasn't been issued yet. Ask your agency to finalize before sharing the verify URL." />;
  }

  // Look up the agency profile (display name + logo).
  const { data: agencyRaw } = await admin
    .from("agency_profiles")
    .select("name, logo_url")
    .eq("user_id", project.user_id)
    .maybeSingle();
  const agency = (agencyRaw as { name?: string | null; logo_url?: string | null } | null) ?? null;

  const agencyName = agency?.name?.trim() || "An agency";
  const clientName = project.client_name?.trim() || "a client";
  const issuedDate = new Date(issuedAt);

  return (
    <main className="mx-auto flex min-h-full max-w-xl flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 text-center text-2xl font-bold text-slate-900">
          Verified Custody Record
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600 leading-relaxed">
          This Custody Record was issued by{" "}
          <strong className="text-slate-900">{agencyName}</strong> for{" "}
          <strong className="text-slate-900">{clientName}</strong> on{" "}
          <strong className="text-slate-900">
            {issuedDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </strong>
          .
        </p>

        <dl className="mt-6 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <DataRow label="Attestation ID" value={project.attestation_id} mono />
          <DataRow label="Engagement" value={project.name} />
          <DataRow label="Issued by" value={agencyName} />
          <DataRow
            label="Issued by (signer)"
            value={issuedBy?.name ? `${issuedBy.name}${issuedBy.role ? `, ${issuedBy.role}` : ""}` : "—"}
          />
          <DataRow label="Issued for" value={clientName} />
          <DataRow
            label="Issued on"
            value={issuedDate.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          />
        </dl>

        <div className="mt-7 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
              <strong>What this confirms:</strong> a paid, dated, signed
              Custody Record matching this ID exists in SherpaKeys.{" "}
              <br />
              <strong>What this doesn&apos;t confirm:</strong> the
              accuracy of the assertions inside. SherpaKeys attests the
              record exists and was issued by the named agency; the
              agency attests the contents.
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Generated by{" "}
          <Link href="/" className="font-semibold text-slate-600 hover:text-slate-800">
            Sherpa<span className="text-sherpa-500">Keys</span>
          </Link>{" "}
          · the credential keychain for AI-built apps
        </p>
      </div>
    </main>
  );
}

function DataRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd
        className={
          "mt-0.5 text-slate-900 " +
          (mono ? "font-mono text-xs" : "text-sm")
        }
      >
        {value}
      </dd>
    </div>
  );
}

function Notice({ ok, message }: { ok: boolean; message: string }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-6 py-16">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
          {ok ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Not verified</h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">{message}</p>
        <p className="mt-6 text-[11px] text-slate-400">
          Powered by Sherpa<span className="text-sherpa-500">Keys</span>
        </p>
      </div>
    </main>
  );
}

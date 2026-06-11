"use client";

/**
 * SHRP-096 Day 9-10 — Custody Record edit form.
 *
 * Single long form, no multi-step wizard. Sections:
 *   1. Engagement summary (read-only — pulled from projects + agency)
 *   2. Issued by (agency principal signing the record)
 *   3. Domain & registrar
 *   4. Hosting platform
 *   5. Per-service ownership rows (auto-seeded from credentials)
 *   6. Handoff notes (free text)
 *
 * Save writes the entire blob into projects.custody_assertions and stamps
 * issued_at. We keep is_sample/seeded_at sentinels intact across edits.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Save, Eye, Briefcase } from "lucide-react";
import { getService } from "@/lib/services";
import type {
  CustodyAssertions,
  CustodyServiceAssertion,
  TransferStatus,
} from "@/lib/custody";

interface Props {
  projectId: string;
  engagementName: string;
  clientName: string;
  launchDate: string;
  agencyName: string;
  initial: CustodyAssertions;
  hasNoCredentials: boolean;
}

export function CustodyEditForm({
  projectId,
  engagementName,
  clientName,
  launchDate,
  agencyName,
  initial,
  hasNoCredentials,
}: Props) {
  const router = useRouter();

  // Top-level state mirrors the assertion shape. We don't deep-equality
  // dirty-check — Save is always enabled once you've typed anything, and
  // a no-op save is cheap.
  const [issuedByName, setIssuedByName] = React.useState(
    initial.issued_by?.name ?? "",
  );
  const [issuedByRole, setIssuedByRole] = React.useState(
    initial.issued_by?.role ?? "",
  );

  const [domain, setDomain] = React.useState(initial.domain!);
  const [hosting, setHosting] = React.useState(initial.hosting!);
  const [services, setServices] = React.useState<CustodyServiceAssertion[]>(
    initial.services ?? [],
  );
  const [handoffNotes, setHandoffNotes] = React.useState(
    initial.handoff_notes ?? "",
  );

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);

  function updateService(
    serviceId: string,
    patch: Partial<CustodyServiceAssertion>,
  ) {
    setServices((prev) =>
      prev.map((s) => (s.service_id === serviceId ? { ...s, ...patch } : s)),
    );
  }

  async function onSubmit(
    e: React.FormEvent,
    options?: { andViewAfter?: boolean },
  ) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const next: CustodyAssertions = {
        // Preserve sample sentinel across edits.
        is_sample: initial.is_sample ?? false,
        seeded_at: initial.seeded_at,

        issued_by: { name: issuedByName.trim(), role: issuedByRole.trim() },
        // SHRP-098 — form save stamps saved_at. issued_at only flips
        // when the agency explicitly clicks Issue on the view page.
        // If a previous Issue stamped it, preserve that — edits don't
        // un-issue.
        saved_at: new Date().toISOString(),
        issued_at: initial.issued_at,
        domain: {
          primary_domain: domain.primary_domain.trim(),
          registrar: domain.registrar.trim(),
          owner_email: domain.owner_email.trim(),
          notes: domain.notes.trim(),
        },
        hosting: {
          platform: hosting.platform.trim(),
          billing_owner_email: hosting.billing_owner_email.trim(),
          notes: hosting.notes.trim(),
        },
        services: services.map((s) => ({
          service_id: s.service_id,
          service_name: s.service_name,
          account_owner_email: s.account_owner_email.trim(),
          billing_owner_email: s.billing_owner_email.trim(),
          admins_raw: s.admins_raw.trim(),
          transfer_status: s.transfer_status,
          exception_note: s.exception_note.trim(),
        })),
        handoff_notes: handoffNotes.trim(),
      };

      const { error: upErr } = await supabase
        .from("projects")
        .update({ custody_assertions: next })
        .eq("id", projectId);
      if (upErr) throw upErr;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "custody_record_saved",
        actor: "user",
        metadata: { services_count: next.services?.length ?? 0 },
      });

      setSaved(true);
      if (options?.andViewAfter) {
        router.push(`/vault/${projectId}/custody/view`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => onSubmit(e)} className="space-y-6">
      {/* ──────────── Engagement summary (read-only) ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Engagement</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Briefcase className="mt-0.5 h-4 w-4 text-sherpa-500" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">
                {engagementName}
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                {clientName ? `Client: ${clientName} · ` : ""}
                {launchDate
                  ? `Target launch: ${formatDate(launchDate)} · `
                  : ""}
                Agency: {agencyName || "(set in /agency/settings)"}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Edit these in the engagement settings if anything looks off.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {hasNoCredentials && (
        <Callout tone="warning" title="No credentials in this engagement yet.">
          You can still fill in the Custody Record, but the per-service
          section will be empty. Add credentials first to auto-populate the
          ownership rows.
        </Callout>
      )}

      {/* ──────────── Signed by ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Signed by</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-500">
            The agency principal attesting that everything below is accurate
            as of the issue date.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="issued-name">Your name</Label>
              <Input
                id="issued-name"
                value={issuedByName}
                onChange={(e) => setIssuedByName(e.target.value)}
                placeholder="e.g. Mara Lindberg"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="issued-role">Your role</Label>
              <Input
                id="issued-role"
                value={issuedByRole}
                onChange={(e) => setIssuedByRole(e.target.value)}
                placeholder="e.g. Project Lead"
                maxLength={120}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ──────────── Domain ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Domain &amp; registrar</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-500">
            Who owns the primary domain, and where is it registered.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="domain-primary">Primary domain</Label>
              <Input
                id="domain-primary"
                value={domain.primary_domain}
                onChange={(e) =>
                  setDomain({ ...domain, primary_domain: e.target.value })
                }
                placeholder="brushfirecoffee.com"
              />
            </div>
            <div>
              <Label htmlFor="domain-registrar">Registrar</Label>
              <Input
                id="domain-registrar"
                value={domain.registrar}
                onChange={(e) =>
                  setDomain({ ...domain, registrar: e.target.value })
                }
                placeholder="Cloudflare, Hover, Namecheap…"
              />
            </div>
            <div>
              <Label htmlFor="domain-owner">Owner email at registrar</Label>
              <Input
                id="domain-owner"
                value={domain.owner_email}
                onChange={(e) =>
                  setDomain({ ...domain, owner_email: e.target.value })
                }
                placeholder="ops@client.com"
                type="email"
              />
            </div>
            <div>
              <Label htmlFor="domain-notes">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Input
                id="domain-notes"
                value={domain.notes}
                onChange={(e) =>
                  setDomain({ ...domain, notes: e.target.value })
                }
                placeholder="Auto-renew on. Expires Mar 15, 2027."
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ──────────── Hosting ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Hosting</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <p className="text-xs text-slate-500">
            Where the production app runs and who pays the bill.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="hosting-platform">Platform</Label>
              <Input
                id="hosting-platform"
                value={hosting.platform}
                onChange={(e) =>
                  setHosting({ ...hosting, platform: e.target.value })
                }
                placeholder="Vercel, Netlify, Railway, AWS…"
              />
            </div>
            <div>
              <Label htmlFor="hosting-billing">Billing owner email</Label>
              <Input
                id="hosting-billing"
                value={hosting.billing_owner_email}
                onChange={(e) =>
                  setHosting({
                    ...hosting,
                    billing_owner_email: e.target.value,
                  })
                }
                placeholder="ops@client.com"
                type="email"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="hosting-notes">
                Notes <span className="font-normal text-slate-400">(optional)</span>
              </Label>
              <Input
                id="hosting-notes"
                value={hosting.notes}
                onChange={(e) =>
                  setHosting({ ...hosting, notes: e.target.value })
                }
                placeholder="Pro plan. Client card on file."
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ──────────── Per-service ownership ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Per-service ownership</CardTitle>
        </CardHeader>
        <CardBody className="space-y-6">
          <p className="text-xs text-slate-500">
            One row per service in this engagement&apos;s vault. Fill in who
            owns the account today, what the transfer status is, and any
            documented exceptions.
          </p>

          {services.length === 0 ? (
            <p className="text-sm text-slate-500">
              No services yet. Add credentials to this engagement and they
              will appear here for ownership assertions.
            </p>
          ) : (
            services.map((s) => (
              <ServiceCard
                key={s.service_id}
                service={s}
                onChange={(patch) => updateService(s.service_id, patch)}
              />
            ))
          )}
        </CardBody>
      </Card>

      {/* ──────────── Handoff notes ──────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Handoff notes</CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <p className="text-xs text-slate-500">
            What you want the client to know in one paragraph. Renewal
            reminders, recommended monitoring, anything that doesn&apos;t
            fit elsewhere.
          </p>
          <textarea
            value={handoffNotes}
            onChange={(e) => setHandoffNotes(e.target.value)}
            rows={5}
            maxLength={2000}
            placeholder="All production secrets were rotated on launch day. Agency access has been revoked across all services."
            className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
          />
        </CardBody>
      </Card>

      {error && <Callout tone="danger">{error}</Callout>}
      {saved && <Callout tone="success">Saved.</Callout>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={(e) => onSubmit(e, { andViewAfter: true })}
          disabled={saving}
        >
          <Eye className="h-4 w-4" />
          Save &amp; view
        </Button>
        <Button type="submit" disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

function ServiceCard({
  service,
  onChange,
}: {
  service: CustodyServiceAssertion;
  onChange: (patch: Partial<CustodyServiceAssertion>) => void;
}) {
  const def = getService(service.service_id);
  const displayName = service.service_name || def?.name || service.service_id;
  const color = def?.color ?? "#64748B";
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
        <span
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {displayName.slice(0, 1).toUpperCase()}
        </span>
        <div className="text-base font-semibold text-slate-900">
          {displayName}
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`svc-owner-${service.service_id}`}>
              Account owner email
            </Label>
            <Input
              id={`svc-owner-${service.service_id}`}
              type="email"
              value={service.account_owner_email}
              onChange={(e) => onChange({ account_owner_email: e.target.value })}
              placeholder="ops@client.com"
            />
          </div>
          <div>
            <Label htmlFor={`svc-billing-${service.service_id}`}>
              Billing owner email
            </Label>
            <Input
              id={`svc-billing-${service.service_id}`}
              type="email"
              value={service.billing_owner_email}
              onChange={(e) => onChange({ billing_owner_email: e.target.value })}
              placeholder="ops@client.com"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor={`svc-admins-${service.service_id}`}>
              Current admins{" "}
              <span className="font-normal text-slate-400">
                (comma or newline separated)
              </span>
            </Label>
            <Input
              id={`svc-admins-${service.service_id}`}
              value={service.admins_raw}
              onChange={(e) => onChange({ admins_raw: e.target.value })}
              placeholder="ops@client.com, dev@client.com"
            />
          </div>
          <div>
            <Label htmlFor={`svc-status-${service.service_id}`}>
              Transfer status
            </Label>
            <select
              id={`svc-status-${service.service_id}`}
              value={service.transfer_status}
              onChange={(e) =>
                onChange({
                  transfer_status: e.target.value as TransferStatus,
                })
              }
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
            >
              <option value="">Not set</option>
              <option value="complete">Complete</option>
              <option value="scheduled">Scheduled</option>
              <option value="exception">Exception (see note)</option>
            </select>
          </div>
          <div>
            <Label htmlFor={`svc-exc-${service.service_id}`}>
              Exception / notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </Label>
            <Input
              id={`svc-exc-${service.service_id}`}
              value={service.exception_note}
              onChange={(e) => onChange({ exception_note: e.target.value })}
              placeholder="Agency retains read-only key until Aug 8."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(`${iso}T00:00`);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

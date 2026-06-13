"use client";

/**
 * SHRP-100d/e — Client claim flow.
 *
 * Renders the agency-branded landing with four possible states:
 *
 *   - landing       : showing engagement summary + value props +
 *                     'Create account to claim' CTA.
 *   - sign_in       : visitor was signed in to a different account
 *                     than the email the handoff was sent to.
 *   - vault_setup   : signed in but no keypair yet — link to
 *                     /vault/setup and resume.
 *   - acceptance    : ready to call /api/handoff/[token]/accept.
 *   - accepted      : success screen, agency notified, await
 *                     transfer.
 *
 * The actual signup / vault-setup flows live elsewhere; this
 * component links to them with a next= param so the user returns
 * here after.
 */

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Loader2,
  Lock,
  AlertTriangle,
} from "lucide-react";

interface Props {
  token: string;
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyPrimaryColor: string;
  clientEmail: string;
  clientName: string;
  engagementName: string;
  agencyMessage: string;
  optedInToPaidVault: boolean;
  custodyIssuedAt: string | null;
  initialStatus: string;
  signedIn: boolean;
  signedInEmail: string | null;
  hasKeypair: boolean;
}

export function ClaimFlow(props: Props) {
  const router = useRouter();
  const [accepting, setAccepting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [accepted, setAccepted] = React.useState(
    props.initialStatus === "pending_rekey" ||
      props.initialStatus === "transferred",
  );
  const [transferred, setTransferred] = React.useState(
    props.initialStatus === "transferred",
  );

  const clientFirstName = (props.clientName || props.clientEmail.split("@")[0])
    .split(/\s+/)[0]!;

  async function onAccept() {
    setError(null);
    setAccepting(true);
    try {
      const res = await fetch(`/api/handoff/${props.token}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
          message?: string;
        };
        throw new Error(body.message ?? body.error ?? `HTTP ${res.status}`);
      }
      setAccepted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept.");
    } finally {
      setAccepting(false);
    }
  }

  const next = `/handoff/${props.token}`;

  // ─── Already transferred ────────────────────────────────────────
  if (transferred) {
    return (
      <Container>
        <BrandBar {...props} />
        <SuccessCard
          primary={props.agencyPrimaryColor}
          title="Ownership transferred."
          body={`Your vault is fully yours. Sign in to manage credentials, view the Custody Record, and configure auto-rotation if you opted in.`}
          cta={
            <Link
              href="/vault"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm"
              style={{ background: props.agencyPrimaryColor }}
            >
              Open your vault
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
      </Container>
    );
  }

  // ─── Accepted, awaiting agency rekey ───────────────────────────
  if (accepted) {
    return (
      <Container>
        <BrandBar {...props} />
        <SuccessCard
          primary={props.agencyPrimaryColor}
          title={`Thanks, ${clientFirstName}.`}
          body={`We've let ${props.agencyName} know you're ready. They'll do one last step in their browser — re-encrypting every credential so only you can read them — and then your vault will appear in your dashboard.`}
          cta={
            <p className="text-xs text-slate-500">
              You can close this tab. We&apos;ll email you the moment the
              transfer completes.
            </p>
          }
        />
      </Container>
    );
  }

  // ─── Signed in to wrong account ────────────────────────────────
  if (props.signedIn && props.signedInEmail && props.clientEmail.toLowerCase() !== props.signedInEmail.toLowerCase()) {
    return (
      <Container>
        <BrandBar {...props} />
        <CardBlock>
          <CardHead
            badge="Different account"
            badgeColor="amber"
            title={`Hi ${clientFirstName} — you're signed in as ${props.signedInEmail}.`}
            body={`${props.agencyName} sent this handoff to ${props.clientEmail}. You can claim it with the account you're signed in as, but the Custody Record was prepared for the other address. Continue anyway?`}
          />
          <div className="mt-6 space-y-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={accepting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
              style={{ background: props.agencyPrimaryColor }}
            >
              {accepting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Claim as {props.signedInEmail}
            </button>
            <form action="/auth/logout" method="post" className="w-full">
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Log out and sign in as {props.clientEmail}
              </button>
            </form>
          </div>
          {error && (
            <p className="mt-3 text-xs text-red-700">{error}</p>
          )}
        </CardBlock>
      </Container>
    );
  }

  // ─── Signed in, no keypair → finish vault setup ───────────────
  if (props.signedIn && !props.hasKeypair) {
    return (
      <Container>
        <BrandBar {...props} />
        <CardBlock>
          <CardHead
            badge="Almost there"
            badgeColor="info"
            title={`One more step, ${clientFirstName}.`}
            body="Set a master passphrase and we'll generate your encryption keys. Only your passphrase can unlock your vault — keep it somewhere safe."
          />
          <Link
            href={`/vault/setup?next=${encodeURIComponent(next)}`}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm"
            style={{ background: props.agencyPrimaryColor }}
          >
            <Lock className="h-4 w-4" />
            Set up my vault
            <ArrowRight className="h-3 w-3" />
          </Link>
        </CardBlock>
      </Container>
    );
  }

  // ─── Signed in + has keypair → ready to accept ────────────────
  if (props.signedIn && props.hasKeypair) {
    return (
      <Container>
        <BrandBar {...props} />
        <CardBlock>
          <CardHead
            badge="Ready to claim"
            badgeColor="emerald"
            title={`Hi ${clientFirstName} — you're set.`}
            body={`Your vault is ready to receive ${props.engagementName}'s credentials. Click below to let ${props.agencyName} know you're ready. They'll do the final crypto step in their browser; you don't have to do anything else.`}
          />
          <button
            type="button"
            onClick={onAccept}
            disabled={accepting}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50"
            style={{ background: props.agencyPrimaryColor }}
          >
            {accepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {accepting ? "Notifying agency..." : `I'm ready — notify ${props.agencyName}`}
            {!accepting && <ArrowRight className="h-3 w-3" />}
          </button>
          {error && (
            <p className="mt-3 text-xs text-red-700">{error}</p>
          )}
        </CardBlock>
      </Container>
    );
  }

  // ─── Not signed in → landing page ────────────────────────────
  return (
    <Container>
      <BrandBar {...props} />

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Hi {clientFirstName} — your engagement is ready.
        </h1>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed">
          <strong>{props.agencyName}</strong> just finished{" "}
          <strong>{props.engagementName}</strong> and prepared a secure
          vault with every credential they used to build it. Claim it to
          take ownership.
        </p>
        {props.agencyMessage.trim() && (
          <blockquote
            className="mt-5 rounded-lg p-4 text-sm text-slate-800 leading-relaxed"
            style={{
              background: "rgba(15, 23, 42, 0.03)",
              borderLeft: `3px solid ${props.agencyPrimaryColor}`,
              whiteSpace: "pre-wrap",
            }}
          >
            {props.agencyMessage.trim()}
          </blockquote>
        )}

        <div className="mt-7 space-y-2 text-sm text-slate-700">
          <div className="flex items-start gap-2.5">
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0"
              style={{ color: props.agencyPrimaryColor }}
            />
            <span>
              Ownership of every Stripe key, GitHub token, Vercel env var
              — every credential running {props.engagementName}.
            </span>
          </div>
          {props.optedInToPaidVault ? (
            <div className="flex items-start gap-2.5">
              <Sparkles
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: props.agencyPrimaryColor }}
              />
              <span>
                <strong>$9/month auto-rotating vault.</strong> Your
                production secrets rotate themselves on a schedule. You
                never have to think about credential hygiene. Cancel
                anytime.
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: props.agencyPrimaryColor }}
              />
              <span>A free credential vault you control.</span>
            </div>
          )}
          {props.custodyIssuedAt && (
            <div className="flex items-start gap-2.5">
              <FileCheck
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: props.agencyPrimaryColor }}
              />
              <span>
                Your signed Custody Record. Dated{" "}
                {new Date(props.custodyIssuedAt).toLocaleDateString()}.
              </span>
            </div>
          )}
        </div>

        <div className="mt-7 grid grid-cols-1 gap-2">
          <Link
            href={`/signup?email=${encodeURIComponent(props.clientEmail)}&next=${encodeURIComponent(next)}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-sm"
            style={{ background: props.agencyPrimaryColor }}
          >
            Create my account
            <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="text-center text-xs text-slate-500 hover:text-slate-700"
          >
            Already have a SherpaKeys account? Sign in
          </Link>
        </div>
      </div>

      <PrivacyStripe primary={props.agencyPrimaryColor} agencyName={props.agencyName} />
    </Container>
  );
}

// ─── Layout primitives ──────────────────────────────────────────

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-12">{children}</div>
  );
}

function BrandBar({
  agencyName,
  agencyLogoUrl,
  engagementName,
}: {
  agencyName: string;
  agencyLogoUrl: string | null;
  engagementName: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {agencyLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={agencyLogoUrl}
          alt={`${agencyName} logo`}
          className="h-10 w-10 rounded-lg object-contain bg-white ring-1 ring-slate-200"
        />
      ) : (
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white text-base font-bold">
          {agencyName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900">
          {agencyName}
        </div>
        <div className="text-xs text-slate-500">
          Handoff · {engagementName}
        </div>
      </div>
    </div>
  );
}

function CardBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      {children}
    </div>
  );
}

function CardHead({
  badge,
  badgeColor,
  title,
  body,
}: {
  badge: string;
  badgeColor: "amber" | "info" | "emerald";
  title: string;
  body: string;
}) {
  const palette = {
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    info: "bg-sherpa-50 text-sherpa-700 ring-sherpa-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  }[badgeColor];
  const Icon =
    badgeColor === "amber" ? AlertTriangle : badgeColor === "emerald" ? CheckCircle2 : Sparkles;
  return (
    <>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${palette}`}
      >
        <Icon className="h-3 w-3" />
        {badge}
      </span>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
    </>
  );
}

function SuccessCard({
  title,
  body,
  cta,
  primary,
}: {
  title: string;
  body: string;
  cta: React.ReactNode;
  primary: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-emerald-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{body}</p>
      <div className="mt-6 flex justify-center">{cta}</div>
      <p className="mt-8 text-[11px] text-slate-400">
        Secured with end-to-end encryption · powered by SherpaKeys
      </p>
      {/* prevent unused-var TS noise on primary */}
      <span className="sr-only" style={{ color: primary }}>
        .
      </span>
    </div>
  );
}

function PrivacyStripe({
  primary,
  agencyName,
}: {
  primary: string;
  agencyName: string;
}) {
  return (
    <div
      className="mt-8 flex items-start gap-2 rounded-lg border p-3 text-xs text-emerald-900"
      style={{ background: "#ecfdf5", borderColor: "#a7f3d0" }}
    >
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <div>
        <strong>How this transfer works:</strong>{" "}
        {agencyName} encrypts every credential in their browser before
        it reaches you. SherpaKeys is the vault — we can&apos;t read
        them either. After you create a passphrase, only{" "}
        <strong>you</strong> can decrypt them.
      </div>
      <span className="sr-only" style={{ color: primary }}>
        .
      </span>
    </div>
  );
}

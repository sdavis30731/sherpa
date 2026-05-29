/**
 * Stripe playbook — SHRP-016
 *
 * Written for a non-engineer founder who has shipped a product using AI
 * coding tools. Plain language, no jargon-as-drama, every claim verifiable
 * against the Stripe docs as of May 2026.
 */

import {
  PlaybookSection,
  PlaybookSteps,
  PlaybookList,
  DashboardLink,
  Pitfall,
  Danger,
  KeyChip,
} from "@/components/playbook-parts";
import type { PlaybookMeta } from "@/lib/playbooks";

export const meta: PlaybookMeta = {
  service: "stripe",
  name: "Stripe",
  lastReviewed: "2026-05-28",
  defaultSection: "overview",
};

export default function StripePlaybook() {
  return (
    <>
      <PlaybookSection id="overview" title="Overview">
        <p>
          Stripe issues several different kinds of credentials, and the
          difference between them matters. Pasting the wrong one in the wrong
          place is the most common Stripe mistake on a vibe-coded product.
        </p>

        <p className="font-semibold text-slate-900">The four you&apos;ll meet:</p>
        <PlaybookList>
          <li>
            <KeyChip>sk_live_…</KeyChip> or <KeyChip>sk_test_…</KeyChip> —{" "}
            <strong>Secret key.</strong> Can do anything as your Stripe account.
            Server-side only. Never put this in frontend code or commit it.
          </li>
          <li>
            <KeyChip>pk_live_…</KeyChip> or <KeyChip>pk_test_…</KeyChip> —{" "}
            <strong>Publishable key.</strong> Safe in frontend JavaScript. Lets
            the browser tokenize a card with Stripe.js. Cannot move money on
            its own.
          </li>
          <li>
            <KeyChip>rk_…</KeyChip> — <strong>Restricted key.</strong> A
            scoped subset of the secret key. Recommended whenever your code
            only needs a small part of Stripe (e.g. read-only, or just create
            charges).
          </li>
          <li>
            <KeyChip>whsec_…</KeyChip> — <strong>Webhook signing secret.</strong>{" "}
            Used to verify that a webhook request actually came from Stripe.
            One per endpoint. Without it, an attacker can fake "payment
            successful" events and unlock paid features for free.
          </li>
        </PlaybookList>

        <Pitfall title="Test mode vs live mode is a hard switch.">
          Each kind of key has a <KeyChip>_test_</KeyChip> and a{" "}
          <KeyChip>_live_</KeyChip> version. They live in separate dashboards
          and on separate URLs. Test keys can&apos;t move real money; live
          keys absolutely can. The dashboard toggle in the upper-left of
          Stripe is how you flip between them.
        </Pitfall>
      </PlaybookSection>

      <PlaybookSection id="find" title="Where to find each key">
        <PlaybookList>
          <li>
            <strong>Live secret &amp; publishable keys:</strong>{" "}
            <DashboardLink href="https://dashboard.stripe.com/apikeys">
              dashboard.stripe.com/apikeys
            </DashboardLink>
          </li>
          <li>
            <strong>Test secret &amp; publishable keys:</strong>{" "}
            <DashboardLink href="https://dashboard.stripe.com/test/apikeys">
              dashboard.stripe.com/test/apikeys
            </DashboardLink>
          </li>
          <li>
            <strong>Restricted keys (create or rotate):</strong>{" "}
            <DashboardLink href="https://dashboard.stripe.com/apikeys/create">
              dashboard.stripe.com/apikeys/create
            </DashboardLink>{" "}
            — click &quot;Create restricted key&quot; on the API keys page.
          </li>
          <li>
            <strong>Webhook signing secrets:</strong>{" "}
            <DashboardLink href="https://dashboard.stripe.com/webhooks">
              dashboard.stripe.com/webhooks
            </DashboardLink>{" "}
            — click an endpoint, then &quot;Reveal&quot; under Signing secret.
          </li>
        </PlaybookList>

        <p>
          The secret key is hidden by default. Click <em>Reveal</em> and it
          shows once. Copy it into Sherpa, then close the browser tab — Stripe
          will require you to reveal it again next time.
        </p>
      </PlaybookSection>

      <PlaybookSection id="scopes" title="Recommended scopes (Restricted keys)">
        <p>
          A secret key can do everything in your Stripe account. A restricted
          key only does what you give it permission to do. <strong>Prefer
          restricted keys whenever possible.</strong> If a restricted key is
          ever leaked, the blast radius is smaller.
        </p>

        <p className="font-semibold text-slate-900">Common scope sets:</p>
        <PlaybookList>
          <li>
            <strong>Read-only analytics dashboard.</strong> Resources:{" "}
            <KeyChip>Charges</KeyChip>, <KeyChip>Customers</KeyChip>,{" "}
            <KeyChip>Subscriptions</KeyChip> — all set to{" "}
            <KeyChip>Read</KeyChip>. Nothing else.
          </li>
          <li>
            <strong>Standard checkout backend.</strong>{" "}
            <KeyChip>Customers</KeyChip>: Write,{" "}
            <KeyChip>Checkout Sessions</KeyChip>: Write,{" "}
            <KeyChip>Subscriptions</KeyChip>: Write,{" "}
            <KeyChip>Webhook Endpoints</KeyChip>: Read.
          </li>
          <li>
            <strong>Customer portal backend.</strong>{" "}
            <KeyChip>Customers</KeyChip>: Write,{" "}
            <KeyChip>Billing Portal</KeyChip>: Write — that&apos;s usually all.
          </li>
        </PlaybookList>

        <p>
          When in doubt, start with <em>fewer</em> permissions and add them
          when something breaks. The error messages Stripe returns when a
          restricted key is missing a scope are very clear.
        </p>
      </PlaybookSection>

      <PlaybookSection id="rotation" title="How to rotate">
        <p>
          Stripe is one of the few services that lets you rotate a key with
          zero downtime, by issuing a new key alongside the old one and giving
          you a grace period. Use this — don&apos;t just delete-and-recreate.
        </p>

        <p className="font-semibold text-slate-900">Standard secret key rotation:</p>
        <PlaybookSteps>
          <li>
            Go to{" "}
            <DashboardLink href="https://dashboard.stripe.com/apikeys">
              dashboard.stripe.com/apikeys
            </DashboardLink>
            . Find the secret key. Click the three-dot menu → <em>Roll key…</em>
          </li>
          <li>
            Choose an expiry for the <em>old</em> key — usually 1 day is
            plenty for a personal project, 7 days for anything in production.
            The new key is generated immediately; the old one keeps working
            until expiry.
          </li>
          <li>
            Click <em>Roll key</em>. Stripe reveals the new key once. Paste it
            into Sherpa via the <em>Edit</em> button on this credential — that
            re-encrypts the stored value and records the rotation
            automatically.
          </li>
          <li>
            Update your deployment env vars (Vercel:{" "}
            <DashboardLink href="https://vercel.com/dashboard">
              vercel.com/dashboard
            </DashboardLink>{" "}
            → Project → Settings → Environment Variables) and trigger a
            redeploy. Verify a real or test transaction works.
          </li>
          <li>
            Once you&apos;ve confirmed the new key is in use everywhere, you
            can let the old key expire naturally — or revoke it sooner from
            the same menu.
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">Webhook signing secret rotation:</p>
        <p>
          This one has no built-in grace period — rotating breaks any process
          using the old secret. The safe pattern is to add a <em>second</em>{" "}
          endpoint with the same URL temporarily.
        </p>
        <PlaybookSteps>
          <li>
            Go to{" "}
            <DashboardLink href="https://dashboard.stripe.com/webhooks">
              dashboard.stripe.com/webhooks
            </DashboardLink>
            . Add a new endpoint with the same URL and the same event types.
            It will be issued a fresh <KeyChip>whsec_…</KeyChip>.
          </li>
          <li>
            Update your code to accept either signing secret (verify against
            both, accept if either is valid). Deploy.
          </li>
          <li>
            Once you see traffic on the new endpoint, delete the old one.
            Update your code to only verify against the new secret.
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">Restricted key rotation:</p>
        <p>
          Restricted keys don&apos;t have a built-in roll. The pattern is:
          create a new restricted key with the same scopes, deploy your code
          using it, then delete the old one. Sherpa&apos;s rotation tracker
          will reset when you paste the new value via Edit.
        </p>
      </PlaybookSection>

      <PlaybookSection id="revoke" title="How to revoke if leaked">
        <p>
          If a secret key ended up in a public GitHub commit, a Discord
          message, or anywhere you can&apos;t guarantee was private — assume
          it&apos;s compromised. Act in this order:
        </p>

        <PlaybookSteps>
          <li>
            <strong>Revoke the key immediately.</strong> Open{" "}
            <DashboardLink href="https://dashboard.stripe.com/apikeys">
              dashboard.stripe.com/apikeys
            </DashboardLink>
            , click the three-dot menu next to the key →{" "}
            <em>Delete key</em>. This invalidates it instantly. Your own code
            will start failing — that&apos;s OK and expected.
          </li>
          <li>
            <strong>Create a replacement.</strong> Generate a new secret or
            restricted key with the same purpose.
          </li>
          <li>
            <strong>Update everywhere.</strong> Sherpa (this credential, via
            Edit), Vercel env vars, any other deploy targets, your local{" "}
            <KeyChip>.env.local</KeyChip>, any CI secrets. A redeploy is
            usually needed.
          </li>
          <li>
            <strong>Check for damage.</strong> Open{" "}
            <DashboardLink href="https://dashboard.stripe.com/payments">
              dashboard.stripe.com/payments
            </DashboardLink>{" "}
            and look for charges you don&apos;t recognize. Also check{" "}
            <DashboardLink href="https://dashboard.stripe.com/customers">
              dashboard.stripe.com/customers
            </DashboardLink>{" "}
            for refunds or new customers you didn&apos;t create.
          </li>
          <li>
            <strong>Email Stripe if material.</strong> If you see suspicious
            activity, email <KeyChip>support@stripe.com</KeyChip> with a
            description and the affected key&apos;s ID (the part after
            <KeyChip>sk_live_</KeyChip>). Stripe can review and reverse
            unauthorized charges.
          </li>
        </PlaybookSteps>

        <Danger title="Public GitHub leak — Stripe will sometimes act before you do.">
          GitHub partners with Stripe to scan public commits for live keys.
          If a key shows up, Stripe will typically email you and may rotate
          the key for you automatically. <em>Do not rely on this.</em> Treat
          a leaked key as compromised the moment you notice, and rotate
          yourself.
        </Danger>
      </PlaybookSection>

      <PlaybookSection id="pitfalls" title="Common pitfalls">
        <Pitfall title="Using sk_live_ in development.">
          The single most expensive mistake. Your test code, run with a live
          key, will move real money. Always check the prefix on your secret
          key before any payment-related code runs locally. A helpful pattern:
          have your code refuse to start if <KeyChip>NODE_ENV !== &quot;production&quot;</KeyChip>{" "}
          and the key starts with <KeyChip>sk_live_</KeyChip>.
        </Pitfall>

        <Pitfall title="Webhook secret rotated, code not updated.">
          Stripe will start sending events with a new signature, your code
          will reject them all as invalid, and customer payment state in your
          database will drift out of sync with reality. Always use the
          dual-endpoint rotation pattern in the &quot;How to rotate&quot;
          section.
        </Pitfall>

        <Pitfall title="Publishable key is &quot;public&quot;, but not toothless.">
          A <KeyChip>pk_live_…</KeyChip> can create payment tokens that your
          backend may then charge. If someone hijacks your publishable key,
          they can send tokens of their own cards into your checkout flow —
          and your backend may dutifully charge them. Implement payment
          confirmation logic that verifies the customer matches your
          expected user.
        </Pitfall>

        <Pitfall title="Restricted key permission creep.">
          When you don&apos;t have a scope you need, the temptation is to
          create a new key with all the scopes &quot;just in case&quot;.
          Don&apos;t. Add only the specific permission Stripe&apos;s error
          message asked for.
        </Pitfall>

        <Pitfall title="The Customer Portal also has a secret.">
          The Customer Portal lets your users manage their own subscriptions.
          Its configuration lives at{" "}
          <DashboardLink href="https://dashboard.stripe.com/settings/billing/portal">
            dashboard.stripe.com/settings/billing/portal
          </DashboardLink>
          . There&apos;s no separate API key for the portal itself, but the
          configuration ID can be passed to your code — store it in Sherpa
          under a Custom credential type if you reference it from env vars.
        </Pitfall>
      </PlaybookSection>
    </>
  );
}

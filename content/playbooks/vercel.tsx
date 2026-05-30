/**
 * Vercel playbook — SHRP-019
 *
 * Vercel credentials are less catastrophic than Supabase or Stripe (Vercel
 * itself doesn't move money or hold user data), but a leak of a personal
 * Vercel token can let an attacker deploy malicious code to your production
 * domain. The biggest mistake we see: env var changes don't auto-redeploy,
 * so people rotate a Stripe key and don't realize their app is still using
 * the old one until customers complain.
 */

import {
  PlaybookSection,
  PlaybookSteps,
  PlaybookList,
  DashboardLink,
  Pitfall,
  KeyChip,
} from "@/components/playbook-parts";
import type { PlaybookMeta } from "@/lib/playbooks";

export const meta: PlaybookMeta = {
  service: "vercel",
  name: "Vercel",
  lastReviewed: "2026-05-28",
  defaultSection: "overview",
};

export default function VercelPlaybook() {
  return (
    <>
      <PlaybookSection id="overview" title="Overview">
        <p>
          Vercel has fewer credential types than Stripe or Supabase, but they
          do different things and the mental model matters:
        </p>

        <PlaybookList>
          <li>
            <strong>Personal access token.</strong> Authenticates the Vercel
            CLI as you. Can deploy, change settings, read logs, manage
            projects across all your teams. Most powerful credential here.
            Treat like a GitHub PAT.
          </li>
          <li>
            <strong>Team access token.</strong> Same as personal but scoped
            to a specific team. Use when you want a CI script to manage one
            team without giving it your full account.
          </li>
          <li>
            <strong>Project deploy hook (URL).</strong> A unique URL per
            project that triggers a deploy when POSTed to. Less destructive —
            it can only kick off a deploy, can&apos;t change settings or
            read secrets. Used by webhook integrations (e.g., &quot;rebuild
            when my CMS content changes&quot;).
          </li>
          <li>
            <strong>Environment variables.</strong> Not exactly &quot;Vercel
            credentials&quot;, but the place where YOUR app&apos;s secrets
            (Supabase, Stripe, OpenAI, etc.) live. Vercel itself can decrypt
            and inject them at build/runtime, so they&apos;re only as secure
            as your Vercel account access.
          </li>
        </PlaybookList>

        <Pitfall title="Vercel env vars are not encrypted client-side.">
          Vercel encrypts env vars at rest (using their own keys, server-side),
          but anyone who can read your Vercel project settings can see them
          in plaintext. This is why Sherpa stores credentials encrypted in
          YOUR browser before they ever reach a server — even when those
          credentials are also pasted into Vercel for the app to use.
        </Pitfall>
      </PlaybookSection>

      <PlaybookSection id="find" title="Where to find each key">
        <PlaybookList>
          <li>
            <strong>Personal access tokens:</strong>{" "}
            <DashboardLink href="https://vercel.com/account/settings/tokens">
              vercel.com/account/settings/tokens
            </DashboardLink>{" "}
            (under your personal account, not under a team).
          </li>
          <li>
            <strong>Team access tokens:</strong>{" "}
            <DashboardLink href="https://vercel.com/teams/_/settings/tokens">
              vercel.com → switch to the team → Settings → Tokens
            </DashboardLink>
            . Substitute your team slug in the URL.
          </li>
          <li>
            <strong>Environment variables (per project):</strong>{" "}
            <DashboardLink href="https://vercel.com/dashboard">
              dashboard
            </DashboardLink>{" "}
            → click your project → Settings → Environment Variables. Vercel
            doesn&apos;t have a universal env-var URL because it includes
            your team slug and project slug.
          </li>
          <li>
            <strong>Deploy hooks (per project):</strong> Same path —
            Settings → Git → Deploy Hooks. Each hook has a name and a URL
            that you copy once at creation.
          </li>
          <li>
            <strong>Git integrations / permissions:</strong>{" "}
            <DashboardLink href="https://vercel.com/account/git">
              vercel.com/account/git
            </DashboardLink>{" "}
            — go here if Vercel loses connection to your GitHub repository
            or you need to revoke its access.
          </li>
        </PlaybookList>

        <p>
          Tokens are shown ONCE at creation. Copy them into Sherpa
          immediately. If you lose one, you have to delete it and create a
          new one — Vercel won&apos;t let you re-reveal.
        </p>
      </PlaybookSection>

      <PlaybookSection id="scopes" title="Recommended scopes">
        <p>
          Vercel personal access tokens don&apos;t have fine-grained scopes —
          they&apos;re all-or-nothing across the scopes you select at
          creation. The two knobs you get:
        </p>

        <PlaybookList>
          <li>
            <strong>Scope</strong> — &quot;Full Account&quot; (works for any
            team you belong to) or &quot;Specific Team&quot;. Always pick
            Specific Team if you only need to manage one.
          </li>
          <li>
            <strong>Expiration</strong> — never / 1 day / 7 days / 30 days /
            60 days / 90 days / 1 year. Always pick an expiration. &quot;Never&quot;
            is a footgun.
          </li>
        </PlaybookList>

        <p>
          For deploy hooks, the only thing that limits damage is that they
          can only trigger a deploy — they cannot change code or settings.
          So even if a deploy hook URL leaks, the worst an attacker can do
          is trigger expensive build minutes against your account. Worth
          revoking and replacing if you suspect a leak, but not an emergency.
        </p>
      </PlaybookSection>

      <PlaybookSection id="rotation" title="How to rotate">
        <p>
          Vercel does NOT support overlapping rotation for tokens — when you
          create a new one, the old one is still valid until you explicitly
          delete it. That&apos;s actually nice: deploy the new one first,
          verify it works, then delete the old one.
        </p>

        <p className="font-semibold text-slate-900">Personal / team access token rotation:</p>
        <PlaybookSteps>
          <li>
            Go to{" "}
            <DashboardLink href="https://vercel.com/account/settings/tokens">
              vercel.com/account/settings/tokens
            </DashboardLink>
            . Click <em>Create Token</em>. Give it a name (something like
            &quot;sherpa-2026-q3&quot;), pick the same scope as the old one,
            set an expiration.
          </li>
          <li>
            Copy the new token. Paste into Sherpa via <em>Edit</em> on this
            credential.
          </li>
          <li>
            Update wherever the old token was used — typically a CI script
            or your local Vercel CLI config (
            <KeyChip>~/.local/share/com.vercel.cli</KeyChip>).
          </li>
          <li>
            Test it: run the CI script / the CLI command that needed the
            token, and verify it still works.
          </li>
          <li>
            Go back to{" "}
            <DashboardLink href="https://vercel.com/account/settings/tokens">
              .../tokens
            </DashboardLink>{" "}
            and click <em>Delete</em> next to the OLD token.
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">Deploy hook rotation:</p>
        <PlaybookSteps>
          <li>
            Go to your project → Settings → Git → Deploy Hooks. Click{" "}
            <em>Create Hook</em>, give it a name and pick the branch.
          </li>
          <li>
            Copy the new hook URL. Update wherever it was used (e.g., your
            CMS&apos;s webhook config).
          </li>
          <li>
            Delete the old hook from the same page.
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">Env var rotation:</p>
        <p>
          To rotate something like your Stripe key:
        </p>
        <PlaybookSteps>
          <li>
            Get the new key from Stripe / Supabase / wherever (see THAT
            service&apos;s playbook).
          </li>
          <li>
            Paste the new value into Sherpa via <em>Edit</em>.
          </li>
          <li>
            Update the env var in Vercel: Project → Settings → Environment
            Variables → find the var → click the three-dot menu → <em>Edit</em>.
            Paste the new value.
          </li>
          <li>
            <strong>Critically: trigger a redeploy.</strong> Env var changes do
            NOT auto-redeploy. Go to Deployments → click the three-dot menu
            on the most recent deploy → <em>Redeploy</em>. Wait for it to
            finish.
          </li>
          <li>
            Verify by exercising the feature that uses the key.
          </li>
        </PlaybookSteps>
      </PlaybookSection>

      <PlaybookSection id="revoke" title="How to revoke if leaked">
        <p>
          For personal / team tokens: delete them. The URL is{" "}
          <DashboardLink href="https://vercel.com/account/settings/tokens">
            vercel.com/account/settings/tokens
          </DashboardLink>
          . Deletion is instant.
        </p>

        <p>
          For deploy hooks: same — go to the project&apos;s Deploy Hooks
          settings and delete. Deletion is instant.
        </p>

        <p>
          For env vars: rotate the underlying credential first (in Stripe,
          Supabase, etc.), THEN update the env var, THEN redeploy. Just
          deleting the env var from Vercel doesn&apos;t do anything to the
          credential at the source — anyone with a copy of the value can
          still use it.
        </p>

        <p className="font-semibold text-slate-900">If you suspect someone deployed code on your behalf:</p>
        <PlaybookSteps>
          <li>
            Delete every Vercel token (personal and team) at{" "}
            <DashboardLink href="https://vercel.com/account/settings/tokens">
              .../tokens
            </DashboardLink>
            .
          </li>
          <li>
            Review recent deploys at{" "}
            <DashboardLink href="https://vercel.com/dashboard">
              dashboard
            </DashboardLink>{" "}
            → project → Deployments. Look for deploys you don&apos;t
            recognize. If you find any, roll back to the last known-good
            deploy by clicking it → <em>Promote to Production</em>.
          </li>
          <li>
            Review which GitHub repo Vercel is connected to — confirm it&apos;s
            still yours and hasn&apos;t been redirected to a different repo
            (an obscure attack pattern).
          </li>
          <li>
            Rotate any env vars that may have been exposed in build logs.
            Vercel build logs are visible to anyone with team read access.
          </li>
        </PlaybookSteps>
      </PlaybookSection>

      <PlaybookSection id="pitfalls" title="Common pitfalls">
        <Pitfall title="Env var changes don't auto-redeploy.">
          The most common Vercel mistake. You rotate a Stripe key, paste the
          new value into Vercel, feel productive, walk away. Your live site is
          still using the OLD key, baked into the most recent build. Always
          trigger a redeploy after changing env vars. The Vercel UI does
          show a yellow banner reminding you, but it&apos;s easy to miss.
        </Pitfall>

        <Pitfall title="Production vs Preview vs Development env vars.">
          Vercel splits env vars into three buckets. By default, when you
          add a new variable, it applies to all three. If you want different
          values per environment (e.g., a test Stripe key for Preview, live
          for Production), uncheck the boxes for the environments you
          don&apos;t want. Otherwise your preview branch will charge real
          credit cards.
        </Pitfall>

        <Pitfall title="NEXT_PUBLIC_ prefix is sticky.">
          Any env var prefixed with <KeyChip>NEXT_PUBLIC_</KeyChip> gets
          baked into the client-side JavaScript bundle. That&apos;s safe for
          things designed to be public (Stripe publishable key, Supabase
          anon key), CATASTROPHIC for anything secret (Stripe secret key,
          Supabase service_role). If you set a secret env var with{" "}
          <KeyChip>NEXT_PUBLIC_</KeyChip> by accident and deploy, every
          visitor to your site can read it. The fix is to remove the
          prefix and redeploy — but assume the old value is compromised
          and rotate the underlying credential first.
        </Pitfall>

        <Pitfall title="Logs include env vars on errors.">
          When your server crashes, Vercel&apos;s log output sometimes
          includes the env block that was active. If you have anyone with
          team read access to your project, they can read those logs and
          see your secrets. Rotate any value that appeared in a public
          error trace.
        </Pitfall>

        <Pitfall title="The Vercel CLI caches its token.">
          When you run <KeyChip>vercel login</KeyChip>, the CLI caches your
          token to <KeyChip>~/.local/share/com.vercel.cli/</KeyChip>. If
          you rotate the token in the dashboard, the CLI will start failing
          mysteriously. Fix: <KeyChip>vercel logout</KeyChip>, then{" "}
          <KeyChip>vercel login</KeyChip> again.
        </Pitfall>
      </PlaybookSection>
    </>
  );
}

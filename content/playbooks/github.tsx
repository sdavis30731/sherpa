/**
 * GitHub playbook — SHRP-017
 *
 * Written for the non-engineer founder. GitHub credentials are the ones
 * most often pasted accidentally into the wrong place — README.md commits,
 * Discord screenshots, agent chat windows. We lead with the safest option
 * (fine-grained PATs) and explain why you'd ever use anything else.
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
import type { PlaybookMeta, RotationGuide } from "@/lib/playbooks";

export const meta: PlaybookMeta = {
  service: "github",
  name: "GitHub",
  lastReviewed: "2026-05-28",
  defaultSection: "overview",
};

export const rotationSteps: RotationGuide[] = [
  {
    keyType: "fine_grained_pat",
    title: "GitHub fine-grained PAT",
    dashboardUrl: "https://github.com/settings/personal-access-tokens",
    supportsProgrammaticRotation: false,
    warning: "GitHub does NOT support overlapping rotation. The OLD token stops working the instant you regenerate.",
    steps: [
      "Open github.com/settings/personal-access-tokens.",
      "Click the PAT you want to rotate.",
      "Scroll to the bottom and click 'Regenerate token'. Pick a new expiration (90 days is reasonable).",
      "Copy the new token GitHub reveals once and paste into Sherpa via Edit.",
      "Update wherever the PAT was used (Vercel env vars, GitHub Actions secrets, local .env.local) BEFORE the new token gets used.",
      "Redeploy or restart your services.",
      "Verify by running whatever script or deploy the PAT powered.",
    ],
  },
  {
    keyType: "classic_pat",
    title: "GitHub classic PAT",
    dashboardUrl: "https://github.com/settings/tokens",
    supportsProgrammaticRotation: false,
    warning: "Same as fine-grained: NO overlap. Deploy the new value before relying on it.",
    steps: [
      "Open github.com/settings/tokens.",
      "Click the token to rotate, then 'Regenerate token'.",
      "Copy the new value Github reveals once.",
      "Paste into Sherpa via Edit on this credential.",
      "Update all uses (env vars, CI, scripts) and redeploy.",
      "Verify, then optionally migrate to a fine-grained PAT for future rotations.",
    ],
  },
  {
    keyType: "oauth_secret",
    title: "GitHub OAuth app client secret",
    dashboardUrl: "https://github.com/settings/developers",
    supportsProgrammaticRotation: false,
    steps: [
      "Open github.com/settings/developers.",
      "Click your OAuth app, then 'Generate a new client secret'.",
      "The new secret is shown once. The OLD secret keeps working for 24 hours OR until you click Delete on it.",
      "Paste the new secret into Sherpa via Edit on this credential.",
      "Update wherever it was used and redeploy within the 24-hour overlap window.",
      "Once verified, click Delete next to the old secret on the same page.",
    ],
  },
  {
    keyType: "deploy_key",
    title: "GitHub deploy key (SSH)",
    dashboardUrl: "https://github.com/",
    supportsProgrammaticRotation: false,
    steps: [
      "On the machine that needs access, generate a new SSH keypair: ssh-keygen -t ed25519 -f ~/.ssh/repo_deploy_new",
      "Go to your repo on GitHub → Settings → Deploy keys.",
      "Add the new public key (~/.ssh/repo_deploy_new.pub). Give it the same access (read-only or read-write).",
      "Update your SSH config or CI to use the new private key.",
      "Verify by cloning or pushing.",
      "Delete the OLD deploy key from the same GitHub page.",
      "Store the new private key in Sherpa via Edit on this credential.",
    ],
  },
];

export default function GitHubPlaybook() {
  return (
    <>
      <PlaybookSection id="overview" title="Overview">
        <p>
          GitHub gives you four different ways to authenticate as you. They are
          NOT interchangeable. Picking the right one is the difference between
          &quot;a leak revokes one specific permission&quot; and &quot;a leak
          gives an attacker full control of every repository you own.&quot;
        </p>

        <p className="font-semibold text-slate-900">The four credentials you&apos;ll meet:</p>
        <PlaybookList>
          <li>
            <KeyChip>github_pat_…</KeyChip> — <strong>Fine-grained Personal
            Access Token.</strong> The good one. Lets you specify which
            repositories AND which permissions. Use these by default for
            anything new.
          </li>
          <li>
            <KeyChip>ghp_…</KeyChip> — <strong>Classic Personal Access Token.</strong>{" "}
            Older format. Permissions are scope-based and apply to ALL your
            repositories. Some tools still require classic PATs because
            fine-grained ones don&apos;t support every API yet. Use only when
            forced to.
          </li>
          <li>
            <strong>OAuth App secret.</strong> Used by a third-party application
            (e.g., Vercel) that signs users in via GitHub. Lives in the app
            owner&apos;s dashboard, not yours.
          </li>
          <li>
            <strong>Deploy key.</strong> A per-repository SSH key. Read-only or
            read-write to that repo only. Used by CI/CD systems that need
            to clone but don&apos;t need broad GitHub access.
          </li>
        </PlaybookList>

        <Pitfall title="There&apos;s a fifth thing you&apos;ll see — and probably shouldn&apos;t use.">
          GitHub also offers <strong>password authentication for git</strong>{" "}
          (your account password). It&apos;s deprecated for git operations
          and exists mostly because of legacy tools. If a tutorial tells you
          to use your GitHub password, it&apos;s wrong; use a PAT instead.
        </Pitfall>
      </PlaybookSection>

      <PlaybookSection id="find" title="Where to find each key">
        <PlaybookList>
          <li>
            <strong>Fine-grained Personal Access Tokens:</strong>{" "}
            <DashboardLink href="https://github.com/settings/personal-access-tokens">
              github.com/settings/personal-access-tokens
            </DashboardLink>
          </li>
          <li>
            <strong>Classic Personal Access Tokens:</strong>{" "}
            <DashboardLink href="https://github.com/settings/tokens">
              github.com/settings/tokens
            </DashboardLink>
          </li>
          <li>
            <strong>OAuth Apps you own:</strong>{" "}
            <DashboardLink href="https://github.com/settings/developers">
              github.com/settings/developers
            </DashboardLink>{" "}
            (the OAuth app client secret is shown once at creation; click
            &quot;Generate a new client secret&quot; to roll it).
          </li>
          <li>
            <strong>Authorized third-party apps</strong> (the ones YOU granted
            access to GitHub, like Vercel):{" "}
            <DashboardLink href="https://github.com/settings/applications">
              github.com/settings/applications
            </DashboardLink>{" "}
            — this is where you go to revoke access to a service you no
            longer trust.
          </li>
          <li>
            <strong>Deploy keys</strong> are per-repository, at{" "}
            <KeyChip>github.com/USER/REPO/settings/keys</KeyChip>.
          </li>
        </PlaybookList>

        <p>
          Tokens are shown <em>once</em>, right after you create them, in a
          green-bordered box. Copy them into Sherpa immediately — if you
          navigate away, GitHub won&apos;t show them again and you&apos;ll
          have to generate a new one.
        </p>
      </PlaybookSection>

      <PlaybookSection id="scopes" title="Recommended scopes">
        <p>
          The single biggest improvement you can make in GitHub credential
          security is <strong>switching from classic PATs to fine-grained
          PATs</strong> and giving them only the access they need.
        </p>

        <p className="font-semibold text-slate-900">Fine-grained PAT — common scope sets:</p>
        <PlaybookList>
          <li>
            <strong>Read a single repo from CI:</strong> Repository access →
            Only select repositories → pick the one. Permissions → Contents:
            Read. That&apos;s it.
          </li>
          <li>
            <strong>Push to a single repo from a build script:</strong> Same
            as above plus Contents: Write, Metadata: Read (forced), Pull
            requests: Write if you open PRs.
          </li>
          <li>
            <strong>Use GitHub Actions secrets from a script:</strong> Add
            Actions: Read.
          </li>
          <li>
            <strong>Read your private repo list:</strong> Repository access →
            All repositories, Permissions → Metadata: Read.
          </li>
        </PlaybookList>

        <p className="font-semibold text-slate-900">Classic PAT — minimum-viable scopes:</p>
        <PlaybookList>
          <li>
            For private repo clone/push: <KeyChip>repo</KeyChip> (entire scope
            — there&apos;s no granular option).
          </li>
          <li>
            For public repo read: <KeyChip>public_repo</KeyChip>.
          </li>
          <li>
            For managing GitHub Actions: <KeyChip>workflow</KeyChip>.
          </li>
        </PlaybookList>

        <Pitfall title="Classic PATs are blunt instruments.">
          If you give a classic PAT the <KeyChip>repo</KeyChip> scope, it can
          read and write EVERY private repository you own — including ones
          the script that&apos;s using it doesn&apos;t know about. That&apos;s
          why fine-grained PATs exist and why we recommend them.
        </Pitfall>
      </PlaybookSection>

      <PlaybookSection id="rotation" title="How to rotate">
        <p>
          GitHub does NOT support overlapping (zero-downtime) rotation for
          PATs. The pattern is to issue a new one, switch your code to use
          it, and then revoke the old one.
        </p>

        <p className="font-semibold text-slate-900">Fine-grained PAT rotation:</p>
        <PlaybookSteps>
          <li>
            Go to{" "}
            <DashboardLink href="https://github.com/settings/personal-access-tokens">
              github.com/settings/personal-access-tokens
            </DashboardLink>
            . Click on the PAT you want to rotate.
          </li>
          <li>
            Scroll to the bottom and click <em>Regenerate token</em>. Pick a new
            expiration (90 days is reasonable for ongoing use). Confirm.
          </li>
          <li>
            GitHub shows the new token ONCE in a green box. Copy it
            immediately and paste into Sherpa via <em>Edit</em> on this
            credential. The old token is invalidated the instant you click
            Regenerate.
          </li>
          <li>
            Update wherever this PAT was being used (Vercel env vars, GitHub
            Actions secrets, your local <KeyChip>.env.local</KeyChip>) and
            redeploy / restart so the new token is in use.
          </li>
          <li>
            Verify it works by triggering whatever the PAT does (a deploy, a
            script run, an API call).
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">Classic PAT rotation:</p>
        <p>
          Same flow as above, at{" "}
          <DashboardLink href="https://github.com/settings/tokens">
            github.com/settings/tokens
          </DashboardLink>
          . When you regenerate, the old one stops working immediately, so
          deploy the new one BEFORE the old one stops being needed.
        </p>

        <p className="font-semibold text-slate-900">OAuth App secret rotation:</p>
        <p>
          From{" "}
          <DashboardLink href="https://github.com/settings/developers">
            github.com/settings/developers
          </DashboardLink>
          , click your OAuth app, then <em>Generate a new client secret</em>.
          The new secret is shown once. The old secret keeps working for
          24 hours OR until you click <em>Delete</em> next to it — whichever
          is first. Use the 24-hour window to deploy the new one.
        </p>
      </PlaybookSection>

      <PlaybookSection id="revoke" title="How to revoke if leaked">
        <p>
          If a PAT or OAuth secret ended up in a public commit, a screenshot,
          or anywhere it shouldn&apos;t have — treat it as compromised
          immediately.
        </p>

        <PlaybookSteps>
          <li>
            <strong>Revoke the token.</strong> Open{" "}
            <DashboardLink href="https://github.com/settings/personal-access-tokens">
              github.com/settings/personal-access-tokens
            </DashboardLink>{" "}
            (or{" "}
            <DashboardLink href="https://github.com/settings/tokens">
              .../settings/tokens
            </DashboardLink>{" "}
            for classic). Click the token → <em>Delete</em>. It stops working
            instantly. Your own code will start failing — that&apos;s expected.
          </li>
          <li>
            <strong>Create a replacement</strong> with the same scopes
            (preferably fine-grained, even if the old one was classic).
          </li>
          <li>
            <strong>Update everywhere.</strong> Sherpa (this credential, via
            Edit), Vercel env vars, GitHub Actions secrets, local{" "}
            <KeyChip>.env.local</KeyChip>, any CI secrets.
          </li>
          <li>
            <strong>Check for damage.</strong> Open{" "}
            <DashboardLink href="https://github.com/settings/security-log">
              github.com/settings/security-log
            </DashboardLink>{" "}
            and look for activity you don&apos;t recognize: pushes, branch
            creations, settings changes, repo deletions.
          </li>
          <li>
            <strong>Force-revoke third-party authorizations</strong> if the
            leaked credential was an OAuth secret. At{" "}
            <DashboardLink href="https://github.com/settings/applications">
              github.com/settings/applications
            </DashboardLink>
            , revoke anything that used the compromised secret.
          </li>
        </PlaybookSteps>

        <Danger title="GitHub secret scanning will sometimes act before you do.">
          GitHub scans every public commit, gist, and issue for known token
          formats. If a <KeyChip>ghp_…</KeyChip> or <KeyChip>github_pat_…</KeyChip>{" "}
          shows up in a public location, GitHub will revoke it automatically
          and email you. <em>Do not rely on this.</em> Treat any leak as
          compromised the moment you spot it and rotate yourself.
        </Danger>
      </PlaybookSection>

      <PlaybookSection id="pitfalls" title="Common pitfalls">
        <Pitfall title="Pasting a PAT into chat with an AI agent.">
          The most common vibe-coder mistake. Once a PAT is in an agent&apos;s
          context window, you have to assume it&apos;s in their training data,
          their logs, and possibly their model provider&apos;s telemetry.
          Rotate it. The whole point of Sherpa&apos;s MCP integration
          (coming soon) is that the agent never sees the token to begin with.
        </Pitfall>

        <Pitfall title="Committing .env files to public repos.">
          If your <KeyChip>.env</KeyChip> with a GitHub PAT ends up in a
          public commit, GitHub&apos;s secret scanning may revoke the token
          automatically — but the commit is still in the public history and
          anyone could have copied it before the revoke. Use{" "}
          <KeyChip>.gitignore</KeyChip> to keep <KeyChip>.env</KeyChip> out
          of git. (Sherpa&apos;s repo already does this; check yours.)
        </Pitfall>

        <Pitfall title="The 'Personal' in PAT is misleading for shared apps.">
          PATs are tied to your personal GitHub account. If you build a
          product and use your PAT to deploy it, then leave the company /
          delete your account / take a long vacation, the deploys break.
          For real production apps, use a GitHub App or a dedicated bot
          account, not a personal PAT.
        </Pitfall>

        <Pitfall title="Token expiration sneaks up on you.">
          Fine-grained PATs require an expiration date (max 1 year). The
          night the token expires, the deploys start failing. Sherpa&apos;s
          rotation tracker will warn you — but only if you set the
          appropriate <KeyChip>last_rotated_at</KeyChip> when you create the
          credential. The default in Sherpa is &quot;just now,&quot; which
          will give you the right reminder ~90 days out.
        </Pitfall>

        <Pitfall title="Deploy keys are per-repo, not per-org.">
          A deploy key for repo A cannot access repo B. If you need access to
          multiple repos from one machine, use a machine-user PAT, or set up
          multiple deploy keys. SSH gets confused if you have several deploy
          keys configured for github.com — use a per-repo SSH config block to
          tell git which key to use for which repo.
        </Pitfall>
      </PlaybookSection>
    </>
  );
}

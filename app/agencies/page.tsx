import Link from "next/link";
import {
  FileCheck2,
  KeyRound,
  Users,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  ClipboardList,
  Lock,
  Github,
} from "lucide-react";

export const metadata = {
  title: "SherpaKeys for Agencies — Take on client credentials. Not client risk.",
  description:
    "Your client's Stripe, Supabase, and AWS keys — usable by Claude, Cursor, and Codex while you build. Never visible to them. Fully accounted for at handoff, with a branded Go-Live Custody Record your client can actually trust.",
};

export default function AgenciesPage() {
  return (
    <main className="mx-auto min-h-full max-w-4xl px-6 pb-24">
      {/* Top nav */}
      <nav className="flex items-center justify-between py-5">
        <Link href="/" className="text-lg font-bold tracking-tight">
          <span className="text-slate-900">Sherpa</span>
          <span className="text-sherpa-500">Keys</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            href="/"
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-sherpa-500 px-4 py-2 font-semibold text-white shadow-sm hover:bg-sherpa-600"
          >
            Sign up free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mt-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-sherpa-50 px-3 py-1 text-xs font-medium text-sherpa-700">
          <Users className="h-3.5 w-3.5" /> Credential infrastructure for
          client work
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          Take on client credentials.
          <br />
          <span className="text-slate-500">Not client risk.</span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-600">
          Your client&apos;s Stripe key, Supabase service_role, AWS credentials
          — usable by Claude, Cursor, and Codex while you build. Never visible
          to them. Fully accounted for when you hand off.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sherpa-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
          >
            <KeyRound className="h-4 w-4" /> Start a client workspace — free
          </Link>
          <Link
            href="/sample-custody-record.html"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <FileCheck2 className="h-4 w-4" /> See a sample Go-Live Custody Record
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          Browser-encrypted vault · Every access logged · Open-source firewall
          (MIT)
        </p>
      </section>

      {/* Headaches */}
      <Section
        eyebrow="Client-work headaches"
        title="You've lived at least one of these."
      >
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PainCard title={<>&ldquo;The client emailed us their live Stripe key.&rdquo;</>}>
            It&apos;s in their sent folder, your inbox, and your
            contractor&apos;s forwarded thread. Forever. There is no
            professional way to un-send a secret.
          </PainCard>
          <PainCard title={<>&ldquo;Did your AI tools see our keys?&rdquo;</>}>
            Your client read an article about AI agents leaking credentials.
            You ship with Cursor and Claude every day. You need a better
            answer than &ldquo;we&apos;re careful.&rdquo;
          </PainCard>
          <PainCard title={<>&ldquo;Handoff day. No receipts.&rdquo;</>}>
            The project&apos;s done. The client asks what was accessed, what
            was rotated, and what you still have. Right now the honest answer
            is a shrug and a Notion page.
          </PainCard>
          <PainCard title={<>&ldquo;Three clients. Thirty keys. One folder of .env files.&rdquo;</>}>
            Client A&apos;s keys one tab away from Client B&apos;s. One wrong
            paste in one wrong chat, and you&apos;re writing the worst email
            of your year.
          </PainCard>
        </div>
      </Section>

      {/* How it works */}
      <Section
        eyebrow="The workflow"
        title="Client keeps control. You keep moving. Everyone keeps receipts."
      >
        <ol className="mt-4 space-y-5">
          <FlowStep
            step={1}
            title="Intake"
            body="The client adds their credentials to a dedicated workspace — encrypted in their browser before anything leaves it — or you run intake together on a call. Either way: no keys in email, Slack, or a shared doc, ever."
          />
          <FlowStep
            step={2}
            title="Build"
            body="Your team ships with Claude, Cursor, or Codex through the SherpaKeys firewall. The AI asks for the API call; SherpaKeys makes it server-side and returns the response. Reads flow silently. Anything that moves money or data pauses for approval. Every call lands in the audit log with a timestamp and an actor."
          />
          <FlowStep
            step={3}
            title="Handoff"
            body="On go-live day you deliver a branded Go-Live Custody Record: every credential inventoried, risk-scored, and accounted for. Rotation done, your access revoked, the audit log exported. The client signs off knowing exactly what happened — because it's all written down."
          />
        </ol>
      </Section>

      {/* The deliverable */}
      <Section
        eyebrow="The Go-Live Custody Record"
        title="The handoff document that makes you look like the bigger agency."
      >
        <p>
          Every project ends with a report carrying your logo: the full
          credential inventory, risk scores, misconfiguration findings, what
          was rotated, what was revoked, and a complete access history.
          It&apos;s the difference between &ldquo;trust us, we cleaned
          up&rdquo; and a document your client can file, forward to their
          accountant, or show their next developer.
        </p>
        <ul className="mt-5 space-y-2.5 text-base text-slate-800">
          <Bullet>
            <strong className="font-semibold">Your branding, not ours</strong>{" "}
            — white-label reports on the Agency tier.
          </Bullet>
          <Bullet>
            Credential inventory with per-key risk scoring — the same engine
            as the{" "}
            <Link
              href="/#secured"
              className="font-medium text-sherpa-600 hover:underline"
            >
              Go-Live Check
            </Link>
            .
          </Bullet>
          <Bullet>
            Rotation and revocation checklist, completed and timestamped.
          </Bullet>
          <Bullet>
            Full audit log export — every access, every approval, every actor.
          </Bullet>
        </ul>
        <Link
          href="/sample-custody-record.html"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <FileCheck2 className="h-4 w-4" /> See a sample report
        </Link>
      </Section>

      {/* Trust block */}
      <Section
        eyebrow="Straight answers"
        title="We'll tell you exactly what we can and can't see."
      >
        <p>
          The firewall, the cryptography, and the approval flow are
          MIT-licensed on GitHub — your client&apos;s security person can read
          every line. Credentials are encrypted in the browser; at rest, the
          vault is zero-knowledge. During an active agent call, the server
          decrypts that one credential just long enough to make the request,
          then zeros it. The model never sees plaintext. That&apos;s the
          honest tradeoff, and it&apos;s documented in full in our threat
          model.
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <Link
            href="/security"
            className="inline-flex items-center gap-1.5 font-medium text-sherpa-600 hover:underline"
          >
            <Lock className="h-4 w-4" /> Security architecture
          </Link>
          <a
            href="https://github.com/sdavis30731/sherpa"
            className="inline-flex items-center gap-1.5 font-medium text-sherpa-600 hover:underline"
          >
            <Github className="h-4 w-4" /> Read the code on GitHub
          </a>
        </div>
      </Section>

      {/* Founding agencies */}
      <section className="mt-20 rounded-2xl border border-sherpa-200 bg-gradient-to-br from-sherpa-50 to-white p-8">
        <p className="text-xs font-semibold uppercase tracking-wide text-sherpa-600">
          Limited — first cohort
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          We&apos;re onboarding 10 founding agencies.
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700">
          Use SherpaKeys on a real client project. Get Agency-tier features —
          multi-client workspaces, white-label branding, branded Go-Live
          Reports — free for 3 months, and a founding-agency price after. In
          exchange: a 30-minute call after your first handoff, and honest
          feedback on the report your client received.
        </p>
        <ul className="mt-5 space-y-2.5 text-base text-slate-800">
          <Bullet>
            Built for 2–8 person shops that take possession of client
            production credentials and ship with AI tools.
          </Bullet>
          <Bullet>
            Agency tier is normally $299/month. Founding agencies lock a lower
            rate, permanently.
          </Bullet>
        </ul>
        <Link
          href="/pro-waitlist?tier=agency"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-md bg-sherpa-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
        >
          <ClipboardList className="h-4 w-4" /> Apply as a founding agency
        </Link>
      </section>

      {/* What this is not */}
      <Section eyebrow="Honesty" title="What this is — and isn't.">
        <ul className="space-y-3 text-base text-slate-700">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              <strong>It is a controlled handoff workflow.</strong> Your
              client keeps ownership of their credentials; you keep a logged,
              revocable working window — and proof of both.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>It is not a compliance certification.</strong> The
              Go-Live Custody Record documents what happened in SherpaKeys — it
              doesn&apos;t audit your client&apos;s whole stack, and it
              isn&apos;t a SOC 2.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>It is not for what you ship.</strong> SherpaKeys sits
              between your AI tools and your client&apos;s APIs while you
              build — it&apos;s not a runtime secrets manager for the app you
              deliver.
            </span>
          </li>
        </ul>
      </Section>

      {/* Final CTA */}
      <section className="mt-20 rounded-2xl border border-sherpa-200 bg-gradient-to-br from-sherpa-50 to-white p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          The next client kickoff is your chance to look different.
        </h2>
        <p className="mt-2 text-slate-600">
          Set up the workspace before the kickoff call. Walk the client
          through it live. That five minutes is worth more than your portfolio
          page.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sherpa-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
          >
            <KeyRound className="h-4 w-4" /> Start a client workspace — free
          </Link>
          <Link
            href="/sample-custody-record.html"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            See a sample report
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
        <p>
          Built for the shops that hold other people&apos;s keys — and want to
          be able to prove they held them well.
        </p>
      </footer>
    </main>
  );
}

// ---------------- Small components ----------------

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-20">
      <p className="text-xs font-semibold uppercase tracking-wide text-sherpa-600">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h2>
      <div className="mt-5 max-w-3xl text-base leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

function PainCard({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  );
}

function FlowStep({
  step,
  title,
  body,
}: {
  step: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-4">
      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sherpa-500 text-base font-bold text-white">
        {step}
      </span>
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{body}</p>
      </div>
    </li>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Server,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Bot,
} from "lucide-react";

export const metadata = {
  title: "Security — SherpaKeys",
  description:
    "How SherpaKeys protects your API keys: a zero-knowledge browser-encrypted vault, plus a mediated MCP agent bridge that decrypts server-side only long enough to make a call and never lets AI models see plaintext. AES-256-GCM, Argon2id, BIP-39 recovery.",
};

export default function SecurityPage() {
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
            Join waitlist
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mt-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          <ShieldCheck className="h-3.5 w-3.5" /> Zero-knowledge vault ·
          Mediated agent bridge
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
          We can&apos;t read your vault.
          <br />
          <span className="text-slate-500">
            We mediate every agent call.
          </span>
        </h1>
        <p className="mt-5 max-w-3xl text-lg text-slate-600">
          SherpaKeys is built two ways at once. The <strong>vault</strong> is
          zero-knowledge — even our own database administrators can&apos;t
          decrypt your credentials. The <strong>agent bridge</strong> is
          mediated — when Claude or Cursor needs to call Stripe through us,
          we decrypt server-side only long enough to make the call, then
          zero the key. The model never sees plaintext. This page walks
          through both — because security pages with no math deserve no
          trust.
        </p>
      </section>

      {/* TL;DR */}
      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
          TL;DR for the busy
        </h2>
        <ul className="mt-4 space-y-2.5 text-base text-slate-800">
          <Bullet>
            Your master passphrase{" "}
            <strong className="font-semibold">never leaves your device</strong>
            . We literally do not have it.
          </Bullet>
          <Bullet>
            Every credential is encrypted in your browser with{" "}
            <span className="font-mono text-sm">AES-256-GCM</span> before it
            reaches us. By the time it hits the database, it&apos;s ciphertext.
          </Bullet>
          <Bullet>
            The key that encrypts your data is{" "}
            <em>derived</em> from your passphrase using{" "}
            <span className="font-mono text-sm">Argon2id</span> — the
            algorithm that won the Password Hashing Competition, tuned for
            modern hardware.
          </Bullet>
          <Bullet>
            If our database leaked tomorrow, the attacker would get a list of
            email addresses and gibberish. No keys. No way to brute-force a
            strong passphrase in any human lifetime.
          </Bullet>
          <Bullet>
            When Claude or Cursor calls Stripe through SherpaKeys, we decrypt
            server-side only long enough to make the API call.{" "}
            <strong className="font-semibold">
              The AI never sees the plaintext secret.
            </strong>
          </Bullet>
        </ul>
      </section>

      {/* Section 1: The architecture in plain English */}
      <Section
        eyebrow="The big idea"
        title="Zero-knowledge, in one paragraph"
      >
        <p>
          Zero-knowledge means the encryption keys exist only on your
          devices, derived from a passphrase you alone know. We store
          ciphertext and metadata. That&apos;s it. The encryption keys never
          touch our servers, so no insider, no compromised admin, and no
          subpoena can force us to hand over what we don&apos;t have. This
          architecture has been used by serious security products for over
          a decade — SherpaKeys applies it specifically to developer
          credentials.
        </p>
        <p className="mt-4">
          What it costs you: <strong>if you forget your passphrase and
          lose your recovery code, your data is gone.</strong> We can&apos;t
          email you a reset link, because we don&apos;t have the key. This
          is the tradeoff that makes the security real.
        </p>
      </Section>

      {/* Section 2: The crypto stack */}
      <Section eyebrow="The crypto" title="The actual algorithms we use">
        <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CryptoCard
            icon={<KeyRound className="h-5 w-5" />}
            label="Key derivation"
            value="Argon2id"
            detail="t=3, m=64MiB, p=1 — winner of the Password Hashing Competition. Tuned to make a brute-force attempt on a strong passphrase take centuries on commodity hardware."
          />
          <CryptoCard
            icon={<Lock className="h-5 w-5" />}
            label="Symmetric encryption"
            value="AES-256-GCM"
            detail="The same algorithm that protects HTTPS, U.S. classified data, and most enterprise vaults. 12-byte random IVs per encryption. Authenticated — tampering with ciphertext fails decryption loudly."
          />
          <CryptoCard
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Key wrapping"
            value="Per-credential AES"
            detail="Each credential is encrypted with its own AES key, which is itself encrypted by a project key, which is encrypted by your vault key. Compromising one entry doesn't cascade to the others."
          />
          <CryptoCard
            icon={<Server className="h-5 w-5" />}
            label="Recovery"
            value="BIP-39 (12 words)"
            detail="The same recovery format used by Bitcoin wallets. 12 human-readable words encode enough entropy that nobody is brute-forcing it. Memorize them, or store them somewhere offline."
          />
        </div>
      </Section>

      {/* Section 3: What it looks like in practice */}
      <Section
        eyebrow="The flow"
        title="What happens when you save a credential"
      >
        <ol className="mt-4 space-y-5">
          <FlowStep
            step={1}
            title="You enter your passphrase on first unlock"
            body="Your browser runs Argon2id on the passphrase + a per-user salt we store. The output is your vault key — 256 bits of entropy that exist only in your tab's memory."
          />
          <FlowStep
            step={2}
            title="You paste a credential"
            body="Before any network request, your browser generates a fresh 12-byte IV and AES-256-GCM-encrypts the credential value with your vault key (well, with a derived per-credential key wrapped by the vault key — but you get the idea)."
          />
          <FlowStep
            step={3}
            title="The ciphertext travels to our server"
            body="Over HTTPS. Our server receives a base64 blob and stores it. We never see the plaintext, the IV alone is useless, and the vault key never left your browser."
          />
          <FlowStep
            step={4}
            title="When you reveal a key, it's decrypted in your browser"
            body="The encrypted blob comes back, your browser decrypts it locally, displays it for the configured reveal window (10 seconds by default), and zeroes the variable when it's done."
          />
        </ol>
      </Section>

      {/* Section 4: The MCP carve-out */}
      <Section
        eyebrow="The agent bridge"
        title="How Claude can use a key without seeing it"
      >
        <p>
          Zero-knowledge would normally mean agents can&apos;t use your keys
          either — because there&apos;s no plaintext on the server to call
          Stripe with. So we added a careful escape hatch: the{" "}
          <strong className="font-semibold">MCP agent session</strong>.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Box
            tone="info"
            title="The setup (once)"
            body="When you connect Cowork/Cursor/Codex to SherpaKeys, your browser unwraps an ephemeral agent session key and seals it with a server-held master key (AGENT_SESSION_MASTER_KEY). The sealed blob is stored. Your browser key is gone."
          />
          <Box
            tone="info"
            title="The call (every time)"
            body="When the agent calls sherpa_call_api, we unseal the session key, use it to decrypt only the credential needed for that call, make the API request, and zero the key. The agent receives the API response. It never receives the secret."
          />
        </div>
        <p className="mt-5 text-sm text-slate-600">
          The tradeoff: agent sessions trust our server slightly more than
          your direct vault access does. You can revoke any agent token
          instantly, every call is rate-limited, and every call appears in
          your activity log with the prompt that triggered it. If you never
          enable an agent session, this code path is never used.
        </p>
      </Section>

      {/* Section 5: What we don't do (transparency) */}
      <Section eyebrow="Honesty" title="What SherpaKeys is NOT">
        <ul className="space-y-3 text-base text-slate-700">
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Not a password recovery service.</strong> Forget your
              passphrase and lose your recovery words and your data is gone.
              That&apos;s the cost of zero-knowledge.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Not a substitute for HSMs.</strong> If you&apos;re
              storing nuclear launch codes or running a publicly-traded
              fintech, you need a hardware security module, not a SaaS vault.
              SherpaKeys is for the credentials a solo founder actually has.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <span>
              <strong>Not invincible if your laptop is compromised.</strong>{" "}
              If malware on your device steals your passphrase, no
              cryptography protects you. Treat your device security
              accordingly.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              <strong>We do publish what we&apos;ve learned.</strong>{" "}
              Discovered a vulnerability? Email{" "}
              <a
                href="mailto:security@sherpakeys.com"
                className="font-medium text-sherpa-600 hover:underline"
              >
                security@sherpakeys.com
              </a>{" "}
              or open a private advisory at{" "}
              <a
                href="https://github.com/sdavis30731/sherpa/security/advisories/new"
                className="font-medium text-sherpa-600 hover:underline"
              >
                github.com/sdavis30731/sherpa
              </a>
              . Responsible disclosure gets credited in our changelog.
            </span>
          </li>
        </ul>
      </Section>

      {/* CTA */}
      <section className="mt-20 rounded-2xl border border-sherpa-200 bg-gradient-to-br from-sherpa-50 to-white p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-900">
          Ready to put your keys somewhere safe?
        </h2>
        <p className="mt-2 text-slate-600">
          Free for your first app, permanently. Same browser-encryption on
          every tier.
        </p>
        <Link
          href="/signup"
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-md bg-sherpa-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
        >
          <KeyRound className="h-4 w-4" /> Get started, free
        </Link>
      </section>

      {/* Footer */}
      <footer className="mt-16 border-t border-slate-200 pt-8 text-center text-xs text-slate-400">
        <p>
          Built for the people who scaled Everest the first time out with
          Cowork, Cursor, Codex, or Bolt.
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      <span>{children}</span>
    </li>
  );
}

function CryptoCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sherpa-50 text-sherpa-500">
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <div className="mt-3 font-mono text-lg font-bold text-slate-900">
        {value}
      </div>
      <p className="mt-2 text-sm text-slate-600">{detail}</p>
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

function Box({
  tone,
  title,
  body,
}: {
  tone: "info" | "warn";
  title: string;
  body: string;
}) {
  const colors =
    tone === "info"
      ? "border-sherpa-200 bg-sherpa-50/60"
      : "border-amber-200 bg-amber-50";
  const iconColor = tone === "info" ? "text-sherpa-500" : "text-amber-500";
  return (
    <div className={`rounded-2xl border p-5 ${colors}`}>
      <div className="flex items-center gap-2">
        <Bot className={`h-4 w-4 ${iconColor}`} />
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-slate-700">{body}</p>
    </div>
  );
}

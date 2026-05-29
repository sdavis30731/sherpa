import Link from "next/link";
import { ShieldCheck, KeyRound, Bot } from "lucide-react";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-sherpa-50 px-3 py-1 text-xs font-medium text-sherpa-700">
        <ShieldCheck className="h-3.5 w-3.5" /> Research preview
      </div>
      <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
        The keychain for <span className="text-sherpa-500">vibe coders</span>.
      </h1>
      <p className="mt-6 max-w-2xl text-lg text-slate-600">
        One safe place for every API key. Step-by-step rotation guides. Your AI agents
        can use them without ever seeing them.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/signup"
          className="rounded-md bg-sherpa-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
        >
          Get started — free for your first project
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Log in
        </Link>
      </div>

      <div className="mt-20 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
        <Pillar
          icon={<KeyRound className="h-6 w-6" />}
          title="Vault"
          body="Encrypted in your browser before it ever leaves. We store ciphertext only."
        />
        <Pillar
          icon={<ShieldCheck className="h-6 w-6" />}
          title="Playbooks"
          body="Per-service guides for finding, rotating, and revoking every kind of key."
        />
        <Pillar
          icon={<Bot className="h-6 w-6" />}
          title="Agent Bridge"
          body="Claude, Cursor and Codex use your keys without ever seeing them."
        />
      </div>
    </main>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sherpa-50 text-sherpa-500">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{body}</p>
    </div>
  );
}

"use client";

/**
 * Pro waitlist form — client island.
 *
 * Posts to /api/pro-waitlist on submit. On success, renders an inline
 * thank-you state. Treats "already on list" as success silently (the
 * API never reveals which emails are already registered).
 */

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const TEAM_SIZES = ["1-5", "6-20", "21-100", "100+"] as const;

const TOOLS = [
  "Cursor",
  "Cowork",
  "Claude Desktop",
  "Claude Code",
  "Codex",
  "Bolt",
  "Other",
] as const;

export function ProWaitlistForm() {
  const [state, setState] = React.useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [error, setError] = React.useState<string | null>(null);

  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [company, setCompany] = React.useState("");
  const [teamSize, setTeamSize] = React.useState<string>("");
  const [tools, setTools] = React.useState<string[]>([]);
  const [useCase, setUseCase] = React.useState("");

  function toggleTool(tool: string) {
    setTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool],
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/pro-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          company: company || undefined,
          team_size: teamSize || undefined,
          tools: tools.length > 0 ? tools : undefined,
          use_case: useCase || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">
          You&apos;re on the list.
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          We&apos;ll email you at{" "}
          <strong className="font-semibold text-slate-800">{email}</strong> as
          Pro features ship. If you mentioned anything specific in the form,
          we may also reach out to ask more about it — your input shapes what
          we build.
        </p>
        <p className="mt-6 text-xs text-slate-500">
          In the meantime, the free tier and the open-source MCP server are
          live today. Use them however you want.
        </p>
      </div>
    );
  }

  const submitting = state === "submitting";

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Email — required */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-slate-900"
        >
          Work email <span className="text-red-500">*</span>
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourcompany.com"
          className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-2 focus:ring-sherpa-500/40"
        />
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-semibold text-slate-900"
        >
          Your name <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Steve Davis"
          className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-2 focus:ring-sherpa-500/40"
        />
      </div>

      {/* Company */}
      <div>
        <label
          htmlFor="company"
          className="block text-sm font-semibold text-slate-900"
        >
          Company or team{" "}
          <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="company"
          type="text"
          autoComplete="organization"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="EcoVerse, Vercel, Stripe — wherever AI agents need to play safely"
          className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-2 focus:ring-sherpa-500/40"
        />
      </div>

      {/* Team size */}
      <div>
        <span className="block text-sm font-semibold text-slate-900">
          Team size <span className="text-slate-400">(optional)</span>
        </span>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TEAM_SIZES.map((size) => (
            <button
              type="button"
              key={size}
              onClick={() => setTeamSize(teamSize === size ? "" : size)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                teamSize === size
                  ? "border-sherpa-500 bg-sherpa-50 text-sherpa-700 ring-2 ring-sherpa-500/40"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Tools used */}
      <div>
        <span className="block text-sm font-semibold text-slate-900">
          AI tools your team uses{" "}
          <span className="text-slate-400">(optional)</span>
        </span>
        <div className="mt-2 flex flex-wrap gap-2">
          {TOOLS.map((tool) => (
            <button
              type="button"
              key={tool}
              onClick={() => toggleTool(tool)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tools.includes(tool)
                  ? "border-sherpa-500 bg-sherpa-50 text-sherpa-700 ring-1 ring-sherpa-500/40"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>

      {/* Use case */}
      <div>
        <label
          htmlFor="use_case"
          className="block text-sm font-semibold text-slate-900"
        >
          What do you most want Pro to do for your team?{" "}
          <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          id="use_case"
          rows={3}
          value={useCase}
          onChange={(e) => setUseCase(e.target.value)}
          maxLength={2000}
          placeholder="e.g. centralized approval queue in Slack, audit log export for SOC2, shared vault across our engineering team..."
          className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-2 focus:ring-sherpa-500/40"
        />
        <p className="mt-1 text-xs text-slate-500">
          Your answer here directly shapes the feature roadmap. We read these.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || !email}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-sherpa-500/30 transition hover:shadow-md hover:shadow-sherpa-500/40 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
          </>
        ) : (
          <>Join the Pro early-access list</>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        We won&apos;t sell your email. We won&apos;t spam you. We&apos;ll email
        you when Pro features ship and may follow up to ask about your needs.
      </p>
    </form>
  );
}

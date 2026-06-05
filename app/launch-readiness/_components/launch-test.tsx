"use client";

/**
 * LaunchTest — the interactive 10-question test island.
 *
 * State model is intentionally minimal: an array of "yes" | "no" | null
 * for the 10 questions. The score band updates live as the visitor
 * answers; the share UI + CTA appear once all 10 are answered.
 *
 * No backend. No PII captured. This page is shareable as-is.
 */

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  RotateCcw,
} from "lucide-react";

interface Question {
  id: number;
  text: string;
}

const QUESTIONS: ReadonlyArray<Question> = [
  {
    id: 1,
    text: "Does the client own the production Stripe account?",
  },
  {
    id: 2,
    text: "Does the client own the production hosting account (Vercel, Netlify, Render, etc.)?",
  },
  {
    id: 3,
    text: "Does the client own the domain registrar account?",
  },
  {
    id: 4,
    text: "Does the client control DNS access?",
  },
  {
    id: 5,
    text: "Are production API keys stored in a real vault — not in Slack, email, Notion, or text messages?",
  },
  {
    id: 6,
    text: "Have you scanned git history for accidentally-committed secrets?",
  },
  {
    id: 7,
    text: "Have former freelancers and contractors been removed from production systems?",
  },
  {
    id: 8,
    text: "Are OpenAI / Anthropic / other AI API keys owned by the client — not a developer's personal account?",
  },
  {
    id: 9,
    text: "Is there a written handoff record showing who owns each critical credential?",
  },
  {
    id: 10,
    text: "Has someone reviewed admin access across Stripe, GitHub, hosting, DNS, analytics, and AI tools before launch?",
  },
];

type Answer = "yes" | "no" | null;

interface Band {
  range: [number, number];
  label: string;
  emoji: string;
  bg: string;
  ring: string;
  text: string;
  accent: string;
  message: string;
  shortMessage: string;
}

const BANDS: ReadonlyArray<Band> = [
  {
    range: [9, 10],
    label: "Launch-ready",
    emoji: "🟢",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    text: "text-emerald-900",
    accent: "text-emerald-700",
    message:
      "Clean custody. Nice work. You've earned a quiet launch day — the kind where no one calls you at 11pm asking who has the Stripe login.",
    shortMessage: "Clean custody. Nice work.",
  },
  {
    range: [6, 8],
    label: "Almost there",
    emoji: "🟡",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    text: "text-amber-900",
    accent: "text-amber-700",
    message:
      "A few loose ends before go-live. Worth a half-day to tidy up before the client signs the SOW.",
    shortMessage: "A few loose ends before go-live.",
  },
  {
    range: [3, 5],
    label: "Normal agency chaos",
    emoji: "🟠",
    bg: "bg-orange-50",
    ring: "ring-orange-200",
    text: "text-orange-900",
    accent: "text-orange-700",
    message:
      "Common, fixable, and worth cleaning up. Most agencies live here — but that doesn't make it safe at handoff. The good news: the fixes are mostly an afternoon, not a sprint.",
    shortMessage: "Common, fixable, and worth cleaning up.",
  },
  {
    range: [0, 2],
    label: "Keys need a Sherpa",
    emoji: "🔴",
    bg: "bg-red-50",
    ring: "ring-red-200",
    text: "text-red-900",
    accent: "text-red-700",
    message:
      "Don't panic. Don't launch blind. Your app is probably live and the treasure map is, too. The right move: pause the handoff and run a credential custody review before anything else moves.",
    shortMessage: "Your app is live, but so is the treasure map.",
  },
];

function getBand(score: number): Band {
  return (
    BANDS.find((b) => score >= b.range[0] && score <= b.range[1]) ?? BANDS[3]
  );
}

export function LaunchTest() {
  const [answers, setAnswers] = React.useState<Answer[]>(
    () => new Array(QUESTIONS.length).fill(null),
  );
  const [copied, setCopied] = React.useState(false);

  const yesCount = answers.filter((a) => a === "yes").length;
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === QUESTIONS.length;
  const band = getBand(yesCount);

  function setAnswer(index: number, value: Answer) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function copyShareText() {
    if (!allAnswered) return;
    const text = `I scored ${yesCount}/10 on the SherpaKeys Go-Live Credential Test.

${band.emoji} ${band.label} — ${band.shortMessage}

Take the test: https://sherpakeys.com/launch-readiness`;
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2400);
  }

  function reset() {
    setAnswers(new Array(QUESTIONS.length).fill(null));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <>
      {/* ============================================================
          HERO
          ============================================================ */}
      <section className="mx-auto max-w-3xl px-6 pt-10 pb-12 text-center sm:pt-16 sm:pb-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sherpa-200 bg-sherpa-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-sherpa-700">
          <Sparkles className="h-3.5 w-3.5" /> The Go-Live Credential Test
        </div>
        <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">
          Your client app is live.
          <br />
          <span className="text-slate-400">But who has the keys?</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-slate-600">
          Most agencies have a launch checklist. Almost none have a credential
          custody checklist. Answer 10 yes/no questions — we&apos;ll score your
          launch readiness in under 60 seconds.
        </p>
      </section>

      {/* ============================================================
          QUESTIONS
          ============================================================ */}
      <section className="mx-auto max-w-3xl px-6 pb-10">
        <ol className="space-y-3">
          {QUESTIONS.map((q, i) => (
            <QuestionRow
              key={q.id}
              index={i}
              question={q}
              answer={answers[i]}
              onAnswer={(v) => setAnswer(i, v)}
            />
          ))}
        </ol>
      </section>

      {/* ============================================================
          SCORE PANEL
          ============================================================ */}
      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div
          className={`rounded-3xl border border-slate-200 p-6 ring-1 transition sm:p-9 ${band.bg} ${band.ring}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              Your score
            </div>
            <div className="text-xs font-medium text-slate-500">
              {answeredCount}/{QUESTIONS.length} answered
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-2">
            <span
              className={`text-7xl font-bold tracking-tight sm:text-8xl ${band.text}`}
            >
              {yesCount}
              <span className="text-2xl text-slate-400 sm:text-3xl">/10</span>
            </span>
            <span
              className={`inline-flex items-baseline gap-2 text-2xl font-bold sm:text-3xl ${band.text}`}
            >
              <span aria-hidden>{band.emoji}</span>
              {band.label}
            </span>
          </div>
          <p
            className={`mt-5 max-w-2xl text-base leading-relaxed ${band.text}`}
          >
            {allAnswered
              ? band.message
              : "Answer all 10 to see your final band. Your provisional band is shown above — it'll update as you go."}
          </p>

          {allAnswered && (
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copyShareText}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {copied ? "Copied — paste anywhere" : "Copy my score to share"}
              </button>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" /> Start over
              </button>
            </div>
          )}
        </div>

        {/* Band legend — visually de-emphasized when test isn't done */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {BANDS.map((b) => {
            const isCurrent =
              allAnswered && yesCount >= b.range[0] && yesCount <= b.range[1];
            return (
              <div
                key={b.label}
                className={`rounded-2xl border p-4 transition ${
                  isCurrent
                    ? "border-slate-400 bg-white shadow-sm"
                    : "border-slate-200 bg-white/60"
                }`}
              >
                <div className="text-sm font-bold text-slate-900">
                  <span aria-hidden>{b.emoji}</span>{" "}
                  {b.range[0]}
                  {b.range[1] !== b.range[0] && `–${b.range[1]}`} ·{" "}
                  {b.label}
                </div>
                <div className="mt-1 text-xs leading-relaxed text-slate-600">
                  {b.shortMessage}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          CTA — only after all 10 answered, otherwise we're nagging
          ============================================================ */}
      {allAnswered && (
        <section className="border-t border-slate-200 bg-gradient-to-b from-sherpa-50/60 to-white">
          <div className="mx-auto max-w-3xl px-6 py-16 text-center sm:py-20">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Hand your client a clean handoff.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-relaxed text-slate-600">
              SherpaKeys is building the <strong>Go-Live Credential Report</strong>{" "}
              — a client-ready, agency-branded PDF showing who owns Stripe,
              hosting, domain, DNS, GitHub, and AI keys before launch. Plus
              the working layer underneath: a vault and AI firewall that
              keeps credentials clean from kickoff through handoff.
            </p>
            <Link
              href="/pro-waitlist?tier=agency"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-sherpa-500 to-sherpa-600 px-6 py-3.5 text-base font-semibold text-white shadow-md shadow-sherpa-500/30 transition hover:shadow-lg hover:shadow-sherpa-500/40"
            >
              Join the agency waitlist <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-slate-500">
              Free for the first 100 agencies. No credit card.
            </p>
          </div>
        </section>
      )}

      {/* ============================================================
          SOFT FOOTER — ethos line
          ============================================================ */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-10 text-center">
          <p className="text-sm text-slate-500">
            Built for good agencies, careful clients, and the messy middle
            of modern app launches.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-700">
              What is SherpaKeys?
            </Link>
            <span aria-hidden>·</span>
            <Link href="/security" className="hover:text-slate-700">
              Security
            </Link>
            <span aria-hidden>·</span>
            <Link
              href="https://github.com/sdavis30731/sherpa"
              className="hover:text-slate-700"
            >
              Open source
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}

/* ============================================================
   QuestionRow — one card per question
   ============================================================ */
function QuestionRow({
  index,
  question,
  answer,
  onAnswer,
}: {
  index: number;
  question: Question;
  answer: Answer;
  onAnswer: (value: Answer) => void;
}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 sm:p-6">
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-600">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium leading-snug text-slate-900">
          {question.text}
        </p>
        <div className="mt-3 flex gap-2">
          <AnswerButton
            label="Yes"
            selected={answer === "yes"}
            tone="yes"
            onClick={() => onAnswer("yes")}
          />
          <AnswerButton
            label="No"
            selected={answer === "no"}
            tone="no"
            onClick={() => onAnswer("no")}
          />
        </div>
      </div>
    </li>
  );
}

function AnswerButton({
  label,
  selected,
  tone,
  onClick,
}: {
  label: string;
  selected: boolean;
  tone: "yes" | "no";
  onClick: () => void;
}) {
  const base =
    "min-w-[5.5rem] rounded-lg border px-4 py-1.5 text-sm font-semibold transition";
  const yesStyle = selected
    ? "border-emerald-500 bg-emerald-500 text-white shadow-sm shadow-emerald-500/30"
    : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50";
  const noStyle = selected
    ? "border-slate-700 bg-slate-800 text-white shadow-sm"
    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${base} ${tone === "yes" ? yesStyle : noStyle}`}
    >
      {label}
    </button>
  );
}

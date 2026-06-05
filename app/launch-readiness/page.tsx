/**
 * /launch-readiness  (SHRP-068)
 *
 * The Go-Live Credential Test — a 10-question yes/no quiz that scores an
 * agency's launch-day credential custody into Green/Yellow/Orange/Red.
 *
 * Why this page exists: it's the viral wedge for the agency strategy.
 * The 10-question test is content marketing — it commits us to no product
 * capability change, but it tests whether the agency story spreads. If
 * shares + DMs come in, we have evidence to reposition the homepage. If
 * not, the solo-founder homepage we just rebuilt is still standing and
 * we've lost nothing but a couple of hours.
 *
 * Tone: warm, not punitive. "Normal agency chaos" sits in Orange so
 * agencies can laugh at themselves before they laugh at us. See the
 * methodology + brand voice notes in SHRP-068.
 */

import type { Metadata } from "next";
import { TopNav } from "../_components/top-nav";
import { LaunchTest } from "./_components/launch-test";

export const metadata: Metadata = {
  title: "The Go-Live Credential Test — SherpaKeys",
  description:
    "Before your client app goes live, answer 10 yes/no questions. Score yourself: Green (launch-ready), Yellow (almost there), Orange (normal agency chaos), or Red (keys need a Sherpa). Built for good agencies, careful clients, and the messy middle of modern app launches.",
  openGraph: {
    title: "The Go-Live Credential Test — SherpaKeys",
    description:
      "10 yes/no questions. Score your launch readiness. Most agencies land in Orange (normal agency chaos). Take the test.",
    url: "https://sherpakeys.com/launch-readiness",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Go-Live Credential Test — SherpaKeys",
    description:
      "10 yes/no questions. Score your launch readiness. Most agencies land in Orange (normal agency chaos).",
  },
};

export default function LaunchReadinessPage() {
  return (
    <main className="min-h-full overflow-x-clip bg-white">
      {/* Sticky top nav — same component as the homepage */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6">
          <TopNav />
        </div>
      </header>

      <LaunchTest />
    </main>
  );
}

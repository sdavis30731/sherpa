/**
 * SHRP-104 — Plain-language layer for the Custody Record.
 *
 * The Custody Record is the only SherpaKeys surface a non-technical
 * client ever sees. They glance at it once, maybe sign it, file it,
 * possibly return to it later if something breaks. Brief, high-stakes,
 * non-technical. The technical detail (key types, endpoints, RLS
 * policies) belongs in the agency's audit log — not in the client's
 * handoff document.
 *
 * This module supplies the plain-English layer that wraps the existing
 * technical assertions: a one-line description of what each service
 * actually does, a per-service "ownership in plain words" caption,
 * and the "what this means for you" opener that frames the whole
 * document for a reader who has no idea what Stripe is.
 *
 * Voice: short, human, first-person-to-client. Avoid "credential",
 * "endpoint", "method", "service" (the noun), "production". Use
 * "account", "took over", "your control", "no leftover access".
 */

import type {
  CustodyAssertions,
  CustodyServiceAssertion,
} from "@/lib/custody";

/**
 * One-line description of what each launch-12 service is FOR — phrased
 * for a non-technical client. If a service isn't in this map we fall
 * back to the service display name; not having a description is
 * better than having a bad one.
 *
 * The phrasing pattern: "Your [X account] [does Y for your business]."
 */
export const SERVICE_PLAIN_DESCRIPTIONS: Record<string, string> = {
  stripe:
    "Stripe handles payments and billing for your business.",
  supabase:
    "Supabase is the database and login system behind your app.",
  github:
    "GitHub stores the source code your app is built from.",
  vercel:
    "Vercel hosts your website — it's what serves brushfirecoffee.com to your visitors.",
  openai:
    "OpenAI provides the AI features used in your app (e.g. product description writing).",
  resend:
    "Resend sends transactional email from your domain — order confirmations, password resets, etc.",
  cloudflare:
    "Cloudflare runs the DNS for your domain and protects your site from abuse.",
  twilio:
    "Twilio sends SMS messages and runs phone-based features for your business.",
  sendgrid:
    "SendGrid sends email from your domain.",
  postmark:
    "Postmark sends transactional email from your domain.",
  mailgun:
    "Mailgun sends email from your domain.",
  aws:
    "AWS provides the cloud servers, storage, and other infrastructure your app runs on.",
  gcp:
    "Google Cloud provides the cloud servers and infrastructure your app runs on.",
  azure:
    "Microsoft Azure provides the cloud servers and infrastructure your app runs on.",
  google_oauth:
    "Google sign-in lets your customers log in to your app with their Google account.",
  github_oauth:
    "GitHub sign-in lets your customers log in to your app with their GitHub account.",
  // SaaS commonly used for ops + analytics
  posthog: "PostHog tracks how customers use your site.",
  segment: "Segment routes customer-event data between your tools.",
  algolia: "Algolia powers the search box on your site.",
};

/**
 * Returns the plain-English description of what this service does, or a
 * sensible fallback. Pass either the service id (stable lowercase key
 * from lib/services.ts) or the display name; we'll normalize.
 */
export function plainServiceDescription(
  serviceId: string,
  fallbackName?: string,
): string {
  const key = serviceId.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  const found = SERVICE_PLAIN_DESCRIPTIONS[key];
  if (found) return found;
  const name = fallbackName || serviceId;
  return `${name} is one of the services your business depends on.`;
}

/**
 * Returns a single-sentence caption summarizing the OWNERSHIP situation
 * for one service, written for the client. Used at the top of each
 * service card on the Custody Record view.
 *
 * Examples:
 *   "You own it. No agency access remains."
 *   "You own it. The agency keeps temporary read-only access until Aug 8."
 *   "Ownership transfer is scheduled."
 *   "Ownership status not yet recorded by the agency."
 */
export function plainOwnershipCaption(
  s: CustodyServiceAssertion,
  agencyName: string,
): string {
  const agencyLabel = agencyName.trim() || "The agency";

  // No status set → don't guess; tell the truth.
  if (!s.transfer_status) {
    return "Ownership status not yet recorded by the agency.";
  }

  if (s.transfer_status === "complete") {
    if (s.exception_note.trim().length > 0) {
      return `You own it. ${agencyLabel} kept a documented exception — see "What to watch for" at the end.`;
    }
    return `You own it. No ${agencyLabel.toLowerCase()} access remains.`;
  }

  if (s.transfer_status === "scheduled") {
    return `Ownership transfer is scheduled — see the exception note below.`;
  }

  // exception
  return `Documented exception in place — see "What to watch for" at the end.`;
}

/**
 * "What this means for you" — the two-paragraph human opener that goes
 * at the top of the Executive Summary on the Custody Record view. The
 * point: a non-technical client should understand the bottom line
 * before they read any of the technical detail.
 */
export function plainOpener(args: {
  custody: CustodyAssertions;
  agencyName: string;
  clientName: string;
  engagementName: string;
}): { headline: string; paragraphs: string[] } {
  const { custody, clientName, engagementName } = args;
  const agency = args.agencyName.trim() || "Your agency";
  const client = clientName.trim() || "you";
  const services = custody.services ?? [];
  const total = services.length;
  const complete = services.filter(
    (s) => s.transfer_status === "complete",
  ).length;
  const exceptions = services.filter(
    (s) =>
      s.transfer_status === "exception" ||
      (s.exception_note?.trim().length ?? 0) > 0,
  ).length;

  // Headline — punchy, accurate, never overstating.
  const headline = `What this means for ${client}.`;

  const paragraphs: string[] = [];

  if (total === 0) {
    paragraphs.push(
      `${agency} prepared this record for your ${engagementName} engagement. It captures who owns what at launch, what was rotated at handoff, and what (if anything) still requires attention.`,
    );
    paragraphs.push(
      `No production services are listed yet — once they're added, each will appear as a card below with a plain-English summary of ownership and access.`,
    );
    return { headline, paragraphs };
  }

  // Sentence 1: agency just handed off, here's the bottom line.
  if (complete === total && exceptions === 0) {
    paragraphs.push(
      `${agency} just handed off the ${total} account${total === 1 ? "" : "s"} that run${total === 1 ? "s" : ""} ${engagementName} to ${client}. Every one is now in ${client === "you" ? "your" : "their"} name, on ${client === "you" ? "your" : "their"} billing, with no agency access remaining.`,
    );
  } else if (exceptions === 0) {
    paragraphs.push(
      `${agency} just handed off the ${total} account${total === 1 ? "" : "s"} that run${total === 1 ? "s" : ""} ${engagementName} to ${client}. ${complete} of ${total} ${complete === 1 ? "is" : "are"} fully in ${client === "you" ? "your" : "their"} name today; the rest have transfers scheduled — see each card for the timeline.`,
    );
  } else {
    paragraphs.push(
      `${agency} just handed off the ${total} account${total === 1 ? "" : "s"} that run${total === 1 ? "s" : ""} ${engagementName} to ${client}. ${complete} ${complete === 1 ? "is" : "are"} fully in ${client === "you" ? "your" : "their"} name today; ${exceptions} ${exceptions === 1 ? "has" : "have"} documented, time-bound exceptions that ${client === "you" ? "you" : "they"} can revoke at any time.`,
    );
  }

  // Sentence 2: what to do with this document.
  paragraphs.push(
    `Read this once, file it, and refer back if you ever need to know who controls what. The technical detail behind each summary is included below for whoever inherits the day-to-day work.`,
  );

  return { headline, paragraphs };
}

/**
 * An item in the "What to watch for" action list — surfaces the
 * exception notes as plain-language reminders, one per affected
 * service.
 *
 * We don't auto-extract dates from the free-text note (too brittle);
 * we display the note as-is so dates the agency mentioned in plain
 * English ("until Aug 8") flow through. The framing wrapper around it
 * is what makes the section approachable.
 */
export type WatchForItem = {
  service_id: string;
  service_label: string;
  status: CustodyServiceAssertion["transfer_status"];
  note: string;
};

/**
 * Pull the watch-for items from the assertions blob. Returns the
 * services that have either a documented exception (status='exception')
 * or any non-empty exception_note (including 'scheduled' transfers).
 *
 * Caller is expected to render each item with a humane wrapper, e.g.
 *   "[service]: [note]"
 *   "Stripe — The agency kept a read-only key until Aug 8, 2026 for
 *   post-launch incident triage. You can revoke this at any time."
 *
 * Sorted: 'exception' first, then 'scheduled', then 'complete' (the
 * complete ones with notes are usually informational green callouts —
 * "no exceptions" caveats — so they come last).
 */
export function watchForItems(
  custody: CustodyAssertions,
  serviceLabelLookup: (serviceId: string) => string,
): WatchForItem[] {
  const services = custody.services ?? [];
  const items: WatchForItem[] = [];
  for (const s of services) {
    const note = s.exception_note?.trim() ?? "";
    if (note.length === 0 && s.transfer_status !== "exception") continue;
    items.push({
      service_id: s.service_id,
      service_label: serviceLabelLookup(s.service_id),
      status: s.transfer_status,
      note,
    });
  }
  const rank = (
    status: CustodyServiceAssertion["transfer_status"],
  ): number => {
    if (status === "exception") return 0;
    if (status === "scheduled") return 1;
    return 2;
  };
  items.sort((a, b) => rank(a.status) - rank(b.status));
  return items;
}

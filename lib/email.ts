/**
 * Email utility — SHRP-042 Stage 2
 *
 * Thin wrapper around Resend's HTTP API. The design is deliberately
 * graceful: if RESEND_API_KEY is missing or the send fails, we log a
 * warning and return { sent: false, reason }. We NEVER throw. This is
 * because the approval flow must work even when email is misconfigured
 * — the user can still reach the approval page via the URL the agent
 * returns. Email is a notification accelerant, not a hard dependency.
 *
 * Env vars required to actually send mail (optional at startup):
 *   - RESEND_API_KEY   The "re_…" API key from resend.com
 *   - EMAIL_FROM       The verified sender, e.g. "SherpaKeys <noreply@sherpakeys.com>"
 *
 * If you haven't set up Resend yet:
 *   1. Sign up at https://resend.com (free tier covers 3k/month)
 *   2. Verify your sending domain
 *   3. Add RESEND_API_KEY and EMAIL_FROM to your Vercel project env vars
 *   4. Redeploy
 *
 * Until then, this module logs warnings and returns sent: false. The
 * approval flow continues to work — the user just won't get an email.
 */

import { extractEndpoint } from "./write-actions";

export interface SendResult {
  sent: boolean;
  reason?: string;
  messageId?: string;
}

interface ResendErrorBody {
  name?: string;
  message?: string;
  statusCode?: number;
}

interface ResendSuccessBody {
  id?: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";

/**
 * Low-level send. You probably want a higher-level helper like
 * sendApprovalEmail() instead.
 */
async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "SherpaKeys <noreply@sherpakeys.com>";

  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping email send. Approval flow will still work via direct URL.",
    );
    return { sent: false, reason: "no_api_key" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
    });

    if (!response.ok) {
      const errBody = (await response
        .json()
        .catch(() => ({}))) as ResendErrorBody;
      const reason = errBody.message ?? `http_${response.status}`;
      console.warn("[email] Resend send failed:", reason);
      return { sent: false, reason };
    }

    const body = (await response.json().catch(() => ({}))) as ResendSuccessBody;
    return { sent: true, messageId: body.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    console.warn("[email] Network error sending mail:", reason);
    return { sent: false, reason };
  }
}

/**
 * High-level helper for the approval-request email. Builds an
 * approval-card-flavored HTML + plain-text email body.
 */
export async function sendApprovalEmail(args: {
  to: string;
  approvalUrl: string;
  summary: string;
  service: string;
  endpoint: string;
  method: string;
  dollarAmountCents: number | null;
  expiresAt: Date;
  agentPrompt: string | null;
  /** SHRP-086 — when true, framed as an expiry reminder rather than a fresh request. */
  isReminder?: boolean;
}): Promise<SendResult> {
  const dollarLine =
    args.dollarAmountCents !== null
      ? `<p style="margin: 8px 0 4px; font-size: 14px; color: #475569;">Amount</p>
         <p style="margin: 0; font-size: 22px; font-weight: 700; color: #b91c1c;">$${(args.dollarAmountCents / 100).toFixed(2)}</p>`
      : "";

  const promptLine = args.agentPrompt
    ? `<p style="margin: 16px 0 4px; font-size: 13px; color: #64748b;">The prompt that triggered this</p>
       <blockquote style="border-left: 3px solid #cbd5e1; margin: 0; padding: 8px 12px; background: #f8fafc; color: #334155; font-style: italic;">${escapeHtml(args.agentPrompt)}</blockquote>`
    : "";

  const minutesLeft = Math.max(
    1,
    Math.round((args.expiresAt.getTime() - Date.now()) / 60000),
  );

  const reminderBanner = args.isReminder
    ? `<tr><td style="padding: 0 32px;">
        <div style="background: #fef3c7; border: 1px solid #fcd34d; border-left: 4px solid #b45309; border-radius: 8px; padding: 12px 16px; margin-bottom: 12px;">
          <p style="margin: 0; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #b45309;">⏰ Reminder · expires in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}</p>
          <p style="margin: 4px 0 0; font-size: 13px; color: #78350f; line-height: 1.45;">An approval you previously received is about to expire. Approving now keeps the AI agent's work on track.</p>
        </div>
      </td></tr>`
    : "";

  const headlineText = args.isReminder
    ? "Reminder: an approval is about to expire."
    : "An AI agent wants to do something. Approve?";

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; padding: 32px 16px; margin: 0;">
  <table cellpadding="0" cellspacing="0" border="0" style="max-width: 540px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
    <tr><td style="padding: 28px 32px 20px;">
      <p style="margin: 0 0 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #1F6FEB;">SherpaKeys · AI Firewall</p>
      <h1 style="margin: 0; font-size: 22px; color: #0f172a; font-weight: 700;">${headlineText}</h1>
    </td></tr>
    ${reminderBanner}
    <tr><td style="padding: 0 32px 8px;">
      <p style="margin: 16px 0 4px; font-size: 13px; color: #64748b;">Proposed action</p>
      <p style="margin: 0; font-family: 'SF Mono', Menlo, monospace; font-size: 14px; color: #0f172a; background: #f1f5f9; padding: 10px 12px; border-radius: 8px; word-break: break-all;">${escapeHtml(args.summary)}</p>
      ${dollarLine}
      ${promptLine}
      <p style="margin: 24px 0 6px; font-size: 12px; color: #64748b;">Expires in approximately ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}</p>
    </td></tr>
    <tr><td style="padding: 16px 32px 32px;">
      <a href="${args.approvalUrl}" style="display: block; text-align: center; background: linear-gradient(to bottom, #1F6FEB, #0747A6); color: white; padding: 14px 24px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 15px;">Review and approve</a>
      <p style="margin: 16px 0 0; font-size: 12px; color: #94a3b8; text-align: center;">If you didn't request this, you can safely ignore this email. The action will expire automatically.</p>
    </td></tr>
  </table>
  <p style="text-align: center; font-size: 11px; color: #94a3b8; margin: 16px 0 0;">SherpaKeys — the keychain for AI-built apps.</p>
</body>
</html>`;

  const text = args.isReminder
    ? `SherpaKeys — AI Firewall

REMINDER: Approval expires in about ${minutesLeft} minutes.

Action: ${args.summary}
${args.dollarAmountCents !== null ? `Amount: $${(args.dollarAmountCents / 100).toFixed(2)}\n` : ""}${args.agentPrompt ? `Prompt that triggered it: "${args.agentPrompt}"\n` : ""}
Review and approve here:
${args.approvalUrl}

If you didn't request this, you can safely ignore — the action will expire automatically.

— SherpaKeys`
    : `SherpaKeys — AI Firewall

An AI agent wants to do something. Approve?

Action: ${args.summary}
${args.dollarAmountCents !== null ? `Amount: $${(args.dollarAmountCents / 100).toFixed(2)}\n` : ""}${args.agentPrompt ? `Prompt that triggered it: "${args.agentPrompt}"\n` : ""}
Review and approve here (expires in about ${minutesLeft} minutes):
${args.approvalUrl}

If you didn't request this, you can safely ignore this email — the action will expire automatically.

— SherpaKeys`;

  const subjectPrefix = args.isReminder
    ? "[SherpaKeys ⏰ Reminder]"
    : "[SherpaKeys]";

  return sendEmail({
    to: args.to,
    subject: `${subjectPrefix} Approve write action: ${args.service}/${args.endpoint ?? extractEndpoint("/")}`,
    html,
    text,
  });
}

/**
 * SHRP-107e — Credential request invite email.
 *
 * Sent to a client when the agency hits "Request from client" on an
 * engagement. The email looks like it's from the agency partner
 * (display-name pattern: "Mara Lindberg (via SherpaKeys)") with the
 * agency's reply-to so client replies route back to the partner. Body
 * is branded with the agency logo and primary color.
 *
 * Same graceful-degrade contract: if RESEND_API_KEY is missing we
 * return { sent: false } and the share URL still works (the agency can
 * copy it out of the dialog and send manually).
 */
export async function sendCredentialRequestEmail(args: {
  to: string;
  shareUrl: string;
  agencyName: string;
  agencyLogoUrl: string | null;
  agencyPrimaryColor: string;
  agencyPartnerName: string;
  agencyPartnerEmail: string;
  clientName: string | null;
  engagementName: string;
  personalMessage: string | null;
  requestedServiceNames: string[];
  expiresAt: Date;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress =
    process.env.EMAIL_FROM_ADDRESS ?? "notifications@sherpakeys.com";

  if (!apiKey) {
    console.warn(
      "[email] RESEND_API_KEY not set — skipping credential-request email. Share URL still works.",
    );
    return { sent: false, reason: "no_api_key" };
  }

  // Display-name pattern: client sees "Mara Lindberg (via SherpaKeys)"
  // in their inbox. Reply-To routes back to the agency partner directly.
  const fromDisplay = args.agencyPartnerName
    ? `${args.agencyPartnerName} (via SherpaKeys)`
    : `${args.agencyName} (via SherpaKeys)`;
  const from = `${fromDisplay} <${fromAddress}>`;
  const replyTo = args.agencyPartnerEmail;

  const greeting = args.clientName?.trim()
    ? `Hi ${escapeHtml(args.clientName.trim().split(/\s+/)[0] ?? args.clientName.trim())},`
    : "Hi,";

  const personalNoteBlock = args.personalMessage?.trim()
    ? `<tr><td style="padding: 8px 32px 0;">
        <blockquote style="margin: 0; padding: 12px 14px; background: #f8fafc; border-left: 3px solid ${escapeHtml(args.agencyPrimaryColor)}; border-radius: 6px; color: #0f172a; font-size: 14px; line-height: 1.55; white-space: pre-wrap;">${escapeHtml(args.personalMessage.trim())}</blockquote>
      </td></tr>`
    : "";

  const serviceList =
    args.requestedServiceNames.length === 0
      ? ""
      : `<tr><td style="padding: 12px 32px 0;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b;">Accounts we'll need access to</p>
          <ul style="margin: 0; padding-left: 18px; color: #0f172a; font-size: 14px; line-height: 1.65;">
            ${args.requestedServiceNames
              .map((n) => `<li>${escapeHtml(n)}</li>`)
              .join("")}
          </ul>
        </td></tr>`;

  const logoBlock = args.agencyLogoUrl
    ? `<img src="${escapeHtml(args.agencyLogoUrl)}" alt="${escapeHtml(args.agencyName)} logo" style="width: 44px; height: 44px; border-radius: 8px; object-fit: contain; background: #fff; border: 1px solid #e2e8f0;">`
    : `<div style="width: 44px; height: 44px; border-radius: 8px; background: ${escapeHtml(args.agencyPrimaryColor)}; color: white; display: inline-block; line-height: 44px; text-align: center; font-weight: 800; font-size: 18px;">${escapeHtml((args.agencyName.charAt(0) || "A").toUpperCase())}</div>`;

  const daysLeft = Math.max(
    1,
    Math.round(
      (args.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
    ),
  );

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; padding: 32px 16px; margin: 0;">
  <table cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.08);">
    <tr><td style="padding: 28px 32px 16px;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
        ${logoBlock}
        <div>
          <p style="margin: 0; font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 0.05em; text-transform: uppercase;">${escapeHtml(args.agencyName)}</p>
          <p style="margin: 2px 0 0; font-size: 13px; color: #0f172a;">Engagement: ${escapeHtml(args.engagementName)}</p>
        </div>
      </div>
      <h1 style="margin: 8px 0 0; font-size: 22px; color: #0f172a; font-weight: 700; line-height: 1.3;">${greeting}</h1>
      <p style="margin: 10px 0 0; font-size: 15px; color: #334155; line-height: 1.6;">
        ${escapeHtml(args.agencyPartnerName || args.agencyName)} is getting set up to work on ${escapeHtml(args.engagementName)} and needs access to a few of your accounts. You can grant access through a secure SherpaKeys page — each step has a plain-English guide.
      </p>
    </td></tr>
    ${personalNoteBlock}
    ${serviceList}
    <tr><td style="padding: 24px 32px 0;">
      <a href="${escapeHtml(args.shareUrl)}" style="display: inline-block; background: ${escapeHtml(args.agencyPrimaryColor)}; color: white; padding: 14px 26px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 15px; box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);">Open the secure page →</a>
      <p style="margin: 12px 0 0; font-size: 12px; color: #64748b;">Link expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.</p>
    </td></tr>
    <tr><td style="padding: 22px 32px 0;">
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
        <p style="margin: 0; font-size: 12px; font-weight: 700; color: #047857; letter-spacing: 0.05em; text-transform: uppercase;">🔒 How this is kept private</p>
        <p style="margin: 6px 0 0; font-size: 13px; color: #334155; line-height: 1.55;">
          Your credentials are encrypted in <strong>your browser</strong> before they leave your machine. Only ${escapeHtml(args.agencyName)} can read them. Even SherpaKeys (the tool) can&apos;t see them.
        </p>
      </div>
    </td></tr>
    <tr><td style="padding: 22px 32px 28px;">
      <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.55;">
        Questions? Reply to this email — it goes straight to ${escapeHtml(args.agencyPartnerName || args.agencyName)}.
      </p>
    </td></tr>
  </table>
  <p style="text-align: center; color: #94a3b8; font-size: 11px; margin: 16px auto 0; max-width: 560px;">
    Sent by ${escapeHtml(args.agencyName)} using SherpaKeys · the credential keychain for AI-built apps
  </p>
</body>
</html>`;

  const text = `${greeting}

${args.agencyPartnerName || args.agencyName} is getting set up to work on ${args.engagementName} and needs access to a few of your accounts.

${args.personalMessage?.trim() ? `${args.personalMessage.trim()}\n\n` : ""}Accounts we'll need access to:
${args.requestedServiceNames.map((n) => `  - ${n}`).join("\n")}

Open the secure page (link expires in ${daysLeft} day${daysLeft === 1 ? "" : "s"}):
${args.shareUrl}

How this is kept private: your credentials are encrypted in your browser before they leave your machine. Only ${args.agencyName} can read them. SherpaKeys (the tool) cannot.

Questions? Reply to this email — it goes to ${args.agencyPartnerName || args.agencyName}.

— Sent by ${args.agencyName} using SherpaKeys`;

  const subject = args.clientName?.trim()
    ? `${args.agencyPartnerName || args.agencyName} needs access for ${args.engagementName}`
    : `Access request from ${args.agencyPartnerName || args.agencyName}`;

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [args.to],
        reply_to: replyTo,
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      const errBody = (await response
        .json()
        .catch(() => ({}))) as ResendErrorBody;
      const reason = errBody.message ?? `http_${response.status}`;
      console.warn("[email] credential-request send failed:", reason);
      return { sent: false, reason };
    }
    const body = (await response.json().catch(() => ({}))) as ResendSuccessBody;
    return { sent: true, messageId: body.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown";
    console.warn("[email] network error sending credential request:", reason);
    return { sent: false, reason };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

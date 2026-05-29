/**
 * Rotation status helpers — used by SHRP-011 (credential row) and SHRP-026
 * (overdue widget). Keep the rules in one place so the two views agree on
 * what "overdue" means.
 *
 * Status ladder:
 *   ok       — rotated within the last 80% of the interval
 *   due      — rotated within the last 80–100% of the interval (warn soon)
 *   overdue  — rotated > interval ago (or never; see below)
 *   unknown  — never rotated AND the credential was just added today
 *
 * "Never rotated" defaults to OVERDUE rather than unknown — we want to
 * nudge users to confirm or rotate freshly-imported keys. The "unknown"
 * status is reserved for credentials that haven't existed long enough to
 * have a meaningful status (under 1 day old).
 */

export type RotationStatus = "ok" | "due" | "overdue" | "unknown";

export interface RotationInfo {
  status: RotationStatus;
  daysSinceRotation: number | null;
  daysOverdue: number; // > 0 means past due. 0 = not overdue.
}

export function evaluateRotation(
  lastRotatedAt: string | null,
  intervalDays: number,
  createdAt?: string | null,
): RotationInfo {
  if (!lastRotatedAt) {
    // Newly-added with no recorded rotation yet.
    if (createdAt) {
      const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
      if (ageDays < 1) {
        return { status: "unknown", daysSinceRotation: null, daysOverdue: 0 };
      }
    }
    return { status: "overdue", daysSinceRotation: null, daysOverdue: 0 };
  }

  const days = (Date.now() - new Date(lastRotatedAt).getTime()) / 86_400_000;
  const overdueBy = Math.max(0, days - intervalDays);

  let status: RotationStatus;
  if (days > intervalDays) status = "overdue";
  else if (days > intervalDays * 0.8) status = "due";
  else status = "ok";

  return {
    status,
    daysSinceRotation: Math.round(days),
    daysOverdue: Math.round(overdueBy),
  };
}

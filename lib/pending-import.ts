/**
 * Pending import handoff — SHRP-041b
 *
 * When a visitor pastes a .env into the landing page analyzer and chooses
 * to sign up, we save the pasted text to localStorage so it survives the
 * round-trip through magic-link email (which opens a new browser tab and
 * therefore can't use sessionStorage).
 *
 * Privacy notes:
 *   - The data NEVER leaves the user's browser.
 *   - We auto-expire after 1 hour. If the user takes longer to complete
 *     signup, they'll just need to paste again — no harm done.
 *   - The post-import flow clears this immediately on success.
 *
 * If localStorage is unavailable (private browsing, browser policy),
 * all functions fail silently. The fallback is: the user re-pastes
 * inside the vault after signup. Annoying but never breaking.
 */

const KEY = "sherpa:pending-env-import-v1";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour

interface StoredImport {
  text: string;
  savedAt: number;
}

export function savePendingImport(text: string): void {
  if (typeof window === "undefined") return;
  if (!text || !text.trim()) return;
  try {
    const payload: StoredImport = { text, savedAt: Date.now() };
    window.localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* unavailable — silent fail is fine */
  }
}

export function loadPendingImport(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredImport>;
    if (
      typeof parsed.text !== "string" ||
      typeof parsed.savedAt !== "number" ||
      Date.now() - parsed.savedAt > MAX_AGE_MS
    ) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    return parsed.text;
  } catch {
    return null;
  }
}

export function clearPendingImport(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* fail silent */
  }
}

export function hasPendingImport(): boolean {
  return loadPendingImport() !== null;
}

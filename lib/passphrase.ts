/**
 * Lightweight passphrase entropy estimator — SHRP-004
 *
 * Returns an approximate entropy in bits and a 0–4 score (mirroring zxcvbn).
 * This is intentionally simple: a full zxcvbn integration is on the v1.1
 * backlog. The estimator is generous on character-class entropy but applies
 * conservative penalties for repeats, sequences, and the most common
 * passwords. For Sherpa's purposes (gate at score >= 3, ~60 bits), this
 * is sufficient to keep users from picking "password123".
 */

const COMMON = new Set([
  "password",
  "password1",
  "password123",
  "123456",
  "12345678",
  "qwerty",
  "letmein",
  "welcome",
  "admin",
  "iloveyou",
  "abc123",
  "monkey",
  "dragon",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "trustno1",
  "starwars",
  "passw0rd",
  "correct horse battery staple",
]);

function poolSize(s: string): number {
  let pool = 0;
  if (/[a-z]/.test(s)) pool += 26;
  if (/[A-Z]/.test(s)) pool += 26;
  if (/[0-9]/.test(s)) pool += 10;
  if (/[^A-Za-z0-9]/.test(s)) pool += 32; // approx punctuation set
  return pool || 1;
}

function hasRepeat(s: string): boolean {
  return /(.)\1{2,}/.test(s); // aaa, 111, !!!
}

function hasSequence(s: string): boolean {
  const seqs = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiopasdfghjklzxcvbnm"];
  const lower = s.toLowerCase();
  for (const seq of seqs) {
    for (let i = 0; i <= seq.length - 4; i++) {
      const part = seq.slice(i, i + 4);
      if (lower.includes(part)) return true;
    }
  }
  return false;
}

export interface PassphraseStrength {
  entropyBits: number;
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very weak" | "Weak" | "Fair" | "Strong" | "Excellent";
  feedback: string[];
}

export function estimatePassphrase(input: string): PassphraseStrength {
  const s = input.trim();
  const feedback: string[] = [];

  if (s.length === 0) {
    return { entropyBits: 0, score: 0, label: "Very weak", feedback: ["Enter a passphrase."] };
  }

  if (COMMON.has(s.toLowerCase())) {
    return {
      entropyBits: 0,
      score: 0,
      label: "Very weak",
      feedback: ["That is one of the most-guessed passwords. Pick something else."],
    };
  }

  // Base entropy: length * log2(poolSize)
  const pool = poolSize(s);
  let bits = s.length * Math.log2(pool);

  if (hasRepeat(s)) {
    bits -= 8;
    feedback.push("Avoid runs of repeating characters.");
  }
  if (hasSequence(s)) {
    bits -= 8;
    feedback.push("Avoid keyboard or alphabetical sequences.");
  }

  // Bonus for length over 16 chars (long passphrases beat clever ones)
  if (s.length >= 16) {
    bits += 6;
  }

  bits = Math.max(0, Math.round(bits));

  let score: PassphraseStrength["score"] = 0;
  if (bits >= 80) score = 4;
  else if (bits >= 60) score = 3;
  else if (bits >= 40) score = 2;
  else if (bits >= 25) score = 1;

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Excellent"] as const;
  const label = labels[score];

  if (score < 3) {
    if (s.length < 12) feedback.push("Use at least 12 characters.");
    if (!/[a-z]/.test(s) || !/[A-Z]/.test(s)) feedback.push("Mix upper and lower case.");
    if (!/[0-9]/.test(s)) feedback.push("Add a number or two.");
    if (!/[^A-Za-z0-9]/.test(s)) feedback.push("Add a symbol.");
  }

  return { entropyBits: bits, score, label, feedback };
}

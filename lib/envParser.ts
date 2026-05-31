/**
 * .env file parser — SHRP-009b
 *
 * Parses a multi-line .env-style string into a list of { key, value } pairs.
 * Tolerates the conventions vibe coders actually use:
 *   - blank lines and `#` comments are skipped
 *   - inline `# comment after value` is stripped (only if NOT inside quotes)
 *   - values may be single-quoted, double-quoted, or unquoted
 *   - export prefixes (`export KEY=VALUE`) are recognised
 *   - escaped \n inside double-quoted strings becomes a real newline
 *   - whitespace around the `=` is tolerated
 *   - duplicate keys: last one wins, with the count surfaced for the UI
 *
 * We deliberately do NOT try to interpret variable interpolation (`$OTHER`) —
 * that's a dotenv-specific feature that depends on resolution order and
 * surrounding state. Sherpa just stores the literal value.
 */

export interface EnvEntry {
  /** Index in the source file (1-based, line number). */
  line: number;
  /** Variable name as parsed. */
  key: string;
  /** Variable value as parsed (with quotes stripped, escapes resolved). */
  value: string;
}

export interface EnvParseResult {
  entries: EnvEntry[];
  /** Lines that looked like they should be entries but couldn't be parsed. */
  warnings: { line: number; raw: string; reason: string }[];
  /** Keys that appeared more than once. */
  duplicateKeys: string[];
}

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function stripExportPrefix(line: string): string {
  return line.replace(/^\s*export\s+/, "");
}

function stripInlineComment(value: string): string {
  // Strip ` # comment` only if the # is not inside any quoted segment.
  // We walk the string and track quote state.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === "\\" && i + 1 < value.length) {
      i++; // skip the escaped char
      continue;
    }
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "#" && !inSingle && !inDouble) {
      // Inline comment starts here — but only if preceded by whitespace
      // (or beginning of string). Otherwise it's part of the value.
      if (i === 0 || /\s/.test(value[i - 1]!)) {
        return value.slice(0, i).trimEnd();
      }
    }
  }
  return value;
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 2) return trimmed;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    const inner = trimmed.slice(1, -1);
    if (first === '"') {
      // Double-quoted: resolve common escape sequences.
      return inner
        .replace(/\\n/g, "\n")
        .replace(/\\r/g, "\r")
        .replace(/\\t/g, "\t")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
    // Single-quoted: literal value, no escapes.
    return inner;
  }
  return trimmed;
}

export function parseEnv(text: string): EnvParseResult {
  const entries: EnvEntry[] = [];
  const warnings: EnvParseResult["warnings"] = [];
  const seenKeys = new Map<string, number>();

  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const rawLine = lines[i] ?? "";
    const trimmed = rawLine.trim();

    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;

    const lineWithoutExport = stripExportPrefix(trimmed);
    const eq = lineWithoutExport.indexOf("=");
    if (eq < 0) {
      warnings.push({ line: lineNumber, raw: rawLine, reason: "No '=' found" });
      continue;
    }

    const key = lineWithoutExport.slice(0, eq).trim();
    if (!KEY_RE.test(key)) {
      warnings.push({
        line: lineNumber,
        raw: rawLine,
        reason: `Invalid key "${key}" (must match [A-Za-z_][A-Za-z0-9_]*)`,
      });
      continue;
    }

    let rawValue = lineWithoutExport.slice(eq + 1);
    rawValue = stripInlineComment(rawValue);
    const value = stripQuotes(rawValue);

    seenKeys.set(key, (seenKeys.get(key) ?? 0) + 1);
    entries.push({ line: lineNumber, key, value });
  }

  const duplicateKeys = Array.from(seenKeys.entries())
    .filter(([, count]) => count > 1)
    .map(([key]) => key);

  return { entries, warnings, duplicateKeys };
}

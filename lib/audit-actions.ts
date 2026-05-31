/**
 * Audit action catalog — SHRP-028
 *
 * Every action written to public.audit_log is enumerated here with the
 * human-readable label, icon, severity color, and category used by the
 * audit log viewer.
 *
 * When adding a new action elsewhere in the codebase, please also add
 * an entry here — otherwise it'll show up as a generic "Activity" row
 * with no useful styling.
 */

import type { LucideIcon } from "lucide-react";
import {
  Eye,
  Copy,
  Pencil,
  Trash2,
  Plus,
  RotateCw,
  Upload,
  ShieldCheck,
  ShieldAlert,
  Bot,
  KeyRound,
  Folder,
  FolderArchive,
  FolderX,
  Settings,
  AlertTriangle,
  Activity,
} from "lucide-react";

export type AuditSeverity = "info" | "success" | "notable" | "warning" | "danger";

export type AuditCategory =
  | "credential"
  | "project"
  | "agent"
  | "security";

export interface AuditActionMeta {
  label: string;
  description: string;
  icon: LucideIcon;
  severity: AuditSeverity;
  category: AuditCategory;
}

const REGISTRY: Record<string, AuditActionMeta> = {
  // ----- Credential lifecycle -----
  credential_added: {
    label: "Credential added",
    description: "Stored a new credential in the vault.",
    icon: Plus,
    severity: "success",
    category: "credential",
  },
  credential_revealed: {
    label: "Credential revealed",
    description: "Decrypted and displayed the value.",
    icon: Eye,
    severity: "notable",
    category: "credential",
  },
  credential_copied: {
    label: "Credential copied",
    description: "Decrypted and copied to clipboard.",
    icon: Copy,
    severity: "notable",
    category: "credential",
  },
  credential_edited: {
    label: "Credential edited",
    description: "Updated label or environment.",
    icon: Pencil,
    severity: "info",
    category: "credential",
  },
  credential_rotated: {
    label: "Credential rotated",
    description: "Updated the stored value via Sherpa.",
    icon: RotateCw,
    severity: "success",
    category: "credential",
  },
  credential_rotated_externally: {
    label: "Marked as rotated",
    description: "Recorded that you rotated this outside Sherpa.",
    icon: RotateCw,
    severity: "info",
    category: "credential",
  },
  credential_deleted: {
    label: "Credential deleted",
    description: "Soft-deleted from the vault.",
    icon: Trash2,
    severity: "warning",
    category: "credential",
  },
  credentials_imported: {
    label: ".env import",
    description: "Bulk-imported credentials from a pasted .env file.",
    icon: Upload,
    severity: "success",
    category: "credential",
  },

  // ----- Project lifecycle -----
  project_renamed: {
    label: "Project renamed",
    description: "Changed the project name or description.",
    icon: Settings,
    severity: "info",
    category: "project",
  },
  project_archived: {
    label: "Project archived",
    description: "Soft-hidden from the vault list.",
    icon: FolderArchive,
    severity: "info",
    category: "project",
  },
  project_unarchived: {
    label: "Project un-archived",
    description: "Restored to the vault list.",
    icon: Folder,
    severity: "info",
    category: "project",
  },
  project_deleted: {
    label: "Project deleted",
    description: "Hard-deleted with all credentials and tokens.",
    icon: FolderX,
    severity: "danger",
    category: "project",
  },

  // ----- Agent (MCP) -----
  mcp_token_created: {
    label: "Agent token created",
    description: "Generated a new MCP token for AI agents.",
    icon: KeyRound,
    severity: "info",
    category: "agent",
  },
  mcp_token_revoked: {
    label: "Agent token revoked",
    description: "Invalidated an MCP token immediately.",
    icon: ShieldAlert,
    severity: "notable",
    category: "agent",
  },
  agents_authorized: {
    label: "Agents authorized",
    description: "Opened a time-limited window for agent credential access.",
    icon: ShieldCheck,
    severity: "notable",
    category: "agent",
  },
  agents_revoked: {
    label: "Agents revoked",
    description: "Closed the agent authorization window.",
    icon: ShieldAlert,
    severity: "notable",
    category: "agent",
  },
  agent_call_api: {
    label: "Agent API call",
    description: "AI agent called a third-party API via Sherpa.",
    icon: Bot,
    severity: "notable",
    category: "agent",
  },
  agent_rotate_requested: {
    label: "Agent rotation request",
    description: "AI agent asked Sherpa for rotation steps.",
    icon: RotateCw,
    severity: "info",
    category: "agent",
  },

  // ----- Security signals -----
  rate_limit_exceeded: {
    label: "Rate limit hit",
    description: "A token exceeded its per-minute or per-hour request limit.",
    icon: AlertTriangle,
    severity: "warning",
    category: "security",
  },
};

const FALLBACK: AuditActionMeta = {
  label: "Activity",
  description: "An action that hasn't been catalogued yet.",
  icon: Activity,
  severity: "info",
  category: "credential",
};

export function getAuditActionMeta(action: string): AuditActionMeta {
  return REGISTRY[action] ?? FALLBACK;
}

export const KNOWN_AUDIT_ACTIONS = Object.keys(REGISTRY);

export const AUDIT_CATEGORIES: Array<{
  id: AuditCategory;
  label: string;
}> = [
  { id: "credential", label: "Credentials" },
  { id: "project", label: "Project" },
  { id: "agent", label: "Agents" },
  { id: "security", label: "Security" },
];

export const SEVERITY_STYLES: Record<AuditSeverity, string> = {
  info: "text-slate-600 bg-slate-50 ring-1 ring-slate-200",
  success: "text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200",
  notable: "text-sherpa-700 bg-sherpa-50 ring-1 ring-sherpa-200",
  warning: "text-amber-800 bg-amber-50 ring-1 ring-amber-200",
  danger: "text-red-800 bg-red-50 ring-1 ring-red-200",
};

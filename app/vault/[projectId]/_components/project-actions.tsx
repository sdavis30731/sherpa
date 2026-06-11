"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useVaultKey } from "@/lib/vault-context";
import {
  KeyRound,
  Lock,
  Unlock,
  Settings,
  Upload,
  Activity,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddCredentialDialog } from "@/components/add-credential-dialog";
import { ImportEnvDialog } from "@/components/import-env-dialog";
import { RequestCredentialsDialog } from "@/components/request-credentials-dialog";
import { loadPendingImport } from "@/lib/pending-import";

/**
 * Project-page top-right actions: Add credential, Request from client,
 * Import .env, Activity link, Settings link, and the unlock status
 * indicator. Several entry points are clickable via data-action
 * attributes on the empty-state card so the same handlers power both
 * pathways.
 */
export function ProjectActions({
  projectId,
  clientName,
}: {
  projectId: string;
  clientName?: string;
}) {
  const router = useRouter();
  const vault = useVaultKey();
  const searchParams = useSearchParams();
  const [open, setOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [requestOpen, setRequestOpen] = React.useState(false);
  const [pendingText, setPendingText] = React.useState<string | undefined>(undefined);

  // If we arrived from the landing-page handoff (?continue_import=1) and
  // there's pending text in localStorage, auto-open the import dialog with
  // it pre-filled. Done once per mount.
  const autoOpenedRef = React.useRef(false);
  React.useEffect(() => {
    if (autoOpenedRef.current) return;
    if (searchParams.get("continue_import") !== "1") return;
    const text = loadPendingImport();
    if (!text) return;
    autoOpenedRef.current = true;
    setPendingText(text);
    if (!vault.key) {
      router.push(
        `/vault/unlock?next=/vault/${projectId}?continue_import=1`,
      );
      return;
    }
    setImportOpen(true);
  }, [searchParams, vault.key, projectId, router]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-action="open-add-credential"]')) {
        e.preventDefault();
        openAdd();
      } else if (target?.closest('[data-action="open-import-env"]')) {
        e.preventDefault();
        openImport();
      } else if (target?.closest('[data-action="open-request-credentials"]')) {
        e.preventDefault();
        setRequestOpen(true);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vault.key]);

  function openAdd() {
    if (!vault.key) {
      router.push(`/vault/unlock?next=/vault/${projectId}`);
      return;
    }
    setOpen(true);
  }

  function openImport() {
    if (!vault.key) {
      router.push(`/vault/unlock?next=/vault/${projectId}`);
      return;
    }
    setImportOpen(true);
  }

  return (
    <div className="flex items-center gap-2">
      <UnlockIndicator />
      <Link
        href={`/vault/${projectId}/audit`}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        title="Activity log"
        aria-label="Activity log"
      >
        <Activity className="h-4 w-4" />
      </Link>
      <Link
        href={`/vault/${projectId}/settings`}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        title="Engagement settings"
        aria-label="Engagement settings"
      >
        <Settings className="h-4 w-4" />
      </Link>
      <Button variant="secondary" onClick={() => setRequestOpen(true)}>
        <Mail className="h-4 w-4" /> Request from client
      </Button>
      <Button variant="secondary" onClick={openImport}>
        <Upload className="h-4 w-4" /> Import .env
      </Button>
      <Button onClick={openAdd}>
        <KeyRound className="h-4 w-4" /> Add credential
      </Button>
      <AddCredentialDialog
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
        onCreated={() => router.refresh()}
      />
      <ImportEnvDialog
        projectId={projectId}
        open={importOpen}
        onOpenChange={(o) => {
          setImportOpen(o);
          if (!o) setPendingText(undefined);
        }}
        onImported={() => router.refresh()}
        initialText={pendingText}
      />
      <RequestCredentialsDialog
        projectId={projectId}
        defaultClientName={clientName ?? ""}
        open={requestOpen}
        onOpenChange={setRequestOpen}
      />
    </div>
  );
}

function UnlockIndicator() {
  const vault = useVaultKey();
  if (vault.key) {
    return (
      <span
        title="Vault is unlocked for this tab. Closing the tab re-locks."
        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
      >
        <Unlock className="h-3 w-3" /> Unlocked
      </span>
    );
  }
  return (
    <span
      title="Vault is locked. You'll be prompted to unlock when needed."
      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600"
    >
      <Lock className="h-3 w-3" /> Locked
    </span>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useVaultKey } from "@/lib/vault-context";
import { KeyRound, Lock, Unlock, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddCredentialDialog } from "@/components/add-credential-dialog";

/**
 * Project-page top-right actions: Add credential, and the unlock status
 * indicator. Both buttons are clickable via the [data-action="open-add-credential"]
 * attribute on the empty state card so the same handler powers both entry points.
 */
export function ProjectActions({ projectId }: { projectId: string }) {
  const router = useRouter();
  const vault = useVaultKey();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-action="open-add-credential"]')) {
        e.preventDefault();
        openAdd();
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

  return (
    <div className="flex items-center gap-2">
      <UnlockIndicator />
      <Link
        href={`/vault/${projectId}/settings`}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        title="Project settings"
        aria-label="Project settings"
      >
        <Settings className="h-4 w-4" />
      </Link>
      <Button onClick={openAdd}>
        <KeyRound className="h-4 w-4" /> Add credential
      </Button>
      <AddCredentialDialog
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
        onCreated={() => router.refresh()}
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

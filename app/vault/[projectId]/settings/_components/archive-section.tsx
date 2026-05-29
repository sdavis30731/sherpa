"use client";

/**
 * ArchiveProjectSection — SHRP-014
 *
 * Soft-archive sets projects.archived_at. The project disappears from
 * /vault and frees up the free-tier slot (because the limit trigger only
 * counts non-archived projects). All data — credentials, audit log, MCP
 * tokens — is preserved.
 *
 * Un-archive is intentionally not in MVP UI. Users who change their mind
 * can ask support (or, until we have support, use the Supabase SQL Editor).
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Archive, ArchiveRestore } from "lucide-react";

export function ArchiveProjectSection({
  projectId,
  projectName,
  archivedAt,
}: {
  projectId: string;
  projectName: string;
  archivedAt: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [working, setWorking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isArchived = Boolean(archivedAt);

  async function onConfirm() {
    setError(null);
    setWorking(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const newArchivedAt = isArchived ? null : new Date().toISOString();

      const { error: upErr } = await supabase
        .from("projects")
        .update({ archived_at: newArchivedAt })
        .eq("id", projectId);
      if (upErr) throw upErr;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: isArchived ? "project_unarchived" : "project_archived",
        actor: "user",
        metadata: { project_name: projectName },
      });

      setOpen(false);
      if (isArchived) {
        router.refresh();
      } else {
        router.push("/vault");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="space-y-3 text-sm text-slate-700">
        {isArchived ? (
          <>
            <Callout tone="info">
              This project is archived. Un-archive to use it again (it will
              count against your free-tier project limit).
            </Callout>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <ArchiveRestore className="h-4 w-4" /> Un-archive project
            </Button>
          </>
        ) : (
          <>
            <p>
              Archiving hides the project from your vault list and frees up
              your free-tier slot. Everything in it — credentials, audit log,
              MCP tokens — stays intact.
            </p>
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <Archive className="h-4 w-4" /> Archive project
            </Button>
          </>
        )}
      </div>

      <Dialog
        open={open}
        onOpenChange={(o) => !working && setOpen(o)}
        title={isArchived ? "Un-archive this project?" : "Archive this project?"}
        description={
          isArchived
            ? "It will reappear in your vault list."
            : "It will be hidden from your vault list. You can come back here to un-archive it."
        }
        className="max-w-md"
      >
        <div className="space-y-3">
          {error && <Callout tone="danger">{error}</Callout>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={working}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={working}>
              {working
                ? "Working..."
                : isArchived
                  ? "Un-archive"
                  : "Archive"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

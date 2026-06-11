"use client";

import * as React from "react";
import { FileCheck } from "lucide-react";
import { IssueCustodyDialog } from "./issue-dialog";

/**
 * SHRP-098 — Issue Custody Record button + dialog wrapper.
 *
 * Lives in the draft CTA banner on the view page. Click → opens the
 * IssueCustodyDialog, which POSTs to /api/custody/[projectId]/issue
 * and refreshes the page so the watermark drops.
 */
export function IssueButton({
  projectId,
  clientName,
}: {
  projectId: string;
  clientName: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
      >
        <FileCheck className="h-4 w-4" />
        Issue Custody Record
      </button>
      <IssueCustodyDialog
        projectId={projectId}
        clientName={clientName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateProjectDialog } from "@/components/create-project-dialog";

/**
 * Client island for the "New project" button on the vault home.
 * Also catches clicks on the empty-state inline button by listening
 * for [data-action="open-new-project"].
 */
export function VaultHomeActions() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-action="open-new-project"]')) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> New project
      </Button>
      <CreateProjectDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

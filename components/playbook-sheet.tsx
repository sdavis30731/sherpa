"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { getPlaybook, SECTION_LABELS, type Section } from "@/lib/playbooks";
import { getService } from "@/lib/services";
import { Callout } from "@/components/ui/callout";
import { BookOpen, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ORDER: Section[] = ["overview", "find", "scopes", "rotation", "revoke", "pitfalls"];

export function PlaybookSheet({
  serviceId,
  section,
  onClose,
  onSectionChange,
}: {
  serviceId: string | null;
  section: Section | null;
  onClose: () => void;
  onSectionChange: (s: Section) => void;
}) {
  const open = serviceId !== null;
  const playbook = serviceId ? getPlaybook(serviceId) : null;
  const service = serviceId ? getService(serviceId) : null;

  // When a section is selected, scroll its content into view.
  React.useEffect(() => {
    if (!open || !section) return;
    const id = `playbook-${section}`;
    requestAnimationFrame(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [open, section]);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title={service ? `${service.name} playbook` : "Playbook"}
      description={
        playbook
          ? `Last reviewed ${new Date(playbook.meta.lastReviewed).toLocaleDateString()}`
          : undefined
      }
      width="max-w-2xl"
    >
      {!playbook ? (
        <div className="p-6">
          <Callout tone="info" title="Playbook not written yet.">
            We&apos;re still writing the playbook for{" "}
            {service?.name ?? "this service"}. Stripe is the first one — others
            will land before launch. In the meantime, the credential is stored
            and rotation tracking works.
          </Callout>
        </div>
      ) : (
        <div>
          {/* Sticky section nav */}
          <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-2 py-2 backdrop-blur">
            <ul className="flex flex-wrap gap-1">
              {ORDER.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => onSectionChange(s)}
                    className={cn(
                      "rounded-md px-2 py-1 text-xs font-medium transition",
                      section === s
                        ? "bg-sherpa-50 text-sherpa-700"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {SECTION_LABELS[s]}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Header strip with the playbook intro */}
          <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
            <div className="flex items-start gap-2 text-xs text-slate-600">
              <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sherpa-500" />
              <p>
                Sherpa keeps these playbooks current. If anything below looks
                wrong, you can flag it from your project settings.
              </p>
            </div>
          </div>

          {/* Body — the playbook's exported component renders all sections */}
          <playbook.Body />

          {/* Footer marker */}
          <div className="border-t border-slate-100 px-6 py-4 text-xs text-slate-500">
            <Info className="-mt-0.5 mr-1 inline h-3 w-3" />
            Playbook ID: <code className="font-mono">{playbook.meta.service}</code>{" "}
            · last reviewed{" "}
            {new Date(playbook.meta.lastReviewed).toLocaleDateString()}
          </div>
        </div>
      )}
    </Sheet>
  );
}


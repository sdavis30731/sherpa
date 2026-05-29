"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Side drawer — slides in from the right with a backdrop. Used by the
 * playbook viewer. Distinct from Dialog (modal in the center).
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  width = "max-w-xl",
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** Tailwind max-width class for the panel. Default max-w-xl ≈ 576px. */
  width?: string;
  className?: string;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "sheet-title" : undefined}
      className="fixed inset-0 z-50"
    >
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "absolute right-0 top-0 flex h-full w-full flex-col bg-white shadow-2xl",
          width,
          className,
        )}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            {title && (
              <h2 id="sheet-title" className="truncate text-lg font-semibold text-slate-900">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 truncate text-sm text-slate-600">{description}</p>
            )}
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="ml-3 shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

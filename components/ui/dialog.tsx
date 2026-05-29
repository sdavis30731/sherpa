"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  /** Set to false to disable closing on backdrop click. */
  dismissible?: boolean;
}

/**
 * Minimal accessible modal dialog. No external dependency — uses a fixed
 * overlay + content panel and traps focus on Escape.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  dismissible = true,
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && dismissible) onOpenChange(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, dismissible, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => dismissible && onOpenChange(false)}
      />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-xl",
          className,
        )}
      >
        {(title || dismissible) && (
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
            <div>
              {title && (
                <h2 id="dialog-title" className="text-lg font-semibold text-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              )}
            </div>
            {dismissible && (
              <button
                onClick={() => onOpenChange(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

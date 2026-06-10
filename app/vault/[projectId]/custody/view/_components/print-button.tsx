"use client";

import * as React from "react";
import { Printer } from "lucide-react";

/**
 * Tiny client island — triggers window.print(). The @media print rules on
 * the page hide everything outside the .custody-record element so the
 * resulting PDF is the document, not the dashboard chrome.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md bg-sherpa-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sherpa-600"
    >
      <Printer className="h-4 w-4" />
      Export PDF
    </button>
  );
}

"use client";

/**
 * When the URL has ?credential=ID, scroll to the matching row and flash it
 * briefly. If ?playbook=SECTION is also set, open the playbook for that
 * credential's service to that section. Used by the Needs Attention widget
 * on /vault.
 */

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useOpenPlaybook } from "@/components/playbook-context";
import { parseSection } from "@/lib/playbooks";

export function ScrollToCredential({
  credentialServiceMap,
}: {
  /** Map of credential id → service id, so we can open the right playbook. */
  credentialServiceMap: Record<string, string>;
}) {
  const params = useSearchParams();
  const credId = params.get("credential");
  const playbookSection = parseSection(params.get("playbook"));
  const { open } = useOpenPlaybook();

  React.useEffect(() => {
    if (!credId) return;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`cred-${credId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("bg-amber-50");
      const t = setTimeout(() => el.classList.remove("bg-amber-50"), 1800);

      if (playbookSection) {
        const serviceId = credentialServiceMap[credId];
        if (serviceId) open(serviceId, playbookSection);
      }
      return () => clearTimeout(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [credId, playbookSection, credentialServiceMap, open]);

  return null;
}

"use client";

/**
 * Playbook context — SHRP-015
 *
 * One PlaybookSheet per project page. Any descendant (credential row,
 * URL deep-link handler, future Add-credential flow) can call
 * useOpenPlaybook(serviceId, section?) to open it.
 *
 * Centralising this means we never have to coordinate between many open
 * sheets and the deep link URL.
 */

import * as React from "react";
import { PlaybookSheet } from "@/components/playbook-sheet";
import type { Section } from "@/lib/playbooks";

interface PlaybookState {
  serviceId: string | null;
  section: Section | null;
  open: (serviceId: string, section?: Section | null) => void;
  close: () => void;
  goToSection: (section: Section) => void;
}

const Ctx = React.createContext<PlaybookState | null>(null);

export function PlaybookProvider({ children }: { children: React.ReactNode }) {
  const [serviceId, setServiceId] = React.useState<string | null>(null);
  const [section, setSection] = React.useState<Section | null>(null);

  const value = React.useMemo<PlaybookState>(
    () => ({
      serviceId,
      section,
      open: (svc, sec) => {
        setServiceId(svc);
        setSection(sec ?? null);
      },
      close: () => {
        setServiceId(null);
        setSection(null);
      },
      goToSection: (s) => setSection(s),
    }),
    [serviceId, section],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <PlaybookSheet
        serviceId={serviceId}
        section={section}
        onClose={() => {
          setServiceId(null);
          setSection(null);
        }}
        onSectionChange={(s) => setSection(s)}
      />
    </Ctx.Provider>
  );
}

export function useOpenPlaybook() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useOpenPlaybook must be used inside PlaybookProvider");
  return ctx;
}

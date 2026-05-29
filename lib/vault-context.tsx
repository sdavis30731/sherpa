"use client";

/**
 * Vault key context — SHRP-004
 *
 * Holds the derived AES-GCM CryptoKey in React context for the duration of
 * the page session. The key is:
 *   - NEVER written to localStorage, sessionStorage, IndexedDB, or cookies
 *   - Cleared on tab close (because React state is in-memory)
 *   - Cleared on explicit `lock()`
 *
 * Refreshing the page forces re-unlock. That is the intended tradeoff.
 */

import * as React from "react";

type VaultState = {
  key: CryptoKey | null;
  unlockedAt: number | null;
  unlock: (k: CryptoKey) => void;
  lock: () => void;
};

const VaultCtx = React.createContext<VaultState | null>(null);

export function VaultKeyProvider({ children }: { children: React.ReactNode }) {
  const [key, setKey] = React.useState<CryptoKey | null>(null);
  const [unlockedAt, setUnlockedAt] = React.useState<number | null>(null);

  const value = React.useMemo<VaultState>(
    () => ({
      key,
      unlockedAt,
      unlock: (k) => {
        setKey(k);
        setUnlockedAt(Date.now());
      },
      lock: () => {
        setKey(null);
        setUnlockedAt(null);
      },
    }),
    [key, unlockedAt],
  );

  return <VaultCtx.Provider value={value}>{children}</VaultCtx.Provider>;
}

export function useVaultKey() {
  const ctx = React.useContext(VaultCtx);
  if (!ctx) throw new Error("useVaultKey must be used inside VaultKeyProvider");
  return ctx;
}

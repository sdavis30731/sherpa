"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { cn } from "@/lib/utils";

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  "read-credential-names": {
    label: "Read credential names",
    description: "Agent can list which services are configured (no secret values).",
  },
  "call-api": {
    label: "Call third-party APIs",
    description: "Agent can make API calls to Stripe, GitHub, etc. using your stored keys — Sherpa injects the secret server-side, the agent never sees it.",
  },
  rotate: {
    label: "Initiate rotations",
    description: "Agent can ask the user to rotate a credential via the in-app flow.",
  },
};

export function GenerateTokenDialog({
  projectId,
  open,
  onOpenChange,
  onCreated,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (token: { id: string; token: string; name: string }) => void;
}) {
  const [name, setName] = React.useState("");
  const [scopes, setScopes] = React.useState<string[]>([
    "read-credential-names",
    "call-api",
  ]);
  const [error, setError] = React.useState<string | null>(null);
  const [working, setWorking] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setName("");
      setScopes(["read-credential-names", "call-api"]);
      setError(null);
    }
  }, [open]);

  function toggleScope(s: string) {
    setScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Give the token a name so you remember what it's for.");
      return;
    }
    if (scopes.length === 0) {
      setError("Pick at least one scope.");
      return;
    }
    setWorking(true);
    try {
      const res = await fetch("/api/mcp-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          name: name.trim(),
          scopes,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { id: string; token: string };
      onCreated({ id: data.id, token: data.token, name: name.trim() });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create token");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !working && onOpenChange(o)}
      title="Generate an agent token"
      description="One token per agent or per machine. You can revoke any time."
      className="max-w-lg"
    >
      <form onSubmit={onCreate} className="space-y-4">
        <div>
          <Label htmlFor="token-name">Token name</Label>
          <Input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Claude Desktop on my Mac"
            autoFocus
          />
          <p className="mt-1 text-xs text-slate-500">
            Pick something that tells you which agent or machine this is for,
            so you know which one to revoke if a laptop is lost.
          </p>
        </div>

        <div>
          <Label>Scopes</Label>
          <div className="mt-1 space-y-2">
            {Object.entries(SCOPE_LABELS).map(([id, info]) => {
              const checked = scopes.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleScope(id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-md border bg-white px-3 py-2 text-left transition",
                    checked
                      ? "border-sherpa-500 ring-1 ring-sherpa-500"
                      : "border-slate-200 hover:border-sherpa-300 hover:bg-sherpa-50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    readOnly
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-sherpa-500"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-900">
                      {info.label}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {info.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => onOpenChange(false)}
            disabled={working}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={working || !name.trim()}>
            {working ? "Generating..." : "Generate token"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

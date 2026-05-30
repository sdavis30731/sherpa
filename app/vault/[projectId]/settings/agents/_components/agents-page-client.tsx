"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Plus, Trash2, Bot, Clock } from "lucide-react";
import { GenerateTokenDialog } from "./generate-token-dialog";
import { ConfigGenerator } from "./config-generator";
import type { McpTokenRow } from "../page";
import { cn } from "@/lib/utils";

export function AgentsPageClient({
  projectId,
  tokens,
  mcpEndpoint,
}: {
  projectId: string;
  tokens: McpTokenRow[];
  mcpEndpoint: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [justCreated, setJustCreated] = React.useState<{
    id: string;
    token: string;
    name: string;
  } | null>(null);

  const active = tokens.filter((t) => !t.revoked_at);
  const revoked = tokens.filter((t) => t.revoked_at);

  async function onRevoke(tokenId: string) {
    if (!confirm("Revoke this token? Any agent currently using it will stop working immediately.")) {
      return;
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("mcp_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", tokenId);
      if (error) throw error;

      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "mcp_token_revoked",
        actor: "user",
        metadata: { token_id: tokenId },
      });

      // If the revoked token was the one we just created and are still showing
      // in the config preview, clear it.
      if (justCreated?.id === tokenId) setJustCreated(null);

      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not revoke");
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Active tokens */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-sherpa-500" />
                Agent tokens
              </CardTitle>
              <Button onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New token
              </Button>
            </div>
          </CardHeader>
          <CardBody className="!p-0">
            {active.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500">
                  No tokens yet. Generate one to connect an AI agent.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {active.map((t) => (
                  <TokenRow key={t.id} t={t} onRevoke={onRevoke} />
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Config generator — only shown if there's a token to use */}
        {(justCreated || active.length > 0) && (
          <ConfigGenerator
            mcpEndpoint={mcpEndpoint}
            token={justCreated?.token ?? null}
            tokenName={justCreated?.name ?? active[0]?.name}
            hasJustCreated={Boolean(justCreated)}
          />
        )}

        {/* Revoked tokens — for audit */}
        {revoked.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revoked tokens</CardTitle>
            </CardHeader>
            <CardBody className="!p-0">
              <ul className="divide-y divide-slate-100">
                {revoked.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 px-6 py-3 text-sm"
                  >
                    <span className="line-through text-slate-500">{t.name}</span>
                    <span className="ml-auto text-xs text-slate-400">
                      Revoked {new Date(t.revoked_at!).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        )}
      </div>

      <GenerateTokenDialog
        projectId={projectId}
        open={open}
        onOpenChange={setOpen}
        onCreated={(t) => {
          setJustCreated(t);
          router.refresh();
        }}
      />

      {/* One-time token reveal */}
      {justCreated && (
        <div className="fixed bottom-4 right-4 z-40 max-w-md">
          <Callout tone="success" title={`Token "${justCreated.name}" created.`}>
            <p className="mb-2 text-xs">
              Copy it now — this is the only time you&apos;ll see the full
              value. After you close this banner, only the hashed version
              remains in the database.
            </p>
            <div className="flex items-center gap-2 rounded-md bg-white px-2 py-1.5">
              <code className="break-all font-mono text-xs text-emerald-900 flex-1">
                {justCreated.token}
              </code>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(justCreated.token);
                  alert("Token copied to clipboard");
                }}
                className="shrink-0 rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => setJustCreated(null)}
              className="mt-2 text-xs font-medium text-emerald-800 hover:underline"
            >
              Dismiss (I copied it)
            </button>
          </Callout>
        </div>
      )}
    </>
  );
}

function TokenRow({
  t,
  onRevoke,
}: {
  t: McpTokenRow;
  onRevoke: (id: string) => void;
}) {
  const scopes = Array.isArray(t.scopes) ? t.scopes : [];
  return (
    <li className="flex items-center gap-3 px-6 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-900">
            {t.name}
          </span>
          {scopes.map((s) => (
            <span
              key={s}
              className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mt-0.5 text-xs text-slate-500">
          <Clock className="-mt-0.5 mr-1 inline h-3 w-3" />
          {t.last_used_at
            ? `Last used ${new Date(t.last_used_at).toLocaleString()}`
            : `Created ${new Date(t.created_at).toLocaleDateString()} · never used`}
        </div>
      </div>
      <button
        onClick={() => onRevoke(t.id)}
        title="Revoke"
        aria-label="Revoke token"
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-red-50 hover:text-red-600",
        )}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </li>
  );
}

"use client";

/**
 * MCP config generator — SHRP-034
 *
 * Produces a paste-ready config snippet for each major MCP-speaking AI
 * client. The user picks their client from the tab bar, sees a JSON block
 * with their actual token embedded (if they just generated one) or a
 * `<YOUR_SHERPA_TOKEN>` placeholder, and clicks Copy.
 *
 * Each tab also includes a one-line install instruction.
 */

import * as React from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { Copy, Check, ExternalLink, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

type ClientId = "claude-desktop" | "cowork" | "cursor" | "openai" | "generic";

interface ClientInfo {
  id: ClientId;
  name: string;
  /** Where the config snippet should be pasted. */
  configLocation: string;
  /** Direct doc link the user can open for full install steps. */
  docsUrl?: string;
}

const CLIENTS: ClientInfo[] = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    configLocation:
      "Edit ~/Library/Application Support/Claude/claude_desktop_config.json",
    docsUrl: "https://docs.anthropic.com/claude/docs/mcp",
  },
  {
    id: "cowork",
    name: "Cowork",
    configLocation: "Cowork → Settings → MCP servers → Add MCP server",
    docsUrl: "https://docs.claude.com/en/docs/claude-code/mcp",
  },
  {
    id: "cursor",
    name: "Cursor",
    configLocation: "Edit ~/.cursor/mcp.json",
    docsUrl: "https://docs.cursor.com/context/model-context-protocol",
  },
  {
    id: "openai",
    name: "OpenAI Agents",
    configLocation: "Use the snippet as a tool registration in your agent setup",
    docsUrl: "https://platform.openai.com/docs/guides/tools",
  },
  {
    id: "generic",
    name: "Generic",
    configLocation: "Any MCP client that supports HTTP transport",
  },
];

interface Props {
  mcpEndpoint: string;
  /** If just generated, embedded in the snippet. Otherwise we show a placeholder. */
  token: string | null;
  tokenName: string | undefined;
  hasJustCreated: boolean;
}

export function ConfigGenerator({
  mcpEndpoint,
  token,
  tokenName,
  hasJustCreated,
}: Props) {
  const [active, setActive] = React.useState<ClientId>("claude-desktop");
  const [copied, setCopied] = React.useState(false);

  const tokenValue = token ?? "<YOUR_SHERPA_TOKEN>";
  const snippet = buildSnippet(active, mcpEndpoint, tokenValue);

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const client = CLIENTS.find((c) => c.id === active)!;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-sherpa-500" />
          Connect an AI client
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-2">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setActive(c.id)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                active === c.id
                  ? "bg-sherpa-50 text-sherpa-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {c.name}
            </button>
          ))}
        </div>

        {!hasJustCreated && (
          <Callout tone="warning">
            The token below is replaced with{" "}
            <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
              &lt;YOUR_SHERPA_TOKEN&gt;
            </code>{" "}
            because we don&apos;t store plaintext tokens — you can&apos;t see an
            existing one again. Generate a new token (top of page) to get a
            snippet with the real value embedded.
          </Callout>
        )}

        <div>
          <div className="mb-2 text-xs text-slate-500">{client.configLocation}</div>
          <pre className="relative overflow-x-auto rounded-md border border-slate-200 bg-slate-900 p-4 text-xs text-slate-100">
            <button
              type="button"
              onClick={copy}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded bg-slate-700 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-600"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" /> Copy
                </>
              )}
            </button>
            <code className="font-mono">{snippet}</code>
          </pre>
        </div>

        {client.docsUrl && (
          <a
            href={client.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-sherpa-600 hover:underline"
          >
            How to install MCP for {client.name}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {hasJustCreated && (
          <p className="text-xs text-emerald-700">
            This snippet has your fresh token <strong>{tokenName}</strong> baked
            in. Paste it once into the client&apos;s config, then you don&apos;t
            need to remember the token — Sherpa only validates the hashed form.
          </p>
        )}
      </CardBody>
    </Card>
  );
}

// ---------------- snippet builders ----------------

function buildSnippet(
  clientId: ClientId,
  endpoint: string,
  token: string,
): string {
  switch (clientId) {
    case "claude-desktop":
      return JSON.stringify(
        {
          mcpServers: {
            sherpa: {
              url: endpoint,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      );
    case "cowork":
      return JSON.stringify(
        {
          mcpServers: {
            sherpa: {
              transport: "http",
              url: endpoint,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      );
    case "cursor":
      return JSON.stringify(
        {
          mcpServers: {
            sherpa: {
              url: endpoint,
              headers: { Authorization: `Bearer ${token}` },
            },
          },
        },
        null,
        2,
      );
    case "openai":
      return JSON.stringify(
        {
          type: "mcp",
          server: { url: endpoint, auth: `Bearer ${token}` },
          tools: ["sherpa_list_services", "sherpa_call_api", "sherpa_rotate"],
        },
        null,
        2,
      );
    case "generic":
    default:
      return [
        `# Connect any MCP client to Sherpa over HTTP transport.`,
        `# Endpoint: ${endpoint}`,
        `# Auth header:`,
        `Authorization: Bearer ${token}`,
        ``,
        `# Available tools:`,
        `#   sherpa_list_services   (read-credential-names)`,
        `#   sherpa_call_api        (call-api)`,
        `#   sherpa_rotate          (rotate)`,
      ].join("\n");
  }
}

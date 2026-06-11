/**
 * MCP stdio server.
 *
 * Exposes two tools to the AI:
 *
 *   sherpa_list_services()
 *     → list of credentials the AI can use (without the values)
 *
 *   sherpa_call_api({ service, name, method, path, body?, headers? })
 *     → forwards a call to the upstream API using the stored credential.
 *       Read-only in v0.1. Writes return a clear error.
 *
 * The MCP protocol runs over stdio (one JSON-RPC request per line, no
 * network). Claude Desktop spawns this process and talks to it via
 * stdin/stdout. The credential VALUES never appear in stdout — they
 * stay in process memory.
 *
 * v0.1 limitations the user sees clearly:
 *   - Writes are refused with a "coming in v0.2" message.
 *   - No audit log persistence (calls are logged to stderr).
 *   - No rate limiting (local, single-user; not a SaaS).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  getProvider,
  isReadOnly,
  listProviders,
} from "./providers.js";
import type { Credential } from "./vault.js";

export interface ServerOptions {
  /** Unlocked credentials (decrypted, in memory). */
  credentials: Credential[];
}

export async function startMcpServer(opts: ServerOptions): Promise<void> {
  const server = new Server(
    {
      name: "sherpakeys-mcp-firewall",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // -------------------------------------------------
  // list_tools — describe the two tools we expose
  // -------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "sherpa_list_services",
        description:
          "List the API credentials available through the local SherpaKeys firewall. Returns service + name (no key values). Call this first to discover what services you can use.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "sherpa_call_api",
        description:
          "Call an upstream API (Stripe, GitHub) using a credential from the local vault. The credential value is never returned to you. v0.1 supports read-only calls (GET). Write actions return a clear 'requires hosted SherpaKeys' error.",
        inputSchema: {
          type: "object",
          required: ["service", "name", "method", "path"],
          properties: {
            service: {
              type: "string",
              description:
                "Service id, e.g. 'stripe' or 'github'. See sherpa_list_services for available ids.",
            },
            name: {
              type: "string",
              description:
                "Credential name, e.g. 'STRIPE_SECRET_KEY' or 'GITHUB_TOKEN'.",
            },
            method: {
              type: "string",
              enum: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
              description:
                "HTTP method. v0.1 only allows read methods (GET, HEAD).",
            },
            path: {
              type: "string",
              description:
                "Path including leading slash, e.g. '/v1/customers' for Stripe.",
            },
            body: {
              description:
                "Optional request body. Object will be JSON-encoded. String passes through.",
            },
            headers: {
              type: "object",
              description: "Optional extra headers (Authorization is ignored).",
            },
          },
        },
      },
    ],
  }));

  // -------------------------------------------------
  // call_tool — dispatch to one of the two tools
  // -------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "sherpa_list_services") {
      // Return the credentials we have — WITHOUT values.
      const services = opts.credentials.map((c) => ({
        service: c.service,
        name: c.name,
        added_at: c.added_at,
      }));
      const providers = listProviders().map((p) => ({
        id: p.id,
        name: p.name,
        baseUrl: p.baseUrl,
        read_patterns_count: p.readPatterns.length,
      }));
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                credentials: services,
                supported_providers: providers,
                mode: "read-only (v0.1)",
              },
              null,
              2,
            ),
          },
        ],
      };
    }

    if (name === "sherpa_call_api") {
      const callArgs = args as {
        service?: string;
        name?: string;
        method?: string;
        path?: string;
        body?: unknown;
        headers?: Record<string, string>;
      };
      const result = await handleCallApi(opts.credentials, callArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        isError: result.error !== undefined,
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  });

  // -------------------------------------------------
  // Connect stdio transport — this is what Claude Desktop talks to.
  // -------------------------------------------------
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't corrupt the stdio JSON-RPC stream.
  process.stderr.write(
    `SherpaKeys MCP firewall v0.1.0 ready. ${opts.credentials.length} credential(s) unlocked.\n`,
  );
}

/**
 * Execute a sherpa_call_api request: validate, look up credential,
 * check read-only allow-list, dispatch upstream.
 */
async function handleCallApi(
  credentials: Credential[],
  args: {
    service?: string;
    name?: string;
    method?: string;
    path?: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
): Promise<{
  status?: number;
  body?: string;
  error?: string;
}> {
  const service = args.service?.toLowerCase();
  const name = args.name;
  const method = args.method?.toUpperCase();
  const path = args.path;

  if (!service || !name || !method || !path) {
    return {
      error:
        "Missing required argument. Need service, name, method, path.",
    };
  }
  if (!path.startsWith("/")) {
    return {
      error: `Path must start with "/". Got: ${path}`,
    };
  }

  const provider = getProvider(service);
  if (!provider) {
    return {
      error: `Unknown service "${service}". Supported in v0.1: stripe, github. Run sherpa_list_services for details.`,
    };
  }

  const credential = credentials.find(
    (c) => c.service.toLowerCase() === service && c.name === name,
  );
  if (!credential) {
    return {
      error: `No credential named "${name}" for service "${service}". Add one with \`sherpakeys-mcp-firewall add ${service} ${name}\`.`,
    };
  }

  if (!isReadOnly(provider, method, path)) {
    return {
      error:
        `Write actions are not supported in v0.1 of the local firewall. ${method} ${path} is outside the read-only allow-list. ` +
        `Write-action approval (email + browser confirmation) is in the hosted SherpaKeys; the local firewall will get it in v0.2.`,
    };
  }

  // Build and dispatch.
  const url = provider.baseUrl + path;
  const outboundHeaders: Record<string, string> = {
    "User-Agent": "sherpakeys-mcp-firewall/0.1.0",
    ...(args.headers ?? {}),
    ...provider.buildAuthHeaders(credential.value),
  };

  // Reserved headers we never let the model override.
  delete outboundHeaders["host"];
  delete outboundHeaders["content-length"];

  let outboundBody: string | undefined;
  if (args.body !== undefined && args.body !== null && method !== "GET") {
    if (typeof args.body === "string") {
      outboundBody = args.body;
    } else {
      outboundBody = JSON.stringify(args.body);
      outboundHeaders["Content-Type"] = "application/json";
    }
  }

  process.stderr.write(
    `→ ${method} ${url}\n`,
  );

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: outboundHeaders,
      body: outboundBody,
    });
  } catch (err) {
    return {
      error: `Network error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const text = await response.text();
  process.stderr.write(`← ${response.status}\n`);

  return {
    status: response.status,
    body: text,
  };
}

#!/usr/bin/env node
/**
 * sherpakeys-mcp-firewall — CLI entry point.
 *
 * Subcommands:
 *   init                         Create a new encrypted vault.
 *   add <service> <name>         Add a credential to the vault.
 *   serve                        Run the MCP stdio server.
 *   config                       Print Claude Desktop config snippet.
 *   --version, --help
 *
 * The CLI prompts for the master passphrase using node-readline with
 * stdin echo disabled — no external prompt library, no `inquirer` dep.
 */

import { createInterface } from "node:readline";
import { stdin, stdout, stderr, exit, argv } from "node:process";
import { listProviders } from "./providers.js";
import {
  vaultExists,
  createVault,
  loadVault,
  saveVault,
  addCredential,
  VAULT_PATH,
} from "./vault.js";
import { startMcpServer } from "./server.js";

const VERSION = "0.1.0";

async function main(): Promise<void> {
  const args = argv.slice(2);
  const cmd = args[0];

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    printHelp();
    return;
  }
  if (cmd === "--version" || cmd === "-v" || cmd === "version") {
    stdout.write(`sherpakeys-mcp-firewall ${VERSION}\n`);
    return;
  }

  switch (cmd) {
    case "init":
      await cmdInit();
      break;
    case "add":
      await cmdAdd(args.slice(1));
      break;
    case "serve":
      await cmdServe();
      break;
    case "config":
      cmdConfig();
      break;
    default:
      stderr.write(`Unknown command: ${cmd}\n\n`);
      printHelp();
      exit(1);
  }
}

function printHelp(): void {
  stdout.write(`
sherpakeys-mcp-firewall ${VERSION}
Local AI firewall — your AI uses your API keys without ever seeing them.

Usage:
  sherpakeys-mcp-firewall init                Create an encrypted vault.
  sherpakeys-mcp-firewall add <svc> <name>    Add a credential.
  sherpakeys-mcp-firewall serve               Run as MCP stdio server.
  sherpakeys-mcp-firewall config              Print Claude Desktop config.
  sherpakeys-mcp-firewall --version           Show version.
  sherpakeys-mcp-firewall --help              Show this help.

Supported services in v0.1: ${listProviders()
    .map((p) => p.id)
    .join(", ")}

Vault location: ${VAULT_PATH}
Docs: https://sherpakeys.com
`);
}

// ============================================================
// init
// ============================================================
async function cmdInit(): Promise<void> {
  if (vaultExists()) {
    stderr.write(
      `A vault already exists at ${VAULT_PATH}.\n` +
        `Delete it manually if you really want to start over.\n`,
    );
    exit(1);
  }
  stdout.write(`Creating a new SherpaKeys vault at ${VAULT_PATH}\n\n`);
  stdout.write(
    `Choose a master passphrase. You will need it to unlock the vault\n` +
      `every time the MCP server starts. SherpaKeys cannot recover it for you.\n` +
      `Use something long — 5+ random words is a good baseline.\n\n`,
  );

  const passphrase = await promptHidden("Master passphrase: ");
  if (passphrase.length < 12) {
    stderr.write(
      `\nPassphrase must be at least 12 characters. Try again.\n`,
    );
    exit(1);
  }
  const confirm = await promptHidden("Confirm passphrase: ");
  if (confirm !== passphrase) {
    stderr.write(`\nPassphrases don't match. Try again.\n`);
    exit(1);
  }

  createVault(passphrase);
  stdout.write(`\n✓ Vault created at ${VAULT_PATH}\n\n`);
  stdout.write(`Next steps:\n`);
  stdout.write(
    `  1. Add a credential:  sherpakeys-mcp-firewall add stripe STRIPE_SECRET_KEY\n`,
  );
  stdout.write(
    `  2. Wire into Claude:  sherpakeys-mcp-firewall config\n`,
  );
  stdout.write(`  3. Run the server:    sherpakeys-mcp-firewall serve\n\n`);
}

// ============================================================
// add
// ============================================================
async function cmdAdd(args: string[]): Promise<void> {
  const [service, name] = args;
  if (!service || !name) {
    stderr.write(`Usage: sherpakeys-mcp-firewall add <service> <name>\n`);
    stderr.write(
      `Example: sherpakeys-mcp-firewall add stripe STRIPE_SECRET_KEY\n\n`,
    );
    stderr.write(
      `Supported services: ${listProviders().map((p) => p.id).join(", ")}\n`,
    );
    exit(1);
  }
  if (!listProviders().some((p) => p.id === service.toLowerCase())) {
    stderr.write(
      `Unknown service "${service}". Supported in v0.1: ${listProviders()
        .map((p) => p.id)
        .join(", ")}\n`,
    );
    exit(1);
  }

  const passphrase = await promptHidden("Master passphrase: ");
  let data;
  try {
    data = loadVault(passphrase);
  } catch (err) {
    stderr.write(
      `\n${err instanceof Error ? err.message : String(err)}\n`,
    );
    exit(1);
  }

  const value = await promptHidden(`Value for ${name}: `);
  if (!value) {
    stderr.write(`\nCredential value cannot be empty.\n`);
    exit(1);
  }

  const updated = addCredential(data, {
    service: service.toLowerCase(),
    name,
    value,
  });
  saveVault(updated, passphrase);
  stdout.write(`\n✓ Added ${service}/${name} to vault.\n`);
  stdout.write(
    `  Total credentials: ${updated.credentials.length}\n\n`,
  );
}

// ============================================================
// serve
// ============================================================
async function cmdServe(): Promise<void> {
  // When run as an MCP server, stdout is the JSON-RPC transport — we
  // must not write to it. All prompts and logs go to stderr.
  const isClaudeDesktop = !stdin.isTTY;

  let passphrase: string;
  if (isClaudeDesktop) {
    // Claude Desktop spawns us with stdin connected. We can't prompt
    // interactively. Read the passphrase from SHERPAKEYS_PASSPHRASE.
    const envPass = process.env.SHERPAKEYS_PASSPHRASE;
    if (!envPass) {
      stderr.write(
        `[sherpakeys] No TTY available and SHERPAKEYS_PASSPHRASE is not set.\n` +
          `When Claude Desktop launches this server, set the passphrase in its\n` +
          `mcpServers config:  "env": { "SHERPAKEYS_PASSPHRASE": "..." }\n`,
      );
      exit(1);
    }
    passphrase = envPass;
  } else {
    passphrase = await promptHidden("Master passphrase: ", stderr);
  }

  let data;
  try {
    data = loadVault(passphrase);
  } catch (err) {
    stderr.write(
      `\n[sherpakeys] ${err instanceof Error ? err.message : String(err)}\n`,
    );
    exit(1);
  }

  await startMcpServer({ credentials: data.credentials });
  // Keep the process alive — the MCP transport handles its own lifecycle.
}

// ============================================================
// config — print Claude Desktop snippet
// ============================================================
function cmdConfig(): void {
  // Resolve the absolute path so the user can paste a literal command.
  const cliPath = argv[1] ?? "/path/to/sherpakeys-mcp-firewall/dist/cli.js";
  const snippet = {
    mcpServers: {
      sherpakeys: {
        command: "node",
        args: [cliPath, "serve"],
        env: {
          SHERPAKEYS_PASSPHRASE: "<your master passphrase here>",
        },
      },
    },
  };
  stdout.write(`\n# Add this to your Claude Desktop config:\n`);
  stdout.write(`# macOS:    ~/Library/Application Support/Claude/claude_desktop_config.json\n`);
  stdout.write(`# Windows:  %APPDATA%\\Claude\\claude_desktop_config.json\n\n`);
  stdout.write(JSON.stringify(snippet, null, 2));
  stdout.write(`\n\n`);
  stdout.write(
    `# After saving the config, fully quit and restart Claude Desktop.\n`,
  );
  stdout.write(
    `# In a new conversation, ask: "what services can you use?"\n`,
  );
  stdout.write(
    `# Claude should call sherpa_list_services and tell you what's available.\n\n`,
  );
}

// ============================================================
// Hidden-input prompt — no external dep.
// ============================================================
function promptHidden(
  prompt: string,
  outStream: NodeJS.WritableStream = stdout,
): Promise<string> {
  return new Promise((resolve) => {
    outStream.write(prompt);
    const rl = createInterface({
      input: stdin,
      output: outStream,
      terminal: true,
    });
    // Override _writeToOutput so the user's keystrokes don't echo.
    const rlAny = rl as unknown as {
      _writeToOutput: (s: string) => void;
    };
    rlAny._writeToOutput = (s: string) => {
      // Allow Enter to pass through, mask everything else.
      if (s.includes("\n") || s.includes("\r")) {
        outStream.write(s);
      }
    };
    rl.question("", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

main().catch((err) => {
  stderr.write(`\nError: ${err instanceof Error ? err.message : String(err)}\n`);
  exit(1);
});

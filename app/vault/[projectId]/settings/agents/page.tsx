import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Callout } from "@/components/ui/callout";
import { ChevronLeft, Bot } from "lucide-react";
import { AgentsPageClient } from "./_components/agents-page-client";
import {
  AuthorizeAgentsSection,
  type ActiveSession,
} from "./_components/authorize-section";

export interface McpTokenRow {
  id: string;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default async function AgentsSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/vault/${projectId}/settings/agents`);

  const { data: project } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) notFound();

  const { data: tokens } = await supabase
    .from("mcp_tokens")
    .select("id, name, scopes, last_used_at, created_at, revoked_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  // Active (non-revoked, non-expired) agent session for this project, if any.
  const { data: sessionRow } = await supabase
    .from("agent_sessions")
    .select("id, expires_at, authorized_at, last_used_at")
    .eq("project_id", projectId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("authorized_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const activeSession = (sessionRow ?? null) as ActiveSession | null;

  // Pre-compute the MCP server URL the user will paste into their AI client.
  // For local dev this will be localhost; in prod it picks up NEXT_PUBLIC_SITE_URL.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  const mcpEndpoint = `${siteUrl}/api/mcp/v1`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <Link
        href={`/vault/${projectId}/settings`}
        className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
      >
        <ChevronLeft className="h-4 w-4" /> Back to settings
      </Link>

      <div className="mb-2 flex items-center gap-2">
        <Bot className="h-5 w-5 text-sherpa-500" />
        <h1 className="text-2xl font-bold text-slate-900">AI Agent access</h1>
      </div>
      <p className="mb-8 text-sm text-slate-600">
        Connect Claude, Cursor, Cowork, or any MCP-speaking AI agent to your{" "}
        <strong>{project.name}</strong> vault. The agent can use your stored
        credentials to make API calls — without ever seeing the keys themselves.
      </p>

      <Callout tone="info" title="Coming online: the MCP server endpoint">
        Tokens you generate here are real and stored hashed in your database
        right now. The MCP server endpoint they connect to{" "}
        <code className="rounded bg-white px-1 py-0.5 font-mono text-xs">
          {mcpEndpoint}
        </code>{" "}
        is the next thing on the build list (SHRP-030 → 032). Once it&apos;s live,
        the tokens you create here will work immediately — no need to regenerate.
      </Callout>

      <div className="mt-6 space-y-6">
        <AuthorizeAgentsSection
          projectId={project.id}
          initialSession={activeSession}
        />

        <AgentsPageClient
          projectId={project.id}
          tokens={(tokens ?? []) as McpTokenRow[]}
          mcpEndpoint={mcpEndpoint}
        />
      </div>
    </main>
  );
}

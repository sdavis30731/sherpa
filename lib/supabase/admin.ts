/**
 * Service-role Supabase client — for server-side code that runs without
 * a user session (e.g. the MCP server endpoint, scheduled functions).
 *
 * This client bypasses Row-Level Security. Every query made through it
 * MUST be scoped manually by user_id / project_id, otherwise you risk
 * leaking one user's data to another.
 *
 * NEVER import this from a Client Component. It exists only on the server.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let cached: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin credentials. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  cached = createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

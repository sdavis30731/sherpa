-- Sherpa migration 0006 — per-token rate limiting (SHRP-035).
--
-- We log one row per MCP request, keyed by token. A pre-request count
-- of recent rows tells us whether the token has exceeded its limit.
-- Old rows are cleaned up by a function that's safe to run any time.
--
-- Why a dedicated table and not the audit_log:
--   - High-frequency: every MCP request inserts here, not just user-visible
--     actions. Mixing into audit_log would drown the human-readable
--     history.
--   - Different retention: audit_log we want kept for forensics. Rate
--     limit events can be discarded after the longest window we care
--     about (e.g., 24h).

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  token_id uuid not null references public.mcp_tokens(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_events_token_time_idx
  on public.rate_limit_events(token_id, created_at desc);

alter table public.rate_limit_events enable row level security;

-- No client should ever read or write this table directly. The MCP server
-- uses the service role to bypass RLS. We deliberately do NOT create any
-- SELECT or INSERT policies for anon/authenticated; that means with RLS
-- on, no client query can touch it.

-- ============================================================
-- Cleanup: discard rows older than 24 hours.
-- Schedule via Supabase Edge Function or Vercel Cron once a day.
-- ============================================================
create or replace function public.purge_old_rate_limit_events(
  older_than interval default '24 hours'
)
returns table (purged_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.rate_limit_events
  where created_at < (now() - older_than);
  get diagnostics n = row_count;
  purged_count := n;
  return next;
end;
$$;

revoke all on function public.purge_old_rate_limit_events(interval) from public;
revoke all on function public.purge_old_rate_limit_events(interval) from anon, authenticated;

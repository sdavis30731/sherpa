-- Sherpa migration 0003 — hard-purge soft-deleted credentials after 30 days.
--
-- SHRP-013 soft-deletes credentials by setting deleted_at. We give the user
-- a 30-day grace period during which a deletion is recoverable (from the
-- audit log + a "restore" UI we'll build later). After 30 days the row is
-- hard-deleted by this function.
--
-- Invocation: this function is idempotent. Call it on a schedule via one of:
--   1. A Supabase Edge Function on a daily cron (recommended)
--   2. A Vercel Cron Job hitting an API route that invokes it
--   3. pg_cron — only available on Supabase Pro+
--
-- The function uses SECURITY DEFINER so it can bypass RLS during the purge.

create or replace function public.purge_soft_deleted_credentials(
  older_than interval default '30 days'
)
returns table (purged_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.credentials
  where deleted_at is not null
    and deleted_at < (now() - older_than);
  get diagnostics n = row_count;
  purged_count := n;
  return next;
end;
$$;

-- Restrict execution to the service role; the client should never call this.
revoke all on function public.purge_soft_deleted_credentials(interval) from public;
revoke all on function public.purge_soft_deleted_credentials(interval) from anon, authenticated;

-- =============================================================
-- SHRP-097 — Approval dashboard plumbing.
-- =============================================================
-- The existing email-link approval flow (SHRP-042) is bearer-auth: anyone
-- with the magic URL can approve. SHRP-097 adds a real-time dashboard
-- (Supabase Realtime + RLS) and demotes email to a *fallback* channel
-- that only fires if the developer isn't at their desk.
--
-- Three new columns on pending_approvals arbitrate dashboard vs email:
--
--   1. notified_via text
--        - null              : neither channel has claimed responsibility
--        - 'dashboard'       : developer opened the detail panel in the
--                              dashboard, suppressing the email fallback
--        - 'email'           : 60s window passed with no dashboard
--                              claim, cron fired the email
--
--   2. claimed_at timestamptz
--        - when notified_via flipped from null to a real value
--
--   3. notify_after timestamptz (default: now() + 60s)
--        - the moment the email fallback becomes eligible to fire. The
--          MCP server can set this explicitly per-request (e.g. 0s for
--          truly critical approvals where we want belt+suspenders).
--
-- The cron sweep at /api/cron/approval-reminders (every 5 min) gets a
-- second pass: send the initial email if status='pending' AND
-- notified_via IS NULL AND now() > notify_after.
--
-- All additive + idempotent.

alter table public.pending_approvals
  add column if not exists notified_via text
    check (notified_via in ('dashboard', 'email')),
  add column if not exists claimed_at timestamptz,
  add column if not exists notify_after timestamptz
    not null default (now() + interval '60 seconds');

comment on column public.pending_approvals.notified_via is
  'SHRP-097 which channel delivered the initial notification: dashboard or email. null = pending notification.';
comment on column public.pending_approvals.claimed_at is
  'SHRP-097 timestamp at which notified_via transitioned from null to a value.';
comment on column public.pending_approvals.notify_after is
  'SHRP-097 the cron sweep only sends the initial email if now() > notify_after. Default 60s window for dashboard pickup.';

-- =============================================================
-- Indexes
-- =============================================================
-- 1. Cron-sweep predicate: status='pending' AND notified_via IS NULL
--    AND now() > notify_after. Partial index covers the hot path.
create index if not exists pending_approvals_notify_pending_idx
  on public.pending_approvals (notify_after)
  where status = 'pending' and notified_via is null;

-- 2. Dashboard subscription query: per-user, ordered by created_at desc
--    for the recent-approvals list. Covered by existing user_id index;
--    no new index needed.

-- =============================================================
-- Realtime publication
-- =============================================================
-- Add pending_approvals to the supabase_realtime publication so the
-- browser can subscribe via the user's session. RLS on the table
-- already scopes rows to auth.uid() = user_id, so each session only
-- receives events for its own rows — no extra auth wiring required.
--
-- The publication name 'supabase_realtime' is Supabase's default.
-- `ALTER PUBLICATION ... ADD TABLE` errors if the table is already a
-- member, so we drop and re-add inside a DO block to stay idempotent.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    -- Drop from publication first; ignore if not a member.
    begin
      alter publication supabase_realtime drop table public.pending_approvals;
    exception when undefined_object then
      null;
    end;
    alter publication supabase_realtime add table public.pending_approvals;
  end if;
end
$$;

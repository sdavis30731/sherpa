-- Sherpa migration 0007 — write-action approval (SHRP-042).
--
-- The "AI firewall" feature. Adds permission scope + dollar caps to MCP
-- tokens, and a pending_approvals queue so the user must approve any
-- write-action an agent requests before it executes.
--
-- Why a separate `permission` column (not folded into `scopes`):
--   - `scopes` is the user-facing capability list (which API surfaces a
--     token can touch). `permission` is a binary safety classifier
--     (read vs write). Mixing them couples concerns we want orthogonal.
--   - Existing tokens default to permission='read' — safest possible
--     migration. Anyone with an existing token sees a one-time
--     "your token is now read-only; upgrade to allow writes" message in
--     the UI. They can re-create with write access if they want.

-- ============================================================
-- 1. Extend mcp_tokens with permission + dollar_cap_cents
-- ============================================================
alter table public.mcp_tokens
  add column if not exists permission text not null default 'read',
  add column if not exists dollar_cap_cents integer,
  add constraint mcp_tokens_permission_check
    check (permission in ('read', 'write'));

comment on column public.mcp_tokens.permission is
  'Read-only tokens can only call endpoints classified as read in lib/write-actions.ts. Write-permission tokens can request writes but each one requires user approval.';

comment on column public.mcp_tokens.dollar_cap_cents is
  'Optional spending cap per individual approved action, in cents. NULL = no cap. Enforced server-side before executing write actions that move money.';

-- ============================================================
-- 2. pending_approvals queue
-- ============================================================
create table if not exists public.pending_approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_id uuid not null references public.mcp_tokens(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  -- The proposed action
  service text not null,
  endpoint text not null,
  method text not null,
  params jsonb,
  action_summary text not null,           -- human-readable, shown on the approval card
  dollar_amount_cents integer,            -- optional, populated for money-moving actions
  agent_prompt text,                      -- the user prompt that triggered this (if the agent provided it)

  -- Lifecycle
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'expired')),
  expires_at timestamptz not null,
  approved_at timestamptz,
  rejected_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists pending_approvals_user_status_idx
  on public.pending_approvals (user_id, status);

create index if not exists pending_approvals_token_idx
  on public.pending_approvals (token_id);

-- Partial index for the expired-sweeper to find rows quickly.
create index if not exists pending_approvals_expires_pending_idx
  on public.pending_approvals (expires_at)
  where status = 'pending';

alter table public.pending_approvals enable row level security;

-- Users can read their own pending approvals (for the /approve page and
-- the audit log integration).
create policy "Users can read their own pending approvals"
  on public.pending_approvals for select
  using (auth.uid() = user_id);

-- Users can update their own pending approvals (to approve / reject from
-- the /approve page). They cannot change the action itself — only the
-- status field via a column-level constraint in the application layer.
create policy "Users can update their own pending approvals"
  on public.pending_approvals for update
  using (auth.uid() = user_id);

-- Inserts are server-side only (the MCP server uses the service role).
-- We deliberately do NOT add an INSERT policy so user-facing clients
-- can't fabricate approvals.

comment on table public.pending_approvals is
  'Queue of write-action requests awaiting user approval. The MCP server creates rows here; the user approves or rejects via /approve/[id]; rows expire after their TTL and the MCP server returns a clear error to the agent.';

-- ============================================================
-- 3. Sweeper: mark expired-pending rows as 'expired' so the UI does
--    not show stale items, and the MCP server can quickly distinguish
--    "still waiting" from "the user took too long."
--
-- Schedule via Vercel Cron or Supabase Edge Function every minute.
-- ============================================================
create or replace function public.expire_pending_approvals()
returns table (expired_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  update public.pending_approvals
     set status = 'expired'
   where status = 'pending'
     and expires_at < now();
  get diagnostics n = row_count;
  expired_count := n;
  return next;
end;
$$;

revoke all on function public.expire_pending_approvals() from public;
revoke all on function public.expire_pending_approvals() from anon, authenticated;

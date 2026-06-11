-- =============================================================
-- SHRP-051 — Auto-rotation foundation.
-- =============================================================
-- The killer feature: every N days, SherpaKeys generates a new key
-- with the provider, pushes it to every place the old one is
-- deployed, smoke-tests, revokes the old key, and writes the new
-- ciphertext into the vault. If anything fails between steps, we
-- roll back — old key stays, new key gets deleted, agency gets
-- alerted.
--
-- v1 scope: Stripe restricted keys → Vercel env vars, manual
-- "Rotate now" + scheduled cron. Other providers and targets follow
-- as 1-2 day adapter additions once this canonical reference works.
--
-- Three pieces in this migration:
--
-- 1. rotation_policies — one row per credential the agency has
--    marked auto-rotating. Holds the interval, the source-provider
--    credential (wrapped server-side with ROTATION_MASTER_KEY so
--    the orchestrator can decrypt to call the provider's API), the
--    target deployment platform + project ref + env var name, the
--    target-platform credential (also wrapped), and the cron
--    next_rotation_at predicate.
--
-- 2. rotation_attempts — per-execution audit log. The orchestrator
--    inserts a row when it starts, updates as steps complete,
--    closes the row at the end with status + structured
--    rollback summary. Used by both the result-modal UI and the
--    engagement audit log.
--
-- 3. credentials.ciphertext_format — flag indicating whether the
--    row's ciphertext is wrapped with the agency's vault key (the
--    historical 'vault_key' format) or with the agency's X25519
--    public key (the new 'agency_sealed_box' format used after a
--    rotation completes). The agency's browser detects the sealed-
--    box format on next vault unlock and re-wraps to vault_key.
--    This preserves zero-knowledge — server-rotated credentials
--    never sit decryptable to the server after the orchestrator
--    finishes.
--
-- Server-held key:
--   ROTATION_MASTER_KEY env var holds an AES-256 key used to wrap
--   the source + target credentials in rotation_policies. Compromise
--   of that key combined with DB access exposes all auto-rotating
--   credentials. Documented honestly to the founding cohort; they
--   opt in per credential. Migration to per-policy keypairs is a
--   v1.1 hardening step.
--
-- All additive + idempotent.

-- =============================================================
-- 1. rotation_policies
-- =============================================================

create table if not exists public.rotation_policies (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null unique
    references public.credentials(id) on delete cascade,
  user_id uuid not null
    references public.users(id) on delete cascade,
  project_id uuid not null
    references public.projects(id) on delete cascade,

  -- Lifecycle
  enabled boolean not null default true,
  interval_days int not null
    check (interval_days >= 1 and interval_days <= 365),

  -- Source-provider credential wrap. AES-GCM(iv||ciphertext+tag) base64.
  -- Wrapped with ROTATION_MASTER_KEY (env var, server-only).
  -- Updated when the orchestrator successfully completes a rotation.
  source_credential_wrapped text not null,

  -- OPTIONAL higher-privilege credential needed to drive the rotation.
  -- For Stripe restricted-key rotation, this is the standard sk_live_
  -- (the API requires it to create/delete restricted keys). For
  -- providers where source can rotate itself (Vercel, Cloudflare,
  -- Resend), this stays null and the orchestrator authenticates with
  -- the source key directly. Same ROTATION_MASTER_KEY wrap format.
  actor_credential_wrapped text,

  -- Target deployment platform (where the new key gets pushed). v1
  -- supports 'vercel' only; the adapter pattern makes adding railway/
  -- render/etc. a 1-day follow-up each.
  target_platform text not null
    check (target_platform in ('vercel')),
  target_project_ref text not null,
  target_team_ref text,
  target_env_var_name text not null,
  -- JSON array of Vercel env scopes (e.g., ["production"], ["preview"],
  -- or all three). Lets the agency rotate prod separately from preview.
  target_env_var_environments jsonb not null
    default '["production"]'::jsonb,
  -- Optional: trigger a Vercel redeploy after env update so the new
  -- key takes effect immediately. Defaults true since the whole point
  -- of auto-rotation is "no human intervention required."
  target_trigger_redeploy boolean not null default true,

  -- Target-platform API token wrap (e.g., Vercel access token). Same
  -- wrap scheme as source_credential_wrapped.
  target_credential_wrapped text not null,

  -- Provider-specific configuration. The shape is owned by each
  -- lib/rotation-providers/* adapter, not the schema. For Stripe, this
  -- holds the scope/permissions of the restricted key being rotated so
  -- the orchestrator can replicate them on the new key. For self-
  -- rotating providers (Vercel, Cloudflare, Resend), this is usually
  -- empty.
  metadata jsonb not null default '{}'::jsonb,

  -- Cron sweep predicate. last_rotation_at is informational; the cron
  -- only reads next_rotation_at + enabled.
  last_rotation_at timestamptz,
  next_rotation_at timestamptz not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rotation_policies_user_id_idx
  on public.rotation_policies(user_id);
create index if not exists rotation_policies_project_id_idx
  on public.rotation_policies(project_id);
-- Partial index for the cron sweep — only enabled, only by due date.
create index if not exists rotation_policies_due_idx
  on public.rotation_policies(next_rotation_at)
  where enabled = true;

alter table public.rotation_policies enable row level security;

drop policy if exists "Users can read their own rotation policies"
  on public.rotation_policies;
create policy "Users can read their own rotation policies"
  on public.rotation_policies for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own rotation policies"
  on public.rotation_policies;
create policy "Users can insert their own rotation policies"
  on public.rotation_policies for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own rotation policies"
  on public.rotation_policies;
create policy "Users can update their own rotation policies"
  on public.rotation_policies for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete their own rotation policies"
  on public.rotation_policies;
create policy "Users can delete their own rotation policies"
  on public.rotation_policies for delete
  using (auth.uid() = user_id);

-- Touch updated_at on policy edits.
drop trigger if exists touch_rotation_policies_updated
  on public.rotation_policies;
create trigger touch_rotation_policies_updated
  before update on public.rotation_policies
  for each row execute function public.touch_updated_at();

-- =============================================================
-- 2. rotation_attempts
-- =============================================================

create table if not exists public.rotation_attempts (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null
    references public.rotation_policies(id) on delete cascade,
  credential_id uuid not null
    references public.credentials(id) on delete cascade,

  started_at timestamptz not null default now(),
  completed_at timestamptz,

  -- Lifecycle
  --   running       : orchestrator started, no terminal status yet
  --   succeeded     : every step completed, old key revoked,
  --                   new ciphertext written
  --   rolled_back   : a step failed, rollback completed,
  --                   old key still in place
  --   failed        : a step failed AND rollback failed — agency
  --                   intervention required
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'rolled_back', 'failed')),

  -- Array of {step, at, ok, detail?} objects so the result modal can
  -- render the per-step timeline.
  steps_completed jsonb not null default '[]'::jsonb,

  -- Provider-level identifiers for the keys involved (e.g., Stripe's
  -- 'rak_…' key id — NOT the secret itself). Used for cleanup +
  -- post-mortem.
  old_key_id text,
  new_key_id text,

  -- If we failed: which step + the surface message. Verbatim
  -- error_message goes to the audit log; truncated 'failure summary'
  -- shows in the UI.
  error_step text,
  error_message text,

  -- How the rotation was triggered.
  trigger text not null
    check (trigger in ('manual', 'scheduled'))
);

create index if not exists rotation_attempts_policy_id_idx
  on public.rotation_attempts(policy_id);
create index if not exists rotation_attempts_credential_id_idx
  on public.rotation_attempts(credential_id);
create index if not exists rotation_attempts_status_idx
  on public.rotation_attempts(status)
  where status in ('running', 'failed');

alter table public.rotation_attempts enable row level security;

-- Read-only from the agency's side. The orchestrator (server-side
-- with the service role) is what inserts + updates these rows.
drop policy if exists "Users can read rotation attempts on their policies"
  on public.rotation_attempts;
create policy "Users can read rotation attempts on their policies"
  on public.rotation_attempts for select
  using (
    exists (
      select 1 from public.rotation_policies p
      where p.id = rotation_attempts.policy_id
        and p.user_id = auth.uid()
    )
  );

-- =============================================================
-- 3. credentials.ciphertext_format
-- =============================================================
-- After a rotation completes, the orchestrator writes the new
-- credential ciphertext as an X25519 sealed-box (using the agency's
-- public_key from SHRP-107). The format flag tells the agency's
-- browser to re-wrap on next vault unlock — decrypt sealed-box with
-- private key, re-encrypt with vault key, flip the flag back to
-- 'vault_key'. Preserves zero-knowledge across rotations.

alter table public.credentials
  add column if not exists ciphertext_format text not null
    default 'vault_key'
    check (ciphertext_format in ('vault_key', 'agency_sealed_box'));

comment on column public.credentials.ciphertext_format is
  'SHRP-051 ''vault_key'' means ciphertext is wrapped with the agency vault key (default). ''agency_sealed_box'' means it was written by the rotation orchestrator using X25519 sealed-box; the agency''s browser re-wraps on next vault unlock.';

-- Partial index for the "needs re-wrap" sweep on vault unlock.
create index if not exists credentials_needs_rewrap_idx
  on public.credentials(user_id)
  where ciphertext_format = 'agency_sealed_box' and deleted_at is null;

-- =============================================================
-- Realtime
-- =============================================================
-- The agency's engagement page subscribes to rotation_attempts so the
-- "Rotate now" result modal updates live as steps complete. Same
-- pattern as SHRP-097's approvals dashboard.

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime
        drop table public.rotation_attempts;
    exception when undefined_object then
      null;
    end;
    alter publication supabase_realtime
      add table public.rotation_attempts;
  end if;
end
$$;

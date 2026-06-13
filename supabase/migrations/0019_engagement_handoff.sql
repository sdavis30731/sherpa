-- =============================================================
-- SHRP-100 — Post-handoff vault disposition.
-- =============================================================
-- The agency-launches-client-receives moment becomes the agency-
-- launches-client-owns-and-pays moment. v1 ships the three-step
-- ownership transfer:
--
--   1. Agency initiates → signed token, branded email, state
--      = 'pending_acceptance'.
--   2. Client signs up + sets vault (passphrase, vault key,
--      X25519 keypair). Server records client_user_id +
--      flips to 'pending_rekey'.
--   3. Agency unlocks vault, browser re-encrypts every credential
--      as sealed-box for client's public key, server flips user_id
--      on projects + credentials + rotation_policies + audit_log,
--      state = 'transferred'.
--
-- v1 explicitly punts on:
--   - Stripe metered billing — vault_subscriptions tracks intent
--     only; status flips when SHRP-054 lights up Stripe.
--   - Grace-period archive path (option a from the ticket) —
--     comes back as v1.2.1 once we know agencies actually want it.
--   - Affiliate cut to the agency on the $9/month — needs Stripe
--     too; column reserved but not active.
--
-- Three pieces:
--
-- 1. engagement_handoffs — one row per agency-initiated handoff.
--    Carries the magic-link token, the client identity (email
--    pre-signup, user_id post-signup), and lifecycle timestamps.
--    Status machine: pending_acceptance → pending_rekey →
--    transferred (or revoked at any point by the agency).
--
-- 2. vault_subscriptions — one row per "client said yes to the
--    $9/month vault." Holds the agency's $9 list price, the
--    founding-cohort price if locked, the eventual Stripe ids.
--    v1 just tracks intent + start date; Stripe wiring is v1.2.1.
--
-- 3. projects gains handoff_id, transferred_at, and
--    original_owner_user_id (so we can show "Owned by Brushfire,
--    handed off from Northwood Shores May 24" on the engagement
--    detail post-transfer).
--
-- All additive + idempotent.

-- =============================================================
-- 1. engagement_handoffs
-- =============================================================

create table if not exists public.engagement_handoffs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  agency_user_id uuid not null references public.users(id) on delete cascade,

  -- HMAC-style random token in the magic link. 256-bit, base64url.
  token text not null unique,

  -- Client identity. email is known at initiation; client_user_id
  -- gets set once they sign up.
  client_email text not null,
  client_name text,
  client_user_id uuid references public.users(id) on delete set null,

  -- Status machine. Each transition has its own timestamp column
  -- for an unambiguous audit trail.
  status text not null default 'pending_acceptance'
    check (status in (
      'pending_acceptance', -- token sent, client hasn't signed up yet
      'pending_rekey',      -- client has vault keypair, agency hasn't re-encrypted yet
      'transferred',        -- agency has re-encrypted, ownership flipped
      'revoked'             -- agency cancelled or token expired without acceptance
    )),
  started_at timestamptz not null default now(),
  email_sent_at timestamptz,
  first_opened_at timestamptz,
  accepted_at timestamptz,        -- client signed up + saved their public key
  rekey_completed_at timestamptz, -- agency re-encrypted + ownership flipped
  transferred_at timestamptz,
  revoked_at timestamptz,

  -- Lifecycle config + the optional handoff message.
  expires_at timestamptz not null default (now() + interval '30 days'),
  agency_message text,

  -- Whether the client opted in to the $9/month paid vault at the
  -- moment of handoff. Drives the vault_subscriptions row.
  opted_in_to_paid_vault boolean not null default false
);

create index if not exists engagement_handoffs_token_idx
  on public.engagement_handoffs(token);
create index if not exists engagement_handoffs_project_id_idx
  on public.engagement_handoffs(project_id);
create index if not exists engagement_handoffs_agency_user_id_idx
  on public.engagement_handoffs(agency_user_id);
create index if not exists engagement_handoffs_client_user_id_idx
  on public.engagement_handoffs(client_user_id)
  where client_user_id is not null;

alter table public.engagement_handoffs enable row level security;

-- Agency reads their own handoffs.
drop policy if exists "Agency can read own handoffs" on public.engagement_handoffs;
create policy "Agency can read own handoffs"
  on public.engagement_handoffs for select
  using (auth.uid() = agency_user_id);

-- Agency inserts handoffs for their own projects.
drop policy if exists "Agency can insert handoffs for own projects"
  on public.engagement_handoffs;
create policy "Agency can insert handoffs for own projects"
  on public.engagement_handoffs for insert
  with check (auth.uid() = agency_user_id);

-- Agency updates (e.g. revoke) their own handoffs.
drop policy if exists "Agency can update own handoffs"
  on public.engagement_handoffs;
create policy "Agency can update own handoffs"
  on public.engagement_handoffs for update
  using (auth.uid() = agency_user_id);

-- Client (once signed up + linked) can read their handoff to drive
-- the claim UI.
drop policy if exists "Client can read own handoff"
  on public.engagement_handoffs;
create policy "Client can read own handoff"
  on public.engagement_handoffs for select
  using (auth.uid() = client_user_id);

-- Public reads (with token) are server-side via the admin client
-- on the /handoff/[token] route. No public RLS policy.

-- =============================================================
-- 2. vault_subscriptions
-- =============================================================

create table if not exists public.vault_subscriptions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  client_user_id uuid not null references public.users(id) on delete cascade,
  agency_user_id uuid references public.users(id) on delete set null,
  handoff_id uuid references public.engagement_handoffs(id) on delete set null,

  -- The $9/month list, or the founding-cohort $7/month, or whatever
  -- the agency configured.
  monthly_cents int not null default 900,

  -- Lifecycle
  status text not null default 'founding_cohort_grace'
    check (status in (
      'founding_cohort_grace', -- pre-Stripe-billing intent record
      'active',                -- live Stripe subscription
      'past_due',              -- Stripe says billing failed
      'canceled',              -- client cancelled
      'archived'               -- vault wound down
    )),
  started_at timestamptz not null default now(),
  current_period_end timestamptz,
  canceled_at timestamptz,

  -- Stripe IDs land here when SHRP-054 lights up billing.
  stripe_customer_id text,
  stripe_subscription_id text,

  -- Agency-side affiliate config (v1.3 — currently advisory).
  agency_revenue_share_bps int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One subscription per project — the agency can't hand off the
  -- same engagement twice. Enforce idempotency at the schema.
  unique (project_id)
);

create index if not exists vault_subscriptions_client_idx
  on public.vault_subscriptions(client_user_id);
create index if not exists vault_subscriptions_status_idx
  on public.vault_subscriptions(status)
  where status in ('active', 'past_due', 'founding_cohort_grace');

alter table public.vault_subscriptions enable row level security;

drop policy if exists "Client can read own subscription"
  on public.vault_subscriptions;
create policy "Client can read own subscription"
  on public.vault_subscriptions for select
  using (auth.uid() = client_user_id);

drop policy if exists "Agency can read subscriptions they originated"
  on public.vault_subscriptions;
create policy "Agency can read subscriptions they originated"
  on public.vault_subscriptions for select
  using (auth.uid() = agency_user_id);

drop trigger if exists touch_vault_subscriptions_updated
  on public.vault_subscriptions;
create trigger touch_vault_subscriptions_updated
  before update on public.vault_subscriptions
  for each row execute function public.touch_updated_at();

-- =============================================================
-- 3. projects.handoff_id / transferred_at / original_owner_user_id
-- =============================================================

alter table public.projects
  add column if not exists handoff_id uuid
    references public.engagement_handoffs(id) on delete set null,
  add column if not exists transferred_at timestamptz,
  add column if not exists original_owner_user_id uuid
    references public.users(id) on delete set null;

comment on column public.projects.handoff_id is
  'SHRP-100 set when this engagement was handed off via the SHRP-100 flow.';
comment on column public.projects.transferred_at is
  'SHRP-100 timestamp at which ownership flipped from agency to client.';
comment on column public.projects.original_owner_user_id is
  'SHRP-100 the agency user_id that originally owned this engagement. Preserved across the ownership flip so the engagement detail can show 'Handed off by X on Y.'';

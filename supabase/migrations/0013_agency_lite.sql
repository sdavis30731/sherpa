-- =============================================================
-- SHRP-096 — Path A (Lean Agency Dashboard MVP). Day 1-2 foundation.
-- =============================================================
-- Single deliberate choice: stay on the existing single-tenant
-- projects table rather than do the full Phase 1 multi-tenant
-- migration (0011_phase1_engagement_model.sql, still paused). That
-- migration is the right answer once we have evidence — but we have
-- zero agencies on the product right now. Path A puts the product in
-- front of 5 friendly agencies in 2 weeks, on a schema that's small
-- enough to evolve without anyone noticing.
--
-- Adds:
--   1. agency_profiles — one row per user, carries the agency-level
--      identity that the user populates at signup (name, logo URL,
--      brand colors, footer text). Used by the agency dashboard,
--      the Custody Record renderer, and any future white-label
--      surface. One-to-one with users for now; when we add team
--      members in v1.1 this becomes the org table.
--
--   2. projects gains four engagement-flavored columns:
--      - client_name        the client's display name on the dashboard
--      - launch_date        target launch date for the engagement
--      - status             active | launched | archived
--      - custody_assertions JSONB blob the Custody Record wizard
--                           populates. Single column so the form
--                           shape can evolve without migrations.
--
-- Notes:
--   - Everything is additive and idempotent. Re-running this
--     migration is safe.
--   - RLS is scoped to the row's user_id, same pattern as the rest
--     of the schema.
--   - The existing projects RLS policy ("Users can manage their own
--     projects") already covers the four new columns — no policy
--     changes needed there.

-- =============================================================
-- 1. agency_profiles
-- =============================================================

create table if not exists public.agency_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text,
  logo_url text,
  primary_color text not null default '#1f6feb',
  accent_color text not null default '#0c2a63',
  footer_text text,
  -- Onboarding completion: set once the user finishes /agency/setup.
  -- Lets the app distinguish "first-time visitor, redirect to setup"
  -- from "set up but logo is null because they intentionally left it."
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agency_profiles_user_id_idx
  on public.agency_profiles(user_id);

alter table public.agency_profiles enable row level security;

create policy "Users can read their own agency profile"
  on public.agency_profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own agency profile"
  on public.agency_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own agency profile"
  on public.agency_profiles for update
  using (auth.uid() = user_id);

-- Auto-create an agency_profiles row when the users row is created.
-- The user fills in the name + logo + colors during onboarding.
create or replace function public.handle_new_user_agency_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agency_profiles (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_user_created_agency_profile on public.users;
create trigger on_user_created_agency_profile
  after insert on public.users
  for each row execute function public.handle_new_user_agency_profile();

-- Touch updated_at on update (reuse the helper from 0001_init.sql)
drop trigger if exists touch_agency_profiles_updated on public.agency_profiles;
create trigger touch_agency_profiles_updated
  before update on public.agency_profiles
  for each row execute function public.touch_updated_at();

-- =============================================================
-- 2. projects — engagement metadata
-- =============================================================

alter table public.projects
  add column if not exists client_name text,
  add column if not exists launch_date date,
  add column if not exists status text not null default 'active'
    check (status in ('active', 'launched', 'archived')),
  add column if not exists custody_assertions jsonb not null default '{}'::jsonb;

create index if not exists projects_user_status_idx
  on public.projects(user_id, status)
  where archived_at is null;

comment on column public.projects.client_name is
  'SHRP-096 display name of the client (e.g. "Brushfire Coffee Roasters").';
comment on column public.projects.launch_date is
  'SHRP-096 target launch date for the engagement.';
comment on column public.projects.status is
  'SHRP-096 engagement lifecycle: active | launched | archived.';
comment on column public.projects.custody_assertions is
  'SHRP-096 Custody Record wizard payload. Per-service ownership data.';

-- =============================================================
-- 3. Backfill: every existing user gets an agency_profiles row.
-- =============================================================
insert into public.agency_profiles (user_id)
select id from public.users
on conflict (user_id) do nothing;

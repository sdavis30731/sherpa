-- Sherpa migration 0009 — Pro early-access waitlist (SHRP-048).
--
-- A simple capture table for the Pro tier waitlist on the homepage.
-- Anon can INSERT (so the public form works without auth). No SELECT
-- policy means only the service-role key can read the entries — which
-- is what we want, since this is lead data.
--
-- Why a separate table from public.waitlist:
--   - The existing waitlist table requires a referral_code (founders
--     program). Different concept, different lifecycle.
--   - Keeps the two queries clean for ops/analytics.

create table if not exists public.pro_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  company text,
  team_size text check (team_size in ('1-5', '6-20', '21-100', '100+')),
  tools text[],
  use_case text,
  joined_at timestamptz not null default now(),
  contacted_at timestamptz
);

create index if not exists pro_waitlist_joined_at_idx
  on public.pro_waitlist (joined_at desc);

alter table public.pro_waitlist enable row level security;

-- Anon can INSERT — the public form posts without auth
drop policy if exists "Anyone can join the pro waitlist" on public.pro_waitlist;
create policy "Anyone can join the pro waitlist"
  on public.pro_waitlist for insert to anon with check (true);

-- No SELECT policy = no SELECT allowed for anon/authenticated.
-- Service-role key is the only path to read entries.

comment on table public.pro_waitlist is
  'Lead capture for the Pro early-access waitlist on the homepage. Anon can INSERT; only service-role can SELECT.';

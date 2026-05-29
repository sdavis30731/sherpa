-- Sherpa initial schema
-- Run this in the Supabase SQL Editor (or via the CLI) on a fresh project.
-- Every table has Row-Level Security ENABLED and a default policy
-- restricting access to rows where user_id = auth.uid().

-- =============================================================
-- 1. User profile (extends auth.users)
-- =============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'lifetime', 'founders')),
  -- Argon2id key-derivation parameters and salt for the vault key.
  -- The passphrase itself is NEVER stored.
  -- Argon2id salt and params for the vault key. Salt is stored as base64.
  argon_salt text,
  argon_params jsonb,
  -- A short ciphertext encrypted with the vault key. Decryption proves
  -- the passphrase is correct.
  sentinel_ciphertext text,
  -- Passphrase encrypted with the recovery-derived key. Lets the BIP-39
  -- recovery code recover the passphrase. Set at signup.
  recovery_wrapped_passphrase text,
  recovery_salt text,
  recovery_params jsonb,
  recovery_verified_at timestamptz,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read their own profile"
  on public.users for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.users for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.users for insert with check (auth.uid() = id);

-- Auto-create a users row when a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 2. Projects
-- =============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects(user_id);

alter table public.projects enable row level security;

create policy "Users can manage their own projects"
  on public.projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- 3. Credentials (ciphertext only — server never sees plaintext)
-- =============================================================
create table if not exists public.credentials (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  service text not null,
  env text not null default 'production' check (env in ('dev', 'staging', 'production')),
  label text not null,
  ciphertext text not null,
  key_version int not null default 1,
  last_rotated_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists credentials_project_id_idx on public.credentials(project_id);
create index if not exists credentials_user_id_idx on public.credentials(user_id);

alter table public.credentials enable row level security;

create policy "Users can manage their own credentials"
  on public.credentials for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- 4. Audit log
-- =============================================================
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  credential_id uuid references public.credentials(id) on delete set null,
  action text not null,
  actor text not null default 'user',
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_user_id_idx on public.audit_log(user_id, created_at desc);

alter table public.audit_log enable row level security;

create policy "Users can read their own audit log"
  on public.audit_log for select using (auth.uid() = user_id);

create policy "Users can insert their own audit log entries"
  on public.audit_log for insert with check (auth.uid() = user_id);

-- =============================================================
-- 5. Rotation events
-- =============================================================
create table if not exists public.rotation_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  rotated_at timestamptz not null default now(),
  source text not null default 'manual'
);

create index if not exists rotation_events_credential_id_idx
  on public.rotation_events(credential_id, rotated_at desc);

alter table public.rotation_events enable row level security;

create policy "Users can manage their own rotation events"
  on public.rotation_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- 6. MCP tokens (for the Agent Bridge, used later by SHRP-029+)
-- =============================================================
create table if not exists public.mcp_tokens (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  token_hash text not null,
  scopes jsonb not null default '["read-credential-names","call-api"]'::jsonb,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists mcp_tokens_project_id_idx on public.mcp_tokens(project_id);

alter table public.mcp_tokens enable row level security;

create policy "Users can manage their own MCP tokens"
  on public.mcp_tokens for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================
-- 7. Waitlist (public-write, used by SHRP-042)
-- =============================================================
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  referral_code text not null unique,
  referred_by text,
  joined_at timestamptz not null default now(),
  founders_offered_at timestamptz
);

alter table public.waitlist enable row level security;

-- Anyone (anon) can INSERT into the waitlist via the public form
create policy "Anyone can join the waitlist"
  on public.waitlist for insert to anon with check (true);

-- Nobody can read the waitlist via the client — service-role only
-- (no SELECT policy defined = no SELECT allowed for anon/authenticated)

-- =============================================================
-- 8. Touch updated_at on every UPDATE
-- =============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_users_updated on public.users;
create trigger touch_users_updated before update on public.users
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_projects_updated on public.projects;
create trigger touch_projects_updated before update on public.projects
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_credentials_updated on public.credentials;
create trigger touch_credentials_updated before update on public.credentials
  for each row execute function public.touch_updated_at();

-- =============================================================
-- SHRP-107 — Client credential collection flow (asymmetric crypto).
-- =============================================================
-- The agency hits "Request credentials" on an engagement, picks the
-- stacks they need, confirms the client's email, and SherpaKeys
-- emails a signed magic link. The client lands on a no-auth branded
-- page and pastes their credentials. The browser encrypts each one
-- with the agency's PUBLIC key (X25519 sealed box) before it leaves
-- the client's machine; the server never sees plaintext. When the
-- agency next unlocks their vault, the browser decrypts each held
-- submission with the agency's private key (unwrapped from
-- wrapped_private_key) and re-stores as a normal credentials row.
--
-- This migration adds three pieces:
--
-- 1. Asymmetric keypair on users.
--      public_key            base64 X25519 public — published
--      wrapped_private_key   base64 AES-GCM ciphertext, wrapped
--                            with the vault key derived from the
--                            user's passphrase. Never readable
--                            server-side.
--      keypair_algo          'x25519' for now. Future-proofs us
--                            if we add post-quantum later.
--    Existing users (Steve, beta testers) have NULLs here — the
--    lazy-migrate path generates the keypair at next unlock.
--
-- 2. credential_requests — one row per "agency asked client for X".
--    Includes the signed-link token, requested services, client
--    email, optional personal note, experience level (set by
--    client on first land), and lifecycle timestamps.
--
-- 3. credential_submissions — one row per credential the client
--    pasted. Holds the X25519-encrypted ciphertext until the
--    agency accepts it (browser decrypts, re-stores into
--    credentials with vault-key encryption).
--
-- All additive + idempotent.

-- =============================================================
-- 1. Asymmetric keypair on users
-- =============================================================

alter table public.users
  add column if not exists public_key text,
  add column if not exists wrapped_private_key text,
  add column if not exists keypair_algo text
    check (keypair_algo is null or keypair_algo in ('x25519'));

comment on column public.users.public_key is
  'SHRP-107 base64 X25519 public key. Anyone can read this to send the user encrypted credentials.';
comment on column public.users.wrapped_private_key is
  'SHRP-107 base64 AES-GCM(salt||iv||ciphertext) of the X25519 private key, wrapped with the vault key. Server-unreadable; agency browser unwraps after vault unlock.';

-- =============================================================
-- 2. credential_requests
-- =============================================================

create table if not exists public.credential_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  -- HMAC-derived token in the magic link. Indexed below for the
  -- public lookup path.
  token text not null unique,

  -- What the agency asked for. Array of service ids from
  -- lib/services.ts (e.g. ['stripe', 'github', 'vercel']).
  requested_services jsonb not null default '[]'::jsonb,

  -- Who we sent it to + the agency's optional personal note.
  client_email text not null,
  client_name text,
  client_message text,

  -- Set by the client when they first land on the onboarding page —
  -- changes which track of stack guides we render.
  experience_level text
    check (experience_level is null or experience_level in ('beginner', 'intermediate', 'expert')),

  -- Lifecycle
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days'),
  email_sent_at timestamptz,
  first_opened_at timestamptz,
  submitted_at timestamptz,
  revoked_at timestamptz,

  -- The agency-pasted handle. Optional; surfaces in the email
  -- subject line and on the client landing page header.
  engagement_label text
);

create index if not exists credential_requests_token_idx
  on public.credential_requests(token);
create index if not exists credential_requests_user_id_idx
  on public.credential_requests(user_id);
create index if not exists credential_requests_project_id_idx
  on public.credential_requests(project_id);

alter table public.credential_requests enable row level security;

-- The agency can manage their own requests via the authenticated UI.
create policy "Users can read their own credential requests"
  on public.credential_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert credential requests on their projects"
  on public.credential_requests for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own credential requests"
  on public.credential_requests for update
  using (auth.uid() = user_id);

-- The public client-onboarding flow does NOT go through RLS — it
-- hits dedicated server routes that validate the signed token, fetch
-- with the service role, and only expose fields the client should
-- see (agency branding, requested services, expiry).

-- =============================================================
-- 3. credential_submissions (holding table)
-- =============================================================

create table if not exists public.credential_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.credential_requests(id) on delete cascade,

  -- What service / kind of credential this submission is for. The
  -- client's onboarding page renders one card per requested_service
  -- and each Save creates a row here.
  service text not null,
  key_type text,
  label text,
  env text not null default 'production'
    check (env in ('dev', 'staging', 'production')),

  -- X25519 sealed-box ciphertext (base64). Encrypted in the client's
  -- browser with the agency's public_key. Server never sees plaintext.
  ciphertext_b64 text not null,

  -- Lifecycle
  submitted_at timestamptz not null default now(),
  accepted_at timestamptz,
  -- Once the agency unlocks + re-encrypts with their vault key, we
  -- store the resulting credentials.id here so the receipt UI can
  -- link directly to the created credential row.
  accepted_credential_id uuid references public.credentials(id) on delete set null,
  declined_at timestamptz,
  decline_reason text
);

create index if not exists credential_submissions_request_id_idx
  on public.credential_submissions(request_id);
create index if not exists credential_submissions_request_pending_idx
  on public.credential_submissions(request_id)
  where accepted_at is null and declined_at is null;

alter table public.credential_submissions enable row level security;

-- The agency reads their own submissions through the request join.
create policy "Users can read submissions on their own requests"
  on public.credential_submissions for select
  using (
    exists (
      select 1 from public.credential_requests cr
      where cr.id = credential_submissions.request_id
        and cr.user_id = auth.uid()
    )
  );

create policy "Users can update submissions on their own requests"
  on public.credential_submissions for update
  using (
    exists (
      select 1 from public.credential_requests cr
      where cr.id = credential_submissions.request_id
        and cr.user_id = auth.uid()
    )
  );

-- Public inserts (from the client onboarding flow) go through server
-- routes with the service role, gated on token validation. No public
-- RLS policy needed.

-- =============================================================
-- Realtime
-- =============================================================
-- Add credential_submissions to the supabase_realtime publication so
-- the agency's vault dashboard can light up the moment the client
-- submits, same pattern as SHRP-097's approvals dashboard.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    begin
      alter publication supabase_realtime
        drop table public.credential_submissions;
    exception when undefined_object then
      null;
    end;
    alter publication supabase_realtime
      add table public.credential_submissions;
  end if;
end
$$;

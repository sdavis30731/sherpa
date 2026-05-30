-- Sherpa migration 0005 — agent authorization sessions.
--
-- SHRP-040: when the user wants to let AI agents act on their behalf via
-- the MCP server, they "authorize agents" for a time window. During the
-- window, the server holds enough material to decrypt their credentials.
-- After the window expires, that material is wiped and zero-knowledge is
-- restored.
--
-- An agent_session is created in the browser (the only place that has the
-- vault key). The browser:
--   1. Generates a random 32-byte session wrapper key K_s
--   2. For each credential in the project, decrypts the value with the
--      vault key V, then re-encrypts the plaintext with K_s
--   3. Uploads K_s + the list of session-encrypted credentials to the
--      server
--
-- The server wraps K_s with the AGENT_SESSION_MASTER_KEY (a server-held
-- secret) and stores the wrapped form. The vault key V is never sent to
-- the server. Outside the session window, the server has no way to
-- decrypt — the session_ciphertext is unreadable without K_s, and K_s
-- is only available while AGENT_SESSION_MASTER_KEY can unwrap it.
--
-- Hard expiry is enforced by checking expires_at at every sherpa_call_api
-- request. A scheduled job (later) hard-deletes expired rows.

-- ============================================================
-- agent_sessions: one row per authorization window per project
-- ============================================================
create table if not exists public.agent_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,

  -- K_s wrapped with the server master key. Always opaque to the user.
  wrapper_ciphertext text not null,

  expires_at timestamptz not null,
  authorized_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

create index if not exists agent_sessions_project_idx
  on public.agent_sessions(project_id, expires_at desc);

alter table public.agent_sessions enable row level security;

-- Users can read & manage their own sessions (the agents UI lists them).
create policy "Users can manage their own agent sessions"
  on public.agent_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- agent_session_credentials: per-credential session ciphertext
-- ============================================================
create table if not exists public.agent_session_credentials (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions(id) on delete cascade,
  credential_id uuid not null references public.credentials(id) on delete cascade,
  -- The credential plaintext, encrypted with the session key K_s.
  -- Format matches lib/crypto.ts: base64(iv || ciphertext+tag)
  session_ciphertext text not null,
  created_at timestamptz not null default now(),
  unique (session_id, credential_id)
);

create index if not exists agent_session_credentials_session_idx
  on public.agent_session_credentials(session_id);

alter table public.agent_session_credentials enable row level security;

-- Users can read their own session credentials (rare, but possible).
-- The MCP server reads via service_role and bypasses RLS.
create policy "Users can read their own session credentials"
  on public.agent_session_credentials for select
  using (
    exists (
      select 1 from public.agent_sessions
      where agent_sessions.id = agent_session_credentials.session_id
        and agent_sessions.user_id = auth.uid()
    )
  );

create policy "Users can insert session credentials they own"
  on public.agent_session_credentials for insert
  with check (
    exists (
      select 1 from public.agent_sessions
      where agent_sessions.id = agent_session_credentials.session_id
        and agent_sessions.user_id = auth.uid()
    )
  );

-- ============================================================
-- Cleanup function — hard-delete expired sessions and their cipher rows.
-- ============================================================
create or replace function public.purge_expired_agent_sessions()
returns table (purged_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  delete from public.agent_sessions
  where expires_at < now() - interval '1 day'
     or revoked_at is not null;
  get diagnostics n = row_count;
  purged_count := n;
  return next;
end;
$$;

revoke all on function public.purge_expired_agent_sessions() from public;
revoke all on function public.purge_expired_agent_sessions() from anon, authenticated;

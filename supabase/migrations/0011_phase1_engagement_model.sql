-- =============================================================
-- SHRP-069 — Phase 1 data model: organizations + engagements + accounts
-- =============================================================
-- Multi-tenant foundation for the agency Custody Record product. Designed
-- so Phase 2 (client accounts) and Phase 3 (contractor accounts) are
-- ADDITIVE permission paths through the same model — not schema rewrites.
--
-- Design rule: every credential, account, and access grant is scoped to
-- an engagement, not to a user. A user can be a member of many
-- organizations and many engagements via memberships.
--
-- This migration:
--   1. Creates 7 new tables + 4 enum types
--   2. Adds helper functions used by RLS policies
--   3. Enables RLS on every new table with engagement-membership filters
--   4. Migrates existing single-tenant data: creates a "personal" agency
--      org per existing user, converts each project into an engagement
--      with that org as both client and agency, scopes existing
--      credentials to the new engagements
--   5. Adds nullable engagement_id columns to credentials and audit_log
--      so legacy single-tenant paths still work during the transition

-- =============================================================
-- 1. Enum types
-- =============================================================

create type public.org_type as enum ('agency', 'client', 'contractor_group');

create type public.org_role as enum ('owner', 'admin', 'member');

create type public.engagement_status as enum (
  'draft',
  'active',
  'launched',
  'archived'
);

create type public.engagement_role as enum (
  'agency_pm',
  'agency_engineer',
  'contractor',
  'client_observer'
);

create type public.account_party as enum (
  'client',
  'agency',
  'contractor',
  'shared',
  'unknown'
);

create type public.transfer_status as enum (
  'not_started',
  'in_progress',
  'complete',
  'scheduled',
  'exception'
);

create type public.report_type as enum ('custody_record', 'readiness_audit');

-- =============================================================
-- 2. organizations — agency, client, or contractor_group
-- =============================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type public.org_type not null,
  billing_email text,
  -- White-label branding fields (SHRP-075)
  logo_url text,
  primary_color text,    -- hex like '#1f6feb'
  accent_color text,
  footer_text text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index organizations_type_idx on public.organizations(type);

alter table public.organizations enable row level security;

-- =============================================================
-- 3. org_memberships — user ↔ org with role
-- =============================================================

create table public.org_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'member',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null
);

-- A user has at most one active membership per org
create unique index org_memberships_unique_active
  on public.org_memberships(org_id, user_id)
  where revoked_at is null;

create index org_memberships_user_id_idx on public.org_memberships(user_id);
create index org_memberships_org_id_idx on public.org_memberships(org_id);

alter table public.org_memberships enable row level security;

-- =============================================================
-- 4. engagements — a project an agency runs for a client
-- =============================================================

create table public.engagements (
  id uuid primary key default gen_random_uuid(),
  agency_org_id uuid not null references public.organizations(id) on delete cascade,
  -- Nullable because drafts may exist before a client org is created.
  -- For drafts, client_display_name is shown until a client_org is linked.
  client_org_id uuid references public.organizations(id) on delete set null,
  client_display_name text not null,
  project_name text not null,
  launch_date date,
  status public.engagement_status not null default 'draft',
  score integer check (score is null or (score >= 0 and score <= 100)),
  metadata jsonb,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_at timestamptz not null default now()
);

create index engagements_agency_org_id_idx on public.engagements(agency_org_id);
create index engagements_client_org_id_idx on public.engagements(client_org_id);
create index engagements_status_idx on public.engagements(status);

alter table public.engagements enable row level security;

-- =============================================================
-- 5. engagement_members — who has access to an engagement
-- =============================================================

create table public.engagement_members (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.engagement_role not null,
  -- 'full' = unrestricted; 'specific_services' = check engagement_member_scopes (Phase 2+)
  access_scope text not null default 'full',
  granted_at timestamptz not null default now(),
  granted_by uuid not null references auth.users(id) on delete restrict,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoked_reason text
);

create unique index engagement_members_unique_active
  on public.engagement_members(engagement_id, user_id)
  where revoked_at is null;

create index engagement_members_engagement_id_idx
  on public.engagement_members(engagement_id);
create index engagement_members_user_id_active_idx
  on public.engagement_members(user_id)
  where revoked_at is null;

alter table public.engagement_members enable row level security;

-- =============================================================
-- 6. engagement_accounts — per-service ownership data
-- =============================================================

create table public.engagement_accounts (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  service text not null,
  account_owner_email text,
  account_owner_party public.account_party not null default 'unknown',
  billing_card_holder_name text,
  billing_party public.account_party not null default 'unknown',
  recovery_contact_email text,
  admin_emails text[] not null default '{}',
  last_rotated_at date,
  last_rotated_by text,
  transfer_status public.transfer_status not null default 'not_started',
  transfer_date date,
  exceptions text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create unique index engagement_accounts_unique
  on public.engagement_accounts(engagement_id, service);

alter table public.engagement_accounts enable row level security;

-- =============================================================
-- 7. custody_assertions — signed agency claims, snapshotted per service
-- =============================================================

create table public.custody_assertions (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  service text not null,
  -- Snapshot of the engagement_account row at sign time, plus revocation
  -- list, rotation evidence, and exception notes. JSONB so the report
  -- can render exactly what was asserted at the moment of signature.
  assertion_data jsonb not null,
  revocations jsonb not null default '[]'::jsonb,
  rotation_evidence jsonb not null default '[]'::jsonb,
  exceptions_text text,
  signed_by_user_id uuid not null references auth.users(id) on delete restrict,
  signed_by_name text not null,
  signed_at timestamptz not null default now(),
  -- Increments when the assertion is re-signed for the same service
  version integer not null default 1
);

create index custody_assertions_engagement_id_idx
  on public.custody_assertions(engagement_id);
create index custody_assertions_lookup_idx
  on public.custody_assertions(engagement_id, service, version desc);

alter table public.custody_assertions enable row level security;

-- =============================================================
-- 8. reports — generated PDF artifacts
-- =============================================================

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.engagements(id) on delete cascade,
  type public.report_type not null,
  score integer check (score is null or (score >= 0 and score <= 100)),
  pdf_storage_path text,  -- Supabase Storage object path, set after render
  generated_at timestamptz not null default now(),
  generated_by uuid not null references auth.users(id) on delete restrict,
  signed_at timestamptz,
  signed_by_user_id uuid references auth.users(id) on delete set null,
  client_invited_at timestamptz,
  client_view_token_hash text,  -- HMAC-signed read-only token for SHRP-076
  client_viewed_at timestamptz,
  metadata jsonb
);

create index reports_engagement_id_idx
  on public.reports(engagement_id, generated_at desc);

alter table public.reports enable row level security;

-- =============================================================
-- 9. Extend existing tables: credentials and audit_log
-- =============================================================

-- engagement_id is added as NULLABLE so existing single-tenant rows
-- still work during the transition. New writes from the agency UI
-- will populate it. Legacy reads via the vibe-coder vault still match
-- on user_id only.
alter table public.credentials
  add column if not exists engagement_id uuid
    references public.engagements(id) on delete set null;

create index if not exists credentials_engagement_id_idx
  on public.credentials(engagement_id) where engagement_id is not null;

alter table public.audit_log
  add column if not exists engagement_id uuid
    references public.engagements(id) on delete set null;

create index if not exists audit_log_engagement_id_idx
  on public.audit_log(engagement_id, created_at desc) where engagement_id is not null;

-- =============================================================
-- 10. RLS helper functions
-- =============================================================

-- Is the caller a member of this organization (with optional minimum role)?
create or replace function public.is_org_member(
  p_org_id uuid,
  p_min_role public.org_role default 'member'
) returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists(
    select 1 from public.org_memberships
    where org_id = p_org_id
      and user_id = auth.uid()
      and revoked_at is null
      and (
        p_min_role = 'member'
        or (p_min_role = 'admin' and role in ('admin', 'owner'))
        or (p_min_role = 'owner' and role = 'owner')
      )
  );
$$;

-- Is the caller a member of this engagement (with optional minimum role)?
-- Role hierarchy (highest authority first):
--   agency_pm > agency_engineer > contractor > client_observer
-- A caller with role X passes the check for any min_role at or below X.
create or replace function public.is_engagement_member(
  p_engagement_id uuid,
  p_min_role public.engagement_role default null
) returns boolean
  language sql stable security definer
  set search_path = public
as $$
  select exists(
    select 1 from public.engagement_members em
    where em.engagement_id = p_engagement_id
      and em.user_id = auth.uid()
      and em.revoked_at is null
      and (
        p_min_role is null
        or em.role = p_min_role
        or (p_min_role = 'client_observer')
        or (p_min_role = 'contractor'
            and em.role in ('agency_pm', 'agency_engineer', 'contractor'))
        or (p_min_role = 'agency_engineer'
            and em.role in ('agency_pm', 'agency_engineer'))
        or (p_min_role = 'agency_pm'
            and em.role = 'agency_pm')
      )
  );
$$;

-- =============================================================
-- 11. RLS policies
-- =============================================================

-- organizations: visible to members; only owners can update; nobody
-- can delete via client (use admin client for that)
create policy "members can read their orgs"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "owners can update their orgs"
  on public.organizations for update
  using (public.is_org_member(id, 'owner'))
  with check (public.is_org_member(id, 'owner'));

create policy "authenticated can create an org"
  on public.organizations for insert to authenticated
  with check (auth.uid() is not null);

-- org_memberships: visible to other members of the same org; admins manage
create policy "members can see other members of their orgs"
  on public.org_memberships for select
  using (public.is_org_member(org_id));

create policy "admins can manage memberships"
  on public.org_memberships for all
  using (public.is_org_member(org_id, 'admin'))
  with check (public.is_org_member(org_id, 'admin'));

-- Bootstrap exception: a user may insert their OWN first membership
-- into an org they JUST CREATED. Specifically:
--   - The user_id of the new row matches auth.uid()
--   - They are the created_by of the organization being joined
--   - No memberships exist for that org yet (this is the bootstrap)
-- Without this exception, the chicken-and-egg problem prevents the
-- first owner from being added (admins-manage-memberships needs an
-- admin to already exist). With it, joining someone else's org via
-- this policy is impossible — you'd need to be the org's creator
-- AND get there before any membership row exists.
create policy "users bootstrap their first membership in own org"
  on public.org_memberships for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organizations o
      where o.id = org_memberships.org_id
        and o.created_by = auth.uid()
        and not exists (
          select 1 from public.org_memberships m
          where m.org_id = o.id
        )
    )
  );

-- engagements: visible to engagement members + agency org members
create policy "engagement members can read engagement"
  on public.engagements for select
  using (
    public.is_engagement_member(id)
    or public.is_org_member(agency_org_id)
  );

create policy "agency members can create engagements for their org"
  on public.engagements for insert to authenticated
  with check (public.is_org_member(agency_org_id));

create policy "agency members can update their engagements"
  on public.engagements for update
  using (public.is_org_member(agency_org_id))
  with check (public.is_org_member(agency_org_id));

-- engagement_members: visible to other engagement members
create policy "engagement members can see the roster"
  on public.engagement_members for select
  using (public.is_engagement_member(engagement_id));

create policy "agency pms manage engagement members"
  on public.engagement_members for all
  using (public.is_engagement_member(engagement_id, 'agency_pm'))
  with check (public.is_engagement_member(engagement_id, 'agency_pm'));

-- engagement_accounts: visible to engagement members; agency_pm/engineer write
create policy "engagement members read accounts"
  on public.engagement_accounts for select
  using (public.is_engagement_member(engagement_id));

create policy "agency members write accounts"
  on public.engagement_accounts for all
  using (public.is_engagement_member(engagement_id, 'agency_engineer'))
  with check (public.is_engagement_member(engagement_id, 'agency_engineer'));

-- custody_assertions: visible to engagement members; only agency_pm can insert
-- (assertions are immutable once signed — no update/delete via client)
create policy "engagement members read assertions"
  on public.custody_assertions for select
  using (public.is_engagement_member(engagement_id));

create policy "agency pms sign assertions"
  on public.custody_assertions for insert to authenticated
  with check (
    public.is_engagement_member(engagement_id, 'agency_pm')
    and signed_by_user_id = auth.uid()
  );

-- reports: visible to engagement members
create policy "engagement members read reports"
  on public.reports for select
  using (public.is_engagement_member(engagement_id));

create policy "agency members generate reports"
  on public.reports for insert to authenticated
  with check (
    public.is_engagement_member(engagement_id, 'agency_engineer')
    and generated_by = auth.uid()
  );

create policy "agency pms sign reports"
  on public.reports for update
  using (public.is_engagement_member(engagement_id, 'agency_pm'))
  with check (public.is_engagement_member(engagement_id, 'agency_pm'));

-- =============================================================
-- 12. touch_updated_at triggers for new tables
-- =============================================================

drop trigger if exists touch_organizations_updated on public.organizations;
create trigger touch_organizations_updated
  before update on public.organizations
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_engagements_updated on public.engagements;
create trigger touch_engagements_updated
  before update on public.engagements
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_engagement_accounts_updated on public.engagement_accounts;
create trigger touch_engagement_accounts_updated
  before update on public.engagement_accounts
  for each row execute function public.touch_updated_at();

-- =============================================================
-- 13. Migrate existing single-tenant data
-- =============================================================
-- For every existing user with at least one project, create a personal
-- agency organization, add them as owner, convert each project into a
-- draft engagement with that org as both client and agency, and scope
-- their existing credentials to the new engagements.
--
-- Idempotent: WHERE clauses skip rows that have already been migrated.
-- =============================================================

do $$
declare
  v_user record;
  v_org_id uuid;
  v_project record;
  v_engagement_id uuid;
begin
  -- For each user that has projects but doesn't yet own an organization
  for v_user in
    select distinct u.id, u.id::text as id_text
    from public.users u
    join public.projects p on p.user_id = u.id
    where not exists (
      select 1 from public.org_memberships m
      where m.user_id = u.id and m.revoked_at is null
    )
  loop
    -- Create their personal agency org
    insert into public.organizations (name, type, created_by)
    values (
      'Personal workspace (' || substr(v_user.id_text, 1, 8) || ')',
      'agency',
      v_user.id
    )
    returning id into v_org_id;

    -- Add them as owner
    insert into public.org_memberships (org_id, user_id, role, created_by)
    values (v_org_id, v_user.id, 'owner', v_user.id);

    -- Convert each of their projects into a draft engagement
    for v_project in
      select * from public.projects
      where user_id = v_user.id and archived_at is null
    loop
      insert into public.engagements (
        agency_org_id,
        client_org_id,
        client_display_name,
        project_name,
        status,
        created_by,
        metadata
      )
      values (
        v_org_id,
        v_org_id,  -- Same org acts as client too during migration
        'Migrated from project',
        v_project.name,
        'draft',
        v_user.id,
        jsonb_build_object('migrated_from_project_id', v_project.id)
      )
      returning id into v_engagement_id;

      -- Add the user as agency_pm on the engagement
      insert into public.engagement_members (
        engagement_id, user_id, role, granted_by
      ) values (
        v_engagement_id, v_user.id, 'agency_pm', v_user.id
      );

      -- Scope this user's credentials for this project to the new engagement
      update public.credentials
      set engagement_id = v_engagement_id
      where project_id = v_project.id
        and engagement_id is null;
    end loop;
  end loop;
end;
$$;

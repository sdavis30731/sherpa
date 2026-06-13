-- =============================================================
-- SHRP-105 — Attestation IDs on Custody Records.
-- =============================================================
-- The agency pays $99 to issue a Custody Record. The attestation_id
-- is the user-visible artifact that proves "this is the paid, verified
-- version, not a screenshot of a draft." Format:
--
--   SKR-{YYYY}-{8 base32 chars}
--   e.g. SKR-2026-K7M3X9P2
--
-- The /verify/[attestation_id] public page lets anyone confirm
-- "Northwood Shores issued this record for Brushfire Coffee on
-- 2026-05-22." Clients learn to ask for the verify URL the same way
-- they learn to ask for a SOC 2 report.
--
-- Generated server-side on the issue endpoint, one per project, never
-- changes. We store it as a unique text column for efficient lookup
-- by the verify page.

alter table public.projects
  add column if not exists attestation_id text unique;

create index if not exists projects_attestation_id_idx
  on public.projects(attestation_id)
  where attestation_id is not null;

comment on column public.projects.attestation_id is
  'SHRP-105 user-visible Custody Record ID. Format: SKR-YYYY-XXXXXXXX. Generated on the issue endpoint, unique across all engagements, never changes once set. Powers the /verify/[id] public attestation page.';

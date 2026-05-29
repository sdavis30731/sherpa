-- Sherpa migration 0004 — preserve audit trail across project deletion.
--
-- SHRP-014 lets the user hard-delete a project. The 0001 schema set
-- audit_log.project_id with ON DELETE CASCADE, meaning hard-deleting a
-- project would also wipe the audit trail. We want the user-level audit
-- (who deleted what, when, from where) to survive. Switch to SET NULL.
--
-- We also explicitly preserve audit entries from rotation_events and
-- credentials child deletes (those are fine to cascade — once the
-- credential is gone, the per-credential rotation events have nothing
-- to attach to). The user-level deletion audit row is recorded BEFORE
-- the delete is issued, so it shows up in the user's history.

alter table public.audit_log
  drop constraint if exists audit_log_project_id_fkey;

alter table public.audit_log
  add constraint audit_log_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete set null;

-- For deleted_credential_id: stay as SET NULL (already set in 0001).
-- For the user_id: stay as CASCADE (if the user is deleted, the entire
-- account is going anyway, so audit rows should follow).

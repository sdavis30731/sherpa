-- =============================================================
-- SHRP-096 Day 3-4 — agency-logos Supabase Storage bucket.
-- =============================================================
-- The agency onboarding wizard at /agency/setup lets the user
-- upload a logo. The logo is rendered in:
--   - the vault header (top-left, replacing/augmenting the
--     SherpaKeys wordmark)
--   - the Custody Record PDF/HTML cover sheet
--   - any future white-label surface (client invite emails, etc.)
--
-- The bucket is PUBLIC because the Custody Record is rendered
-- as a static HTML/PDF that may be shared with clients via a
-- signed URL that doesn't carry a user JWT. We never put
-- anything sensitive in this bucket — it's branding only.
--
-- File path convention: `{user_id}/logo.<ext>`
--   - One logo per user (the upload step overwrites).
--   - Folder prefix == user_id so RLS can scope writes.
--
-- Notes:
--   - Idempotent: re-running this migration is safe.
--   - Bucket name must match the constant used in the Next.js
--     app code (lib/agency.ts: AGENCY_LOGO_BUCKET).

-- Create the bucket. Public read; uploads gated by RLS below.
insert into storage.buckets (id, name, public)
values ('agency-logos', 'agency-logos', true)
on conflict (id) do nothing;

-- =============================================================
-- RLS policies on storage.objects, scoped to this bucket.
-- =============================================================
-- Path convention: `{user_id}/...`. We compare the first path
-- segment against auth.uid()::text. storage.foldername() returns
-- an array of folder segments — index 1 is the top-level folder.

drop policy if exists "Agency logos are publicly readable"
  on storage.objects;
create policy "Agency logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'agency-logos');

drop policy if exists "Users can upload their own agency logo"
  on storage.objects;
create policy "Users can upload their own agency logo"
  on storage.objects for insert
  with check (
    bucket_id = 'agency-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own agency logo"
  on storage.objects;
create policy "Users can update their own agency logo"
  on storage.objects for update
  using (
    bucket_id = 'agency-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own agency logo"
  on storage.objects;
create policy "Users can delete their own agency logo"
  on storage.objects for delete
  using (
    bucket_id = 'agency-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

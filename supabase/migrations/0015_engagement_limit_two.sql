-- =============================================================
-- SHRP-096 Day 12 polish — free tier now includes 2 engagements.
-- =============================================================
-- The dashboard copy on the live homepage and /vault home says:
--   "Free: 2 engagements included. $19/month per additional engagement."
-- (see SHRP-095 pricing rewrite). But the BEFORE INSERT trigger from
-- migration 0002 still enforces a hard limit of 1, so a free-tier
-- user creating their second engagement would see the paywall instead
-- of the engagement.
--
-- Bumping the active-project ceiling from 1 to 2 to match the public
-- pricing. Also updates the exception detail string to reference
-- "engagements" (the user-facing noun, SHRP-096) and drops the
-- "Lifetime" tier name (killed in SHRP-061).
--
-- Idempotent: re-running this migration is safe — it's a function
-- replace + trigger re-bind.

create or replace function public.enforce_project_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_plan text;
  active_count int;
begin
  select plan into current_plan
    from public.users
    where id = NEW.user_id;

  if current_plan is null then
    raise exception 'users row not found for %', NEW.user_id;
  end if;

  if current_plan = 'free' then
    select count(*) into active_count
      from public.projects
      where user_id = NEW.user_id
        and archived_at is null;
    if active_count >= 2 then
      raise exception using
        errcode = 'P0001',
        message = 'free_tier_limit',
        detail = 'Free tier includes 2 engagements. Add another at $19/month.';
    end if;
  end if;

  return NEW;
end;
$$;

-- The trigger binding was created in 0002 and points at the function
-- by name, so updating the function (above) is enough — but re-bind
-- defensively in case anyone dropped the trigger out-of-band.
drop trigger if exists enforce_project_limit_trigger on public.projects;
create trigger enforce_project_limit_trigger
  before insert on public.projects
  for each row execute function public.enforce_project_limit();

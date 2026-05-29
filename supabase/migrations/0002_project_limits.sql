-- Sherpa migration 0002 — enforce the free-tier project limit at the database.
--
-- The free tier allows exactly one active (non-archived) project. The paid
-- tiers ('lifetime', 'founders') allow unlimited projects. We enforce this
-- via a BEFORE INSERT trigger so the limit can't be bypassed by a custom
-- client.

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
    if active_count >= 1 then
      raise exception using
        errcode = 'P0001',
        message = 'free_tier_limit',
        detail = 'Free tier is limited to 1 active project. Upgrade to Lifetime for unlimited projects.';
    end if;
  end if;

  return NEW;
end;
$$;

drop trigger if exists enforce_project_limit_trigger on public.projects;
create trigger enforce_project_limit_trigger
  before insert on public.projects
  for each row execute function public.enforce_project_limit();

-- Sherpa migration 0010 — user plan + Stripe linkage (SHRP-045).
--
-- Adds the columns we need to track which tier each user is on, when
-- they upgraded, and the Stripe IDs that link them back to the
-- customer + payment record on Stripe's side.
--
-- 'plan' is a check-constrained string. We deliberately don't add the
-- 'pro' tier value yet — Pro billing ships in a follow-up. For now
-- users are 'free' (default) or 'lifetime'.

alter table public.users
  add column if not exists plan text not null default 'free',
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists plan_started_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_plan_check'
  ) then
    alter table public.users
      add constraint users_plan_check
      check (plan in ('free', 'lifetime', 'pro'));
  end if;
end $$;

create index if not exists users_stripe_customer_id_idx
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.users.plan is
  'Subscription tier: free (default), lifetime (paid $19 once), pro (paid monthly/annually — not yet wired).';
comment on column public.users.stripe_customer_id is
  'Stripe Customer ID linking this user to Stripe records. NULL until first paid checkout.';
comment on column public.users.stripe_payment_intent_id is
  'Stripe PaymentIntent ID from the most recent successful upgrade. Useful for refund support.';
comment on column public.users.plan_started_at is
  'When the user first upgraded to their current paid plan.';

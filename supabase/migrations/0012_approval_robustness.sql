-- =============================================================
-- SHRP-085 + SHRP-086 — Approval flow robustness
-- =============================================================
-- Adds two columns to pending_approvals:
--
--   client_request_id  text       Idempotency key supplied by the
--                                 calling agent. A retry with the same
--                                 (token_id, client_request_id) returns
--                                 the existing approval row instead of
--                                 queuing a second one. Matches the
--                                 Stripe-style idempotency-key pattern.
--
--   reminder_sent_at   timestamptz When the 15-min-before-expiry reminder
--                                 email was sent, null until the cron
--                                 sweep flips it.
--
-- Plus two indexes:
--
--   1. A partial UNIQUE index on (token_id, client_request_id) where
--      client_request_id IS NOT NULL — enforces idempotency at the
--      database layer (defensive belt + suspenders).
--
--   2. A partial index on expires_at where status='pending' and
--      reminder_sent_at IS NULL — makes the cron sweep cheap by
--      pre-filtering to "pending approvals that still need reminding".

alter table public.pending_approvals
  add column if not exists client_request_id text,
  add column if not exists reminder_sent_at timestamptz;

comment on column public.pending_approvals.client_request_id is
  'SHRP-085 idempotency key supplied by the calling agent. Unique per token.';

comment on column public.pending_approvals.reminder_sent_at is
  'SHRP-086 when the 15-min-before-expiry reminder email was sent.';

create unique index if not exists pending_approvals_idempotency_idx
  on public.pending_approvals (token_id, client_request_id)
  where client_request_id is not null;

create index if not exists pending_approvals_reminder_sweep_idx
  on public.pending_approvals (expires_at)
  where status = 'pending' and reminder_sent_at is null;

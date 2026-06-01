-- Sherpa migration 0008 — store the executed upstream result on
-- pending_approvals (SHRP-042 Stage 2).
--
-- When the user clicks Approve, the server decrypts the credential,
-- makes the upstream API call (Stripe/GitHub/whatever), and writes the
-- result back here. The agent then fetches the result via a new MCP
-- tool sherpa_get_approval_result(approval_id).
--
-- Why we store on the approval row rather than a separate executions
-- table: each approval corresponds to exactly one execution attempt
-- (idempotent), and the agent needs to be able to look up "did my
-- queued action go through?" via a single ID. Keeping the result on
-- the approval row makes that query trivial.

alter table public.pending_approvals
  add column if not exists result_status_code integer,
  add column if not exists result_body text,
  add column if not exists executed_at timestamptz;

comment on column public.pending_approvals.result_status_code is
  'HTTP status code returned by the upstream API call. NULL until executed.';

comment on column public.pending_approvals.result_body is
  'Response body returned by the upstream API call. Stored as text; parsed JSON if applicable. NULL until executed.';

comment on column public.pending_approvals.executed_at is
  'When the approved call was executed against the upstream API. NULL for pending/rejected/expired rows.';

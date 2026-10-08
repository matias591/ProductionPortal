-- Portal <-> NetSuite / Salesforce sync failures, shown on Admin > Sync Issues.
-- One open row per (source, record_id); repeat failures bump `attempts` instead of adding rows.
-- RLS on with no policies: only the service role (API routes, admin-gated) can read/write.
create table if not exists public.sync_failures (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  record_type text not null,
  record_id text not null,
  record_label text,
  category text not null default 'unknown',
  raw_error text,
  status text not null default 'open',
  attempts integer not null default 1,
  created_at timestamptz not null default now(),
  last_failed_at timestamptz not null default now(),
  last_retry_at timestamptz,
  resolved_at timestamptz,
  resolved_by text
);
create unique index if not exists sync_failures_one_open_per_record
  on public.sync_failures (source, record_id) where status <> 'resolved';
create index if not exists sync_failures_status_idx on public.sync_failures (status, last_failed_at desc);
alter table public.sync_failures enable row level security;

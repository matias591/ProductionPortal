-- Flight segments per trip (from Mesh GET /travel/trips/{tid} bookings[].flights[]), synced by n8n.
alter table public.employee_trips add column if not exists flights jsonb not null default '[]'::jsonb;

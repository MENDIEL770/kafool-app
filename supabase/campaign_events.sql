-- Campaign usage / funnel analytics. Run in Supabase SQL Editor.
-- Events are written by the public donation page via /api/track (service key);
-- read by managers in the campaign "סקירת תנועה" tab.
create table if not exists campaign_events (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns(id) on delete cascade,
  session_id  text not null,                  -- anonymous per-visitor id (localStorage)
  event_type  text not null,                  -- view | video_play | donate_open | donate_payment | donate_complete | donate_abandon
  step        text,                           -- furthest funnel step, for abandons
  meta        jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists campaign_events_campaign_idx on campaign_events (campaign_id, created_at desc);
create index if not exists campaign_events_type_idx     on campaign_events (campaign_id, event_type);

-- RLS on, no public policies → only the service-role key can read/write
-- (the /api/track route writes; the dashboard reads server-side with the service client).
alter table campaign_events enable row level security;

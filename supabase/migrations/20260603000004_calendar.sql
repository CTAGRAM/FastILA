-- ============================================================================
-- Fast-ILA · Calendar & diary sync (Phase 2, Supabase-native)
-- ============================================================================
-- Per-lawyer Google Calendar / Microsoft Outlook connections with two-way sync:
--   • PULL  busy intervals (free/busy) → calendar_busy  (so the booking form
--           only offers genuinely free slots)
--   • PUSH  each booking → a calendar event with a Meet/Teams link, tracked in
--           calendar_event_links
--
-- The sync is RECONCILIATION-BASED (a pg_cron tick calls the `calendar` edge
-- function every 15 min) — deliberately NO triggers on the bookings table, so
-- this phase cannot affect booking writes at all.
--
-- Token security: refresh/access tokens live in calendar_connections, which has
-- RLS enabled with NO policies → it is invisible to PostgREST (anon/authed).
-- Only edge functions (service role) ever read tokens. The dashboard reads a
-- sanitised status list through the `calendar` edge function instead.
--
-- Idempotent — safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- ---------------------------------------------------------------------------
-- 1. calendar_connections — one row per lawyer per provider (holds tokens)
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_connections (
  id               uuid primary key default gen_random_uuid(),
  lawyer_id        text references public.lawyers(id) on delete cascade,
  provider         text not null,                 -- 'google' | 'microsoft'
  account_email    text,
  calendar_id      text default 'primary',
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  scope            text,
  sync_enabled     boolean not null default true,
  status           text not null default 'connected',  -- connected|error|revoked
  last_error       text,
  last_synced_at   timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (lawyer_id, provider)
);

-- ---------------------------------------------------------------------------
-- 2. calendar_busy — cached free/busy intervals pulled from each calendar.
--    No event titles/details are stored — only when a lawyer is busy — so it
--    is safe for the public booking form to read.
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_busy (
  id              uuid primary key default gen_random_uuid(),
  lawyer_id       text references public.lawyers(id) on delete cascade,
  provider        text,
  starts_at       timestamptz not null,
  ends_at         timestamptz not null,
  source_event_id text,
  synced_at       timestamptz default now()
);
create index if not exists calendar_busy_lawyer_idx on public.calendar_busy (lawyer_id, starts_at);

-- ---------------------------------------------------------------------------
-- 3. calendar_event_links — maps a booking → the event we created on a calendar
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_event_links (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  lawyer_id   text,
  provider    text,
  event_id    text,
  meet_link   text,
  state       text not null default 'synced',     -- synced|cancelled|error
  last_error  text,
  booking_fingerprint text,                        -- detects when a booking changed
  updated_at  timestamptz default now(),
  unique (booking_id, provider)
);
create index if not exists calendar_event_links_booking_idx on public.calendar_event_links (booking_id);

-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------
alter table public.calendar_connections  enable row level security;  -- no policies → service-role only
alter table public.calendar_busy          enable row level security;
alter table public.calendar_event_links   enable row level security;

drop policy if exists calendar_busy_read         on public.calendar_busy;
drop policy if exists calendar_event_links_staff on public.calendar_event_links;

-- Busy intervals: readable by anyone (the public booking form needs them);
-- writes are service-role only (no write policy → RLS blocks non-service).
create policy calendar_busy_read on public.calendar_busy
  for select using (true);

-- Event links: staff may read for the admin view; writes service-role only.
create policy calendar_event_links_staff on public.calendar_event_links
  for select using (public.is_staff());

-- Realtime so the dashboard reflects connection/sync changes live (best-effort).
do $$ begin alter publication supabase_realtime add table public.calendar_busy; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.calendar_event_links; exception when others then null; end $$;

-- ---------------------------------------------------------------------------
-- 5. Scheduler — every 15 min, nudge the `calendar` edge function to sync.
--    Reads the function URL + service-role key from Vault (set at deploy time,
--    never in this repo). No-ops quietly until armed, so it's safe immediately.
-- ---------------------------------------------------------------------------
create or replace function public.fi_calendar_tick()
returns void language plpgsql security definer set search_path = public, vault, net as $$
declare v_url text; v_key text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'fi_calendar_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'fi_service_role_key' limit 1;
  exception when others then return;
  end;
  if v_url is null or v_key is null then return; end if;
  if not exists (select 1 from public.calendar_connections where sync_enabled and status = 'connected') then
    return;  -- nothing connected yet
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object('action', 'sync', 'source', 'pg_cron')
  );
exception when others then
  raise warning 'fi_calendar_tick skipped: %', sqlerrm;
end $$;

do $$ begin perform cron.unschedule('fi-calendar-sync'); exception when others then null; end $$;
select cron.schedule('fi-calendar-sync', '*/15 * * * *', $$ select public.fi_calendar_tick(); $$);

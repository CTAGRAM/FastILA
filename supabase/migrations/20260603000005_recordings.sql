-- ============================================================================
-- Fast-ILA · Call recordings & transcripts (Phase 3, Supabase-native)
-- ============================================================================
-- Stores call recordings (uploaded, or later auto-ingested from Meet/Teams),
-- auto-transcribes them (OpenAI Whisper) and writes an AI summary onto the
-- booking. New tables + a private storage bucket; staff-only; additive — no
-- changes to existing tables or policies. No triggers on bookings.
--
-- Idempotent — safe to re-run.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. recordings — one row per audio/video file for a booking
-- ---------------------------------------------------------------------------
create table if not exists public.recordings (
  id               uuid primary key default gen_random_uuid(),
  booking_id       uuid references public.bookings(id) on delete cascade,
  source           text not null default 'upload',     -- upload|google_meet|teams|recall
  storage_path     text,                                -- path in the 'recordings' bucket
  external_url     text,
  filename         text,
  mime_type        text,
  size_bytes       bigint,
  duration_seconds integer,
  status           text not null default 'uploaded',    -- uploaded|transcribing|transcribed|error
  last_error       text,
  uploaded_by      uuid,
  created_at       timestamptz default now()
);
create index if not exists recordings_booking_idx on public.recordings (booking_id, created_at);

-- ---------------------------------------------------------------------------
-- 2. transcripts — transcript + AI summary for a recording
-- ---------------------------------------------------------------------------
create table if not exists public.transcripts (
  id           uuid primary key default gen_random_uuid(),
  booking_id   uuid references public.bookings(id) on delete cascade,
  recording_id uuid references public.recordings(id) on delete cascade,
  provider     text,                                   -- openai_whisper|deepgram|google_meet|teams
  language     text,
  text         text,
  segments     jsonb,
  summary      text,
  status       text not null default 'ready',          -- ready|error
  created_at   timestamptz default now()
);
create index if not exists transcripts_booking_idx on public.transcripts (booking_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. Private storage bucket for the audio/video files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. RLS — staff only (recordings/transcripts are privileged legal material;
--    clients must NOT see them). Edge function uses the service role.
-- ---------------------------------------------------------------------------
alter table public.recordings  enable row level security;
alter table public.transcripts enable row level security;

drop policy if exists recordings_staff  on public.recordings;
drop policy if exists transcripts_staff on public.transcripts;
create policy recordings_staff  on public.recordings  for all using (public.is_staff()) with check (public.is_staff());
create policy transcripts_staff on public.transcripts for all using (public.is_staff()) with check (public.is_staff());

-- Storage policies for the recordings bucket — staff only.
drop policy if exists recordings_select on storage.objects;
drop policy if exists recordings_insert on storage.objects;
drop policy if exists recordings_update on storage.objects;
drop policy if exists recordings_delete on storage.objects;
create policy recordings_select on storage.objects for select using (bucket_id = 'recordings' and public.is_staff());
create policy recordings_insert on storage.objects for insert with check (bucket_id = 'recordings' and public.is_staff());
create policy recordings_update on storage.objects for update using (bucket_id = 'recordings' and public.is_staff());
create policy recordings_delete on storage.objects for delete using (bucket_id = 'recordings' and public.is_staff());

-- Realtime so the booking detail reflects transcription progress live.
do $$ begin alter publication supabase_realtime add table public.recordings;  exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.transcripts; exception when others then null; end $$;

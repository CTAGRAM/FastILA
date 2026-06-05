-- Fast-ILA Supabase schema
-- Run order: schema.sql → policies.sql → seed.sql

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Roles helper (role of the current authenticated user)
-- Stored in user metadata or in `staff` table
-- ---------------------------------------------------------------------------
create table if not exists public.staff (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text unique not null,
  full_name    text,
  role         text not null check (role in ('admin','lawyer')),
  lawyer_id    text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

create or replace function public.current_role()
returns text
language sql stable security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 'anon'
    when exists (select 1 from public.staff where id = auth.uid() and active) then
      (select role from public.staff where id = auth.uid())
    else 'client'
  end;
$$;

create or replace function public.current_lawyer_id()
returns text
language sql stable security definer
set search_path = public
as $$
  select lawyer_id from public.staff where id = auth.uid() and active and role = 'lawyer';
$$;

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------
create table if not exists public.services (
  id                text primary key,
  slug              text unique not null,
  name              text not null,
  short_name        text,
  price             numeric(10,2) not null,
  price_net         numeric(10,2),
  price_vat         numeric(10,2),
  duration          int not null default 45,
  badge             text,
  badge_style       text,
  min_notice_hours  int not null default 48,
  attendee_count    int not null default 1,
  requires_wet_sig  boolean not null default false,
  weekends          boolean not null default false,
  delivery          text not null default 'digital' check (delivery in ('digital','postal')),
  description       text,
  icon              text,
  active            boolean not null default true,
  sort_order        int not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lawyers (profile rows shown in booking flow; linked to staff via lawyer_id)
-- ---------------------------------------------------------------------------
create table if not exists public.lawyers (
  id                text primary key,
  name              text not null,
  initials          text,
  sra               text,
  photo_bg          text,
  languages         text[] not null default '{}',
  services          text[] not null default '{}',
  rating            numeric(2,1),
  reviews           int default 0,
  bio               text,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Matter types (curated by admin)
-- ---------------------------------------------------------------------------
create table if not exists public.matter_types (
  id           text primary key,
  name         text not null,
  short_name   text,
  description  text,
  active       boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lender knowledge base
-- ---------------------------------------------------------------------------
create table if not exists public.lenders (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  category       text,
  accepts_digital boolean default true,
  requires_wet   boolean default false,
  notes          text,
  contact_email  text,
  contact_phone  text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Lawyer availability — explicit slot table (truthful source of availability)
-- ---------------------------------------------------------------------------
create table if not exists public.availability_slots (
  id            uuid primary key default gen_random_uuid(),
  lawyer_id     text not null references public.lawyers(id) on delete cascade,
  slot_date     date not null,
  slot_time     time not null,
  duration      int not null default 45,
  is_blocked    boolean not null default false,
  reason        text,
  created_at    timestamptz not null default now(),
  unique(lawyer_id, slot_date, slot_time)
);

create index if not exists availability_slots_date_idx
  on public.availability_slots(slot_date, lawyer_id) where is_blocked = false;

-- ---------------------------------------------------------------------------
-- Clients (lightweight, no auth required at create time — created during booking)
-- Linked to auth.users when the client first signs in to the portal
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  full_name    text not null,
  email        text not null,
  phone        text,
  postal       text,
  created_at   timestamptz not null default now(),
  unique(email)
);

create index if not exists clients_user_id_idx on public.clients(user_id);

-- ---------------------------------------------------------------------------
-- Bookings (heart of the system)
-- ---------------------------------------------------------------------------
create table if not exists public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  ref                 text unique not null,
  client_id           uuid references public.clients(id) on delete restrict,
  client_name         text not null,
  client_email        text not null,
  client_phone        text,
  service_id          text not null references public.services(id),
  lawyer_id           text references public.lawyers(id),
  appointment_date    date not null,
  appointment_time    time not null,
  duration            int not null default 45,
  matter_type         text references public.matter_types(id),
  status              text not null default 'scheduled'
                      check (status in ('scheduled','completed','no-show','cancelled')),
  payment_status      text not null default 'pending'
                      check (payment_status in ('pending','paid','refunded','failed')),
  amount              numeric(10,2) not null,
  source              text default 'fast-ila.co.uk',
  lender              text,
  legal_summary       text,
  second_signatory_name  text,
  second_signatory_email text,
  second_signatory_phone text,
  post_recipient      text check (post_recipient in ('client','lender')),
  post_address        text,
  dispatch            text check (dispatch in
    ('not_started','awaiting_signature','signed','ready_to_post','posted','delivered')),
  tracking_number     text,
  tracking_service    text,
  meet_link           text,
  ai_summary          text,
  internal_notes      text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  cancelled_at        timestamptz,
  completed_at        timestamptz
);

create index if not exists bookings_date_idx       on public.bookings(appointment_date);
create index if not exists bookings_status_idx     on public.bookings(status);
create index if not exists bookings_lawyer_idx     on public.bookings(lawyer_id);
create index if not exists bookings_client_id_idx  on public.bookings(client_id);
create index if not exists bookings_client_email_idx on public.bookings(client_email);

-- Function to generate a sequential ref like FI-2026-00481
create or replace function public.generate_booking_ref()
returns text
language plpgsql
as $$
declare
  y int := extract(year from now());
  n int;
begin
  select coalesce(max(substring(ref from 'FI-\d{4}-(\d+)')::int), 480) + 1
    into n
    from public.bookings
    where ref like 'FI-' || y || '-%';
  return 'FI-' || y || '-' || lpad(n::text, 5, '0');
end $$;

create or replace function public.set_booking_ref()
returns trigger language plpgsql as $$
begin
  if new.ref is null or new.ref = '' then
    new.ref := public.generate_booking_ref();
  end if;
  return new;
end $$;

drop trigger if exists trg_bookings_ref on public.bookings;
create trigger trg_bookings_ref
  before insert on public.bookings
  for each row execute function public.set_booking_ref();

-- Updated-at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_bookings_updated on public.bookings;
create trigger trg_bookings_updated
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Booking events (audit + portal-step progress)
-- ---------------------------------------------------------------------------
create table if not exists public.booking_events (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  event_type    text not null,
  actor_id      uuid references auth.users(id),
  actor_label   text,
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists booking_events_booking_idx on public.booking_events(booking_id, created_at);

-- ---------------------------------------------------------------------------
-- Documents (KYC + matter docs + certificates) — files live in Storage
-- ---------------------------------------------------------------------------
create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid references public.bookings(id) on delete cascade,
  kind          text not null check (kind in
    ('id_passport','id_driving','address_proof','matter_doc','care_letter','certificate','other')),
  storage_path  text not null,
  filename      text not null,
  mime_type     text,
  size_bytes    bigint,
  uploaded_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists documents_booking_idx on public.documents(booking_id);

-- ---------------------------------------------------------------------------
-- Signatures (care letter, declaration, certificate)
-- ---------------------------------------------------------------------------
create table if not exists public.signatures (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  kind            text not null check (kind in ('care_letter','declaration','certificate')),
  signed_by       text not null,
  signed_by_role  text not null check (signed_by_role in ('client','lawyer','second_signatory')),
  signature_data  text,
  signed_at       timestamptz not null default now(),
  ip_address      inet,
  user_agent      text,
  meta            jsonb default '{}'::jsonb
);

create index if not exists signatures_booking_idx on public.signatures(booking_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  amount        numeric(10,2) not null,
  status        text not null default 'pending'
                check (status in ('pending','paid','failed','refunded')),
  method        text not null default 'bank_transfer',
  reference     text,
  client_declared_paid_at timestamptz,
  verified_at   timestamptz,
  verified_by   uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments(booking_id);

-- ---------------------------------------------------------------------------
-- Understanding answers (declarations recorded for each booking)
-- ---------------------------------------------------------------------------
create table if not exists public.understanding_answers (
  id            uuid primary key default gen_random_uuid(),
  booking_id    uuid not null references public.bookings(id) on delete cascade,
  question_id   text not null,
  question_text text not null,
  answer        boolean not null,
  answered_at   timestamptz not null default now(),
  unique(booking_id, question_id)
);

-- ---------------------------------------------------------------------------
-- AI assistant prompts (admin-editable)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_prompts (
  id           text primary key,
  label        text not null,
  prompt       text not null,
  active       boolean not null default true,
  updated_by   uuid references auth.users(id),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Email/SMS templates
-- ---------------------------------------------------------------------------
create table if not exists public.templates (
  id           text primary key,
  channel      text not null check (channel in ('email','sms','letter')),
  subject      text,
  body         text not null,
  active       boolean not null default true,
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Brokers (referral panel)
-- ---------------------------------------------------------------------------
create table if not exists public.brokers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  firm         text,
  email        text,
  phone        text,
  referral_count int default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Storage buckets (initialised via storage schema)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('client-docs', 'client-docs', false),
  ('certificates', 'certificates', false),
  ('templates', 'templates', false)
on conflict (id) do nothing;

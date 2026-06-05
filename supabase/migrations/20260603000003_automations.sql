-- ============================================================================
-- Fast-ILA · Automation engine (Supabase-native)
-- ============================================================================
-- Adds a reminder/email/SMS automation layer that runs entirely inside Supabase
-- (no n8n dependency): configurable rules → a message queue filled by triggers
-- on bookings → a pg_cron tick that invokes the `dispatch-automations` edge
-- function to actually send via Resend (email) + Twilio (SMS).
--
-- SAFETY: every booking trigger is wrapped so an automation failure can NEVER
-- block a booking insert/update. New tables are additive and RLS-locked to
-- staff. Nothing here touches existing tables' columns or policies.
--
-- Idempotent — safe to re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions used by the scheduler (Supabase ships these; enable if needed)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;          -- gen_random_uuid()
create extension if not exists pg_net;            -- net.http_post (cron → edge fn)
create extension if not exists pg_cron;           -- scheduler

-- ---------------------------------------------------------------------------
-- 1. automation_rules — one row per automation, admin-editable from the UI
-- ---------------------------------------------------------------------------
create table if not exists public.automation_rules (
  key              text primary key,
  label            text not null,
  description      text,
  channel          text not null default 'email',      -- 'email' | 'sms' | 'both'
  enabled          boolean not null default true,
  anchor           text not null default 'appointment',  -- 'immediate' | 'booking_created' | 'appointment'
  offset_minutes   integer not null default 0,           -- relative to anchor; negative = before
  template_subject text,
  template_body    text,
  sms_body         text,
  sort_order       integer not null default 100,
  updated_at       timestamptz default now(),
  updated_by       uuid
);

-- ---------------------------------------------------------------------------
-- 2. messages — the queue + delivery log (one row per email / SMS)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references public.bookings(id) on delete cascade,
  rule_key    text,
  channel     text not null,                       -- 'email' | 'sms'
  to_email    text,
  to_phone    text,
  subject     text,
  body        text not null,
  status      text not null default 'pending',     -- pending|sent|failed|cancelled|skipped
  send_after  timestamptz not null default now(),
  attempts    integer not null default 0,
  last_error  text,
  provider    text,                                -- 'resend' | 'twilio'
  provider_id text,
  sent_at     timestamptz,
  created_at  timestamptz default now()
);
create index if not exists messages_due_idx     on public.messages (status, send_after);
create index if not exists messages_booking_idx on public.messages (booking_id);

-- ---------------------------------------------------------------------------
-- 3. automation_runs — audit of each dispatch tick (for the Activity view)
-- ---------------------------------------------------------------------------
create table if not exists public.automation_runs (
  id        uuid primary key default gen_random_uuid(),
  ran_at    timestamptz default now(),
  processed integer default 0,
  sent      integer default 0,
  failed    integer default 0,
  detail    jsonb default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- 4. Default rules (only inserted once — re-running won't clobber edits)
-- ---------------------------------------------------------------------------
insert into public.automation_rules (key, label, description, channel, enabled, anchor, offset_minutes, sort_order, template_subject, template_body, sms_body) values
 ('booking_confirmation',
  'Booking confirmation',
  'Sent the moment a booking is created.',
  'both', true, 'immediate', 0, 10,
  'Your Fast-ILA appointment is booked — {{ref}}',
  E'Hi {{first_name}},\n\nYour {{service_name}} is confirmed for {{date}} at {{time}} (UK time) with {{lawyer_name}}.\n\nComplete your secure client portal here:\n{{portal_url}}\n\nFee: £{{amount}}.\n\nThank you,\nFast-ILA',
  'Fast-ILA: your {{service_name}} is booked for {{date}} {{time}}. Portal: {{portal_url}}'),

 ('reminder_24h',
  '24-hour reminder',
  'Sent 24 hours before the appointment.',
  'both', true, 'appointment', -1440, 20,
  'Reminder · your Fast-ILA call tomorrow ({{ref}})',
  E'Hi {{first_name}},\n\nThis is a reminder of your {{service_name}} tomorrow, {{date}} at {{time}} (UK time) with {{lawyer_name}}.\n\nPlease finish any outstanding steps in your portal before the call:\n{{portal_url}}\n\nFast-ILA',
  'Reminder: your Fast-ILA call is tomorrow {{date}} at {{time}}. Finish your portal steps: {{portal_url}}'),

 ('reminder_1h',
  '1-hour reminder (SMS)',
  'Sent 1 hour before the appointment. Disabled by default.',
  'sms', false, 'appointment', -60, 30,
  'Your Fast-ILA call is in 1 hour',
  E'Your Fast-ILA call is in about an hour, at {{time}}. Join link is in your portal: {{portal_url}}',
  'Your Fast-ILA call is in ~1 hour at {{time}}. Portal: {{portal_url}}'),

 ('payment_chase',
  'Payment reminder',
  'Sent 48 hours after booking if payment is still pending. Auto-cancels once paid.',
  'both', true, 'booking_created', 2880, 40,
  'Payment outstanding for your Fast-ILA appointment ({{ref}})',
  E'Hi {{first_name}},\n\nWe haven''t yet received payment for your {{service_name}} on {{date}}. Please complete the bank transfer from your portal to secure your slot:\n{{portal_url}}\n\nFast-ILA',
  'Fast-ILA: payment is still outstanding for your appointment on {{date}}. Pay via your portal: {{portal_url}}'),

 ('feedback_request',
  'Feedback request',
  'Sent 2 hours after the appointment. Disabled by default.',
  'email', false, 'appointment', 120, 50,
  'How was your Fast-ILA appointment?',
  E'Hi {{first_name}},\n\nThank you for choosing Fast-ILA. We''d love 30 seconds of feedback — open your portal to leave a quick rating:\n{{portal_url}}\n\nFast-ILA',
  'Thanks for choosing Fast-ILA! Leave quick feedback in your portal: {{portal_url}}')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Template renderer — replaces {{token}} (and {{ token }}) from a jsonb map
-- ---------------------------------------------------------------------------
create or replace function public.fi_render(tmpl text, vars jsonb)
returns text language plpgsql immutable as $$
declare k text; v text; out text := coalesce(tmpl, '');
begin
  for k, v in select key, value from jsonb_each_text(vars) loop
    out := replace(out, '{{' || k || '}}', coalesce(v, ''));
    out := replace(out, '{{ ' || k || ' }}', coalesce(v, ''));
  end loop;
  return out;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Enqueue automations for one booking. SECURITY DEFINER so it can write to
--    `messages` regardless of the caller, and fully exception-guarded so it
--    can never roll back the booking transaction.
-- ---------------------------------------------------------------------------
create or replace function public.fi_enqueue_booking_automations(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  b        record;
  r        record;
  vars     jsonb;
  portal   text;
  send_ts  timestamptz;
begin
  select bk.*, s.name as service_name, l.name as lawyer_name
    into b
    from public.bookings bk
    left join public.services s on s.id = bk.service_id
    left join public.lawyers  l on l.id = bk.lawyer_id
    where bk.id = p_booking_id;
  if not found then return; end if;

  portal := coalesce(nullif(current_setting('app.portal_url', true), ''), 'https://app.fast-ila.co.uk');

  vars := jsonb_build_object(
    'ref',          coalesce(b.ref, ''),
    'client_name',  coalesce(b.client_name, ''),
    'first_name',   split_part(coalesce(b.client_name, ''), ' ', 1),
    'service_name', coalesce(b.service_name, 'ILA appointment'),
    'lawyer_name',  coalesce(b.lawyer_name, 'your assigned lawyer'),
    'date',         to_char(b.appointment_date, 'FMDay DD Mon YYYY'),
    'time',         to_char(b.appointment_time, 'HH24:MI'),
    'amount',       coalesce(b.amount::text, ''),
    'lender',       coalesce(b.lender, ''),
    'portal_url',   portal || '/?mode=portal&ref=' || coalesce(b.ref, '')
  );

  for r in select * from public.automation_rules where enabled loop
    if r.anchor = 'immediate' then
      send_ts := now();
    elsif r.anchor = 'booking_created' then
      send_ts := now() + make_interval(mins => r.offset_minutes);
    else  -- 'appointment' (interpret the slot as UK local time)
      send_ts := ((b.appointment_date + b.appointment_time) at time zone 'Europe/London')
                 + make_interval(mins => r.offset_minutes);
    end if;

    if r.channel in ('email', 'both') and coalesce(b.client_email, '') <> '' then
      insert into public.messages (booking_id, rule_key, channel, to_email, subject, body, send_after)
      values (b.id, r.key, 'email', b.client_email,
              public.fi_render(r.template_subject, vars),
              public.fi_render(coalesce(r.template_body, ''), vars),
              send_ts);
    end if;

    if r.channel in ('sms', 'both') and coalesce(b.client_phone, '') <> '' then
      insert into public.messages (booking_id, rule_key, channel, to_phone, body, send_after)
      values (b.id, r.key, 'sms', b.client_phone,
              public.fi_render(coalesce(r.sms_body, r.template_body, ''), vars),
              send_ts);
    end if;
  end loop;
exception when others then
  raise warning 'fi_enqueue_booking_automations(%) skipped: %', p_booking_id, sqlerrm;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Triggers on bookings: enqueue on insert, cancel queued msgs on
--    cancellation / payment. Both guarded so they never break the write.
-- ---------------------------------------------------------------------------
create or replace function public.fi_bookings_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.fi_enqueue_booking_automations(new.id);
  return new;
exception when others then
  raise warning 'fi_bookings_after_insert skipped: %', sqlerrm;
  return new;
end $$;

create or replace function public.fi_bookings_after_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'cancelled' and coalesce(old.status, '') <> 'cancelled' then
    update public.messages set status = 'cancelled'
      where booking_id = new.id and status = 'pending';
  end if;
  if new.payment_status = 'paid' and coalesce(old.payment_status, '') <> 'paid' then
    update public.messages set status = 'cancelled'
      where booking_id = new.id and status = 'pending' and rule_key = 'payment_chase';
  end if;
  return new;
exception when others then
  raise warning 'fi_bookings_after_update skipped: %', sqlerrm;
  return new;
end $$;

drop trigger if exists trg_bookings_automations     on public.bookings;
drop trigger if exists trg_bookings_automations_upd on public.bookings;
create trigger trg_bookings_automations
  after insert on public.bookings
  for each row execute function public.fi_bookings_after_insert();
create trigger trg_bookings_automations_upd
  after update on public.bookings
  for each row execute function public.fi_bookings_after_update();

-- ---------------------------------------------------------------------------
-- 8. Dispatch tick — called every minute by pg_cron. Reads the edge-function
--    URL + service-role key from Supabase Vault (set at deploy time, never in
--    this repo) and POSTs to the dispatch-automations edge function. No-ops
--    quietly until the vault secrets are configured, so it's safe immediately.
-- ---------------------------------------------------------------------------
create or replace function public.fi_dispatch_tick()
returns void language plpgsql security definer set search_path = public, vault, net as $$
declare v_url text; v_key text;
begin
  begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'fi_edge_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'fi_service_role_key' limit 1;
  exception when others then
    return;  -- vault not available yet
  end;
  if v_url is null or v_key is null then return; end if;
  -- Only wake the edge function when there is due work.
  if not exists (select 1 from public.messages where status = 'pending' and send_after <= now()) then
    return;
  end if;
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body    := jsonb_build_object('source', 'pg_cron')
  );
exception when others then
  raise warning 'fi_dispatch_tick skipped: %', sqlerrm;
end $$;

-- Schedule it every minute (re-runnable).
do $$ begin perform cron.unschedule('fi-dispatch-automations'); exception when others then null; end $$;
select cron.schedule('fi-dispatch-automations', '* * * * *', $$ select public.fi_dispatch_tick(); $$);

-- ---------------------------------------------------------------------------
-- 9. RLS — staff-only. Triggers/edge fn use SECURITY DEFINER / service role and
--    bypass these, so queueing + sending keep working regardless.
-- ---------------------------------------------------------------------------
alter table public.automation_rules enable row level security;
alter table public.messages         enable row level security;
alter table public.automation_runs  enable row level security;

drop policy if exists automation_rules_staff on public.automation_rules;
drop policy if exists messages_staff         on public.messages;
drop policy if exists automation_runs_staff  on public.automation_runs;

create policy automation_rules_staff on public.automation_rules
  for all using (public.is_staff()) with check (public.is_staff());
create policy messages_staff on public.messages
  for all using (public.is_staff()) with check (public.is_staff());
create policy automation_runs_staff on public.automation_runs
  for all using (public.is_staff()) with check (public.is_staff());

-- Realtime for the activity log (best-effort; ignore if already added).
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when others then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.automation_runs;
exception when others then null; end $$;

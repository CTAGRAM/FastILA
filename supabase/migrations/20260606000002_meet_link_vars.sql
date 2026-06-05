-- ============================================================================
-- Fast-ILA · Meet link in automation messages
-- ============================================================================
-- Adds {{meet_link}} to the enqueue variables so confirmation + reminder
-- email/SMS carry the real Google Meet link (set on the booking by the
-- create-booking edge function before insert). Re-creates the enqueue function
-- (same logic + meet_link var) and updates the seeded templates. Idempotent.
-- ============================================================================

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
    'meet_link',    coalesce(nullif(b.meet_link, ''), 'sent by email before your call'),
    'portal_url',   portal || '/?mode=portal&ref=' || coalesce(b.ref, '')
  );

  for r in select * from public.automation_rules where enabled loop
    if r.anchor = 'immediate' then
      send_ts := now();
    elsif r.anchor = 'booking_created' then
      send_ts := now() + make_interval(mins => r.offset_minutes);
    else
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

-- Add the Meet link line to the confirmation + reminder templates.
update public.automation_rules
  set template_body = E'Hi {{first_name}},\n\nYour {{service_name}} is confirmed for {{date}} at {{time}} (UK time) with {{lawyer_name}}.\n\nJoin your video call here: {{meet_link}}\n\nComplete your secure client portal here:\n{{portal_url}}\n\nFee: £{{amount}}.\n\nThank you,\nFast-ILA',
      sms_body = 'Fast-ILA: your {{service_name}} is booked for {{date}} {{time}}. Join: {{meet_link}} · Portal: {{portal_url}}'
  where key = 'booking_confirmation';

update public.automation_rules
  set template_body = E'Hi {{first_name}},\n\nReminder of your {{service_name}} tomorrow, {{date}} at {{time}} (UK time) with {{lawyer_name}}.\n\nJoin your video call: {{meet_link}}\n\nFinish any outstanding steps in your portal first:\n{{portal_url}}\n\nFast-ILA',
      sms_body = 'Reminder: your Fast-ILA call is tomorrow {{date}} at {{time}}. Join: {{meet_link}} · Portal: {{portal_url}}'
  where key = 'reminder_24h';

update public.automation_rules
  set sms_body = 'Your Fast-ILA call is in ~1 hour at {{time}}. Join: {{meet_link}}'
  where key = 'reminder_1h';

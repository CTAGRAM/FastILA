// Supabase Edge Function: dispatch-automations
// ---------------------------------------------------------------------------
// Drains the public.messages queue: sends due emails via Resend and SMS via
// Twilio, then marks each row sent/failed/skipped and writes an automation_runs
// audit row. Invoked every minute by pg_cron (fi_dispatch_tick) and on-demand
// by an admin from the Automation Center ("Send due now").
//
// Auth: accepts EITHER the service-role key (used by pg_cron) OR a logged-in
// admin's JWT (used by the dashboard button). Anything else → 401.
//
// Env (set via `supabase secrets set …`):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (auto-injected)
//   RESEND_API_KEY, FROM_EMAIL                 email
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN      sms
//   TWILIO_FROM            a Twilio number  (or)
//   TWILIO_MESSAGING_SERVICE_SID              messaging service
//   PORTAL_URL                                used only for event logging
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const BATCH = 100;

interface MsgRow {
  id: string;
  booking_id: string | null;
  rule_key: string | null;
  channel: 'email' | 'sms';
  to_email: string | null;
  to_phone: string | null;
  subject: string | null;
  body: string;
}

async function sendEmail(to: string, subject: string, body: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' };
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL') ?? 'bookings@fast-ila.co.uk',
      to,
      subject: subject || 'Fast-ILA',
      text: body,
    }),
  });
  if (!resp.ok) return { ok: false, error: `resend ${resp.status}: ${await resp.text()}` };
  const j = await resp.json().catch(() => ({}));
  return { ok: true, id: j?.id ?? null };
}

async function sendSms(to: string, body: string) {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!sid || !token) return { ok: false, error: 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not set' };
  const form = new URLSearchParams();
  form.set('To', to);
  form.set('Body', body);
  const msgSvc = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');
  const from = Deno.env.get('TWILIO_FROM');
  if (msgSvc) form.set('MessagingServiceSid', msgSvc);
  else if (from) form.set('From', from);
  else return { ok: false, error: 'TWILIO_FROM or TWILIO_MESSAGING_SERVICE_SID not set' };

  const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${sid}:${token}`),
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  if (!resp.ok) return { ok: false, error: `twilio ${resp.status}: ${await resp.text()}` };
  const j = await resp.json().catch(() => ({}));
  return { ok: true, id: j?.sid ?? null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const reqBody = await req.json().catch(() => ({} as Record<string, unknown>));
  const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPA_URL, SERVICE_KEY);

  // --- AuthZ: service-role key (pg_cron) OR an admin JWT (dashboard button) ---
  const authHeader = req.headers.get('Authorization') ?? '';
  const bearer = authHeader.replace(/^Bearer\s+/i, '');
  const CRON_SECRET = Deno.env.get('FI_CRON_SECRET');
  let authorized = bearer === SERVICE_KEY || (!!CRON_SECRET && bearer === CRON_SECRET);
  if (!authorized && bearer) {
    try {
      const { data } = await admin.auth.getUser(bearer);
      const role =
        (data.user?.app_metadata as Record<string, unknown> | undefined)?.role ??
        (data.user?.user_metadata as Record<string, unknown> | undefined)?.role;
      authorized = role === 'admin';
    } catch (_e) { /* fall through */ }
  }
  if (!authorized) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }

  try {
    const nowIso = new Date().toISOString();
    const { data: due, error } = await admin
      .from('messages')
      .select('id, booking_id, rule_key, channel, to_email, to_phone, subject, body')
      .eq('status', 'pending')
      .lte('send_after', nowIso)
      .order('send_after', { ascending: true })
      .limit(BATCH);
    if (error) throw new Error(error.message);

    const rows = (due ?? []) as MsgRow[];
    let sent = 0, failed = 0, skipped = 0;

    for (const m of rows) {
      // Guard against stale messages: skip if the booking was cancelled, or a
      // payment chase whose invoice is already paid.
      if (m.booking_id) {
        const { data: bk } = await admin
          .from('bookings')
          .select('status, payment_status')
          .eq('id', m.booking_id)
          .single();
        if (bk?.status === 'cancelled') {
          await admin.from('messages').update({ status: 'cancelled', last_error: 'booking cancelled' }).eq('id', m.id);
          skipped++; continue;
        }
        if (m.rule_key === 'payment_chase' && bk?.payment_status === 'paid') {
          await admin.from('messages').update({ status: 'skipped', last_error: 'already paid' }).eq('id', m.id);
          skipped++; continue;
        }
      }

      let result: { ok: boolean; id?: string | null; error?: string };
      if (m.channel === 'email') {
        if (!m.to_email) result = { ok: false, error: 'no recipient email' };
        else result = await sendEmail(m.to_email, m.subject ?? '', m.body);
      } else {
        if (!m.to_phone) result = { ok: false, error: 'no recipient phone' };
        else result = await sendSms(m.to_phone, m.body);
      }

      if (result.ok) {
        await admin.from('messages').update({
          status: 'sent', sent_at: new Date().toISOString(),
          provider: m.channel === 'email' ? 'resend' : 'twilio',
          provider_id: result.id ?? null,
          attempts: 1, last_error: null,
        }).eq('id', m.id);
        sent++;
        if (m.booking_id) {
          await admin.from('booking_events').insert({
            booking_id: m.booking_id, event_type: `automation_${m.channel}_sent`,
            actor_label: 'automation', meta: { rule_key: m.rule_key },
          }).then(() => {}, () => {});
        }
      } else {
        await admin.from('messages').update({
          status: 'failed', attempts: 1, last_error: result.error ?? 'unknown error',
        }).eq('id', m.id);
        failed++;
      }
    }

    await admin.from('automation_runs').insert({
      processed: rows.length, sent, failed,
      detail: { skipped, source: (reqBody as Record<string, unknown>)?.source ?? 'manual' },
    }).then(() => {}, () => {});

    return new Response(JSON.stringify({ ok: true, processed: rows.length, sent, failed, skipped }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  }
});

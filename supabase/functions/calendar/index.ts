// Supabase Edge Function: calendar
// ---------------------------------------------------------------------------
// One function, several actions (POST { action, ... }):
//   • status      → sanitised list of calendar connections (no tokens)
//   • start       → returns the provider OAuth URL to begin connecting
//   • disconnect  → removes a connection
//   • sync        → reconcile: refresh tokens, pull free/busy, push booking events
//
// Auth: status/start/disconnect need an admin JWT OR the lawyer's own JWT.
//       sync accepts the service-role key (pg_cron) OR an admin JWT.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';
import {
  Provider, signState, buildAuthUrl, refreshTokens,
  getFreeBusy, createEvent, updateEvent, deleteEvent, appUrl,
} from '../_shared/calendar.ts';

const SYNC_DAYS = 60;
const MAX_BOOKINGS = 200;

interface Caller { id: string; role: string; lawyer_id: string | null }

async function getCaller(admin: SupabaseClient, bearer: string): Promise<Caller | null> {
  if (!bearer) return null;
  const { data } = await admin.auth.getUser(bearer);
  const u = data.user;
  if (!u) return null;
  const am = (u.app_metadata ?? {}) as Record<string, unknown>;
  const um = (u.user_metadata ?? {}) as Record<string, unknown>;
  return { id: u.id, role: String(am.role ?? um.role ?? 'client'), lawyer_id: (am.lawyer_id ?? um.lawyer_id ?? null) as string | null };
}

function addLocalMinutes(local: string, mins: number): string {
  // Treat the wall-clock string as UTC purely for arithmetic, then reformat.
  const d = new Date(local.endsWith('Z') ? local : local + 'Z');
  d.setUTCMinutes(d.getUTCMinutes() + mins);
  return d.toISOString().slice(0, 19);
}
function fingerprint(b: { appointment_date: string; appointment_time: string; service_id: string; lawyer_id: string; status: string }): string {
  return [b.appointment_date, b.appointment_time, b.service_id, b.lawyer_id, b.status].join('|');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPA_URL, SERVICE_KEY);

  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const CRON_SECRET = Deno.env.get('FI_CRON_SECRET');
  const isService = bearer === SERVICE_KEY || (!!CRON_SECRET && bearer === CRON_SECRET);
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body.action ?? 'status');

  try {
    // ---- sync: service role (cron) or admin --------------------------------
    if (action === 'sync') {
      let ok = isService;
      if (!ok) { const c = await getCaller(admin, bearer); ok = c?.role === 'admin'; }
      if (!ok) return json(401, { ok: false, error: 'unauthorized' });
      const result = await runSync(admin, body.lawyer_id as string | undefined);
      return json(200, { ok: true, ...result });
    }

    // ---- everything else: admin or the lawyer themselves -------------------
    const caller = await getCaller(admin, bearer);
    if (!caller) return json(401, { ok: false, error: 'unauthorized' });
    const isAdmin = caller.role === 'admin';
    const owns = (lawyerId: string) => isAdmin || (!!caller.lawyer_id && caller.lawyer_id === lawyerId);

    if (action === 'status') {
      let q = admin.from('calendar_connections')
        .select('id, lawyer_id, kind, provider, account_email, calendar_id, sync_enabled, status, last_error, last_synced_at, created_at');
      if (!isAdmin) q = q.or(`lawyer_id.eq.${caller.lawyer_id ?? '__none__'},kind.eq.firm`);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return json(200, { ok: true, connections: data ?? [] });
    }

    if (action === 'start') {
      const provider = body.provider as Provider;
      if (!['google', 'microsoft'].includes(provider)) return json(400, { ok: false, error: 'bad provider' });
      // Firm-wide connection (one account that mints every Meet link) — admin only.
      if (body.firm) {
        if (!isAdmin) return json(403, { ok: false, error: 'admin only' });
        const state = await signState({ provider, firm: true, n: crypto.randomUUID() });
        return json(200, { ok: true, url: await buildAuthUrl(provider, state) });
      }
      const lawyerId = String(body.lawyer_id ?? caller.lawyer_id ?? '');
      if (!lawyerId) return json(400, { ok: false, error: 'lawyer_id required' });
      if (!owns(lawyerId)) return json(403, { ok: false, error: 'forbidden' });
      const state = await signState({ provider, lawyer_id: lawyerId, n: crypto.randomUUID() });
      return json(200, { ok: true, url: await buildAuthUrl(provider, state) });
    }

    if (action === 'disconnect') {
      const provider = body.provider as Provider;
      if (body.firm) {
        if (!isAdmin) return json(403, { ok: false, error: 'admin only' });
        await admin.from('calendar_connections').delete().eq('kind', 'firm').eq('provider', provider);
        return json(200, { ok: true });
      }
      const lawyerId = String(body.lawyer_id ?? caller.lawyer_id ?? '');
      if (!owns(lawyerId)) return json(403, { ok: false, error: 'forbidden' });
      await admin.from('calendar_connections').delete().eq('lawyer_id', lawyerId).eq('provider', provider);
      await admin.from('calendar_busy').delete().eq('lawyer_id', lawyerId).eq('provider', provider);
      return json(200, { ok: true });
    }

    return json(400, { ok: false, error: `unknown action: ${action}` });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});

async function ensureFreshToken(admin: SupabaseClient, conn: Record<string, unknown>): Promise<string> {
  const provider = conn.provider as Provider;
  const exp = conn.token_expires_at ? new Date(conn.token_expires_at as string).getTime() : 0;
  if (exp && exp > Date.now() + 60_000) return conn.access_token as string;
  if (!conn.refresh_token) throw new Error('no refresh token — reconnect required');
  const t = await refreshTokens(provider, conn.refresh_token as string);
  const expiresAt = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from('calendar_connections').update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? conn.refresh_token,
    token_expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id as string);
  return t.access_token;
}

async function runSync(admin: SupabaseClient, onlyLawyer?: string) {
  let q = admin.from('calendar_connections').select('*').eq('sync_enabled', true).eq('status', 'connected');
  if (onlyLawyer) q = q.eq('lawyer_id', onlyLawyer);
  const { data: conns } = await q;
  const summary = { connections: 0, busy: 0, events_created: 0, events_updated: 0, events_cancelled: 0, errors: 0 };

  const now = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + SYNC_DAYS * 86400_000).toISOString();
  const today = now.toISOString().slice(0, 10);
  const maxDate = timeMax.slice(0, 10);

  for (const conn of conns ?? []) {
    summary.connections++;
    const provider = conn.provider as Provider;
    const lawyerId = conn.lawyer_id as string;
    try {
      const token = await ensureFreshToken(admin, conn);

      // 1) free/busy → refresh cache for this lawyer+provider
      const intervals = await getFreeBusy(provider, token, (conn.calendar_id as string) || 'primary', timeMin, timeMax);
      await admin.from('calendar_busy').delete().eq('lawyer_id', lawyerId).eq('provider', provider);
      if (intervals.length) {
        await admin.from('calendar_busy').insert(intervals.map((iv) => ({
          lawyer_id: lawyerId, provider, starts_at: iv.start, ends_at: iv.end,
        })));
        summary.busy += intervals.length;
      }

      // 2) push booking events
      const { data: bookings } = await admin
        .from('bookings')
        .select('id, ref, client_name, client_email, second_signatory_email, appointment_date, appointment_time, service_id, lawyer_id, status, meet_link, service:services(name,duration)')
        .eq('lawyer_id', lawyerId)
        .gte('appointment_date', today)
        .lte('appointment_date', maxDate)
        .limit(MAX_BOOKINGS);

      const { data: links } = await admin.from('calendar_event_links').select('*').eq('provider', provider).eq('lawyer_id', lawyerId);
      const linkByBooking = new Map((links ?? []).map((l) => [l.booking_id as string, l]));

      for (const b of bookings ?? []) {
        const link = linkByBooking.get(b.id as string);
        const svc = (b as { service?: { name?: string; duration?: number } }).service;
        const duration = svc?.duration ?? 45;
        const startLocal = `${b.appointment_date}T${String(b.appointment_time).slice(0, 8).padEnd(8, ':00').slice(0, 8)}`;
        const ev = {
          summary: `Fast-ILA · ${svc?.name ?? 'ILA appointment'} — ${b.client_name}`,
          description: `Fast-ILA appointment ${b.ref}. Client portal: ${appUrl()}/?mode=portal&ref=${b.ref}`,
          startLocal,
          endLocal: addLocalMinutes(startLocal, duration),
          attendees: [b.client_email as string, b.second_signatory_email as string].filter(Boolean),
        };

        if (b.status !== 'scheduled') {
          if (link && link.state === 'synced' && link.event_id) {
            await deleteEvent(provider, token, (conn.calendar_id as string) || 'primary', link.event_id as string);
            await admin.from('calendar_event_links').update({ state: 'cancelled', updated_at: new Date().toISOString() }).eq('id', link.id as string);
            summary.events_cancelled++;
          }
          continue;
        }

        const fp = fingerprint(b as never);
        if (!link) {
          const created = await createEvent(provider, token, (conn.calendar_id as string) || 'primary', ev);
          await admin.from('calendar_event_links').insert({
            booking_id: b.id, lawyer_id: lawyerId, provider, event_id: created.id,
            meet_link: created.meetLink, state: 'synced', booking_fingerprint: fp,
          });
          if (created.meetLink && !b.meet_link) {
            await admin.from('bookings').update({ meet_link: created.meetLink }).eq('id', b.id as string);
          }
          summary.events_created++;
        } else if (link.state === 'synced' && link.booking_fingerprint !== fp && link.event_id) {
          await updateEvent(provider, token, (conn.calendar_id as string) || 'primary', link.event_id as string, ev);
          await admin.from('calendar_event_links').update({ booking_fingerprint: fp, updated_at: new Date().toISOString() }).eq('id', link.id as string);
          summary.events_updated++;
        }
      }

      await admin.from('calendar_connections').update({
        last_synced_at: new Date().toISOString(), status: 'connected', last_error: null,
      }).eq('id', conn.id as string);
    } catch (e) {
      summary.errors++;
      await admin.from('calendar_connections').update({
        status: 'error', last_error: (e as Error).message, updated_at: new Date().toISOString(),
      }).eq('id', conn.id as string);
    }
  }
  return summary;
}

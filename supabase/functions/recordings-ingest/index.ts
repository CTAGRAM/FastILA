// Supabase Edge Function: recordings-ingest (Phase 3b)
// ---------------------------------------------------------------------------
// Automatic transcript capture. For each connected calendar, looks at recent
// bookings that have a pushed Meet/Teams event but no transcript yet, pulls the
// provider's transcript (Google Meet API / Microsoft Graph), stores it and an
// AI file-note summary onto the booking. Runs hourly via pg_cron.
//
// Requires the EXPANDED OAuth scopes (lawyers must reconnect after the Phase 3b
// deploy) AND that recording+transcription is enabled in the org's Workspace/
// M365 admin. If a transcript isn't available yet, it's simply skipped.
//
// Auth: service-role key (pg_cron) OR an admin JWT.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';
import { Provider, refreshTokens, getGoogleMeetTranscript, getTeamsTranscript, meetCodeFromLink } from '../_shared/calendar.ts';
import { summarise } from '../_shared/summarize.ts';

const LOOKBACK_DAYS = 7;

async function ensureFreshToken(admin: SupabaseClient, conn: Record<string, unknown>): Promise<string> {
  const exp = conn.token_expires_at ? new Date(conn.token_expires_at as string).getTime() : 0;
  if (exp && exp > Date.now() + 60_000) return conn.access_token as string;
  if (!conn.refresh_token) throw new Error('no refresh token — reconnect required');
  const t = await refreshTokens(conn.provider as Provider, conn.refresh_token as string);
  const expiresAt = t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null;
  await admin.from('calendar_connections').update({
    access_token: t.access_token, refresh_token: t.refresh_token ?? conn.refresh_token,
    token_expires_at: expiresAt, updated_at: new Date().toISOString(),
  }).eq('id', conn.id as string);
  return t.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // auth: service key or admin JWT
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const CRON_SECRET = Deno.env.get('FI_CRON_SECRET');
  let ok = bearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || (!!CRON_SECRET && bearer === CRON_SECRET);
  if (!ok && bearer) {
    try {
      const { data } = await admin.auth.getUser(bearer);
      const role = (data.user?.app_metadata as Record<string, unknown> | undefined)?.role
        ?? (data.user?.user_metadata as Record<string, unknown> | undefined)?.role;
      ok = role === 'admin';
    } catch (_e) { /* no */ }
  }
  if (!ok) return json(401, { ok: false, error: 'unauthorized' });

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400_000).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const summary = { connections: 0, ingested: 0, skipped: 0, errors: 0 };

  const { data: conns } = await admin.from('calendar_connections').select('*').eq('sync_enabled', true).eq('status', 'connected');
  for (const conn of conns ?? []) {
    summary.connections++;
    const provider = conn.provider as Provider;
    const lawyerId = conn.lawyer_id as string;
    try {
      const token = await ensureFreshToken(admin, conn);

      const { data: links } = await admin.from('calendar_event_links')
        .select('booking_id, meet_link').eq('provider', provider).eq('lawyer_id', lawyerId).eq('state', 'synced');
      const withLink = (links ?? []).filter((l) => l.meet_link);
      if (!withLink.length) continue;

      const ids = withLink.map((l) => l.booking_id);
      const { data: bks } = await admin.from('bookings')
        .select('id, ref').in('id', ids).gte('appointment_date', since).lte('appointment_date', today);
      if (!bks?.length) continue;

      const { data: existing } = await admin.from('transcripts').select('booking_id').in('booking_id', bks.map((b) => b.id));
      const has = new Set((existing ?? []).map((e) => e.booking_id));

      for (const b of bks) {
        if (has.has(b.id)) { summary.skipped++; continue; }
        const link = withLink.find((l) => l.booking_id === b.id);
        if (!link) continue;
        const text = provider === 'google'
          ? await getGoogleMeetTranscript(token, meetCodeFromLink(link.meet_link as string))
          : await getTeamsTranscript(token, link.meet_link as string);
        if (!text) { summary.skipped++; continue; }   // not available yet

        const src = provider === 'google' ? 'google_meet' : 'teams';
        const { data: rec } = await admin.from('recordings').insert({
          booking_id: b.id, source: src, external_url: link.meet_link, filename: 'Auto transcript', status: 'transcribed',
        }).select().single();
        const sum = await summarise(text);
        await admin.from('transcripts').insert({
          booking_id: b.id, recording_id: rec?.id ?? null, provider: src, text, summary: sum, status: 'ready',
        });
        if (sum) await admin.from('bookings').update({ ai_summary: sum }).eq('id', b.id);
        await admin.from('booking_events').insert({
          booking_id: b.id, event_type: 'transcript_ingested', actor_label: 'automation', meta: { provider: src },
        }).then(() => {}, () => {});
        summary.ingested++;
      }
    } catch (e) {
      summary.errors++;
      await admin.from('calendar_connections').update({ last_error: `ingest: ${(e as Error).message}` }).eq('id', conn.id as string);
    }
  }

  return json(200, { ok: true, ...summary });
});

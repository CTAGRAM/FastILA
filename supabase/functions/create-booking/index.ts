// Supabase Edge Function: create-booking
// ---------------------------------------------------------------------------
// The authoritative public booking path. Validates, assigns + conflict-checks
// the lawyer, creates a REAL Google Calendar event with a Meet link on the
// assigned lawyer's connected calendar (when available), inserts the booking
// WITH the meet_link (so the booking-insert trigger enqueues confirmation /
// reminders that already carry the link), and records the calendar event link.
//
// Public (verify_jwt=false) — anon booking form. Uses the service role inside.
// Falls back gracefully: if the lawyer has no Google connection, the booking is
// still created with meet_link=null ("link to follow").
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';
import { refreshTokens, createEvent, appUrl } from '../_shared/calendar.ts';

interface BookingInput {
  service_id: string;
  lawyer_id?: string | null;
  appointment_date: string;     // yyyy-mm-dd
  appointment_time: string;     // HH:MM
  client_name: string;
  client_email: string;
  client_phone?: string;
  lender?: string;
  legal_summary?: string;
  matter_type?: string | null;
  amount?: number;
  source?: string;
  second_signatory_name?: string;
  second_signatory_email?: string;
  post_recipient?: string;
  post_address?: string;
}

function addLocalMinutes(local: string, mins: number): string {
  const d = new Date(local.endsWith('Z') ? local : local + 'Z');
  d.setUTCMinutes(d.getUTCMinutes() + mins);
  return d.toISOString().slice(0, 19);
}

async function freshGoogleToken(admin: SupabaseClient, conn: Record<string, unknown>): Promise<string> {
  const exp = conn.token_expires_at ? new Date(conn.token_expires_at as string).getTime() : 0;
  if (exp && exp > Date.now() + 60_000) return conn.access_token as string;
  if (!conn.refresh_token) throw new Error('no refresh token');
  const t = await refreshTokens('google', conn.refresh_token as string);
  await admin.from('calendar_connections').update({
    access_token: t.access_token, refresh_token: t.refresh_token ?? conn.refresh_token,
    token_expires_at: t.expires_in ? new Date(Date.now() + t.expires_in * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  }).eq('id', conn.id as string);
  return t.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    const input = (await req.json()) as BookingInput;
    const required = ['service_id', 'appointment_date', 'appointment_time', 'client_name', 'client_email'] as const;
    for (const k of required) if (!input[k]) return json(400, { ok: false, error: `${k} is required` });

    const { data: svc } = await admin.from('services').select('name, price, duration').eq('id', input.service_id).single();
    const duration = svc?.duration ?? 45;

    // Resolve lawyer — assign an eligible, free one if none chosen.
    let lawyerId = input.lawyer_id ?? null;
    const slotTaken = async (lid: string) => {
      const { count } = await admin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('lawyer_id', lid).eq('appointment_date', input.appointment_date)
        .eq('appointment_time', input.appointment_time).neq('status', 'cancelled');
      return (count ?? 0) > 0;
    };
    if (lawyerId) {
      if (await slotTaken(lawyerId)) return json(409, { ok: false, error: 'That slot was just taken — please pick another time.' });
    } else {
      const { data: candidates } = await admin.from('lawyers').select('id, services').eq('active', true);
      for (const c of candidates ?? []) {
        if (Array.isArray(c.services) && c.services.includes(input.service_id) && !(await slotTaken(c.id))) { lawyerId = c.id; break; }
      }
    }

    // --- Create the Google Meet event ---------------------------------------
    // Prefer ONE firm calendar (mints the link + invites the lawyer & client as
    // attendees). Fall back to the assigned lawyer's own connection if no firm
    // calendar is connected. The booking still succeeds if neither exists.
    let meet_link: string | null = null;
    let event_id: string | null = null;

    // Assigned lawyer's email — so they're invited as an attendee.
    let lawyerEmail: string | null = null;
    if (lawyerId) {
      const { data: law } = await admin.from('lawyers').select('email').eq('id', lawyerId).maybeSingle();
      lawyerEmail = (law?.email as string) || null;
    }

    const { data: firmConn } = await admin.from('calendar_connections')
      .select('*').eq('kind', 'firm').eq('provider', 'google').eq('status', 'connected').maybeSingle();
    let conn = firmConn;
    if (!conn && lawyerId) {
      const { data: lc } = await admin.from('calendar_connections')
        .select('*').eq('lawyer_id', lawyerId).eq('provider', 'google').eq('status', 'connected').maybeSingle();
      conn = lc;
    }
    if (conn) {
      try {
        const token = await freshGoogleToken(admin, conn);
        const startLocal = `${input.appointment_date}T${String(input.appointment_time).slice(0, 5)}:00`;
        const created = await createEvent('google', token, (conn.calendar_id as string) || 'primary', {
          summary: `Fast-ILA · ${svc?.name ?? 'ILA appointment'} — ${input.client_name}`,
          description: `Fast-ILA appointment for ${input.client_name}. Client portal: ${appUrl()}/?mode=portal`,
          startLocal,
          endLocal: addLocalMinutes(startLocal, duration),
          attendees: [input.client_email, lawyerEmail || '', input.second_signatory_email || ''].filter(Boolean),
        });
        meet_link = created.meetLink || null;
        event_id = created.id || null;
      } catch (e) {
        console.warn('meet creation failed:', (e as Error).message);  // booking still proceeds
      }
    }

    // Insert the booking WITH meet_link (ref + client link set by DB triggers).
    const { data: booking, error: insErr } = await admin.from('bookings').insert({
      client_name: input.client_name,
      client_email: input.client_email,
      client_phone: input.client_phone || null,
      service_id: input.service_id,
      lawyer_id: lawyerId,
      appointment_date: input.appointment_date,
      appointment_time: input.appointment_time,
      lender: input.lender || null,
      legal_summary: input.legal_summary || null,
      matter_type: input.matter_type || null,
      amount: input.amount ?? svc?.price ?? null,
      source: input.source || 'fast-ila.co.uk',
      status: 'scheduled',
      payment_status: 'pending',
      second_signatory_name: input.second_signatory_name || null,
      second_signatory_email: input.second_signatory_email || null,
      post_recipient: input.post_recipient || null,
      post_address: input.post_address || null,
      meet_link,
    }).select().single();
    if (insErr) throw new Error(insErr.message);

    if (event_id) {
      await admin.from('calendar_event_links').insert({
        booking_id: booking.id, lawyer_id: lawyerId, provider: 'google',
        event_id, meet_link, state: 'synced',
      }).then(() => {}, () => {});
    }

    const portal_link = `${appUrl()}/?mode=portal&ref=${booking.ref}`;
    return json(200, { ok: true, ref: booking.ref, id: booking.id, lawyer_id: lawyerId, meet_link, portal_link });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});

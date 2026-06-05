// Supabase Edge Function: client-lookup
// ---------------------------------------------------------------------------
// Public (anon) endpoint for the booking form's "welcome back" nudge. Given an
// email, returns ONLY whether that email has previous bookings + a count.
// Deliberately returns NO personal data (no name, phone, history) — so it can't
// be used to harvest a client's details by guessing their email. The actual
// history is shown only in the authenticated client portal / dashboard.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (obj: unknown) =>
    new Response(JSON.stringify(obj), { headers: { ...corsHeaders, 'content-type': 'application/json' } });

  try {
    const { email } = await req.json().catch(() => ({}));
    const em = String(email ?? '').trim().toLowerCase();
    if (!em || !em.includes('@')) return json({ returning: false, count: 0 });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { count } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .ilike('client_email', em);

    return json({ returning: (count ?? 0) > 0, count: count ?? 0 });
  } catch (_e) {
    // Never reveal errors here — just say "not returning" so the form proceeds.
    return json({ returning: false, count: 0 });
  }
});

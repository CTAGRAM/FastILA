// Supabase Edge Function: health (Phase 4)
// ---------------------------------------------------------------------------
// Admin-only. Reports which provider secrets are configured — booleans only,
// never the values — so the Integrations Control Center can show accurate
// green/red status without exposing any keys.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const has = (k: string) => !!(Deno.env.get(k) ?? '').trim();

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let isAdmin = bearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!isAdmin && bearer) {
    try {
      const { data } = await admin.auth.getUser(bearer);
      const role = (data.user?.app_metadata as Record<string, unknown> | undefined)?.role
        ?? (data.user?.user_metadata as Record<string, unknown> | undefined)?.role;
      isAdmin = role === 'admin';
    } catch (_e) { /* no */ }
  }
  if (!isAdmin) return json(401, { ok: false, error: 'unauthorized' });

  return json(200, {
    ok: true,
    secrets: {
      RESEND_API_KEY: has('RESEND_API_KEY'),
      FROM_EMAIL: has('FROM_EMAIL'),
      TWILIO_ACCOUNT_SID: has('TWILIO_ACCOUNT_SID'),
      TWILIO_AUTH_TOKEN: has('TWILIO_AUTH_TOKEN'),
      TWILIO_SENDER: has('TWILIO_FROM') || has('TWILIO_MESSAGING_SERVICE_SID'),
      OPENAI_API_KEY: has('OPENAI_API_KEY'),
      ANTHROPIC_API_KEY: has('ANTHROPIC_API_KEY'),
      CALENDAR_GOOGLE: has('CALENDAR_GOOGLE_CLIENT_ID') && has('CALENDAR_GOOGLE_CLIENT_SECRET'),
      CALENDAR_MS: has('CALENDAR_MS_CLIENT_ID') && has('CALENDAR_MS_CLIENT_SECRET'),
      PORTAL_URL: has('PORTAL_URL'),
    },
  });
});

// Supabase Edge Function: calendar-oauth-callback
// ---------------------------------------------------------------------------
// The redirect target for Google / Microsoft OAuth. Verifies the signed state,
// exchanges the auth code for tokens, stores the connection, and bounces the
// browser back to the dashboard. Public (no JWT) — integrity comes from the
// HMAC-signed `state` minted by the `calendar` function's `start` action.
//
// Register THIS url as an authorised redirect URI in both providers:
//   https://<project-ref>.supabase.co/functions/v1/calendar-oauth-callback
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), PORTAL_URL,
//      CALENDAR_GOOGLE_CLIENT_ID/SECRET, CALENDAR_MS_CLIENT_ID/SECRET
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import {
  Provider, verifyState, exchangeCode, fetchAccountEmail, appUrl,
} from '../_shared/calendar.ts';

serve(async (req) => {
  const url = new URL(req.url);
  const back = (status: string, msg = '') =>
    Response.redirect(`${appUrl()}/?mode=dashboard&view=calendars&calendar=${status}${msg ? `&msg=${encodeURIComponent(msg)}` : ''}`, 302);

  const err = url.searchParams.get('error');
  if (err) return back('error', url.searchParams.get('error_description') || err);

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return back('error', 'missing code/state');

  const decoded = await verifyState(state);
  if (!decoded) return back('error', 'invalid state');
  const provider = decoded.provider as Provider;
  const isFirm = decoded.firm === true;
  const lawyerId = decoded.lawyer_id as string;
  if (!provider || (!isFirm && !lawyerId)) return back('error', 'bad state payload');

  try {
    const tokens = await exchangeCode(provider, code);
    const email = await fetchAccountEmail(provider, tokens.access_token);
    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Preserve an existing refresh_token if the provider didn't return one
    // (Google only sends it on first consent).
    const prevQ = admin.from('calendar_connections').select('refresh_token').eq('provider', provider);
    const { data: prev } = isFirm
      ? await prevQ.eq('kind', 'firm').maybeSingle()
      : await prevQ.eq('lawyer_id', lawyerId).maybeSingle();
    const refresh = tokens.refresh_token ?? prev?.refresh_token ?? null;

    const rowCommon = {
      provider,
      account_email: email,
      access_token: tokens.access_token,
      refresh_token: refresh,
      token_expires_at: expiresAt,
      scope: tokens.scope ?? null,
      sync_enabled: true,
      status: 'connected',
      last_error: null,
      updated_at: new Date().toISOString(),
    };

    if (isFirm) {
      // One firm connection per provider — replace any existing.
      await admin.from('calendar_connections').delete().eq('kind', 'firm').eq('provider', provider);
      const { error } = await admin.from('calendar_connections').insert({ ...rowCommon, kind: 'firm', lawyer_id: null });
      if (error) throw new Error(error.message);
      return back('connected', `firm:${email}`);
    }

    const { error } = await admin.from('calendar_connections')
      .upsert({ ...rowCommon, kind: 'lawyer', lawyer_id: lawyerId }, { onConflict: 'lawyer_id,provider' });
    if (error) throw new Error(error.message);
    return back('connected', `${provider}:${email}`);
  } catch (e) {
    return back('error', (e as Error).message);
  }
});

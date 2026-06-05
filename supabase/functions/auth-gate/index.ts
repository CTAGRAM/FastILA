// Supabase Edge Function: auth-gate
// ---------------------------------------------------------------------------
// The authoritative dashboard login gate. Called by the frontend immediately
// after a Supabase sign-in. Access is granted ONLY to:
//   * users who already have app_metadata.role (existing admins / re-logins), or
//   * users whose email has an `approved` staff_invites row (first login after
//     approval) — in which case it self-heals: stamps app_metadata.role and
//     mirrors public.staff, then tells the client to refresh its session.
// Everyone else is rejected with a reason: pending / rejected / not_invited.
//
// Auth: validates the caller's own JWT (Authorization: Bearer <user token>).
// Returns: { ok, role?, reason?, message?, healed? }
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const STAFF_ROLES = ['admin', 'lawyer', 'wet_specialist'];
const MESSAGES: Record<string, string> = {
  pending: "Your access is awaiting approval. Open the email we sent you and click “Approve my access”, then sign in again.",
  rejected: 'Your access request was declined. Contact your administrator if you believe this is a mistake.',
  not_invited: "This email isn’t authorised for the Fast-ILA dashboard. Ask an administrator to add you to the team first.",
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer) return json(401, { ok: false, reason: 'no_session', message: 'No active session.' });

  let user;
  try {
    const { data } = await admin.auth.getUser(bearer);
    user = data.user;
  } catch (_e) {
    return json(401, { ok: false, reason: 'no_session', message: 'Invalid session.' });
  }
  if (!user || !user.email) return json(401, { ok: false, reason: 'no_session', message: 'Invalid session.' });

  const email = user.email.toLowerCase().trim();
  const jwtRole =
    (user.app_metadata as Record<string, unknown> | undefined)?.role ??
    (user.user_metadata as Record<string, unknown> | undefined)?.role;

  // Already provisioned (existing admins, returning approved lawyers).
  if (typeof jwtRole === 'string' && STAFF_ROLES.includes(jwtRole)) {
    return json(200, { ok: true, role: jwtRole });
  }

  try {
    const { data: invite } = await admin
      .from('staff_invites')
      .select('role, lawyer_id, full_name, status')
      .eq('email', email)
      .maybeSingle();

    if (!invite) return json(200, { ok: false, reason: 'not_invited', message: MESSAGES.not_invited });
    if (invite.status === 'pending') return json(200, { ok: false, reason: 'pending', message: MESSAGES.pending });
    if (invite.status === 'rejected') return json(200, { ok: false, reason: 'rejected', message: MESSAGES.rejected });

    // approved but app_metadata.role not yet on this auth user → self-heal.
    const role = STAFF_ROLES.includes(String(invite.role)) ? String(invite.role) : 'lawyer';
    const lawyer_id = invite.lawyer_id ?? null;
    const full_name = invite.full_name ?? email;
    await admin.auth.admin.updateUserById(user.id, {
      app_metadata: { role, lawyer_id },
      user_metadata: { ...(user.user_metadata ?? {}), full_name, role },
    });
    await admin.from('staff').upsert(
      { id: user.id, email, full_name, role, lawyer_id, active: true, status: 'approved' },
      { onConflict: 'id' },
    );
    return json(200, { ok: true, role, healed: true });
  } catch (e) {
    return json(500, { ok: false, reason: 'error', message: (e as Error).message });
  }
});

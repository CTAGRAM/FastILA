// Supabase Edge Function: invite-user
// ---------------------------------------------------------------------------
// Admin-only. Provisions a staff member so they can log in with the correct
// role: sends a Supabase invite email, stamps their role into app_metadata
// (which is what the RLS helpers current_role()/is_staff() read), and upserts
// the public.staff row.
//
// Caller must present a valid admin JWT (app_metadata.role = 'admin').
//
// Body: { email, full_name?, role: 'admin'|'lawyer'|'wet_specialist', lawyer_id? }
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), PORTAL_URL (redirect)
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const VALID_ROLES = ['admin', 'lawyer', 'wet_specialist'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPA_URL, SERVICE_KEY);

  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  // --- AuthZ: only an admin may invite ---
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer) return json(401, { ok: false, error: 'missing bearer token' });
  let callerRole: unknown;
  try {
    const { data } = await admin.auth.getUser(bearer);
    callerRole =
      (data.user?.app_metadata as Record<string, unknown> | undefined)?.role ??
      (data.user?.user_metadata as Record<string, unknown> | undefined)?.role;
  } catch (_e) {
    return json(401, { ok: false, error: 'invalid token' });
  }
  if (callerRole !== 'admin') return json(403, { ok: false, error: 'admin only' });

  try {
    const body = (await req.json()) as {
      email?: string; full_name?: string; role?: string; lawyer_id?: string | null;
    };
    const email = (body.email ?? '').trim().toLowerCase();
    const role = (body.role ?? 'lawyer').trim();
    const full_name = body.full_name ?? email;
    const lawyer_id = body.lawyer_id ?? null;

    if (!email) return json(400, { ok: false, error: 'email required' });
    if (!VALID_ROLES.includes(role)) return json(400, { ok: false, error: `role must be one of ${VALID_ROLES.join(', ')}` });

    const redirectTo = `${Deno.env.get('PORTAL_URL') ?? ''}/?mode=dashboard`;
    const meta = { role, full_name, lawyer_id };

    // Invite (or, if the user already exists, just (re)assign their role).
    let userId: string | null = null;
    const { data: invited, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: meta,
      redirectTo,
    });
    if (invErr) {
      // Most likely "already registered" — find them and update instead.
      const { data: list } = await admin.auth.admin.listUsers();
      const existing = list?.users?.find((u) => (u.email ?? '').toLowerCase() === email);
      if (!existing) throw new Error(invErr.message);
      userId = existing.id;
    } else {
      userId = invited.user?.id ?? null;
    }
    if (!userId) throw new Error('could not resolve user id');

    // Stamp role into app_metadata (this is the source of truth for RLS).
    await admin.auth.admin.updateUserById(userId, {
      app_metadata: { role, lawyer_id },
      user_metadata: { full_name, role },
    });

    // Mirror into public.staff for joins / display.
    await admin.from('staff').upsert(
      { id: userId, email, full_name, role, lawyer_id, active: true },
      { onConflict: 'id' },
    );

    return json(200, { ok: true, user_id: userId, role, invited: !invErr });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});

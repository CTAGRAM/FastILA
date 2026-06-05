// Supabase Edge Function: staff-invite
// ---------------------------------------------------------------------------
// Admin-only. Step 1 of the 2-step lawyer approval flow. Creates (or refreshes)
// a `pending` staff_invites row and emails the lawyer a one-click Approve /
// Reject link (HMAC-signed token). No access is granted here — app_metadata.role
// is only set once the lawyer approves (see staff-approve).
//
// Body: { email, full_name?, role?='lawyer', lawyer_id? }
// Auth: caller must present an admin JWT (app_metadata.role === 'admin').
// Env:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), RESEND_API_KEY,
//       FROM_EMAIL, PORTAL_URL.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';
import { signState } from '../_shared/calendar.ts';

const VALID_ROLES = ['admin', 'lawyer', 'wet_specialist'];

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return { ok: false, error: 'RESEND_API_KEY not set' };
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('FROM_EMAIL') ?? 'bookings@fast-ila.co.uk',
      to,
      subject: subject || 'Fast-ILA',
      html,
      text,
    }),
  });
  if (!resp.ok) return { ok: false, error: `resend ${resp.status}: ${await resp.text()}` };
  const j = await resp.json().catch(() => ({}));
  return { ok: true, id: j?.id ?? null };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
  const admin = createClient(SUPA_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // --- AuthZ: admin only ---
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer) return json(401, { ok: false, error: 'missing bearer token' });
  let callerId: string | undefined;
  let callerRole: unknown;
  try {
    const { data } = await admin.auth.getUser(bearer);
    callerId = data.user?.id;
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
    if (!email || !email.includes('@')) return json(400, { ok: false, error: 'valid email required' });
    if (!VALID_ROLES.includes(role)) return json(400, { ok: false, error: `role must be one of ${VALID_ROLES.join(', ')}` });

    // Upsert a fresh pending invite (re-inviting resets status to pending).
    const { error: upErr } = await admin.from('staff_invites').upsert(
      { email, full_name, role, lawyer_id, status: 'pending', invited_by: callerId ?? null, invited_at: new Date().toISOString(), decided_at: null },
      { onConflict: 'email' },
    );
    if (upErr) throw new Error(upErr.message);

    // One-click approve / reject links (HMAC-signed; no login required).
    const token = await signState({ email, role, kind: 'staff_invite' });
    const base = `${SUPA_URL}/functions/v1/staff-approve?token=${encodeURIComponent(token)}`;
    const approveUrl = `${base}&a=approve`;
    const rejectUrl = `${base}&a=reject`;
    const dashUrl = `${(Deno.env.get('PORTAL_URL') ?? '').replace(/\/$/, '')}/?mode=dashboard`;

    const html = `
<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#063952">
  <div style="background:#063952;border-radius:14px 14px 0 0;padding:22px 26px">
    <div style="color:#d7ed3f;font-weight:800;font-size:18px;letter-spacing:.3px">Fast-ILA</div>
    <div style="color:#cfe0e8;font-size:13px;margin-top:2px">Dashboard access request</div>
  </div>
  <div style="border:1px solid #e4ecf0;border-top:none;border-radius:0 0 14px 14px;padding:26px">
    <p style="font-size:15px;margin:0 0 14px">Hi ${full_name},</p>
    <p style="font-size:15px;line-height:1.55;margin:0 0 18px">
      You've been added to the <strong>Fast-ILA</strong> team as a <strong>${role}</strong>.
      To confirm it's really you and activate your access, please approve below.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px">
      <tr>
        <td style="padding-right:10px">
          <a href="${approveUrl}" style="display:inline-block;background:#d7ed3f;color:#063952;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px;font-size:14px">✓ Approve my access</a>
        </td>
        <td>
          <a href="${rejectUrl}" style="display:inline-block;background:#f3f5f6;color:#5b7480;font-weight:600;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px">Reject</a>
        </td>
      </tr>
    </table>
    <p style="font-size:13px;color:#5b7480;line-height:1.5;margin:0">
      After approving, sign in here: <a href="${dashUrl}" style="color:#063952">${dashUrl}</a><br>
      If you weren't expecting this, you can safely ignore it or click Reject.
    </p>
  </div>
</div>`.trim();
    const text = `Hi ${full_name},\n\nYou've been added to the Fast-ILA team as a ${role}. Approve your access:\n${approveUrl}\n\nOr reject: ${rejectUrl}\n\nAfter approving, sign in at ${dashUrl}\nIf you weren't expecting this, ignore this email.`;

    const sent = await sendEmail(email, 'Approve your Fast-ILA dashboard access', html, text);
    return json(200, { ok: true, status: 'pending', email, emailed: sent.ok, email_error: sent.ok ? undefined : sent.error });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});

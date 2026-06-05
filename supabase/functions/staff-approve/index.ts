// Supabase Edge Function: staff-approve
// ---------------------------------------------------------------------------
// Public, token-gated. Step 2 of the 2-step lawyer approval flow — the target
// of the Approve / Reject links in the invite email. Integrity is guaranteed by
// the HMAC-signed token (same secret as the calendar OAuth state), so no login
// is required. Idempotent. Returns a branded HTML page.
//
// GET ?token=<signState({email,role})>&a=approve|reject
// On approve: staff_invites -> approved; if the auth user already exists, stamp
//   app_metadata.role + mirror into public.staff (so RLS grants access).
// On reject:  staff_invites -> rejected; if the user exists, clear role + mark
//   the staff row inactive.
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto), PORTAL_URL.
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { verifyState } from '../_shared/calendar.ts';

function page(title: string, body: string, accent = '#d7ed3f') {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Fast-ILA</title></head>
<body style="margin:0;background:#eef3f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#063952">
  <div style="max-width:460px;margin:9vh auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(6,57,82,.12)">
    <div style="background:#063952;padding:22px 28px"><span style="color:${accent};font-weight:800;font-size:18px">Fast-ILA</span></div>
    <div style="padding:30px 28px">${body}</div>
  </div>
</body></html>`;
}

// deno-lint-ignore no-explicit-any
async function findUserByEmail(admin: any, email: string) {
  // Small teams — a single page is plenty.
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  return data?.users?.find((u: { email?: string }) => (u.email ?? '').toLowerCase() === email) ?? null;
}

serve(async (req) => {
  const html = (status: number, title: string, body: string, accent?: string) =>
    new Response(page(title, body, accent), { status, headers: { 'content-type': 'text/html; charset=utf-8' } });

  const url = new URL(req.url);
  const token = url.searchParams.get('token') ?? '';
  const action = (url.searchParams.get('a') ?? '').toLowerCase();
  const dashUrl = `${(Deno.env.get('PORTAL_URL') ?? '').replace(/\/$/, '')}/?mode=dashboard`;

  const decoded = await verifyState(token);
  if (!decoded || decoded.kind !== 'staff_invite' || !decoded.email) {
    return html(400, 'Invalid link', `<h2 style="margin:0 0 8px">Link not valid</h2><p style="color:#5b7480;line-height:1.5">This approval link is invalid or has been tampered with. Ask your admin to resend the invite.</p>`, '#ff6b6b');
  }
  if (action !== 'approve' && action !== 'reject') {
    return html(400, 'Invalid action', `<p style="color:#5b7480">Missing or unknown action.</p>`, '#ff6b6b');
  }

  const email = String(decoded.email).trim().toLowerCase();
  const role = String(decoded.role ?? 'lawyer');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  try {
    // Make sure the invite still exists (admin may have removed it).
    const { data: invite } = await admin.from('staff_invites').select('email, lawyer_id, full_name, status').eq('email', email).maybeSingle();
    if (!invite) {
      return html(404, 'No invite', `<h2 style="margin:0 0 8px">Nothing to approve</h2><p style="color:#5b7480;line-height:1.5">This invite no longer exists. Ask your admin to add you again.</p>`, '#ff6b6b');
    }
    const lawyer_id = (invite as { lawyer_id?: string }).lawyer_id ?? null;
    const full_name = (invite as { full_name?: string }).full_name ?? email;
    const user = await findUserByEmail(admin, email);

    if (action === 'approve') {
      await admin.from('staff_invites').update({ status: 'approved', decided_at: new Date().toISOString() }).eq('email', email);
      if (user) {
        await admin.auth.admin.updateUserById(user.id, {
          app_metadata: { role, lawyer_id },
          user_metadata: { ...(user.user_metadata ?? {}), full_name, role },
        });
        await admin.from('staff').upsert(
          { id: user.id, email, full_name, role, lawyer_id, active: true, status: 'approved' },
          { onConflict: 'id' },
        );
      }
      return html(200, 'Approved',
        `<h2 style="margin:0 0 10px">✓ Access approved</h2>
         <p style="color:#33525f;line-height:1.55;margin:0 0 20px">Thanks, ${full_name}. Your Fast-ILA dashboard access is now active.</p>
         <a href="${dashUrl}" style="display:inline-block;background:#d7ed3f;color:#063952;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:10px">Sign in to the dashboard →</a>`);
    }

    // reject
    await admin.from('staff_invites').update({ status: 'rejected', decided_at: new Date().toISOString() }).eq('email', email);
    if (user) {
      await admin.auth.admin.updateUserById(user.id, { app_metadata: { role: null, lawyer_id: null } });
      await admin.from('staff').update({ active: false, status: 'rejected' }).eq('id', user.id);
    }
    return html(200, 'Declined',
      `<h2 style="margin:0 0 10px">Access declined</h2>
       <p style="color:#5b7480;line-height:1.55;margin:0">No access has been granted for ${email}. You can close this page. If this was a mistake, ask your admin to resend the invite.</p>`, '#9fb3bd');
  } catch (e) {
    return html(500, 'Error', `<p style="color:#5b7480">${(e as Error).message}</p>`, '#ff6b6b');
  }
});

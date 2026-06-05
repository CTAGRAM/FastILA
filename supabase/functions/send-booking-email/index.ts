// Supabase Edge Function: send-booking-email
// Triggered after a booking is created. Sends confirmation email via Resend.
// Reads template from public.templates and substitutes {{vars}}.
//
// Env:
//   RESEND_API_KEY        Resend API key
//   PORTAL_URL            e.g. https://app.fast-ila.co.uk
//   FROM_EMAIL            e.g. bookings@fast-ila.co.uk
//   SUPABASE_URL          (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

interface Payload {
  booking_id: string;
  template_id?: string;
}

function render(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_, k) => vars[k] ?? '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { booking_id, template_id = 'booking_confirmation_email' } =
      (await req.json()) as Payload;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*, service:services(*), lawyer:lawyers(*)')
      .eq('id', booking_id)
      .single();
    if (bErr || !booking) throw new Error(bErr?.message ?? 'booking not found');

    const { data: tpl, error: tErr } = await supabase
      .from('templates')
      .select('*')
      .eq('id', template_id)
      .single();
    if (tErr || !tpl) throw new Error(tErr?.message ?? 'template not found');

    const vars: Record<string, string> = {
      ref: booking.ref,
      client_name: booking.client_name,
      service_name: booking.service?.name ?? '',
      date: booking.appointment_date,
      time: booking.appointment_time,
      lawyer_name: booking.lawyer?.name ?? 'Your assigned lawyer',
      amount: String(booking.amount),
      meet_link: booking.meet_link ?? '(sent separately)',
      portal_url: `${Deno.env.get('PORTAL_URL') ?? ''}/?mode=portal&ref=${booking.ref}`,
    };

    const subject = render(tpl.subject ?? '', vars);
    const body = render(tpl.body, vars);

    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      // No mailer configured — return success-with-warning so the booking still completes.
      return new Response(
        JSON.stringify({ ok: true, warning: 'RESEND_API_KEY not set; email not sent', preview: { subject, body } }),
        { headers: { ...corsHeaders, 'content-type': 'application/json' } },
      );
    }

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: Deno.env.get('FROM_EMAIL') ?? 'bookings@fast-ila.co.uk',
        to: booking.client_email,
        subject,
        text: body,
      }),
    });

    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`resend failed: ${txt}`);
    }

    await supabase.from('booking_events').insert({
      booking_id: booking.id,
      event_type: 'email_sent',
      actor_label: 'system',
      meta: { template_id, subject },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: (e as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'content-type': 'application/json' } },
    );
  }
});

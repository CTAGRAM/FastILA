// Supabase Edge Function: transcribe
// ---------------------------------------------------------------------------
// Transcribes a stored call recording with OpenAI Whisper, then writes an AI
// summary (Anthropic, falling back to OpenAI) onto the booking. Transcription
// is the must-have; the summary is best-effort.
//
// Body: { recording_id }
// Auth: service-role key OR a staff JWT (admin/lawyer/wet_specialist).
//
// Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto),
//      OPENAI_API_KEY                 (Whisper + summary fallback)
//      ANTHROPIC_API_KEY              (preferred summariser)
//      ANTHROPIC_MODEL                (default claude-haiku-4-5-20251001)
//      OPENAI_MODEL                   (default gpt-4o-mini)
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

const WHISPER_MAX = 25 * 1024 * 1024; // OpenAI hard limit

const SUMMARY_SYSTEM =
  'You are a paralegal assistant for an SRA-regulated firm providing Independent Legal Advice (ILA). ' +
  'Summarise the call transcript into concise file notes with these headings: ' +
  '1) Advice given, 2) Client understanding & capacity, 3) Risks/red flags raised, 4) Documents discussed, 5) Follow-up actions. ' +
  'Be factual, neutral and brief. If the transcript is unclear, say so.';

async function summariseAnthropic(transcript: string): Promise<string | null> {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return null;
  const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 900, system: SUMMARY_SYSTEM,
      messages: [{ role: 'user', content: `Transcript:\n\n${transcript.slice(0, 100_000)}` }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j?.content?.[0]?.text ?? null;
}

async function summariseOpenAI(transcript: string): Promise<string | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 900,
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM },
        { role: 'user', content: `Transcript:\n\n${transcript.slice(0, 100_000)}` },
      ],
    }),
  });
  if (!r.ok) throw new Error(`openai chat ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j?.choices?.[0]?.message?.content ?? null;
}

async function authorize(admin: SupabaseClient, req: Request): Promise<boolean> {
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!bearer) return false;
  if (bearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) return true;
  try {
    const { data } = await admin.auth.getUser(bearer);
    const role = (data.user?.app_metadata as Record<string, unknown> | undefined)?.role
      ?? (data.user?.user_metadata as Record<string, unknown> | undefined)?.role;
    return ['admin', 'lawyer', 'wet_specialist'].includes(String(role));
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  if (!(await authorize(admin, req))) return json(401, { ok: false, error: 'unauthorized' });

  const { recording_id } = await req.json().catch(() => ({}));
  if (!recording_id) return json(400, { ok: false, error: 'recording_id required' });

  const { data: rec, error: recErr } = await admin.from('recordings').select('*').eq('id', recording_id).single();
  if (recErr || !rec) return json(404, { ok: false, error: 'recording not found' });

  const fail = async (msg: string) => {
    await admin.from('recordings').update({ status: 'error', last_error: msg }).eq('id', recording_id);
    return json(200, { ok: false, error: msg });
  };

  try {
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return await fail('OPENAI_API_KEY not set — cannot transcribe');
    if (!rec.storage_path) return await fail('recording has no stored file to transcribe');

    await admin.from('recordings').update({ status: 'transcribing', last_error: null }).eq('id', recording_id);

    // 1) download audio from storage
    const { data: blob, error: dlErr } = await admin.storage.from('recordings').download(rec.storage_path);
    if (dlErr || !blob) throw new Error(`download failed: ${dlErr?.message ?? 'no file'}`);
    if (blob.size > WHISPER_MAX) return await fail(`file is ${(blob.size / 1048576).toFixed(1)}MB; Whisper limit is 25MB`);

    // 2) Whisper transcription
    const form = new FormData();
    form.append('file', blob, rec.filename ?? 'recording');
    form.append('model', 'whisper-1');
    form.append('response_format', 'verbose_json');
    const wr = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${openaiKey}` }, body: form,
    });
    if (!wr.ok) throw new Error(`whisper ${wr.status}: ${await wr.text()}`);
    const w = await wr.json();
    const text: string = w.text ?? '';
    const language: string = w.language ?? '';
    const segments = w.segments ?? null;

    // 3) AI summary (best-effort)
    let summary: string | null = null;
    let summaryErr: string | null = null;
    if (text.trim()) {
      try { summary = await summariseAnthropic(text); } catch (e) { summaryErr = (e as Error).message; }
      if (!summary) { try { summary = await summariseOpenAI(text); } catch (e) { summaryErr = (e as Error).message; } }
    }

    // 4) persist
    const { data: tr, error: trErr } = await admin.from('transcripts').insert({
      booking_id: rec.booking_id, recording_id, provider: 'openai_whisper',
      language, text, segments, summary, status: 'ready',
    }).select().single();
    if (trErr) throw new Error(trErr.message);

    await admin.from('recordings').update({
      status: 'transcribed',
      duration_seconds: w.duration ? Math.round(w.duration) : rec.duration_seconds,
      last_error: summaryErr,
    }).eq('id', recording_id);

    if (summary && rec.booking_id) {
      await admin.from('bookings').update({ ai_summary: summary }).eq('id', rec.booking_id);
      await admin.from('booking_events').insert({
        booking_id: rec.booking_id, event_type: 'transcript_ready', actor_label: 'automation',
        meta: { recording_id, language },
      }).then(() => {}, () => {});
    }

    return json(200, { ok: true, transcript_id: tr.id, language, summarised: !!summary, summary_error: summaryErr });
  } catch (e) {
    return await fail((e as Error).message);
  }
});

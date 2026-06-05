// Supabase Edge Function: ai
// ---------------------------------------------------------------------------
// Server-side proxy for the dashboard AI assistant + pre-call brief + note
// drafting. Keeps the model keys server-side (Supabase secrets) and avoids the
// browser CORS block on api.anthropic.com. Prefers Anthropic, falls back to
// OpenAI. Staff-only (admin/lawyer/wet_specialist) to prevent anon abuse.
//
// Body: { system?: string, messages: [{role:'user'|'assistant', content|text}], max_tokens? }
// Returns: { ok, text, provider } | { ok:false, error }
// Env: ANTHROPIC_API_KEY (+ ANTHROPIC_MODEL), OPENAI_API_KEY (+ OPENAI_MODEL)
// ---------------------------------------------------------------------------

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, 'content-type': 'application/json' } });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let ok = bearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!ok && bearer) {
    try {
      const { data } = await admin.auth.getUser(bearer);
      const role = (data.user?.app_metadata as Record<string, unknown> | undefined)?.role
        ?? (data.user?.user_metadata as Record<string, unknown> | undefined)?.role;
      ok = ['admin', 'lawyer', 'wet_specialist'].includes(String(role));
    } catch (_e) { /* no */ }
  }
  if (!ok) return json(401, { ok: false, error: 'unauthorized' });

  try {
    const body = await req.json().catch(() => ({}));
    const system: string = body.system ?? '';
    const maxTokens: number = body.max_tokens ?? 1024;
    const messages = (Array.isArray(body.messages) ? body.messages : [])
      .map((m: { role?: string; content?: string; text?: string }) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content ?? m.text ?? ''),
      }))
      .filter((m: { content: string }) => m.content);
    if (!messages.length) return json(400, { ok: false, error: 'no messages' });

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001';
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages }),
      });
      if (r.ok) { const j = await r.json(); const text = j?.content?.[0]?.text ?? ''; if (text) return json(200, { ok: true, text, provider: 'anthropic' }); }
      else { console.warn('anthropic', r.status, await r.text()); }
    }

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiKey) {
      const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'system', content: system }, ...messages] }),
      });
      if (r.ok) { const j = await r.json(); const text = j?.choices?.[0]?.message?.content ?? ''; if (text) return json(200, { ok: true, text, provider: 'openai' }); }
      else { console.warn('openai', r.status, await r.text()); }
    }

    return json(200, { ok: false, error: 'No AI provider configured (set ANTHROPIC_API_KEY or OPENAI_API_KEY).' });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});

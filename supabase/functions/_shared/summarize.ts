// Shared AI summariser for ILA call transcripts. Prefers Anthropic, falls back
// to OpenAI. Returns null if neither key is configured (caller treats summary
// as best-effort).

export const SUMMARY_SYSTEM =
  'You are a paralegal assistant for an SRA-regulated firm providing Independent Legal Advice (ILA). ' +
  'Summarise the call transcript into concise file notes with these headings: ' +
  '1) Advice given, 2) Client understanding & capacity, 3) Risks/red flags raised, 4) Documents discussed, 5) Follow-up actions. ' +
  'Be factual, neutral and brief. If the transcript is unclear, say so.';

export async function summarise(transcript: string): Promise<string | null> {
  const text = (transcript || '').slice(0, 100_000);
  if (!text.trim()) return null;

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (anthropicKey) {
    try {
      const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5-20251001';
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 900, system: SUMMARY_SYSTEM, messages: [{ role: 'user', content: `Transcript:\n\n${text}` }] }),
      });
      if (r.ok) { const j = await r.json(); const out = j?.content?.[0]?.text; if (out) return out; }
    } catch (_e) { /* fall through to OpenAI */ }
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiKey) {
    try {
      const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openaiKey}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 900, messages: [
          { role: 'system', content: SUMMARY_SYSTEM },
          { role: 'user', content: `Transcript:\n\n${text}` },
        ] }),
      });
      if (r.ok) { const j = await r.json(); const out = j?.choices?.[0]?.message?.content; if (out) return out; }
    } catch (_e) { /* give up */ }
  }
  return null;
}

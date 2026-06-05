// Shared helpers for Google Calendar + Microsoft Graph (Outlook) calendar sync.
// Used by calendar-oauth-callback and the `calendar` edge function.

export type Provider = 'google' | 'microsoft';

export interface Tokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}
export interface Interval { start: string; end: string }
export interface EventInput {
  summary: string;
  description: string;
  startLocal: string;   // 'YYYY-MM-DDTHH:MM:SS' in Europe/London
  endLocal: string;
  attendees: string[];
}

const TZ = 'Europe/London';

export const PROVIDERS: Record<Provider, {
  authUrl: string; tokenUrl: string; scope: string; extraAuth: Record<string, string>;
}> = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    // calendar.* for sync/push; meetings.space.readonly for Meet transcripts (Phase 3b)
    scope: 'openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/meetings.space.readonly',
    extraAuth: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
  },
  microsoft: {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    // Calendars for sync/push; OnlineMeetings + transcript for Teams transcripts (Phase 3b, needs admin consent)
    scope: 'openid email offline_access https://graph.microsoft.com/Calendars.ReadWrite https://graph.microsoft.com/User.Read https://graph.microsoft.com/OnlineMeetings.Read https://graph.microsoft.com/OnlineMeetingTranscript.Read.All',
    extraAuth: { prompt: 'consent' },
  },
};

export function clientId(p: Provider): string {
  return Deno.env.get(p === 'google' ? 'CALENDAR_GOOGLE_CLIENT_ID' : 'CALENDAR_MS_CLIENT_ID') ?? '';
}
export function clientSecret(p: Provider): string {
  return Deno.env.get(p === 'google' ? 'CALENDAR_GOOGLE_CLIENT_SECRET' : 'CALENDAR_MS_CLIENT_SECRET') ?? '';
}
export function redirectUri(): string {
  return `${Deno.env.get('SUPABASE_URL')}/functions/v1/calendar-oauth-callback`;
}
export function appUrl(): string {
  return Deno.env.get('PORTAL_URL') ?? 'https://app.fast-ila.co.uk';
}

// --- Signed state (HMAC-SHA256 with the service-role key) ------------------
const enc = new TextEncoder();
const b64url = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlDecode = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function hmacHex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function signState(obj: Record<string, unknown>): Promise<string> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const payload = b64url(JSON.stringify(obj));
  return `${payload}.${await hmacHex(secret, payload)}`;
}
export async function verifyState(state: string): Promise<Record<string, unknown> | null> {
  const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const [payload, sig] = (state || '').split('.');
  if (!payload || !sig) return null;
  if (await hmacHex(secret, payload) !== sig) return null;
  try { return JSON.parse(b64urlDecode(payload)); } catch { return null; }
}

export async function buildAuthUrl(p: Provider, state: string): Promise<string> {
  const cfg = PROVIDERS[p];
  const params = new URLSearchParams({
    client_id: clientId(p),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: cfg.scope,
    state,
    ...cfg.extraAuth,
  });
  return `${cfg.authUrl}?${params.toString()}`;
}

export async function exchangeCode(p: Provider, code: string): Promise<Tokens> {
  const body = new URLSearchParams({
    client_id: clientId(p), client_secret: clientSecret(p),
    code, redirect_uri: redirectUri(), grant_type: 'authorization_code',
  });
  const r = await fetch(PROVIDERS[p].tokenUrl, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  });
  if (!r.ok) throw new Error(`${p} token exchange ${r.status}: ${await r.text()}`);
  return await r.json();
}

export async function refreshTokens(p: Provider, refresh_token: string): Promise<Tokens> {
  const body = new URLSearchParams({
    client_id: clientId(p), client_secret: clientSecret(p),
    refresh_token, grant_type: 'refresh_token',
  });
  if (p === 'microsoft') body.set('scope', PROVIDERS.microsoft.scope);
  const r = await fetch(PROVIDERS[p].tokenUrl, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: body.toString(),
  });
  if (!r.ok) throw new Error(`${p} token refresh ${r.status}: ${await r.text()}`);
  return await r.json();
}

// Pull the account email so the UI can show which calendar is connected.
export async function fetchAccountEmail(p: Provider, accessToken: string): Promise<string> {
  try {
    if (p === 'google') {
      const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
      const j = await r.json(); return j.email ?? '';
    } else {
      const r = await fetch('https://graph.microsoft.com/v1.0/me?$select=mail,userPrincipalName', { headers: { Authorization: `Bearer ${accessToken}` } });
      const j = await r.json(); return j.mail ?? j.userPrincipalName ?? '';
    }
  } catch { return ''; }
}

export async function getFreeBusy(p: Provider, accessToken: string, calendarId: string, timeMinIso: string, timeMaxIso: string): Promise<Interval[]> {
  if (p === 'google') {
    const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({ timeMin: timeMinIso, timeMax: timeMaxIso, items: [{ id: calendarId || 'primary' }] }),
    });
    if (!r.ok) throw new Error(`google freeBusy ${r.status}: ${await r.text()}`);
    const j = await r.json();
    const cal = j.calendars?.[calendarId || 'primary'];
    return (cal?.busy ?? []).map((b: { start: string; end: string }) => ({ start: b.start, end: b.end }));
  }
  // microsoft — calendarView, treat anything not 'free' as busy
  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${encodeURIComponent(timeMinIso)}&endDateTime=${encodeURIComponent(timeMaxIso)}&$select=start,end,showAs&$top=500`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}`, Prefer: 'outlook.timezone="UTC"' } });
  if (!r.ok) throw new Error(`microsoft calendarView ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return (j.value ?? [])
    .filter((e: { showAs?: string }) => (e.showAs ?? 'busy') !== 'free')
    .map((e: { start: { dateTime: string }; end: { dateTime: string } }) => ({
      start: e.start.dateTime.endsWith('Z') ? e.start.dateTime : e.start.dateTime + 'Z',
      end: e.end.dateTime.endsWith('Z') ? e.end.dateTime : e.end.dateTime + 'Z',
    }));
}

export async function createEvent(p: Provider, accessToken: string, calendarId: string, ev: EventInput): Promise<{ id: string; meetLink: string }> {
  if (p === 'google') {
    // sendUpdates=all → Google emails the lawyer + client a calendar invite with the Meet link.
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events?conferenceDataVersion=1&sendUpdates=all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: ev.summary,
        description: ev.description,
        start: { dateTime: ev.startLocal, timeZone: TZ },
        end: { dateTime: ev.endLocal, timeZone: TZ },
        attendees: ev.attendees.filter(Boolean).map((email) => ({ email })),
        conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      }),
    });
    if (!r.ok) throw new Error(`google events.insert ${r.status}: ${await r.text()}`);
    const j = await r.json();
    return { id: j.id, meetLink: j.hangoutLink ?? '' };
  }
  const r = await fetch('https://graph.microsoft.com/v1.0/me/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      subject: ev.summary,
      body: { contentType: 'HTML', content: ev.description },
      start: { dateTime: ev.startLocal, timeZone: TZ },
      end: { dateTime: ev.endLocal, timeZone: TZ },
      attendees: ev.attendees.filter(Boolean).map((address) => ({ emailAddress: { address }, type: 'required' })),
      isOnlineMeeting: true, onlineMeetingProvider: 'teamsForBusiness',
    }),
  });
  if (!r.ok) throw new Error(`microsoft events.create ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return { id: j.id, meetLink: j.onlineMeeting?.joinUrl ?? '' };
}

export async function updateEvent(p: Provider, accessToken: string, calendarId: string, eventId: string, ev: EventInput): Promise<void> {
  if (p === 'google') {
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        summary: ev.summary, description: ev.description,
        start: { dateTime: ev.startLocal, timeZone: TZ }, end: { dateTime: ev.endLocal, timeZone: TZ },
      }),
    });
    if (!r.ok) throw new Error(`google events.patch ${r.status}: ${await r.text()}`);
    return;
  }
  const r = await fetch(`https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      subject: ev.summary, body: { contentType: 'HTML', content: ev.description },
      start: { dateTime: ev.startLocal, timeZone: TZ }, end: { dateTime: ev.endLocal, timeZone: TZ },
    }),
  });
  if (!r.ok) throw new Error(`microsoft events.update ${r.status}: ${await r.text()}`);
}

export async function deleteEvent(p: Provider, accessToken: string, calendarId: string, eventId: string): Promise<void> {
  const url = p === 'google'
    ? `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId || 'primary')}/events/${encodeURIComponent(eventId)}`
    : `https://graph.microsoft.com/v1.0/me/events/${encodeURIComponent(eventId)}`;
  const r = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } });
  // 404/410 = already gone — treat as success.
  if (!r.ok && r.status !== 404 && r.status !== 410) throw new Error(`${p} events.delete ${r.status}: ${await r.text()}`);
}

// --- Phase 3b: transcript retrieval ----------------------------------------

/** Extract the Meet meeting code (e.g. "abc-defg-hij") from a hangout link. */
export function meetCodeFromLink(link: string): string {
  if (!link) return '';
  const m = link.match(/meet\.google\.com\/([a-z0-9-]+)/i);
  return m ? m[1].toLowerCase() : '';
}

/** Pull a Google Meet transcript (text) for the meeting with this code. */
export async function getGoogleMeetTranscript(accessToken: string, meetCode: string): Promise<string> {
  if (!meetCode) return '';
  const auth = { Authorization: `Bearer ${accessToken}` };
  const crRes = await fetch('https://meet.googleapis.com/v2/conferenceRecords?pageSize=25', { headers: auth });
  if (!crRes.ok) throw new Error(`meet conferenceRecords ${crRes.status}: ${await crRes.text()}`);
  const records = (await crRes.json()).conferenceRecords ?? [];
  let matched: { name: string } | null = null;
  for (const rec of records) {
    if (!rec.space) continue;
    const spRes = await fetch(`https://meet.googleapis.com/v2/${rec.space}`, { headers: auth });
    if (!spRes.ok) continue;
    const sp = await spRes.json();
    if ((sp.meetingCode || '').toLowerCase() === meetCode) { matched = rec; break; }
  }
  if (!matched) return '';
  const tRes = await fetch(`https://meet.googleapis.com/v2/${matched.name}/transcripts`, { headers: auth });
  if (!tRes.ok) return '';
  const transcripts = (await tRes.json()).transcripts ?? [];
  let out = '';
  for (const tr of transcripts) {
    let pageToken = '';
    do {
      const url = `https://meet.googleapis.com/v2/${tr.name}/entries?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const eRes = await fetch(url, { headers: auth });
      if (!eRes.ok) break;
      const eJson = await eRes.json();
      for (const en of (eJson.transcriptEntries ?? [])) out += (en.text ?? '') + '\n';
      pageToken = eJson.nextPageToken ?? '';
    } while (pageToken);
  }
  return out.trim();
}

function vttToText(vtt: string): string {
  return (vtt || '').split(/\r?\n/)
    .filter((line) => line && !line.startsWith('WEBVTT') && !line.includes('-->') && !/^\d+$/.test(line.trim()) && !line.startsWith('NOTE'))
    .join('\n').trim();
}

/** Pull a Teams transcript (text) for the online meeting at this join URL. */
export async function getTeamsTranscript(accessToken: string, joinUrl: string): Promise<string> {
  if (!joinUrl) return '';
  const auth = { Authorization: `Bearer ${accessToken}` };
  const mRes = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=JoinWebUrl eq '${joinUrl.replace(/'/g, "''")}'`, { headers: auth });
  if (!mRes.ok) throw new Error(`graph onlineMeetings ${mRes.status}: ${await mRes.text()}`);
  const meeting = ((await mRes.json()).value ?? [])[0];
  if (!meeting) return '';
  const tRes = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meeting.id}/transcripts`, { headers: auth });
  if (!tRes.ok) return '';
  const list = (await tRes.json()).value ?? [];
  let out = '';
  for (const tr of list) {
    const cRes = await fetch(`https://graph.microsoft.com/v1.0/me/onlineMeetings/${meeting.id}/transcripts/${tr.id}/content?$format=text/vtt`, { headers: auth });
    if (!cRes.ok) continue;
    out += vttToText(await cRes.text()) + '\n';
  }
  return out.trim();
}

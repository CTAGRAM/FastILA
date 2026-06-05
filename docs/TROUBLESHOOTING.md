# Troubleshooting

Common symptoms and where to look. For the conventions behind these, see [ARCHITECTURE.md](ARCHITECTURE.md), [BACKEND.md](BACKEND.md), and [CONFIGURATION.md](CONFIGURATION.md).

---

### The app shows a yellow "Demo data" pill / console says `FastILA · mock+persist`

You're in **mock mode** — `config.js` has empty keys. Paste `supabaseUrl` + `supabaseAnonKey` to go live. The console banner says `FastILA · live` when keys are detected.

### I added keys but it's *still* in mock mode

`index.html` `document.write`s the Supabase UMD bundle **only** when keys are present, and `HAS_BACKEND` is captured on first read. Make sure:
- The keys are non-empty strings in `config.js` (not placeholders).
- You did a **full page reload** (not just a SPA route change).
- Nothing is blocking the `cdn.jsdelivr.net` Supabase script. If `window.supabase` is undefined at load, the layer stays mock for the session.

### A component renders blank / "X is not defined"

Almost always a **load-order** problem. The file using a global must have its `<script>` tag *after* the file that defines it in [`index.html`](../index.html). The reliable early dependencies are `api.jsx → data.jsx → atoms.jsx → actions.jsx`. Also check the browser console for a Babel transform error in the offending file.

### An icon is missing (blank square)

The `Icon` name isn't defined in [`atoms.jsx`](../atoms.jsx). Use an existing name. (Note: a `copy` icon is known to be undefined and renders blank app-wide — left as-is to avoid changing existing UI.)

### My data change doesn't persist / other tabs don't update

You probably mutated a store global directly (`window.BOOKINGS.push(...)`). Route the write through a `FastILA.*` method so `mutate()` runs (persist + KPI recompute + `fastila:store-changed`). Components must call `FastILA.useStore()` to re-render. See [DATA-LAYER.md](DATA-LAYER.md).

---

## Backend

### Bookings save but no confirmation email arrives

Work down this list:
1. **Engine armed?** The cron job is dormant until Vault holds `fi_edge_url` + the cron secret. Test with Control center → **"Send due now"** (uses the admin JWT, no Vault needed). If that sends, it's an arming problem.
2. **Resend domain.** The Resend test sender (`onboarding@resend.dev`) only delivers to the account owner. Verify `fast-ila.co.uk` in Resend and set `FROM_EMAIL=bookings@fast-ila.co.uk`.
3. **Secrets set?** `RESEND_API_KEY`, `FROM_EMAIL`, `PORTAL_URL` via `supabase secrets set`.
4. **Don't double-wire.** Confirmation goes through `dispatch-automations`; if you also wired `send-booking-email`, disable one.
Check the `messages` table (status/error) and `automation_runs` for the failure reason.

### SMS doesn't send

Twilio trial accounts can only message **verified** numbers; upgrade to message arbitrary numbers. Recipients must be valid **E.164**. Confirm `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM`).

### Booking has no Google Meet link ("link to follow")

Meet creation needs a connected Google **Workspace** calendar (personal Gmail can't mint Meet links). Connect the **firm calendar** once (admin-only, Control center) or a lawyer's Workspace calendar. Until connected, bookings save with `meet_link = null`. Also confirm `CALENDAR_GOOGLE_CLIENT_ID/SECRET` are set and the redirect URI `…/functions/v1/calendar-oauth-callback` is registered.

### Google "access blocked / app not verified / test user"

That wall is triggered by the **sensitive Calendar scope**, not by login. Basic Google **login** just needs the consent screen **published**. Only the **one** firm Workspace account needs to be a test user / internal for the Calendar scope. See [CONFIGURATION.md](CONFIGURATION.md).

### Cron tick returns HTTP 401

The function rejected the cron call's bearer. The cron functions accept `bearer === FI_CRON_SECRET`; ensure the `FI_CRON_SECRET` env on `dispatch-automations` / `calendar` / `recordings-ingest` **matches** the value stored in Vault as `fi_service_role_key`. (This mismatch happened because the api-keys service-role value differed from the function's `SUPABASE_SERVICE_ROLE_KEY` across new/legacy key formats — hence the dedicated shared secret.)

### Anon can read bookings / PII

A serious RLS regression. As anon, `select * from bookings` must return `[]`. The known cause was `current_email()` returning `''` and matching empty columns — it must return `NULL`. Re-apply the fix and re-check. See [SECURITY.md](SECURITY.md).

### AI chat / brief says "couldn't reach the AI"

AI must route through the `ai` edge function (`FastILA.ai.complete`), which checks a **staff JWT** — a demo "view-as" session won't authenticate. Sign in as real staff. Confirm `ANTHROPIC_API_KEY` (and `OPENAI_API_KEY` fallback) are set. The old browser-direct calls were removed and won't work.

### Transcripts/recordings don't populate

Needs `OPENAI_API_KEY` (Whisper) + `ANTHROPIC_API_KEY` (summary), Vault `fi_recordings_url`, and — for auto-ingest of Meet/Teams transcripts — Workspace/M365 admin to enable recording+transcription and grant the transcript scopes (lawyers must reconnect to grant the expanded scopes).

---

## Where to look

| Symptom area | First place to check |
| --- | --- |
| Routing / wrong surface | [`app.jsx`](../app.jsx) mode parsing |
| Load order | [`index.html`](../index.html) script tags |
| Data not persisting | `mutate()` in [`api.jsx`](../api.jsx) |
| Email/SMS | `messages` + `automation_runs` tables; `dispatch-automations` logs |
| Calendar/Meet | `calendar_connections`; `calendar` + `create-booking` fn logs |
| RLS | `.rls-tighten.sql`, policy list in the SQL editor |
| Secrets armed | Control center health; `vault.secrets`; `supabase secrets list` |

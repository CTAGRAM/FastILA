# Configuration

There are **three** places configuration lives. Know which is which — putting a secret in the wrong one either breaks the app or leaks a key.

| Where | Visibility | Holds |
| --- | --- | --- |
| [`config.js`](../config.js) | **Public** (shipped to the browser) | Supabase URL + **anon** key, brand, feature flags |
| Supabase **secrets** (`supabase secrets set …`) | **Server-only** (Edge Functions read via `Deno.env`) | Resend, Twilio, OpenAI, Anthropic, OAuth client secrets, `PORTAL_URL`, `FROM_EMAIL` |
| Supabase **Vault** (`vault.secrets`) | **DB-only** (read by pg_cron functions) | `fi_edge_url`, `fi_calendar_url`, `fi_recordings_url`, `fi_service_role_key` |

The anon key is *meant* to be public — RLS is what protects data. The service-role key and all provider keys are **not** — never put them in `config.js`.

---

## 1. `config.js` (browser)

```js
window.FAST_ILA_CONFIG = {
  supabaseUrl:    "https://<ref>.supabase.co",
  supabaseAnonKey:"eyJhbGciOi…",          // anon key — public by design
  portalReturnUrl: window.location.origin + window.location.pathname,
  brand: { firm: "Nexa Law Ltd", tradingAs: "Fast-ILA", domain: "fast-ila.co.uk", supportEmail: "info@fast-ila.co.uk" },
  features: {
    realBackend: false,   // AUTO-set to true at runtime when keys are present — don't set by hand
    sendEmails:  true,
    enforceAuth: true,    // require Google / magic-link / password sign-in on portal + dashboard
  },
};
```

- **Empty keys ⇒ mock mode** (yellow "Demo data" pill, seed data from `data.jsx`).
- **Keys present ⇒ live mode** — `realBackend` flips automatically, and `index.html` `document.write`s the Supabase UMD bundle so `HAS_BACKEND` reads true on first load.

---

## 2. Edge-function secrets (server)

Set with the CLI against the project ref:

```bash
supabase secrets set \
  RESEND_API_KEY=re_xxx \
  FROM_EMAIL=bookings@fast-ila.co.uk \
  TWILIO_ACCOUNT_SID=AC… TWILIO_AUTH_TOKEN=… TWILIO_MESSAGING_SERVICE_SID=MG… \
  OPENAI_API_KEY=sk-… \
  ANTHROPIC_API_KEY=sk-ant-… \
  CALENDAR_GOOGLE_CLIENT_ID=… CALENDAR_GOOGLE_CLIENT_SECRET=… \
  PORTAL_URL=https://app.fast-ila.co.uk \
  --project-ref xcndxuunmmtyntabtgbr
```

`SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are injected automatically by Supabase.

| Secret | Used by | Notes |
| --- | --- | --- |
| `RESEND_API_KEY` / `FROM_EMAIL` | `dispatch-automations`, `send-booking-email` | For real delivery, verify your domain in Resend and set `FROM_EMAIL=bookings@fast-ila.co.uk`. The Resend test sender (`onboarding@resend.dev`) only delivers to the account owner. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM`) | `dispatch-automations` | Needs valid E.164 recipients; trial accounts can only message verified numbers until upgraded. |
| `OPENAI_API_KEY` | `transcribe`, `recordings-ingest`, `ai` | Whisper + AI fallback |
| `ANTHROPIC_API_KEY` | `ai`, summaries | Primary AI provider |
| `CALENDAR_GOOGLE_CLIENT_ID` / `_SECRET` | `calendar`, `calendar-oauth-callback`, `create-booking` | Google OAuth client for diary + Meet |
| `CALENDAR_MS_CLIENT_ID` / `_SECRET` | `calendar` | Microsoft Outlook/Teams — optional |
| `PORTAL_URL` | enqueue + emails | The deployed site URL (e.g. `https://app.fast-ila.co.uk`); used in `{{portal_url}}` |
| `FI_CRON_SECRET` | cron-called fns | Shared secret so pg_cron can authenticate (see Vault below) |

See [`../.env.example`](../.env.example) for the canonical browser-vs-secret split.

---

## 3. Vault (arms the cron jobs)

The pg_cron functions read the edge-function URLs and an auth token from `vault.secrets`. Until these exist, the cron jobs run but no-op.

```sql
select vault.create_secret('https://xcndxuunmmtyntabtgbr.supabase.co/functions/v1/dispatch-automations', 'fi_edge_url');
select vault.create_secret('https://xcndxuunmmtyntabtgbr.supabase.co/functions/v1/calendar',             'fi_calendar_url');
select vault.create_secret('https://xcndxuunmmtyntabtgbr.supabase.co/functions/v1/recordings-ingest',    'fi_recordings_url');
select vault.create_secret('<the FI_CRON_SECRET value>',                                                 'fi_service_role_key');
```

> The cron secret must match the `FI_CRON_SECRET` env set on the `dispatch-automations`, `calendar`, and `recordings-ingest` functions. A dedicated shared secret is used (rather than the raw service-role key) because the api-keys service-role value did not match the function's `SUPABASE_SERVICE_ROLE_KEY` env across the new/legacy key formats.

---

## Integrations hub (frontend, `localStorage`)

[`dashboard-integrations.jsx`](../dashboard-integrations.jsx) lets an admin paste keys for Supabase, Google, Anthropic, OpenAI, Twilio, SMTP, Royal Mail, etc. into the UI. These are stored in `localStorage` under `fastila_integrations_v2` and read via `window.fiIntegration.get/isConnected`.

> ⚠ **These are stored unencrypted in the browser.** This is acceptable for demo/single-operator use but is **not** where production provider secrets should live — production secrets belong in Supabase secrets (above). See [SECURITY.md](SECURITY.md).

---

## OAuth redirect URIs

Register this redirect URI in **both** Google and (optionally) Microsoft consent screens:

```
https://xcndxuunmmtyntabtgbr.supabase.co/functions/v1/calendar-oauth-callback
```

For Google **Meet** link creation, the connected account must be a real Google **Workspace** account (personal Gmail can't mint Meet links). The "firm calendar" model connects **one** Workspace account once (admin-only); only that account needs the sensitive Calendar scope. Basic Google **login** for everyone just needs the consent screen published.

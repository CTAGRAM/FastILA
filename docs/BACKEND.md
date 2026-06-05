# Backend — Supabase

The backend lives in [`supabase/`](../supabase/): Postgres schema + RLS, Edge Functions (Deno), Storage buckets, and a **Supabase-native automation engine** built on `pg_cron` + `pg_net` + Vault. The frontend talks to it only through `window.FastILA.*` (see [DATA-LAYER.md](DATA-LAYER.md)).

> **Connected project:** `config.js` points at Supabase project **`xcndxuunmmtyntabtgbr`** (`https://xcndxuunmmtyntabtgbr.supabase.co`). The `project_id = "fast-ila"` in `config.toml` is only the local-dev identifier.

---

## Schema

Base schema: [`migrations/20260528000001_schema.sql`](../supabase/migrations/20260528000001_schema.sql).

Core tables:

```
staff · services · lawyers · matter_types · lenders · availability_slots ·
clients · bookings · booking_events · documents · signatures · payments ·
understanding_answers · ai_prompts · templates · brokers
```

- Booking references are `FI-YYYY-NNNNN`, assigned by a trigger.
- Helper functions: `current_role()`, `current_lawyer_id()` (and, after hardening, `current_email()`, `is_staff()`).
- Private storage buckets: `client-docs`, `certificates`, `templates` (and later `recordings`).

Later migrations add columns and tables additively (never altering existing behaviour):

| Migration | Adds |
| --- | --- |
| `20260528000002_policies.sql` | Base RLS (anon / client / lawyer / admin) |
| `20260603000003_automations.sql` | `automation_rules`, `messages`, `automation_runs`; `fi_render()`, enqueue + dispatch functions; pg_cron `fi-dispatch-automations` (every minute) |
| `20260603000004_calendar.sql` | `calendar_connections`, `calendar_busy`, `calendar_event_links`; pg_cron `fi-calendar-sync` (every 15 min) |
| `20260603000005_recordings.sql` | `recordings`, `transcripts`; `recordings` storage bucket + staff policies |
| `20260603000006_recordings_ingest.sql` | pg_cron `fi-recordings-ingest` (hourly) |
| `20260603000007_health.sql` | `fi_platform_health()` RPC for the Control Center |
| `20260603000008_clients.sql` | Booking→client linking trigger + backfill + email index |
| `20260606000001_lawyer_hours.sql` | `lawyers.work_days/work_start/work_end/slot_minutes/buffer_minutes` (working-hours model) |
| `20260606000002_meet_link_vars.sql` | `{{meet_link}}` token + updated templates |
| `20260606000003_firm_calendar.sql` | `calendar_connections.kind` ('lawyer'/'firm'), `lawyers.email`; firm-calendar Meet creation |

Seed data: [`seed.sql`](../supabase/seed.sql) — 4 services, 4 lawyers, 7 matter types, 10 lenders, AI prompts, email templates.

---

## Row-Level Security (RLS)

Three layers — apply them in order for production:

1. **Base policies** ([`20260528000002_policies.sql`](../supabase/migrations/20260528000002_policies.sql)) — roles anon / client / lawyer / admin. Anon may `INSERT` bookings + clients; clients see rows matching their `client_email` / `second_signatory_email`; lawyers are scoped to `lawyer_id`; admins see all.
2. **Dev bootstrap** ([`../.bootstrap-and-realtime.sql`](../.bootstrap-and-realtime.sql)) — auto-promotes the first auth user to admin, opens writes for any signed-in user, enables Realtime. **Dev only.**
3. **Production hardening** ([`../.rls-tighten.sql`](../.rls-tighten.sql)) — JWT-based `current_role()` / `is_staff()` (adds `wet_specialist`), drops the wide-open dev policies, case-insensitive email matching, locks Storage writes to staff. **Apply before go-live.**

> ⚠ **Known issue history & outstanding items:** see [SECURITY.md](SECURITY.md). A critical anon-read leak (anon could read all bookings/PII) was fixed on 2026-06-03 by redefining `current_email()` to return `NULL` instead of `''`. Some leftover wide-open `*_authed_write` policies may still exist — verify before go-live.

---

## Edge Functions (`supabase/functions/`)

| Function | `verify_jwt` | Purpose |
| --- | --- | --- |
| `create-booking` | false (public) | Validates, conflict-checks the slot, assigns/confirms the lawyer, creates a Google Calendar event with a **Meet link** on the firm (or lawyer) calendar, inserts the booking with `meet_link`, logs the event. The insert trigger enqueues the confirmation. |
| `send-booking-email` | true | Renders a template + sends via Resend. **Note:** confirmation now flows through the automation engine, so do *not* also enable this path or emails double-send. |
| `dispatch-automations` | false | The dispatcher. Sends queued `messages` via Resend (email) / Twilio (SMS). Auth = service-role key **or** admin JWT **or** the `FI_CRON_SECRET` shared secret. |
| `invite-user` | — | Admin-only staff provisioning; stamps `app_metadata.role` (which RLS reads). |
| `calendar` | — | Diary sync — `status` / `start` / `disconnect` / `sync`. Token refresh + free/busy pull + push booking events with Meet/Teams links. Supports per-lawyer and **firm** connections. |
| `calendar-oauth-callback` | false (public) | OAuth return; HMAC-signed `state`. |
| `transcribe` | — | Audio → OpenAI Whisper → AI summary → `bookings.ai_summary`. |
| `recordings-ingest` | — | Pulls Meet/Teams transcripts for recent calls, summarises, stores. |
| `health` | — | Admin-only: returns secret-*presence* booleans (never values) for the Control Center. |
| `ai` | — | Staff-only server-side **Anthropic→OpenAI** proxy. Powers AI chat, brief, and notes (replaces the old browser-direct calls). |
| `client-lookup` | false (public) | Returns **only** `{returning, count}` for a given email — no PII — for the returning-client nudge. |

Shared code: [`functions/_shared/`](../supabase/functions/_shared/) — `cors.ts`, `calendar.ts` (Google + Microsoft Graph), `summarize.ts` (Anthropic→OpenAI).

---

## The automation engine (how email/SMS actually send)

This is the **active** notification path (the n8n catalog in `dashboard-automations.jsx` is reference only).

```
booking INSERT/UPDATE
   └─ AFTER trigger fi_enqueue_booking_automations()   (EXCEPTION-guarded — never blocks a write)
         └─ inserts rows into `messages` with computed send_at times,
            rendered from `automation_rules` templates via fi_render()
                                   │
   pg_cron `fi-dispatch-automations` (every 1 min)
         └─ fi_dispatch_tick()  → pg_net POST → `dispatch-automations` edge fn
               └─ Resend (email) / Twilio (SMS);  writes status back to `messages`
```

Seeded rules: `booking_confirmation`, `reminder_24h`, `reminder_1h` (off by default), `payment_chase`, `feedback_request` (off by default). Edit them in the **Automation center** view, or with `FastILA.automations.updateRule`.

### Arming the engine (it's dormant until armed)

The cron jobs are no-ops until you (1) set provider secrets and (2) arm Vault. See [CONFIGURATION.md](CONFIGURATION.md) for the full secret + Vault list. In short:

1. `supabase secrets set RESEND_API_KEY=… FROM_EMAIL=… TWILIO_ACCOUNT_SID=… TWILIO_AUTH_TOKEN=… TWILIO_MESSAGING_SERVICE_SID=… PORTAL_URL=… --project-ref xcndxuunmmtyntabtgbr`
2. Insert Vault secrets `fi_edge_url`, `fi_calendar_url`, `fi_recordings_url`, and a cron shared secret (`fi_service_role_key`) — the dispatch/calendar/recordings functions accept `bearer === FI_CRON_SECRET`.

> While unarmed, you can still test with the **Control center** buttons ("Send due now", "Sync now", "Ingest now") — those use the admin JWT and need no Vault.

---

## Cron jobs

| Job | Cadence | Calls |
| --- | --- | --- |
| `fi-dispatch-automations` | every minute | `dispatch-automations` |
| `fi-calendar-sync` | every 15 min | `calendar` (sync) |
| `fi-recordings-ingest` | hourly | `recordings-ingest` |

Extensions used: `pg_cron`, `pg_net`, `pgcrypto`.

---

## Local Supabase

```bash
supabase start                 # uses supabase/config.toml
supabase db push               # apply migrations
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
supabase functions deploy <name>
```

`config.toml` sets per-function `verify_jwt` and local ports.

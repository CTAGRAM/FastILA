# Changelog / build history

A high-level record of how Fast-ILA grew from the static booking SPA into a backed platform. Reconstructed from migrations, edge functions, and project notes — treat the Supabase migration filenames and `index.html` load order as the source of truth for exact state.

The build followed a phased plan: **(1) Auth + reminders/email/SMS → (2) Calendar & diary sync → (3) Call recordings + transcripts → (4) Integrations control center**, with a later **returning-client history** pass and a **"make it real"** pass. Engine choice throughout: **Supabase-native** (pg_cron + pg_net + Vault + edge functions), not n8n. Standing constraint: **additive only — don't break existing code or UI.**

---

## Base platform (late May 2026)

- Static React-via-Babel SPA: booking flow, 8-step client portal, internal dashboard, e-sign studio, WordPress embed plugin.
- Supabase base schema + RLS policies + seed (`20260528000001_schema.sql`, `20260528000002_policies.sql`, `seed.sql`).
- Public `create-booking` + `send-booking-email` edge functions (Resend).

## Phase 1 — Automation engine (2026-06-03)

- Migration `20260603000003_automations.sql`: `automation_rules` (5 seeded rules), `messages` queue/log, `automation_runs`, `fi_render()`, enqueue + dispatch functions, AFTER-INSERT/UPDATE booking triggers (EXCEPTION-guarded), pg_cron `fi-dispatch-automations` (every minute).
- Edge functions: `dispatch-automations` (Resend email + Twilio SMS), `invite-user` (admin staff provisioning, stamps `app_metadata.role`).
- Frontend: `FastILA.automations`, **Automation center** view (`dashboard-automation-center.jsx`), nav `autocenter`.
- Booking confirmation now flows through this engine — so `send-booking-email` must **not** also be wired in (double-send).

## Phase 2 — Calendar & diary sync (2026-06-03)

- Migration `20260603000004_calendar.sql`: `calendar_connections` (RLS-invisible, service-role only), `calendar_busy` (free/busy cache, anon-readable for the booking form), `calendar_event_links`; pg_cron `fi-calendar-sync` (every 15 min).
- Edge functions: `calendar` (status/start/disconnect/sync), `calendar-oauth-callback` (HMAC-signed state); shared `_shared/calendar.ts` (Google + Microsoft Graph).
- Frontend: `FastILA.calendar`, `CALENDAR_BUSY`, `availability.isSlotFree/busyRangesForLawyer`, **Calendars** view, profile connect panel.

## Phase 3 / 3b — Recordings & transcripts (2026-06-03)

- Migrations `…_recordings.sql` + `…_recordings_ingest.sql`: `recordings`, `transcripts`, private `recordings` bucket, pg_cron `fi-recordings-ingest` (hourly).
- Edge functions: `transcribe` (Whisper → AI summary → `bookings.ai_summary`), `recordings-ingest` (pulls Meet/Teams transcripts); shared `_shared/summarize.ts`.
- Frontend: `FastILA.recordings`, **Recordings** view + `RecordingPanel` in the booking detail.

## Phase 4 — Integrations Control Center (2026-06-03)

- Migration `…_health.sql`: `fi_platform_health()` RPC (staff-guarded; returns armed booleans + counts).
- Edge function: `health` (admin-only; secret-presence booleans, never values).
- Frontend: `FastILA.platform`, **Control center** view — provider status cards, engine health, test buttons (send/sync/ingest now), copy-paste setup commands.

## Returning-client history (2026-06-05)

- Migration `20260603000008_clients.sql`: BEFORE-INSERT trigger links bookings to `clients` by lowercased email + backfill + email index.
- Edge function: `client-lookup` (public; returns only `{returning, count}` — no PII).
- Frontend: `FastILA.clients`, **Clients** view, returning-client panels in booking detail + portal, a **no-prefill** welcome-back nudge on the booking form.

## Auth & messaging hardening (2026-06-05)

- Email+password login (`FastILA.auth.signInWithPassword`); UI role derived from session `app_metadata.role`.
- Required **matter-type dropdown** on the booking form (persisted to `bookings.matter_type`).
- Engine armed end-to-end (provider secrets + Vault + a dedicated `FI_CRON_SECRET` cron shared secret). Verified cron tick → HTTP 200.
- Removed (per product decision) from the frontend: n8n, Airtable, Microsoft/Outlook surfaces.

## "Make it real" pass (2026-06-06)

- Wiped demo data (kept services + admin staff).
- **Lawyer working-hours model** (`20260606000001_lawyer_hours.sql`): `work_days/work_start/work_end/slot_minutes/buffer_minutes`; editable in `LawyerEditModal`.
- **Diary-driven availability**: `availability.forLawyer/forService/earliest` generate slots from hours − bookings − calendar busy (replaces synthetic `buildAvailability`).
- **Real Google Meet**: `create-booking` assigns/conflict-checks a lawyer and creates a Calendar event with a Meet link; booking stored with `meet_link` (`20260606000002_meet_link_vars.sql` adds the `{{meet_link}}` template token). Portal + dashboard use the real link.

## Firm-calendar pivot (2026-06-06)

- Migration `20260606000003_firm_calendar.sql`: `calendar_connections.kind` ('lawyer'/'firm'), `lawyers.email`. One firm Workspace account connected once (admin-only) mints Meet links — sidesteps per-lawyer sensitive-scope OAuth walls. `create-booking` prefers the firm connection (attendees emailed via `sendUpdates=all`).

## AI proxy fix (2026-06-06)

- New `ai` edge function (staff-only server-side Anthropic→OpenAI proxy) + `FastILA.ai.complete`. AI chat, brief, and notes route through it. Removed the browser-direct `window.claude.complete()` / `api.anthropic.com` calls (CORS + key exposure).

---

> **Dormant-until-armed:** the cron-driven email/SMS/calendar/recordings paths require provider secrets + Vault entries to actually fire (see [CONFIGURATION.md](CONFIGURATION.md)). Manual Control-center buttons work via the admin JWT without arming.

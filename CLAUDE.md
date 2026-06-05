# Fast-ILA — Project Index (CLAUDE.md)

End-to-end **Independent Legal Advice (ILA)** booking platform for **Nexa Law Ltd** (trading as **Fast-ILA**, SRA No. 524963). Three surfaces — public booking form, client portal, internal dashboard — plus a Supabase backend and a WordPress embed plugin.

> This file is an orientation map for the codebase. See `README.md` for setup/deploy instructions and `design_handoff_fast_ila/README.md` for the original product spec.

---

## Architecture at a glance

- **No build step.** Static React app loaded via **Babel-standalone** (React/ReactDOM/Babel/Supabase UMD from CDNs in `index.html`). Drop the root files on any static host (Vercel, Netlify, Cloudflare Pages, S3).
- **No ES modules.** Every `.jsx` file is `<script type="text/babel">`; components and helpers attach to **`window` globals** (no `import`/`export`). Load order matters — see `index.html` lines 43–71.
- **Hybrid data layer.** `api.jsx` exposes `window.FastILA.*`. It runs in **live mode** (Supabase) when `config.js` has real keys, otherwise **mock mode** (seed data in `data.jsx` + `localStorage` + `IndexedDB` for blobs, synced across tabs via `BroadcastChannel`).
- **Three URL-driven surfaces.** `?mode=booking | portal | dashboard`, plus `?chrome=off` for iframe embeds and `?ref=FI-…` for portal deep-links. Parsed in `app.jsx`.
- **External libs (CDN, on `window`):** `jspdf` + `pdf-lib` (PDF generation/stamping), `mammoth` (Word→HTML preview), `@supabase/supabase-js`.
- **Automation/AI are external:** client notifications go out via **n8n webhooks**; AI brief/notes/chat call **Anthropic (Claude)** or **OpenAI** directly from the browser with keys stored in `localStorage` (configured in the Integrations view).

### Data flow
```
config.js (keys?) ──► api.jsx (window.FastILA)
                          │  live → Supabase (Postgres + RLS + Realtime + Edge Functions + Storage)
                          │  mock → data.jsx seeds + localStorage + IndexedDB, BroadcastChannel sync
                          ▼
   booking-flow / client-portal / dashboard-* components  (read globals: BOOKINGS, LAWYERS, SERVICES …)
                          ▼
   FastILA.bookings/documents/signatures/payments/contacts.* (CRUD)
                          ▼
   n8n webhooks (client email/SMS)   ·   Anthropic/OpenAI (AI)   ·   jspdf/pdf-lib (PDFs)
```

---

## File map

### Entry / config
| File | Purpose |
| --- | --- |
| `index.html` | Loads CDN libs, conditionally loads Supabase UMD (via `document.write` so `HAS_BACKEND` reads true), then all `.jsx` in dependency order. |
| `config.js` | Runtime config: Supabase URL + anon key, brand, `features` (`realBackend` auto-set, `sendEmails`, `enforceAuth`). **Currently has live keys committed** (see "Connected backend"). |
| `.env.example` | Documents browser vs. Supabase-secret env vars (RESEND_API_KEY, PORTAL_URL, FROM_EMAIL). |
| `vercel.json` / `netlify.toml` | Static host config: clean-URL rewrites (`/booking`, `/portal`, `/admin`, `/embed`), security headers, `/embed*` frame-ancestors `*`. |
| `.serve.py` | Local threaded static server that serves `.jsx` as `application/javascript`, no-cache. `python .serve.py 5173`. |

### Core data / logic layer
| File | Purpose |
| --- | --- |
| `api.jsx` (~1357 ln) | **`window.FastILA`** namespace. Live/mock switch via `HAS_BACKEND` (line 22). Namespaces: `services, lawyers, availability, bookings, documents, signatures, payments, understanding, templates, prompts, lenders, brokers, contacts, mailshots, emailTemplates, users, notifications, firm, admin, auth`. `mutate()` (line ~178) is the central write path → recomputes KPIs, saves localStorage, fires `fastila:store-changed`. Subscribes to Supabase Realtime when live (lines ~1224–1307). `useStore()` re-render hook. Mock blobs in IndexedDB (`fastila_files`/`blobs`). |
| `data.jsx` (~335 ln) | Seed data + helpers for mock mode. `SERVICES` (4 tiers), `LAWYERS` (empty by default), `MATTER_TYPES` (7), `TODAY` (May 27 2026), date helpers (`fmtTime/fmtDateLong/ymd/addDays`), `buildAvailability(serviceId)` (60-day slot map). `window.FastILA_loadLive()` hydrates from Supabase on load. |
| `actions.jsx` (~2280 ln) | Modal/form component library **and** action handlers. Modals: `NewBookingModal, ChangeServiceModal, RescheduleModal, TrackingModal, CancelConfirm, NoteModal, DocPreviewModal, LawyerEditModal, ProfileEditModal, InviteUserModal, FirstRunWizard, NotificationsPanel`. Global hosts: `ToastHost`, `PreviewHost` (`window.fiPreviewDoc`). `Actions.*` handlers (status, dispatch, tasks, reminders, CSV exports). **PDF builders**: `fiBuildDeclarationPDF` (jspdf), `fiBuildSignedCCL`/`fiBuildExecutedCert` (pdf-lib). **AI**: `fiGenerateBrief`, `fiGenerateNote` (Claude/OpenAI). Payment ref helper `fiPaymentReference` → `KAO/SURNAME`. |

### Public booking & client portal
| File | Purpose |
| --- | --- |
| `booking-flow.jsx` (~816 ln) | Public 3-step form (`?mode=booking`, no auth). `BookingFlow` state machine → `ScreenServiceSelect` → `ScreenDateLawyer` (earliest-available / pick-lawyer tabs, `CalendarMonth`) → `ScreenDetails` (conditional couples/postal fields) → `ScreenConfirm`. Calls `FastILA.bookings.create()`. |
| `client-portal.jsx` (~3057 ln) | Post-booking **8-step locked flow** (`?mode=portal&ref=…`, auth via email/Google). Steps: 1 `StepLetter` (sign care letter, multi-signatory 1–6) → 2 `StepKYC` (ID + address) → 3 `StepPay` (bank transfer declare) → 4 `StepDocs` (matter docs) → 5 `StepMeet` (Google Meet + `VideoLibrary`) → 6 `StepUnderstanding` (matter-type declaration) → 7 `StepCert` (ILA certificate; lawyer-only / lawyer-client / wet) → 8 `StepFeedback` (NPS). `SignaturePad`, `MultiSignatoryBlock`, `WetTrackingPanel`, `PortalLogin`, `ClientPortal` shell. |
| `esign.jsx` (~699 ln) | DocuSign-style e-sign studio (dashboard-side). `ESignStudio`, `ESignPad`, `LawyerSignatureCard`, `FirmStampCard`, `DocPicker`, `ESignField`. Signers colour-coded; fields placed by %-position. Lawyer sig + firm stamp persisted in `localStorage`. |

### Dashboard (internal console)
| File | Purpose |
| --- | --- |
| `dashboard-main.jsx` (~45 KB) | Shell: `DashSidebar` (role-based nav: lawyer / wet_specialist / admin), `DashTopbar` (⌘K + bell), `KpiCard`, `TodayView` (schedule rail + `OperationsQueue`), `BookingsView` (9+ filters, CSV export), `SettingsView` (team/firm/demo reset). |
| `dashboard-views.jsx` (~177 KB, largest) | `DetailView` (booking detail hub: AI brief, post-call workflow, cert signing, wet flow, notes, client uploads, audit log) + `RoyalMailView` (5-column Kanban + inline-editable dispatch log). Sub-panels: `WetSignatureFlow`, `CertSignWorkflow`, `LawyerTasksSection`, `PaymentReminder`, `ClientDetailsPanel`, `MatterNotes` (3 tabs), `AuditPackBar`, `ClientUploadsPanel`, `ReminderComposeModal`, `CloseMatterModal`, Kanban primitives. |
| `dashboard-wet-queue.jsx` (~45 KB) | Wet-signature specialist view. Two modes (persisted): `WetSpreadsheet` (Excel-style inline edit) and Kanban board (`Column`/`BookingCard`). `TrackingEditor`, `QuickPostActions` (1-click "mark posted + email tracking"). Fires n8n `booking.wet.*` events. |
| `dashboard-signatures.jsx` (~17 KB) | Lawyer cert/delivery tracking. Digital 3-stage board + Wet 5-stage board, `QuickTrackingModal`. |
| `dashboard-closures.jsx` (~12 KB) | Admin monthly closure report (bookings flagged "ready to close"), grouped by month, CSV export, mark-closed. |
| `dashboard-reports.jsx` | Admin revenue/ops reporting (monthly chart, per-lawyer, service mix, op-health). |
| `dashboard-templates.jsx` | Upload/manage firm docs (CCL, account details, lender certs, policies) → IndexedDB blobs + `fastila_templates_v2`. |
| `dashboard-prompts.jsx` | Edit AI system prompts (pre-call brief + chat) → `fastila_prompts_v1`, read via `window.fastilaPrompts`. |
| `dashboard-integrations.jsx` | Integration hub (Supabase, Google/Outlook, Anthropic, OpenAI, n8n, Airtable, SMTP, Royal Mail) → `fastila_integrations_v2`; `window.fiIntegration.get/isConnected`. **Credentials stored unencrypted in localStorage.** |
| `dashboard-automations.jsx` | Docs catalog of ~18 n8n automation events (payloads, templates, suggested node chains) → `fastila_n8n_workflow_map_v1`. |
| `dashboard-contacts.jsx` | Mailing-list DB (auto-from-bookings, CSV import w/ column mapping, tags, opt-in). `FastILA.contacts.*`. |
| `dashboard-broadcasts.jsx` | Email composer → audience from contacts → dispatch via n8n. `FastILA.mailshots.*`, `FastILA.emailTemplates.*`. |
| `dashboard-blog.jsx` | Airtable blog view embed (n8n auto-publishes to WordPress). |
| `dashboard-brokers.jsx` | Referral CRM (tiers, mailings). In-memory seed. |
| `dashboard-lenders.jsx` | Lender knowledge base (sig preference, templates, SLA, contacts). Admin inline-edit; lawyers read-only + "flag a change". |
| `dashboard-profile.jsx` | Lawyer "my profile" (links user email ↔ lawyer record). |

### UI shell / primitives / styling
| File | Purpose |
| --- | --- |
| `app.jsx` (~33 KB) | Root `App`. URL→mode routing, `ModeSwitcher`, `BookingView` (embedded vs standalone w/ site chrome), `DashboardLogin` (role + email/Google + demo test sign-in, session in `fastila_session_v1`), `DashboardView` (sidebar+topbar+view router, `window.fiSetDashView`), iframe height postMessage beacon. |
| `atoms.jsx` | `Icon` (40+ named SVGs), `Avatar` (IndexedDB photo + initials fallback), `StatusPill`, `ServiceBadge`. |
| `site-chrome.jsx` | Public marketing chrome: `SiteHeader`, `SiteGuaranteeStrip`, `SiteFooterStrip`, `TrustpilotMini`. |
| `global-search.jsx` | ⌘K spotlight: `GlobalSearch` + `useGlobalSearch` (indexes clients/lenders/brokers/lawyers/sections). |
| `ai-chat.jsx` | Floating Claude assistant (`AiChat`), agentic action directives `[ACTION: …]`, role-scoped context from firm data. |
| `tweaks-panel.jsx` | Design-tweak floating panel + `useTweaks` hook + form controls (segmented/toggle/slider/color). Edit-mode postMessage protocol. |
| CSS | `tokens.css` (design tokens — Navy `#042b3d` / Lime `#d7ed3f` / Cream, Sora+Inter, radii, shadows), `app.css`, `app-additions.css` (~54 KB dashboard), `booking.css`, `dashboard.css`, `portal.css`, `signatures.css`, `esign.css`, `global-search.css`. |

### Backend — `supabase/`
| File | Purpose |
| --- | --- |
| `migrations/20260528000001_schema.sql` | Schema. Tables: `staff, services, lawyers, matter_types, lenders, availability_slots, clients, bookings, booking_events, documents, signatures, payments, understanding_answers, ai_prompts, templates, brokers`. Booking ref `FI-YYYY-NNNNN` via trigger. Helpers `current_role()`, `current_lawyer_id()`. Storage buckets `client-docs`, `certificates`, `templates` (private). |
| `migrations/20260528000002_policies.sql` | Base RLS. Roles: anon / client / lawyer / admin. Anon can INSERT bookings+clients; clients see rows by matching `client_email`/`second_signatory_email`; lawyers scoped to `lawyer_id`; admins all. |
| `seed.sql` | 4 services, 4 lawyers (amelia/raj/sofia/tom), 7 matter types, 10 lenders, 2 AI prompts, 3 email templates. |
| `functions/create-booking/index.ts` | Public edge fn (`verify_jwt=false`): validates, conflict-checks slot, upserts client, inserts booking, logs event, async-fires email. |
| `functions/send-booking-email/index.ts` | Edge fn (`verify_jwt=true`): renders template, sends via **Resend** (`RESEND_API_KEY`; warns if unset). Tokens `{{ref}}`, `{{portal_url}}`, etc. |
| `functions/_shared/cors.ts` | CORS headers (`*`). |
| `config.toml` | Local dev (`project_id="fast-ila"`, ports 5432x, per-function `verify_jwt`). |
| `../.bootstrap-and-realtime.sql` (root) | **Dev**: auto-promote first auth user to admin, wide-open writes for signed-in users, enable Realtime on key tables. |
| `../.rls-tighten.sql` (root) | **Production hardening**: JWT-based `current_role()`/`is_staff()` (adds `wet_specialist`), drops wide-open policies, case-insensitive email matching, locks storage writes to staff. Apply before go-live. |

### WordPress plugin — `wordpress-plugin/fast-ila-booking/`
Thin iframe host. `[fast_ila_booking]` shortcode + Gutenberg block (`fast-ila/booking`), attrs `height/theme/layout/service`. Iframes `{embed_url}?mode=booking&chrome=off&…`. Settings page under Settings → Fast-ILA Booking. No data storage — pure delegation to the SPA.

### Other
- `design_handoff_fast_ila/` — original handoff: `README.md` (spec + recommended prod stack: Next.js/TS/Postgres/Prisma/Tailwind), `WALKTHROUGH.md`, and `source/` (a **duplicate snapshot** of the root jsx/css — don't edit, edit the root files).
- `uploads/` — `fast-ila-build-prompt-v6-FINAL.md` (full product spec) + image assets.
- `assets/fastila-logo.png`, `node_modules/` (CDN libs are used at runtime; node_modules is incidental).

---

## Key conventions & gotchas
- **Globals, not modules.** Add new components to `window` and a `<script type="text/babel">` tag in `index.html` in the right order (depends on `atoms.jsx`, `data.jsx`, `api.jsx` being loaded first).
- **All writes go through `FastILA.*`** which calls `mutate()` → fires `fastila:store-changed`; components re-render via `FastILA.useStore()`. Don't mutate `window.BOOKINGS` etc. directly.
- **Mock vs live is automatic** from `config.js` keys. Empty keys = demo mode (yellow "Demo data" pill). IndexedDB stores file blobs in mock mode; Supabase Storage signed URLs in live mode.
- **Compliance matters:** signatures capture timestamp + (live) IP/user-agent; declarations/signatories are snapshotted onto the booking for audit; VAT-inclusive pricing (no "+ VAT"), non-comparative service badges.
- **Wet-signature path** (couples/wet services) uses the Royal Mail dispatch state machine: `not_started → awaiting_signature → signed → ready_to_post → posted → delivered`.
- **Not yet implemented** (schema columns exist): Stripe/GoCardless pay, Google Meet auto-create, Royal Mail tracking API, two-way calendar sync, real AI brief wiring server-side.

## Connected backend
`config.js` points at Supabase project **`xcndxuunmmtyntabtgbr`** (`https://xcndxuunmmtyntabtgbr.supabase.co`), with `realBackend` auto-enabled because the anon key is present. (`supabase/config.toml`'s `project_id = "fast-ila"` is only the local-dev identifier.)

## Run locally
```bash
python .serve.py 5173      # or: python -m http.server 5173  /  npx serve -p 5173
# http://localhost:5173/?mode=dashboard   (or ?mode=booking / ?mode=portal&ref=FI-2026-00481)
```

# Surfaces & screens

A screen-by-screen walkthrough of the three product surfaces, plus the dashboard's role-based navigation.

---

## 1. Public booking — `?mode=booking`

File: [`booking-flow.jsx`](../booking-flow.jsx). No authentication. Embeddable via `?chrome=off`.

A 3-step state machine:

1. **Service select** (`ScreenServiceSelect`) — choose one of 4 service tiers (`SERVICES` in [`data.jsx`](../data.jsx)). Pricing is VAT-inclusive; badges are non-comparative.
2. **Date & lawyer** (`ScreenDateLawyer`) — two tabs: *earliest available* and *pick a lawyer*. A `CalendarMonth` shows bookable slots. Availability is **diary-driven**: it's generated from each lawyer's working hours minus existing bookings minus calendar busy-blocks (see [BACKEND.md](BACKEND.md) → availability).
3. **Details** (`ScreenDetails`) — client details, with conditional fields for **couples** (second signatory) and **postal/wet** services. A required **matter-type** dropdown (`MATTER_OPTIONS`) maps to the `matter_types` table.
4. **Confirm** (`ScreenConfirm`) — calls `FastILA.bookings.create()`, then shows the booking ref, the **Google Meet link** (when the firm calendar is connected), and "Continue to portal" / "Add to my calendar".

A returning-client **welcome-back nudge** shows previous-matter history (read-only — nothing is prefilled, by design).

---

## 2. Client portal — `?mode=portal&ref=FI-…`

File: [`client-portal.jsx`](../client-portal.jsx). Auth via email+password / magic link / Google (in live mode). A **locked 8-step flow** — each step gates the next:

| # | Step | Component | What the client does |
| --- | --- | --- | --- |
| 1 | **Care letter** | `StepLetter` | Sign the Client Care Letter (CCL). Supports **1–6 signatories** (`MultiSignatoryBlock`) for couples/multi-party matters |
| 2 | **KYC** | `StepKYC` | Upload ID + proof of address |
| 3 | **Pay** | `StepPay` | Bank-transfer instructions + declare paid (payment reference `KAO/SURNAME`) |
| 4 | **Documents** | `StepDocs` | Upload the matter documents |
| 5 | **Meet** | `StepMeet` | Join the **Google Meet** at the booked time; `VideoLibrary` of guidance videos |
| 6 | **Understanding** | `StepUnderstanding` | Complete the matter-type-specific understanding declaration |
| 7 | **Certificate** | `StepCert` | Receive the ILA certificate — three modes: lawyer-only, lawyer-client, or **wet** (posted) |
| 8 | **Feedback** | `StepFeedback` | NPS feedback |

Supporting pieces: `SignaturePad`, `WetTrackingPanel` (Royal Mail status for wet matters), `PortalLogin`, the `ClientPortal` shell, and `PortalHistoryCard` (returning-client history injected into the portal body).

**Compliance behaviours:** signatures capture a timestamp and, in live mode, IP + user-agent. The declaration text and the signatory list are **snapshotted onto the booking** so the audit trail is immutable even if templates change later.

---

## 3. Internal dashboard — `?mode=dashboard`

Shell in [`dashboard-main.jsx`](../dashboard-main.jsx): `DashSidebar` (role-based nav), `DashTopbar` (⌘K spotlight + notification bell), `KpiCard`s, and the view router (`window.fiSetDashView`). Login in [`app.jsx`](../app.jsx) (`DashboardLogin`); session in `fastila_session_v1`.

### Navigation by role

The sidebar shows different items depending on the signed-in role:

**Lawyer**
`Today` · `My bookings` · `Clients` · `My signatures` · `Recordings` · `Lender guide` · `My profile`

**Wet-signature specialist**
`Today` · `Wet queue` · `Lender guide` · `My profile`

**Admin** (full console)
`Today` · `All bookings` · `Clients` · `Booking detail` · `Matters to close` · `Recordings` · `Calendars` · `Templates` · `Lender guide` · `Brokers` · `AI prompts` · `Contacts` · `Broadcasts` · `Control center` · `Integrations` · `Automation center` · `Reports & revenue` · `Settings`

### View → file map

| Nav | View / component | File |
| --- | --- | --- |
| Today | `TodayView` (schedule rail + `OperationsQueue`) | [`dashboard-main.jsx`](../dashboard-main.jsx) |
| Bookings | `BookingsView` (9+ filters, CSV export) | [`dashboard-main.jsx`](../dashboard-main.jsx) |
| Booking detail | `DetailView` (AI brief, post-call workflow, cert signing, wet flow, notes, uploads, audit log) | [`dashboard-views.jsx`](../dashboard-views.jsx) |
| Royal Mail / wet | `RoyalMailView` (5-column Kanban) · `WetSpreadsheet` / Kanban | [`dashboard-views.jsx`](../dashboard-views.jsx), [`dashboard-wet-queue.jsx`](../dashboard-wet-queue.jsx) |
| Signatures | Digital 3-stage + Wet 5-stage boards, `QuickTrackingModal` | [`dashboard-signatures.jsx`](../dashboard-signatures.jsx) |
| Clients | `ClientsView`, `ClientHistoryList` (returning-client history) | [`dashboard-clients.jsx`](../dashboard-clients.jsx) |
| Recordings | `RecordingsView` + `RecordingPanel` (injected into DetailView) | [`dashboard-recordings.jsx`](../dashboard-recordings.jsx) |
| Calendars | `CalendarSyncView` + `CalendarConnectPanel` | [`dashboard-calendar-sync.jsx`](../dashboard-calendar-sync.jsx) |
| Matters to close | Monthly closure report, CSV export | [`dashboard-closures.jsx`](../dashboard-closures.jsx) |
| Reports & revenue | Monthly chart, per-lawyer, service mix, op-health | [`dashboard-reports.jsx`](../dashboard-reports.jsx) |
| Templates | Upload/manage firm docs (CCL, account details, lender certs) | [`dashboard-templates.jsx`](../dashboard-templates.jsx) |
| Lender guide | Lender knowledge base (sig preference, SLA, contacts) | [`dashboard-lenders.jsx`](../dashboard-lenders.jsx) |
| Brokers | Referral CRM | [`dashboard-brokers.jsx`](../dashboard-brokers.jsx) |
| AI prompts | Edit AI system prompts | [`dashboard-prompts.jsx`](../dashboard-prompts.jsx) |
| Contacts | Mailing-list DB (CSV import, tags, opt-in) | [`dashboard-contacts.jsx`](../dashboard-contacts.jsx) |
| Broadcasts | Email composer → audience → dispatch | [`dashboard-broadcasts.jsx`](../dashboard-broadcasts.jsx) |
| Automation center | Live engine: rules, message queue/log, stats, send-now | [`dashboard-automation-center.jsx`](../dashboard-automation-center.jsx) |
| Automations (n8n ref) | Catalog/docs of n8n automation events | [`dashboard-automations.jsx`](../dashboard-automations.jsx) |
| Control center | Provider status, engine health, test buttons, setup commands | [`dashboard-control-center.jsx`](../dashboard-control-center.jsx) |
| Integrations | Integration hub (keys → localStorage) | [`dashboard-integrations.jsx`](../dashboard-integrations.jsx) |
| Blog | Airtable blog embed | [`dashboard-blog.jsx`](../dashboard-blog.jsx) |
| My profile | Links user email ↔ lawyer record; calendar connect | [`dashboard-profile.jsx`](../dashboard-profile.jsx) |
| Settings | Team / firm / demo reset | [`dashboard-main.jsx`](../dashboard-main.jsx) |

> Some catalog/reference views (n8n automations, Blog, Microsoft/Outlook) were de-emphasised in favour of the Supabase-native engine. The exact nav set is sourced from `dashboard-main.jsx` — treat that file as the source of truth.

### e-sign studio

[`esign.jsx`](../esign.jsx) — a DocuSign-style placement studio (`ESignStudio`, `ESignPad`, `LawyerSignatureCard`, `FirmStampCard`, `DocPicker`, `ESignField`). Signers are colour-coded; fields are placed by `%` position. The lawyer signature + firm stamp persist in `localStorage`.

---

## 4. WordPress plugin

Folder: [`wordpress-plugin/fast-ila-booking/`](../wordpress-plugin/fast-ila-booking/). A thin iframe host — it stores no data, it only embeds the booking surface.

- Shortcode: `[fast_ila_booking]`
- Gutenberg block: `fast-ila/booking`
- Attributes: `height` (px or `auto`), `service`, `theme` (`light`/`dark`), `layout` (`stacked`/`grid`)
- It iframes `{embed_url}?mode=booking&chrome=off&…`
- Settings live under **Settings → Fast-ILA Booking**

See the install steps in [`../README.md`](../README.md) §5.

---

## Shared UI

| Component | File | Role |
| --- | --- | --- |
| `ModeSwitcher` | [`app.jsx`](../app.jsx) | Dev-only surface switcher (visible at `/`) |
| `SiteHeader` / `SiteFooterStrip` / `TrustpilotMini` | [`site-chrome.jsx`](../site-chrome.jsx) | Public marketing chrome |
| `GlobalSearch` (⌘K) | [`global-search.jsx`](../global-search.jsx) | Spotlight over clients/lenders/brokers/lawyers/sections |
| `AiChat` | [`ai-chat.jsx`](../ai-chat.jsx) | Floating Claude assistant with `[ACTION: …]` directives |
| `Icon` / `Avatar` / `StatusPill` / `ServiceBadge` | [`atoms.jsx`](../atoms.jsx) | Primitives |
| `ToastHost` / `PreviewHost` | [`actions.jsx`](../actions.jsx) | Global toast + document preview hosts |

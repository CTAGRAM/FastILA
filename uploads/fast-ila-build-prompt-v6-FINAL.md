# Build Prompt: Fast-ILA Custom Appointment Booking System & Internal Lawyer Tool

**Version:** Final (v6)
**Operator:** Go Legal Services Limited (trading as Fast-ILA)
**Domains:** `fast-ila.co.uk` and `fast-ila.com`

---

## Project Brief

Build a custom WordPress-integrated appointment booking platform and internal case-management tool for **Fast-ILA**, a trading name of **Go Legal Services Limited**. Fast-ILA provides **Independent Legal Advice (ILA)** on a **fixed-fee** basis. The system must function as a "Calendly on steroids" tailored to a UK multi-lawyer law firm, with an internal back-office that manages the full client journey — from booking through to wet-signature document dispatch via Royal Mail.

This is **not** a wrapper around an existing booking plugin. Build it as a custom plugin (or headless app + WordPress plugin bridge) so we fully own the code, data, and roadmap.

**Data controller:** Go Legal Services Limited (this is the entity named in privacy notices, ICO registration, processor agreements, and all GDPR-related comms).

---

## 1. Architecture & Stack Requirements

- **Front-end booking UI:** Embeddable in WordPress via (a) shortcode, (b) Gutenberg block, (c) Elementor-compatible widget, and (d) standalone iframe for both `fast-ila.co.uk` and `fast-ila.com`.
- **Back-end:** Decoupled REST/GraphQL API so the booking UI, lawyer dashboard, and admin dashboard all consume the same endpoints. Recommend Laravel or Node.js (NestJS) + PostgreSQL, or a custom WordPress plugin using a separate prefixed DB schema if a fully integrated approach is preferred. State your reasoning.
- **Authentication:** Secure login with role-based access control (RBAC), MFA optional for admins, password reset flow, session management.
- **Hosting:** UK-based, GDPR-compliant, data residency in the EU/UK.
- **Multi-domain:** A single back-end serves both `fast-ila.co.uk` and `fast-ila.com`, tracking which domain each booking originated from.

---

## 2. Service Catalogue & Pricing ⭐ (Drives the booking UI)

The front-end presents **exactly these four services**, in this order. All client-facing prices are **VAT-inclusive, rounded UP to the nearest £5** — chosen this way so the client always sees one clear, tidy number with no maths to do and no "+ VAT" surprises at checkout. Rounding direction is always **up**, never down, so margin is never given away.

### Client-facing prices (what the user sees)

| # | Live name (as shown to client) | **Price (inc. VAT)** | Duration | Badge |
|---|---|---|---|---|
| 1 | **Urgent / Same-Day ILA Booking** | **£175** | 1 hour | Fastest Service |
| 2 | **ILA – Standard Appointment** | **£145** | 45 minutes | Most Popular |
| 3 | **ILA for Couples / Joint Signatories** | **£250** | 1 hour | Best Value |
| 4 | **Wet Signature / Weekend** | **£200** | 1 hour | Includes Postage |

### ⚠️ Compliance change from the original screenshots — please read

The current live booking page uses "10% OFF" and "30% OFF" tags. **These must not be carried forward into the new build** unless a genuine higher reference price (`price_was`) is recorded in the system and was actually in force recently.

Under the **Digital Markets, Competition and Consumers Act 2024** and the **CMA's Price Reduction Promotions guidance (October 2024)**, showing "X% OFF" implies a genuine discount from a higher recent price. Using percentage-off badging purely as a conversion device, with no real "was" price behind it, is a misleading commercial practice. Penalties: up to **10% of global turnover** under DMCCA; additional SRA risk for misleading advertising by a regulated firm.

The new build therefore uses **non-comparative badges** (Fastest Service, Most Popular, Best Value, Includes Postage) which describe a real attribute rather than imply a saving. These are safe.

If Go Legal Services Limited's compliance lead wants to retain percentage-off tags, that decision must be recorded in writing alongside a documented reference price for each service that was genuinely in force within the previous 30 days, per CMA guidance.

### Internal accounting figures (what the system stores)

The database stores the **gross** as the canonical, customer-facing number, and back-calculates the **net** for accounting and the VAT invoice. UK VAT at 20%.

| Service | Gross (charged) | Net (back-calculated) | VAT (back-calculated) |
|---|---|---|---|
| Urgent / Same-Day | £175.00 | £145.83 | £29.17 |
| ILA – Standard | £145.00 | £120.83 | £24.17 |
| ILA for Couples | £250.00 | £208.33 | £41.67 |
| Wet Signature / Weekend | £200.00 | £166.67 | £33.33 |

### Pricing rules — non-negotiable
- The **price card on the booking page always shows the gross figure only** (e.g. *"£175"*, *"£145"*) — never "£X + VAT".
- Do **not** display "+ VAT" or a separate VAT line **anywhere on the booking flow** — that's the whole point of moving to rounded inclusive pricing.
- The VAT breakdown appears **only on the formal VAT invoice PDF** (HMRC compliance — net, VAT, gross).
- Gross prices are stored to two decimal places in the database for accounting accuracy, even though the UI only ever shows the rounded whole-pound figure.

### Service catalogue schema

```
services
├── id
├── slug                    (urgent-same-day, ila-standard, ila-couples, wet-signature-weekend)
├── display_name            (the live name above)
├── price_gross             (decimal — the canonical price, e.g. 175.00)
├── vat_rate                (decimal, default 0.20)
├── price_net               (computed — price_gross / (1 + vat_rate), stored for accounting)
├── price_vat               (computed — price_gross - price_net, stored for accounting)
├── duration_minutes        (60 | 45 | 60 | 60)
├── min_notice_hours        (configurable; 2 for Urgent, 48 for others)
├── attendee_count          (1 | 1 | 2 | 1)
├── requires_wet_signature  (bool — true for Wet Signature service)
├── available_weekends      (bool — true for Wet Signature; weekday and weekend availability)
├── badge_label             (string, nullable — "Fastest Service", "Most Popular", etc.)
├── badge_visible           (bool)
├── sort_order              (int)
├── active                  (bool)
└── price_version_id        (FK — every price change creates a new version row; bookings reference the version they paid)
```

A booking always references the **price snapshot at the time of booking**, so historical reports remain accurate if prices change.

---

## 3. Booking System — Client-Facing (Front End)

The flow matches the live screenshots: **three screens, mobile-first, no account creation.**

### Header (persistent across all three screens)
- Title: **"Select from 4 ILA Services"** (configurable in admin).
- Back arrow on screens 2 and 3.

### Screen 1 — Select service
- Vertical stack of four cards, in the order in Section 2.
- Each card shows: **name (gross price) [badge]** on one line, then **duration** below.
  - Example: `ILA – Standard Appointment (£145) 🏷 Most Popular` / `45 minutes`
- No "+ VAT" anywhere on this screen.
- Whole card is tappable — no separate "Select" button.
- Above the four cards, a primary CTA: **"Book the earliest available slot"** — auto-routes the user to whichever service has the soonest qualifying slot (typically Urgent if it's same-day; Standard otherwise). The client can override on screen 2.

### Screen 2 — Select a date and lawyer
- "Back" button top-left.
- Heading: **"Select a date"**.
- Month-grid calendar (Mon–Sun) matching the screenshot.
  - Disabled dates: past dates, dates with no availability, and dates inside the service's `min_notice_hours`.
  - **Weekend availability:** Wet Signature / Weekend is available **weekdays and weekends**. Other services follow per-lawyer working hours (typically weekdays only, but admin-configurable).
  - Tap on a date → reveals available time slots in a panel below.
- Two tabs above the calendar:
  - **"Earliest available"** (default) — surfaces the next 10 available slots across **all qualified lawyers**, soonest first. Each slot shows date, time, and lawyer name + photo.
  - **"Pick a specific lawyer"** — lawyer grid (photo, name, languages spoken, next-available time). Selecting a lawyer filters the calendar to their availability.
- Calendar respects:
  - Service `min_notice_hours`.
  - Lawyer working hours, holidays, blocked dates.
  - Two-way Google Calendar **and** Microsoft Outlook sync for real-time busy slots.
  - Buffer time before/after appointments.
  - Per-lawyer daily booking cap.
- Timezone: **Europe/London** displayed clearly, auto-detected with override.

### Screen 3 — Your details
- "Back" button top-left.
- Confirmation strip at the top: **"You are booking: [Service name] ([gross price]) [badge]"** followed by the selected date, time range, and timezone (e.g. *1 August 2026 18:00 – 18:45 Europe/London*).
- Note line: **"Google Meet video conference info added after booking"** (or "Microsoft Teams" if the lawyer uses Outlook).
- Form fields (matching the live screenshot, with additions as needed per service):
  - **Name** *(required)*
  - **Email** *(required)*
  - **Phone** *(required, with UK flag default and international picker)*
  - **Lender** *(optional, free text)*
  - Conditional fields appended below "Lender" depending on service:
    - **ILA for Couples / Joint Signatories:** second signatory's name, email, phone, relationship to primary. *(No live joint-call required — the second signatory is handled via the automated Zapier-driven email + witness statement workflow described in Section 8.)*
    - **Wet Signature / Weekend:** postal address for the signed documents (defaults to client's address, editable; option "Send directly to lender/solicitor" with their address fields).
  - **Legal issue summary** (optional, single free-text field).
  - **Consent checkboxes** (required, stored with timestamp + IP):
    - Terms & conditions
    - Privacy policy / GDPR (data controller: **Go Legal Services Limited**)
    - Google Meet recording consent
    - Google Meet transcription consent
- A short cancellation policy line beneath the consent block: **"Cancellations and reschedules must be made at least 24 hours before your appointment to be eligible for a refund or rebooking. Cancellations inside 24 hours are non-refundable."**
- Primary CTA: **"BOOK THIS APPOINTMENT"** (full-width, brand navy, white text — matches screenshot).
- On submit → Stripe payment sheet showing the same gross figure (no VAT line) → booking confirmation page → booking reference issued (`FI-2026-00481`) → confirmation email + SMS dispatched → Google Meet / Teams link generated.

### Self-service for clients (post-booking)
- **Self-reschedule link** (token-secured, expires after appointment) — only operates outside the 24-hour cancellation window. Inside 24 hours the link displays a "Contact us" message rather than silently failing.
- **Self-cancellation link** (token-secured) — same 24-hour rule. Inside the window, system records cancellation but does **not** trigger a refund; admin must process manually if a goodwill refund is agreed.
- Wet Signature ILA: token-secured tracking page showing dispatch status once posted.

### Calendar & meeting integration
- Google Calendar **and** Microsoft Outlook two-way sync per lawyer.
- Automatic Google Meet link (or Teams link for Outlook-based lawyers).
- Calendar invites to: client, lawyer, admin mailbox (optional per service).
- Meet link in: calendar invite, client confirmation email, lawyer dashboard.
- Phone consultation as an alternative — selectable on Screen 2 where a slot supports it.
- Configurable rule: option to withhold the Meet link until payment is confirmed (auto-released when status flips to `paid` or `waived`). For Fast-ILA, payment is taken upfront at booking, so this is a fallback for admin-created bookings.

---

## 4. Payment Handling

- **Stripe (UK)** as the default gateway, abstracted so GoCardless or others can be added later.
- Payment taken **upfront** at the point of booking.
- Apple Pay / Google Pay enabled.
- The amount charged is the **gross figure exactly as displayed** (£175 / £145 / £250 / £200).
- Status per booking: `unpaid`, `pending`, `paid`, `waived`, `refunded`, `partially_refunded`.
- **VAT handling:**
  - The booking flow never shows a separate VAT line.
  - On payment, the system back-calculates net and VAT from the gross at 20% (e.g. £175 gross → £145.83 net + £29.17 VAT) and stores both against the booking.
  - The **VAT invoice PDF** generated on payment shows the formal HMRC breakdown: net, VAT rate, VAT amount, gross. This is the only place the VAT split appears to the client.
  - VAT invoices are issued in the name of **Go Legal Services Limited** with its company number and VAT number.
  - Receipt email attaches the VAT invoice PDF and states the total paid as the gross figure.
- **Cancellation and refund rules** (codified in the system):
  - More than 24 hours before appointment: full refund eligible, processed via Stripe API.
  - Inside 24 hours of appointment: non-refundable by default. Admin can override with a "goodwill refund" action that is captured in the audit log with a reason.
  - No-show: non-refundable.
  - The 24-hour rule is enforced by the self-cancellation link (it disables itself inside the window) and surfaced in the cancellation confirmation email.
- Manual admin actions: **"Mark payment confirmed"**, **"Mark payment waived"**, **"Issue refund (full / partial / goodwill)"** — reason field captured for audit log.
- Payment reminder email + SMS with delivery status tracking (primarily for admin-created bookings).

---

## 5. Internal Tool — Lawyer & Admin Back Office

### Dashboards
- **Admin dashboard** — full visibility of all lawyers, bookings, payments, signatures, reports.
- **Lawyer dashboard** — only their own bookings, clients, notes, recordings, transcripts, signature tasks.
- Internal dashboards **do** show net / VAT / gross breakdown (lawyers and admins need this for accounting), even though the client-facing UI never does.
- Standard views: Today's appointments, Upcoming, Past, **Outstanding signatures**, **Ready to post**, **Posted awaiting delivery**, Outstanding payments, **Inside 24-hour cancellation window** (highlights bookings where a no-show would forfeit the fee).

### Appointment management
- Admin manual booking creation (on behalf of a client) — can override `min_notice_hours` with an audit-logged reason.
- Admin manual rescheduling.
- Status tracking: `scheduled`, `completed`, `no-show`, `cancelled`, `rescheduled`.
- Outcome tracking per appointment (ILA given, further info needed, declined, unsuitable).
- No-show, cancellation, reschedule logs with reasons and timestamps.
- Notes: **client-facing**, **internal admin**, **lawyer** — clearly separated, RBAC-controlled.

### Call recording & AI summaries
- Google Meet recording capture and storage (or link-through to Drive).
- Google Meet transcript capture.
- **AI-generated transcript summary** — **provider: OpenAI** (e.g. GPT-4o or current equivalent). System prompt produces: key facts, advice given, risks flagged, action items.
  - Data flow: Meet transcript → OpenAI API → summary stored back in the booking record.
  - Note in privacy policy and consent text that AI processing of transcripts is performed via OpenAI (US-based processor with appropriate transfer mechanism — Standard Contractual Clauses + UK addendum).
  - API key managed in admin settings; rate-limit handling and error fallback (manual summary if API fails).
- **Lawyer-approved call summary** workflow — AI drafts → lawyer edits → lawyer approves → summary locked + timestamped for audit log.
- Follow-up task creation from summary (assign to lawyer or admin, due date).
- Post-call email trigger ("Thanks for your consultation, here's your summary…").
- Client feedback / review request trigger (configurable delay).

---

## 6. Wet-Signature & Royal Mail Tracking Workflow ⭐

Triggered automatically when the booked service is **Wet Signature / Weekend** (the £200 inc. VAT service that includes Royal Mail postage as a disbursement). Can also be flagged manually on any other booking if a lawyer decides a wet signature is needed.

**Tracking entry is manual** — lawyers/admin type the Royal Mail tracking number into the system after posting. There is **no Royal Mail API integration** in scope. (If the Royal Mail Tracking API is added later, it slots in behind the same interface; not required for v1.)

### Per-booking signature record

```
signature_requirements
├── booking_id
├── signature_required             (bool — auto-true for Wet Signature service)
├── signature_type                 (wet | electronic | not_required)
├── documents_to_sign              (list of name + file attachment)
├── recipient_address              (postal address for the dispatch)
├── dispatch_status                (state machine — see below)
├── royal_mail_tracking_number     (validated format, manually entered)
├── royal_mail_service             (Signed For 1st Class | Special Delivery 1pm | Tracked 24 | Tracked 48 | International Tracked & Signed)
├── posted_at                      (auto-stamped on tracking entry)
├── posted_by                      (user ID)
└── tracking_locked                (bool — true after first save, admin can override with audit)
```

### Dispatch status state machine
`not_started` → `awaiting_signature` → `signed` → `ready_to_post` → `posted` → `delivered` → `returned_undelivered`

(`delivered` and `returned_undelivered` are set **manually** by admin in v1, since there is no Royal Mail API polling.)

### When the tracking number is saved, the system automatically:
1. Locks the tracking number against further edits (admin override permitted, audited).
2. Sets `dispatch_status` to `posted` and stamps `posted_at` + `posted_by`.
3. **Sends an email** to the client with: the tracking number, the Royal Mail tracking URL (`https://www.royalmail.com/track-your-item#/tracking-results/{tracking_number}`), the service used, the recipient, expected delivery window.
4. **Sends an SMS** to the client with a short version and a tap-to-track link.
5. Writes to the audit log (user, timestamp, IP, before/after values).
6. Fires the `documents.posted` webhook (consumed by Zapier).

### Reporting queues
- Outstanding signatures (oldest first).
- Ready to post.
- Posted-but-not-marked-delivered (more than N days since posting — admin-set, default 5 — prompts admin to check Royal Mail manually and update).
- Returned undelivered (requires admin action).

---

## 7. Communications

- Email template management (WYSIWYG, merge fields, per-template enable/disable).
- SMS template management (160-char awareness, merge fields).
- **SMS delivery:** routed via **Twilio through Zapier** (not a direct Twilio integration in v1). The system fires the appropriate webhook (e.g. `booking.created`, `documents.posted`), and a Zap on Go Legal Services Limited's Zapier account picks it up and sends the SMS via Twilio. Sender ID is configured on the Twilio account, not in this system.
- Reminder schedule (global default + per-service override).
- Templates needed at minimum:
  - Booking confirmation (email + SMS) — service-specific copy, shows gross amount paid only
  - Appointment reminder (email + SMS) — 24h and 1h before
  - VAT invoice email (with PDF — the only client comm showing the VAT breakdown)
  - Reschedule confirmation
  - Cancellation confirmation — includes the 24-hour policy reminder
  - Post-call summary
  - Feedback / review request
  - **Documents posted with Royal Mail tracking** (email + SMS) ⭐
  - Signature outstanding chase
  - **Second signatory instructions + witness statement** (ILA for Couples) — fired via Zapier; this system provides the trigger and merge data only
- Email provider: Postmark or SendGrid (default, integrated directly).

---

## 8. Integrations & Webhooks

All third-party automation flows through **Zapier** — Go Legal Services Limited's existing Zapier account is the orchestrator. This system's job is to fire the right webhooks at the right time with the right data; Zapier handles the downstream actions (SMS, second-signatory workflow, CRM sync, etc.).

### Zapier actions consumed
- Create/update CRM contact
- Send SMS (via Twilio)
- Send email (where bespoke routing is needed)
- Update payment status
- Notify admin
- Create internal task
- **Send ILA for Couples second-signatory instructions + witness statement automation**

### Outgoing webhooks
- `booking.created`
- `booking.rescheduled`
- `booking.cancelled`
- `appointment.completed`
- `appointment.no_show`
- `payment.status_changed`
- `payment.reminder_sent`
- `documents.posted` ⭐
- `couples.second_signatory_required` — fires immediately on a successful ILA for Couples booking, carries the second signatory's name, email, phone, and the booking reference so Zapier can route the instructions and witness statement.

Generic CRM integration option available via the same webhook layer.

---

## 9. Tracking, Reporting & Audit

- **Booking source tracking** — `fast-ila.co.uk` vs `fast-ila.com`, plus UTM / Google Ads campaign source.
- **Reports** (date-range filtering, CSV export):
  - Bookings by lawyer
  - Bookings by service — revenue breakdown showing net + VAT + gross columns (internal only)
  - Cancellations (including inside vs outside 24-hour window)
  - No-shows
  - Goodwill refunds issued
  - Payment reminders
  - Signature & dispatch ⭐
  - Conversion funnel (visit → booking → completed → signed → posted)
- **Audit log** — every status change, manual override, payment change, refund, tracking-number entry, summary approval, and admin login captures: user, timestamp, IP, before/after values.
- **Data retention** — configurable per data category, defaulting to **6 years** to align with SRA record-keeping expectations. Controller: Go Legal Services Limited.
- Export bookings to CSV.

---

## 10. Roles & Security

- Roles: `super_admin`, `admin`, `lawyer`, `paralegal/assistant`, `viewer`.
- RBAC on every endpoint and UI surface.
- Per-lawyer data isolation — lawyer sees only their own clients unless granted broader access.
- Encryption at rest for PII and document attachments.
- TLS 1.2+ in transit.
- File uploads virus-scanned.
- Alerting on: Google/Outlook calendar sync errors, failed webhooks (especially Zapier-bound), failed SMS/email, OpenAI API failures — admin notified by email and dashboard banner.

---

## 11. Deliverables

1. **Technical specification** covering schema, API endpoints, auth flow, calendar sync logic, OpenAI integration, Zapier webhook contract, and the Royal Mail dispatch workflow as a sequence diagram.
2. **WordPress plugin** (or plugin + companion app) for one-click install on `fast-ila.co.uk` and `fast-ila.com`.
3. **Booking UI** — responsive, accessible (WCAG 2.2 AA), branded; the three-screen flow described in Section 3, visually matching the existing live booking pages.
4. **Admin dashboard** and **Lawyer dashboard** as described.
5. **API documentation** (OpenAPI/Swagger).
6. **Test suite** — unit + integration; explicit coverage of: calendar sync, the `min_notice_hours` rule per service, gross-to-net VAT back-calculation accuracy, the 24-hour cancellation rule, the wet-signature dispatch workflow, and webhook payload contracts.
7. **Privacy policy and consent copy review** prepared for sign-off by Go Legal Services Limited's compliance lead (data controller naming, OpenAI processor disclosure, recording/transcription consent, retention period).
8. **Deployment guide**, **admin user guide**, **lawyer user guide**.
9. **Roadmap** for: Royal Mail Tracking API live polling, Microsoft Teams parity with Google Meet, client portal expansion, direct Twilio integration (removing Zapier as the SMS broker if desired later).

---

## 12. Build Approach — Instructions for the Implementer

1. Produce the technical spec and confirm the data model with us **before** writing code. Schema sign-off required for `Booking`, `Service`, `Lawyer`, `SignatureRequirement`, `PaymentRecord`, `CommunicationLog`, `AuditLog`.
2. Build order: auth & roles → service/lawyer/availability admin → booking flow (front-end) → calendar sync → payments + VAT back-calc → cancellation rules → comms + Zapier webhooks → wet-signature/Royal Mail workflow → OpenAI summaries → reporting.
3. Every external integration (Stripe, Postmark/SendGrid, Google, Microsoft, OpenAI, Zapier) sits behind an interface so it can be swapped without touching business logic. **Twilio is reached via Zapier**, so this system has no direct Twilio code — but the webhook contract must be stable so the Zap doesn't break.
4. The wet-signature + Royal Mail tracking workflow is a **first-class feature**, not an add-on — it carries Fast-ILA's operational risk and the audit trail must be watertight.
5. The Service Catalogue (Section 2) drives the front end. Do not hardcode the four services; build the UI from the `services` table.
6. **The client never sees "+ VAT" or a separate VAT line on the booking flow.** The four gross prices (£175 / £145 / £250 / £200) are the only money figures shown. The VAT split lives on the invoice PDF and in internal reports. Prices are always rounded **up** to the nearest £5 when set or revised — never down.
7. **Badges are non-comparative** (Fastest Service / Most Popular / Best Value / Includes Postage), per the compliance reasoning in Section 2. Do not reintroduce "% OFF" tags without a documented `price_was` and a written sign-off from Go Legal Services Limited's compliance lead.
8. Cancellation policy is a 24-hour hard rule — codify it in the schema (`booking.cancellation_deadline_at = appointment_start - 24h`), the self-service links, the admin override flow, and every confirmation/cancellation email.
9. Visually match the existing booking page (clean, navy + white, single-column, mobile-first) — see reference screenshots.
10. Flag any feature where UK regulatory considerations (SRA, ICO/GDPR, consumer distance-selling, CMA price-reduction guidance) need legal review before launch.

---

## 13. Confirmed Decisions (formerly open questions)

| Question | Decision |
|---|---|
| Data controller | **Go Legal Services Limited** — named in privacy policy, ICO registration, processor agreements, VAT invoices, and consent copy. |
| Royal Mail Tracking API | **Not in scope for v1.** Lawyers/admin enter tracking numbers manually. API integration kept as a feature-flagged roadmap item. |
| LLM provider for AI summaries | **OpenAI.** Disclosed in the privacy policy as a US-based processor with SCCs + UK addendum. Transcripts processed outside the UK/EU is acceptable subject to that disclosure. |
| SMS provider | **Twilio via Zapier.** This system fires webhooks; the Zap sends the SMS. No direct Twilio integration in v1. Sender ID configured on the Twilio account. |
| Cancellation / refund policy | **24-hour rule.** Cancellations made 24+ hours before the appointment are fully refundable. Inside 24 hours: non-refundable, but admin may issue a goodwill refund (audit-logged). No-shows: non-refundable. |
| ILA for Couples — joint live call required? | **No.** Second signatory handled via automated email instructions and a witness statement, sent through Zapier. This system fires `couples.second_signatory_required` with the second signatory's details; Zapier handles the rest. |
| Wet Signature / Weekend availability | **Weekdays AND weekends.** Set `available_weekends = true`; calendar logic permits Saturday and Sunday slots for this service in addition to weekdays. |
| Discount tags (10% OFF / 30% OFF) | **Removed.** Replaced with non-comparative badges (Fastest Service, Most Popular, Best Value, Includes Postage) to comply with the DMCCA 2024 and CMA Price Reduction Promotions guidance. Reintroducing percentage-off badging requires a documented `price_was` and written sign-off from the compliance lead. |

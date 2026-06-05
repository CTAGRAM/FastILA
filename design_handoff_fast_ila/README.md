# Handoff — Fast-ILA appointment booking system

This package contains a complete, working **HTML/React design prototype** for the Fast-ILA platform — a custom appointment booking, client portal, e-signing, and internal practice-management system for Independent Legal Advice. The prototype demonstrates every screen, every interaction, every state and every workflow the lawyers and clients will use.

---

## About the design files

The files in `source/` are **design references**, not production code. They are written as React + Babel + plain CSS, loaded by a single `index.html`, with `localStorage` standing in for a database. They were built to settle UX, copy, layout, data model, state machines and integration touch-points — **not** to be deployed as-is.

The task is to **recreate this prototype in a production stack** of your choice. The design and behaviour are settled; you decide the framework, hosting and persistence.

### Recommended target stack

This is a strong fit for **Next.js (App Router) + TypeScript + Postgres + Prisma + Tailwind + shadcn/ui**, hosted on **Vercel + Supabase or Render + Neon**. Reasons:

- The prototype's component boundaries map cleanly onto Next.js Server / Client components.
- The data model (clients, bookings, lawyers, lenders, brokers, signatures, audit log) is relational and benefits from Postgres + Prisma.
- The visual system is utility-first friendly — Tailwind tokens map 1:1 to the CSS custom properties already defined in `tokens.css`.
- File uploads (KYC, matter docs, signed PDFs) go to S3 / Cloudflare R2 via signed URLs.

If you prefer Remix, Rails, Laravel or anything else with similar capabilities, fine. The decisions to lock are:

1. **One framework**, not a hybrid.
2. **Server-rendered** so SEO works on the public booking page.
3. **Strong type safety** (TypeScript or equivalent).
4. **A real ORM** (Prisma, Drizzle, ActiveRecord) — not raw SQL strings.
5. **Background job runner** for webhooks / email / SMS (Inngest, Trigger.dev, or a simple BullMQ on Redis).

---

## Fidelity

**High-fidelity.** All colours, type, spacing, copy, micro-interactions and edge cases are settled in the prototype. Recreate it pixel-for-pixel. The brand wordmark, navy + lime + cream palette, Sora + Inter typography and rounded button + card shapes are deliberate.

If you find a screen where something feels under-specified, open the prototype, perform the interaction, and copy that behaviour — that screen is the spec.

---

## How to run the prototype

```bash
# inside the source/ folder
npx serve .
# then open http://localhost:3000/index.html
```

Or open `source/index.html` directly in a browser. No build step.

To test:

1. **Public booking** — `index.html` opens on the booking flow. Pick service → date → time → details → confirm.
2. **Client portal** — click the "Client portal" tab in the top switcher. Sign in with any email (mock auth). Walk through all 8 steps in order.
3. **Internal dashboard** — click "Internal dashboard" tab. Sign in as Admin (email = `karim@nexalaw.com`) or Lawyer. Explore every sidebar entry.
4. **⌘K** anywhere in the dashboard opens global search.

The Tweaks panel (bottom-right) toggles between booking variations and the embedded vs standalone widget.

---

## The three product surfaces

The system has **three distinct surfaces**. They share data but are different apps in practice.

### 1. Public booking flow (`fast-ila.co.uk/book`)

3-step funnel. No login required.

- **Step 1 · Service** — 4 services: Urgent Same-Day (£175), ILA Standard (£145), ILA for Couples (£250, includes postage), Wet Signature / Weekend (£200, includes postage). Live in `data.jsx` as `SERVICES`.
- **Step 2 · Date & time** — month calendar with red/amber/green availability dots + time-of-day list. "Earliest available" tab shows 5 next slots across all lawyers. "Specific lawyer" tab shows lawyer cards (no SRA numbers — front-facing) → calendar.
- **Step 3 · Details** — Name, email, phone, lender (optional). Conditional fields for Couples (second signatory name + email) and Wet Sig / Couples (postage details: who to post to + postal address). Legal issue summary (optional). **No payment at booking** — slot is held; client receives a care letter with payment details by email after booking.
- **Confirmation screen** — "You're booked in" + 4-step preview of what happens next + **prominent navy "Continue to portal" CTA** (the user is logged into their portal automatically).

### 2. Client portal (`portal.fast-ila.co.uk`)

A linear, locked-step flow. Clients cannot skip steps. Each step shows a lock icon until the prior one is complete.

Steps in order (all in `client-portal.jsx`):

1. **Sign client care letter** (multi-signatory: 1–6 directors can each sign, with print name + date)
2. **Upload ID & address** (photo ID + proof of address per signatory; supports 4+ directors)
3. **Pay by bank transfer** (we show Nexa Law's client account + reference; client clicks "I've paid")
4. **Upload matter documents** (PG, loan offer, etc — feeds the lawyer's pre-call brief)
5. **Attend Google Meet** (auto-generated link, photo ID required; embedded explainer videos with watched-tracking in localStorage)
6. **Sign declaration** (post-call: matter-specific tick list + 5 declaration confirmations + signed by client; locks until everything ticked)
7. **Sign & receive ILA certificate** (lawyer's e-sign envelope opens; usually lawyer-only-signed)
8. **Quick feedback** (3-question NPS-style; promoters routed to Google review, detractors flagged to admin)

The portal footer makes the entity split clear:
> **Fast-ILA** is the platform, owned by Go Legal Services Ltd (all IP). Legal services are provided by panel solicitors at **Nexa Law Ltd** (SRA No. 524963).

### 3. Internal dashboard (`console.fast-ila.co.uk`)

Login gate first: **Lawyer** (Google/Microsoft SSO) or **Admin** (single email — currently `karim@nexalaw.com`).

**Lawyer sidebar:**
- Today
- Upcoming
- My bookings
- My signatures (digital + wet, split view)
- Lender guide (read-only)
- My profile (saved signature)

**Admin sidebar (Karim only):**
- Today (across all lawyers)
- All bookings
- Booking detail
- Royal Mail queue
- Lawyers
- Templates (firm-wide docs)
- Lender guide (editable)
- Brokers (referral panel + mailings)
- AI prompts (editable Claude system prompts)
- Integrations (N8N + APIs)
- Reports & revenue

Plus a floating AI chat assistant (Claude-backed, role-scoped) and ⌘K global search.

---

## Visual system (design tokens)

From `tokens.css` — implement these as Tailwind theme extension or CSS custom properties.

### Colours

| Token | Value | Use |
|---|---|---|
| `--navy-900` | `#042b3d` | Brand primary, ink |
| `--navy-800` | `#063952` | Headers, buttons |
| `--navy-700` | `#0a4a67` | Hover states |
| `--lime` | `#d7ed3f` | Brand accent, primary CTAs |
| `--lime-hover` | `#c7dd2a` | Lime hover |
| `--lime-deep` | `#aac220` | Lime borders |
| `--cream` | `#f8f5c2` | Highlights, badges |
| `--cream-tint` | `#fefcea` | Subtle backgrounds |
| `--off-white` | `#f7f6f1` | Page background |
| `--paper` | `#fbfaf6` | Panel backgrounds |
| `--ink` | `#042b3d` | Body text |
| `--ink-soft` | `#2b4d5e` | Secondary text |
| `--ink-muted` | `#6b8190` | Tertiary text |
| `--ink-faint` | `#95a8b5` | Placeholder text |
| `--hairline` | `#dee5ea` | Borders |
| `--success` | `#2f8b5b` | Confirmed states |
| `--warning` | `#c47a17` | Pending / attention |
| `--danger` | `#c0402d` | Errors |
| `--info` | `#1f7497` | Info states |

### Type

- **Display (`--font-display`)**: `"Sora"`, weights 500–800, letter-spacing −2%
- **UI (`--font-ui`)**: `"Inter"`, weights 400–700
- Body: 15px / 1.5
- Display sizes: 28px (h2), 22px (panel title), 16–18px (subtitle)

### Spacing & radii

- Radii: 6 / 8 / 12 / 18 / 24 / 999px
- Card radius: 12px
- Button radius: 8–12px
- Pills: 999px

### Shadows

- `--shadow-sm`: 1px elevation
- `--shadow-md`: 4px elevation, hover
- `--shadow-lg`: 18px elevation, modals
- `--shadow-pop`: 24px elevation, sticky panels

---

## Data model

A relational schema that maps directly to what the prototype reads + writes. Use Prisma / Drizzle / equivalent.

```prisma
model Lawyer {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String
  sraNumber     String
  initials      String
  bio           String?
  languages     String[]
  photoUrl      String?
  rating        Float?
  reviews       Int      @default(0)
  bookingsToday Int      @default(0)
  signatureUrl  String?         // saved e-sign — per lawyer
  services      String[]        // service ids they offer
  dailyCap      Int      @default(6)
  bufferBefore  Int      @default(15) // mins
  bufferAfter   Int      @default(15)
  bookings      Booking[]
  blockedDates  BlockedDate[]
}

model Service {
  id              String   @id            // "urgent" | "standard" | "couples" | "wet"
  slug            String   @unique
  name            String
  short           String
  price           Decimal
  duration        Int                       // minutes
  minNoticeHours  Int
  attendeeCount   Int
  delivery        String                    // "digital" | "postal"
  badge           String?
  weekends        Boolean  @default(false)
}

model Booking {
  id                 String   @id @default(cuid())
  ref                String   @unique       // internal only, never shown to client
  clientName         String
  clientEmail        String
  clientPhone        String
  lender             String?
  legal              String?                // legal issue summary
  serviceId          String
  service            Service  @relation(fields: [serviceId], references: [id])
  lawyerId           String
  lawyer             Lawyer   @relation(fields: [lawyerId], references: [id])
  date               DateTime                 // appointment date
  time               String                   // "14:00"
  status             String   @default("scheduled")
  payment            String   @default("pending")
  amount             Decimal
  source             String                   // "fast-ila.co.uk" | "fast-ila.com" | "manual"
  brokerId           String?                  // referral attribution
  // Couples / multi-sig
  secondSignatory    String?
  secondEmail        String?
  extraSignatories   Json?                    // array of {name, email}
  // Postage
  postRecipient      String?                  // "client" | "lender"
  postAddress        String?
  // Wet sig dispatch
  dispatch           String?                  // awaiting_signature | signed | ready_to_post | posted | delivered
  trackingNumber     String?
  trackingService    String?
  postedAt           DateTime?
  documents          Document[]
  signatures         Signature[]
  notes              MatterNote[]
  feedback           Feedback?
  auditLog           AuditEvent[]
}

model Document {
  id          String   @id @default(cuid())
  bookingId   String
  booking     Booking  @relation(fields: [bookingId], references: [id])
  kind        String                          // "ccl" | "kyc-id" | "kyc-address" | "matter" | "cert" | "declaration"
  signatoryId String?
  filename    String
  storageUrl  String                          // S3 / R2 signed URL
  sizeBytes   Int
  mimeType    String
  uploadedBy  String                          // "client" | "lawyer:<id>" | "admin"
  uploadedAt  DateTime @default(now())
  signed      Boolean  @default(false)
  signedAt    DateTime?
  ipAddress   String?
}

model Signature {
  id           String   @id @default(cuid())
  bookingId    String
  booking      Booking  @relation(fields: [bookingId], references: [id])
  signatoryName String
  printName    String
  signedAt     DateTime @default(now())
  ipAddress    String
  signatureUrl String                       // PNG data URL stored separately
  context      String                       // "ccl" | "declaration" | "cert" | "matter-doc"
  documentId   String?
}

model Lender {
  id              String   @id              // "shawbrook" | "together" | etc
  name            String
  signatureType   String                    // "digital" | "wet" | "both"
  notes           String?
  sla             String?
  quirks          String?
  certEmail       String?
  phone           String?
  postalAddress   String?
  typicalMatters  String[]
  templates       LenderTemplate[]
  updatedAt       DateTime @updatedAt
  updatedBy       String
}

model LenderTemplate {
  id          String   @id @default(cuid())
  lenderId    String
  lender      Lender   @relation(fields: [lenderId], references: [id])
  name        String
  version     String
  storageUrl  String
  sizeBytes   Int
  updatedAt   DateTime @updatedAt
}

model Broker {
  id              String   @id @default(cuid())
  name            String
  firm            String?
  email           String   @unique
  phone           String?
  tier            String                    // "platinum" | "gold" | "silver" | "bronze"
  notes           String?
  subscribed      Boolean  @default(true)
  referralsTotal  Int      @default(0)
  referrals30     Int      @default(0)
  lastReferralAt  DateTime?
  addedAt         DateTime @default(now())
  bookings        Booking[]
}

model Mailing {
  id          String   @id @default(cuid())
  subject     String
  body        String   @db.Text
  audience    Json                          // {kind, tiers, ids}
  sentAt      DateTime @default(now())
  recipients  Int
  opened      Int      @default(0)
  clicked     Int      @default(0)
}

model BlockedDate {
  id        String   @id @default(cuid())
  lawyerId  String
  lawyer    Lawyer   @relation(fields: [lawyerId], references: [id])
  date      DateTime
  reason    String?                        // "holiday" | "training" | "other"
  @@unique([lawyerId, date])
}

model FirmAsset {
  id        String   @id                   // "stamp" | "letterhead"
  url       String
  updatedBy String
  updatedAt DateTime @updatedAt
}

model AiPrompt {
  id        String   @id                   // "brief" | "chat"
  body      String   @db.Text
  updatedBy String
  updatedAt DateTime @updatedAt
  history   AiPromptHistory[]
}

model MatterNote {
  id         String   @id @default(cuid())
  bookingId  String
  booking    Booking  @relation(fields: [bookingId], references: [id])
  scope      String                        // "client" | "admin" | "lawyer"
  body       String   @db.Text
  authorId   String
  updatedAt  DateTime @updatedAt
}

model Feedback {
  id            String   @id @default(cuid())
  bookingId     String   @unique
  booking       Booking  @relation(fields: [bookingId], references: [id])
  nps           Int                        // 0–10
  clarity       Int                        // 1–4
  comment       String?  @db.Text
  submittedAt   DateTime @default(now())
  promoter      Boolean                    // derived: nps >= 9
}

model AuditEvent {
  id         String   @id @default(cuid())
  bookingId  String?
  booking    Booking? @relation(fields: [bookingId], references: [id])
  actorType  String                        // "lawyer" | "admin" | "client" | "system"
  actorId    String?
  action     String                        // dot.notation: "tracking.set", "cert.signed", "declaration.signed", "n8n.sent"
  metadata   Json?
  ipAddress  String?
  at         DateTime @default(now())
}
```

---

## State machines

### Wet-signature dispatch

```
awaiting_signature
  ↓ (lawyer marks "Docs arrived")
signed
  ↓ (lawyer signs + witnesses)
ready_to_post
  ↓ (lawyer adds tracking number → fires N8N webhook → email + SMS to client)
posted
  ↓ (Royal Mail confirms OR lawyer marks delivered)
delivered
```

Returns / lost mail go to `returned_undelivered` — admin can reset to any prior stage with audit log.

### Booking lifecycle

```
created (slot held, no payment)
  ↓ (admin uploads invoice → N8N emails it)
invoice_sent
  ↓ (client clicks "I've paid")
payment_claimed
  ↓ (admin confirms bank receipt)
paid
  ↓ (call happens)
call_held
  ↓ (lawyer signs declaration + cert)
completed
  ↓ (24h delay → N8N triggers feedback request)
closed
```

The call cannot proceed without `paid` status AND signed CCL. Show a banner on lawyer's day view if either is missing.

### Portal step lock

Step N unlocks only when steps 0..N-1 are complete. Implemented client-side (UX) and server-side (API gate). See `isUnlocked` in `client-portal.jsx`.

---

## Integrations to build

### N8N (automation backbone)

Self-host on Hetzner / Render. The platform fires webhooks; N8N orchestrates email + SMS + CRM updates.

Webhooks to emit, in priority order:

1. `booking.created` — confirmation email + SMS to client; CRM contact created; calendar hold sent to lawyer.
2. `payment.invoice_sent` — admin issues invoice; N8N emails it to the client.
3. `payment.received` — confirmation email; pre-call reminders scheduled at T-24h and T-1h.
4. `payment.reminder_due` — 24h before call if still unpaid; N8N sends chase email + SMS.
5. `documents.posted` — wet-sig docs out; client email + SMS with tracking URL `https://www.royalmail.com/track-your-item#/tracking-results/{tracking}`.
6. `matter.completed` — fires immediately after cert issued; schedules feedback request 2h later.
7. `feedback.submitted` — promoter (NPS ≥ 9) → review request email + SMS with Google review URL `https://g.page/r/CUXJGCWw_w-jEBM/review`. Detractor (≤ 6) → email to Karim with details.
8. `couples.second_signatory_required` — kicks off witness statement pack email.
9. `broker.referral_logged` — adds to broker's referral count + creates audit trail.
10. `mailing.send` — admin sends a broker mailing; N8N loops, personalises and dispatches via Postmark.

Each webhook is signed with HMAC-SHA256. Response is logged.

### Email (Postmark, direct)

Direct integration (not via N8N) for transactional sends that need synchronous delivery confirmation: payment receipts, login magic links, calendar invites.

### SMS (Twilio via N8N)

Routed through N8N — platform never hits Twilio directly. **Brokers are email-only; no SMS to brokers ever.**

### Calendar (Google + Outlook)

Per-lawyer OAuth. Two-way sync. Lawyer's `/freebusy` from Google blocks slots on the booking form. Booking creates a calendar event with the Google Meet link auto-generated.

### Claude (Anthropic API)

Two prompts, both editable by admin in the platform (stored in `AiPrompt` table):

- **Brief prompt** — fed uploaded matter docs; outputs structured pre-call brief (Parties, Loan terms, Property security, Key clauses, Risks, SRA checklist).
- **Chat prompt** — powers the floating AI assistant on the dashboard; agentic with action confirmation flow.

Model: `claude-haiku-4-5` for both. Latency target: 3s for chat reply, 15s for brief generation.

### Royal Mail Tracking API

Optional — without it, lawyers enter tracking manually. With it, the system polls every 6h and auto-progresses `posted → delivered`.

### Stripe

**Not used.** Bank transfer only. Invoices uploaded by admin as PDF.

---

## Auth & roles

- **Admin** — `karim@nexalaw.com` only. Hardcoded check today; in production it should be a flag on the user record.
- **Lawyer** — Google or Microsoft SSO required (Workspace OU `lawyers@nexalaw.com`).
- **Client** — magic-link email sign-in. No passwords. Booking-flow sign-up creates the account automatically.

Permissions:
- Lawyer sees only their own bookings, their own signatures, the firm-wide lender guide (read), their profile.
- Admin sees everything across all lawyers + brokers + reports + integrations + AI prompts.
- Client sees only their own portal.

---

## Source-file map

Every file in `source/` and what it contains:

### Top-level shell
- `index.html` — entry, loads React + Babel + all JSX files
- `app.jsx` — top-level routing (booking / portal / dashboard), Tweaks panel
- `app.css` + `app-additions.css` — global app styles
- `tokens.css` — design tokens (colours, type, spacing, shadows, radii)

### Public booking flow
- `booking-flow.jsx` — 3-step booking funnel + confirmation screen
- `booking.css` — booking styles
- `site-chrome.jsx` — public site header / banner / footer / Trustpilot widget

### Client portal
- `client-portal.jsx` — 8-step portal with strict lock-step navigation
- `portal.css` — portal styles

### Internal dashboard
- `dashboard-main.jsx` — sidebar + topbar + Today view + bookings list
- `dashboard-views.jsx` — booking detail (the largest view: AI brief, client uploads, notes, cert workflow, post-call actions, audit log, etc), Royal Mail kanban + dispatch log, Lawyer mgmt
- `dashboard-signatures.jsx` — lawyer's "My signatures" with digital + wet split kanbans + quick-action bar
- `dashboard-lenders.jsx` — lender knowledge base (inline-editable table + detail page)
- `dashboard-brokers.jsx` — broker panel + mailing composer
- `dashboard-templates.jsx` — firm-wide document templates
- `dashboard-prompts.jsx` — AI prompts editor
- `dashboard-integrations.jsx` — N8N + email + SMS + calendar + AI config
- `dashboard-reports.jsx` — monthly revenue, per-lawyer breakdown
- `dashboard-profile.jsx` — lawyer profile + saved signature

### Cross-cutting features
- `esign.jsx` — DocuSign-replacement studio (multi-doc, multi-signer, drag-drop fields, send envelope)
- `esign.css` — e-sign styles
- `ai-chat.jsx` — floating Claude-powered AI assistant
- `global-search.jsx` — ⌘K spotlight search
- `global-search.css` — search styles

### Data & utilities
- `data.jsx` — mock data: services, lawyers, bookings (use as seed data references — do NOT ship this data)
- `atoms.jsx` — shared Icon, Avatar, StatusPill components
- `tweaks-panel.jsx` — design-time prototype controls (remove from production)

---

## Things explicitly out of scope for v1

- Native mobile apps (web is mobile-responsive)
- Direct Twilio integration (SMS routed through N8N)
- Royal Mail API live polling (manual tracking entry is fine)
- Multi-firm tenancy (Nexa Law is the only law firm at launch)
- Self-serve broker portal (admin manages broker records directly)
- Multi-currency (£ only)

---

## Acceptance checklist for the first build

The dev should be able to demo each of the following without any errors. Run through them in order on a staging environment.

1. Public booking — book any service end-to-end → confirmation email arrives
2. Couples booking with second signatory + extra directors works
3. Client portal — all 8 steps in order, each step locked until prior completes
4. Multi-signatory CCL signing — add a 4th director, all sign, all stored
5. KYC upload works for all signatories
6. Bank transfer flow — admin uploads invoice → client receives PDF → marks paid → admin confirms
7. Pre-call brief — upload docs → click Regenerate → structured brief returns
8. Lawyer notes — three tabs, client-facing surfaces in client portal
9. E-Sign Studio — add lender template + matter doc, add 3 signers, drop fields per signer, send envelope, signers receive email links
10. Wet-sig dispatch — admin walks a booking through all 5 stages, tracking number entry fires email + SMS to client
11. Royal Mail kanban — admin filters by lawyer, drag/click cards
12. Lender guide — admin edits a lender's signature type, lawyer sees the change immediately
13. Broker mailing — select 5 brokers, send a mailing, see N8N webhook fired with full audience
14. AI assistant — lawyer asks "what's on my schedule today" → real Claude response
15. AI prompts editor — admin edits brief prompt → next brief uses new prompt
16. Global search — ⌘K opens, search "Mehta" → finds the booking, Enter opens it
17. NPS feedback — submit 10 → review CTA appears. Submit 6 → recovery message + admin email fires
18. Audit log — every action above shows up in the audit log with actor + IP + timestamp
19. Lawyer login — only sees their own bookings
20. Admin login — gated to one email

---

## A note on the existing prototype

This prototype was iterated on heavily with the founder (Karim). Every layout decision, copy choice, and edge case has been refined through dozens of comments. Trust the prototype. When in doubt, copy what's there.

If you spot something that looks like a bug or an inconsistency, double-check with the founder before "fixing" it — the inconsistency is usually deliberate (e.g., booking references are deliberately hidden from clients but kept in admin tables as internal IDs).

Good luck. Build this well — it's going to run a real law firm.

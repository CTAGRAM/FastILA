# Glossary

Domain, product, and technical terms used across Fast-ILA.

## Legal / domain

| Term | Meaning |
| --- | --- |
| **ILA** | **Independent Legal Advice** — advice a borrower/guarantor receives from a solicitor independent of the lender, confirming they understand a transaction (e.g. a charge over a jointly-owned property). The core product. |
| **CCL** | **Client Care Letter** — the engagement letter the client signs (portal step 1) setting out terms of the retainer. |
| **Certificate** | The signed ILA certificate the client receives at the end (portal step 7). Delivered three ways: **lawyer-only**, **lawyer-client**, or **wet** (posted). |
| **Wet signature** | A physically ("wet ink") signed document posted via Royal Mail, used where a lender requires a hard-copy original. Drives the Royal Mail dispatch state machine. |
| **KYC** | **Know Your Customer** — identity + proof-of-address verification (portal step 2). |
| **Matter** | A single legal engagement = one booking. |
| **Matter type** | The category of advice (7 seeded types in `matter_types`); selected on the booking form and drives the understanding declaration. |
| **Signatory** | A person who signs. Couples/multi-party matters support **1–6** signatories. |
| **Second signatory** | The partner in a couples matter; captured on the booking form and across RLS email-matching. |
| **Lender** | The bank/financial institution requiring the ILA. The **Lender guide** records each lender's signature preference, SLA, and contacts. |
| **Broker** | A referral source (mortgage/finance broker). Tracked in the Brokers CRM. |
| **SRA** | **Solicitors Regulation Authority** — Nexa Law Ltd's regulator (SRA No. 524963). |
| **NPS** | **Net Promoter Score** — the satisfaction question in the feedback step. |
| **VAT-inclusive** | Prices shown include VAT, never "+ VAT" — a compliance requirement. |

## Royal Mail / wet dispatch states

```
not_started → awaiting_signature → signed → ready_to_post → posted → delivered
```

Used by the wet-signature queue and the Royal Mail Kanban.

## Product surfaces

| Term | Meaning |
| --- | --- |
| **Booking flow** | Public 3-step form (`?mode=booking`). |
| **Client portal** | Post-booking 8-step locked compliance flow (`?mode=portal&ref=…`). |
| **Dashboard** | Internal console (`?mode=dashboard`). |
| **Embed** | The booking flow rendered chrome-less (`?chrome=off`) for the WordPress iframe. |

## Roles

| Role | Scope |
| --- | --- |
| **anon** | Unauthenticated public (booking form only). |
| **client** | A booked client (portal). |
| **lawyer** | Advising solicitor; sees own bookings/signatures. |
| **wet_specialist** | Handles the wet-signature/Royal Mail queue. |
| **admin** | Full console + configuration. |

## Technical

| Term | Meaning |
| --- | --- |
| **Mock mode** | Frontend runs against `data.jsx` seeds + localStorage/IndexedDB (no Supabase). The yellow "Demo data" pill. |
| **Live mode** | Frontend runs against Supabase. Auto-selected when `config.js` has keys. |
| **`HAS_BACKEND`** | The boolean (decided at load) that selects live vs mock. |
| **`window.FastILA`** | The single data-layer namespace ([`api.jsx`](../api.jsx)). |
| **`mutate()`** | The central write path → persist + KPI recompute + `fastila:store-changed`. |
| **`useStore()`** | React hook to re-render on store changes. |
| **RLS** | **Row-Level Security** — Postgres policies that gate every row by role. |
| **Edge function** | A Deno function on Supabase (`supabase/functions/*`). |
| **Vault** | Supabase's `vault.secrets` store; holds the URLs/secret the cron jobs read. |
| **pg_cron / pg_net** | Postgres extensions that schedule jobs and make HTTP calls (the automation engine). |
| **Resend** | The transactional **email** provider. |
| **Twilio** | The **SMS** provider. |
| **Realtime** | Supabase's row-change stream the frontend subscribes to in live mode. |
| **n8n** | A workflow-automation tool; an earlier/alternative notification path, now reference-only (the Supabase-native engine is active). |
| **Firm calendar** | One Google **Workspace** account connected once (admin-only) to mint Meet links, avoiding per-lawyer OAuth on sensitive scopes. |

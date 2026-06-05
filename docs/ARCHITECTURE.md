# Architecture

How Fast-ILA is put together, and *why* it's built this unusual way.

---

## The one big idea: no build step

Fast-ILA is a **static React app with no bundler, no transpile step, and no `node_modules` at runtime.** [`index.html`](../index.html) loads React, ReactDOM, Babel-standalone, Supabase, and a handful of PDF/Word libraries from CDNs, then loads every application file as `<script type="text/babel">`. Babel transforms the JSX **in the browser** on page load.

Consequences you must internalise before editing:

- **No ES modules.** There is no `import` / `export` anywhere. Every component, helper, and constant attaches to a **`window` global** (e.g. `window.BookingFlow`, `window.FastILA`, `window.SERVICES`).
- **Load order matters.** A file can only use globals defined by files loaded *before* it. The order is hard-coded in [`index.html`](../index.html) (lines 43–76). `api.jsx` → `data.jsx` → `atoms.jsx` → `actions.jsx` → surfaces → `app.jsx`.
- **Deploy = copy files.** Any static host works (Vercel, Netlify, Cloudflare Pages, S3+CloudFront). There is nothing to compile.

**Why build it this way?** The product brief favoured a drop-anywhere artifact with zero CI/build infrastructure and instant edit-refresh, embeddable via a plain iframe into WordPress. The trade-off (no tree-shaking, in-browser Babel, large single-page payload) is accepted deliberately. The original handoff in [`../design_handoff_fast_ila/README.md`](../design_handoff_fast_ila/README.md) describes the *recommended production stack* (Next.js/TS/Prisma/Tailwind) if you ever choose to re-platform.

---

## Runtime layers

```
┌──────────────────────────────────────────────────────────────────────┐
│  index.html  — loads CDNs (React/Babel/Supabase/jspdf/pdf-lib/mammoth) │
│                then config.js, then every .jsx in dependency order     │
└───────────────┬──────────────────────────────────────────────────────┘
                │
        ┌───────▼────────┐   reads keys
        │   config.js    │──────────────► HAS_BACKEND (live vs mock)
        └───────┬────────┘
                │
        ┌───────▼────────────────────────────────────────────────────┐
        │  api.jsx → window.FastILA.*   (the single data layer)        │
        │    live  → Supabase (Postgres + RLS + Realtime + Storage)    │
        │    mock  → data.jsx seeds + localStorage + IndexedDB blobs    │
        │            synced across tabs via BroadcastChannel           │
        └───────┬────────────────────────────────────────────────────┘
                │  window globals: BOOKINGS, LAWYERS, SERVICES, …
        ┌───────▼────────────────────────────────────────────────────┐
        │  Surfaces (read globals, write via FastILA.*):               │
        │   booking-flow · client-portal · dashboard-* · esign         │
        └───────┬────────────────────────────────────────────────────┘
                │
   ┌────────────┼─────────────────────────────────────────────┐
   ▼            ▼                         ▼                     ▼
 Supabase    Anthropic / OpenAI      jspdf / pdf-lib       n8n webhooks
 Edge Fns    (via `ai` edge fn)      (PDF gen/stamp)       (legacy/optional)
 + pg_cron
```

---

## The data layer (`api.jsx` → `window.FastILA`)

Everything reads and writes through one namespace, `window.FastILA`. It exposes domain sub-objects:

```
services · lawyers · availability · bookings · documents · signatures · payments ·
understanding · templates · prompts · lenders · brokers · auth · users · notifications ·
firm · admin · contacts · mailshots · emailTemplates · automations · calendar ·
recordings · platform · clients · ai · util · useStore
```

- **`HAS_BACKEND`** (decided once at load from `config.js`) selects **live** (Supabase) or **mock** (localStorage/IndexedDB) for every namespace.
- **`mutate()`** is the central write path. Every write funnels through it → it recomputes KPIs, persists to `localStorage` (mock) or Supabase (live), and fires a `fastila:store-changed` event.
- **`useStore()`** is a React hook components use to re-render on `fastila:store-changed`.
- In **live mode** the layer subscribes to **Supabase Realtime** on key tables (bookings, documents, signatures, payments, lawyers, messages, calendar_busy, recordings) so changes from other users/devices stream in.
- File blobs: **IndexedDB** (`fastila_files` / `blobs`) in mock mode; **Supabase Storage** signed URLs in live mode.

Full reference: [DATA-LAYER.md](DATA-LAYER.md). **Never mutate `window.BOOKINGS` (etc.) directly** — always go through `FastILA.*`.

---

## URL-driven surfaces

[`app.jsx`](../app.jsx) is the root. It parses the query string and renders the right surface:

| Query | Effect |
| --- | --- |
| `?mode=booking` | Public booking form |
| `?mode=portal&ref=FI-2026-…` | Client portal, deep-linked to a booking |
| `?mode=dashboard` | Internal console |
| `?chrome=off` | Hide marketing chrome (used by the WordPress iframe) |
| `?view=…` | Dashboard deep-link to a specific view (also used by the OAuth return) |

The dashboard emits an iframe-height `postMessage` beacon so the WordPress embed can resize to content.

---

## External services

| Concern | How it's done |
| --- | --- |
| **PDF generation / stamping** | `jspdf` (declarations) + `pdf-lib` (signed CCL, executed certificate) — all client-side, in [`actions.jsx`](../actions.jsx) |
| **Word preview** | `mammoth` renders `.docx` → HTML in the browser |
| **AI (brief / notes / chat)** | Routed through the Supabase **`ai`** edge function (server-side Anthropic→OpenAI proxy). *Earlier versions called the providers directly from the browser; that path was removed because of CORS + key exposure.* |
| **Email / SMS** | The **Supabase-native automation engine** (`dispatch-automations` edge fn + pg_cron) sends via **Resend** (email) and **Twilio** (SMS). n8n webhook hooks exist but the engine is the active path. |
| **Calendar / Google Meet** | The **`calendar`** + **`create-booking`** edge functions create Google Calendar events with Meet links (firm Workspace calendar). |
| **Recordings / transcripts** | The **`transcribe`** + **`recordings-ingest`** edge functions (OpenAI Whisper + AI summary). |

See [BACKEND.md](BACKEND.md) for the full server-side picture.

---

## Mock mode vs live mode

| | Mock (demo) | Live |
| --- | --- | --- |
| Trigger | `config.js` keys empty | `config.js` has `supabaseUrl` + `supabaseAnonKey` |
| Data | `data.jsx` seeds + `localStorage` | Supabase Postgres |
| Files | IndexedDB blobs | Supabase Storage (signed URLs) |
| Cross-tab sync | `BroadcastChannel` | Supabase Realtime |
| Indicator | yellow **"Demo data"** pill; console logs `FastILA · mock+persist` | console logs `FastILA · live` |
| Auth | local session in `fastila_session_v1`, "demo sign-in" | Supabase Auth (email+password, magic link, Google) |

Switching is automatic — there is no flag to flip by hand; it's derived from whether the keys are present.

---

## Where each concern lives (quick index)

| Concern | File(s) |
| --- | --- |
| Routing / shell | [`app.jsx`](../app.jsx) |
| Data layer | [`api.jsx`](../api.jsx), [`data.jsx`](../data.jsx) |
| Modals, PDF builders, action handlers, AI helpers | [`actions.jsx`](../actions.jsx) |
| Public booking | [`booking-flow.jsx`](../booking-flow.jsx) |
| Client portal | [`client-portal.jsx`](../client-portal.jsx) |
| Dashboard shell + core views | [`dashboard-main.jsx`](../dashboard-main.jsx), [`dashboard-views.jsx`](../dashboard-views.jsx) |
| Other dashboard views | `dashboard-*.jsx` (see [SURFACES.md](SURFACES.md)) |
| e-sign studio | [`esign.jsx`](../esign.jsx) |
| UI primitives | [`atoms.jsx`](../atoms.jsx), [`site-chrome.jsx`](../site-chrome.jsx) |
| ⌘K search | [`global-search.jsx`](../global-search.jsx) |
| Floating AI assistant | [`ai-chat.jsx`](../ai-chat.jsx) |
| Design tokens / styles | `tokens.css`, `app*.css`, `booking.css`, `dashboard.css`, `portal.css`, `signatures.css`, `esign.css`, `global-search.css` |
| Backend | [`supabase/`](../supabase/) |
| WordPress embed | [`wordpress-plugin/`](../wordpress-plugin/) |

A full file-by-file index is in [`../CLAUDE.md`](../CLAUDE.md).

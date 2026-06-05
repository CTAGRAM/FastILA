# Data layer — `window.FastILA`

Every read and write in the app goes through one global object defined in [`api.jsx`](../api.jsx): `window.FastILA`. This is the **only** sanctioned way to touch data. Components read denormalised globals (`window.BOOKINGS`, `window.LAWYERS`, `window.SERVICES`, …) for rendering, but **all writes** go through `FastILA.*`.

```js
FastILA.mode      // "live" | "mock"
FastILA.config    // the resolved FAST_ILA_CONFIG
```

---

## Namespaces

`window.FastILA` exposes these sub-objects (from [`api.jsx`](../api.jsx) ~line 1788):

| Namespace | Responsibility |
| --- | --- |
| `services` | Service tiers (read-mostly) |
| `lawyers` | Lawyer records + working-hours model (`work_days/work_start/work_end/slot_minutes/buffer_minutes`, `email`) |
| `availability` | Diary-driven slot generation: `forLawyer`, `forService`, `earliest`, `isSlotFree`, `busyRangesForLawyer` |
| `bookings` | Create / read / update bookings; the heart of the system |
| `documents` | Client + matter document uploads (blobs in IndexedDB / Storage) |
| `signatures` | Signature capture (timestamp + IP/UA in live mode) |
| `payments` | Payment declarations + references |
| `understanding` | Matter-type understanding declarations |
| `templates` | Firm documents (CCL, account details, lender certs, policies) |
| `prompts` | AI system prompts (pre-call brief + chat) |
| `lenders` | Lender knowledge base |
| `brokers` | Referral CRM |
| `auth` | Sign-in: `signInWithPassword`, magic link, Google, session handling |
| `users` | Staff/user records |
| `notifications` | In-app notification feed (the bell) |
| `firm` | Firm-level settings |
| `admin` | Admin operations (incl. demo reset) |
| `contacts` | Mailing-list DB |
| `mailshots` | Broadcast campaigns |
| `emailTemplates` | Reusable email templates |
| `automations` | The live automation engine: `rules`, `updateRule`, `messages`, `runs`, `stats`, `dispatchNow`, `inviteUser` |
| `calendar` | Diary sync: `connections`, `connectUrl`, `connectFirmUrl`, `disconnect`, `disconnectFirm`, `firmStatus`, `syncNow`, `loadBusy` |
| `recordings` | Call recordings/transcripts: `list`, `upload`, `transcribe`, `remove`, `overview`, `ingestNow` |
| `platform` | Control-center health: `health`, `secrets` |
| `clients` | Returning-client history: `directory`, `historyByEmail`, `certsFor`, `myBookings`, `lookupPublic` |
| `ai` | `complete(system, messages)` — server-side Anthropic→OpenAI proxy via the `ai` edge fn |
| `util` | `exportCsv`, `nextRef` |
| `useStore` | React re-render hook (see below) |

> Namespace *methods* vary; grep the relevant block in [`api.jsx`](../api.jsx) for the exact signatures before calling — they are defined inline as object literals.

---

## The write path: `mutate()`

Defined ~`api.jsx:178`. Every namespace's write methods ultimately call `mutate()`, which:

1. Applies the change (Supabase call in live mode; in-memory + `localStorage` in mock mode).
2. Recomputes KPIs / derived globals.
3. Persists (localStorage `_save` in mock).
4. Fires a `fastila:store-changed` DOM event.

```
FastILA.bookings.update(id, patch)
        └─► mutate()
              ├─ live: supabase.from('bookings').update(...).eq('id', id)
              ├─ mock: BOOKINGS[i] = {...}; saveToStorage()
              ├─ recompute KPIs
              └─ dispatchEvent('fastila:store-changed')   ──► components re-render
```

**Do not** assign to `window.BOOKINGS` (or any store global) directly — you'll skip persistence, KPI recompute, and the re-render signal, and live/mock will diverge.

---

## Re-rendering: `useStore()`

Components subscribe with the hook:

```jsx
function MyView() {
  FastILA.useStore();              // re-renders on `fastila:store-changed`
  const rows = window.BOOKINGS;    // read the latest global
  return <Table rows={rows} />;
}
```

In **live mode**, Supabase **Realtime** subscriptions also fire `fastila:store-changed` when other users/devices change tracked tables (bookings, documents, signatures, payments, lawyers, messages, calendar_busy, recordings), so the UI stays in sync without a refresh.

---

## File blobs

| Mode | Storage | How |
| --- | --- | --- |
| Mock | **IndexedDB** (`fastila_files` DB, `blobs` store) | Files held as blobs locally; previewed via object URLs |
| Live | **Supabase Storage** (`client-docs`, `certificates`, `templates`, `recordings`) | Private buckets; access via signed URLs |

Word documents are previewed with `mammoth` (→ HTML); PDFs are generated/stamped with `jspdf` + `pdf-lib` — all client-side.

---

## Hydration

- **Mock:** `data.jsx` seeds the globals; `hydrateFromStorage()` (`FastILA._hydrate`) overlays anything saved in `localStorage`.
- **Live:** `window.FastILA_loadLive()` (in [`data.jsx`](../data.jsx)) pulls the initial dataset from Supabase on load; Realtime keeps it fresh thereafter.

---

## Persistence keys (localStorage)

Mock mode and various settings persist under keys such as:

| Key | Holds |
| --- | --- |
| `fastila_session_v1` | The signed-in session (role + email) |
| `fastila_integrations_v2` | Integration credentials (⚠ unencrypted — see [SECURITY.md](SECURITY.md)) |
| `fastila_prompts_v1` | AI system prompts (read via `window.fastilaPrompts`) |
| `fastila_templates_v2` | Template metadata (blobs in IndexedDB) |
| `fastila_n8n_workflow_map_v1` | n8n automation catalog |

(Names are indicative — confirm against the relevant view file.)

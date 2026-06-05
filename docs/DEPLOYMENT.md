# Deployment & go-live

The frontend is a static site; the backend is Supabase. They deploy independently.

> The canonical step-by-step is in [`../README.md`](../README.md) §1–5. This doc adds the **full go-live checklist** and the production-only steps.

---

## Frontend (static host)

Upload every root file. **Omit** `supabase/`, `wordpress-plugin/`, `node_modules/`, `design_handoff_fast_ila/`, and `uploads/`.

| Host | Command | Config file |
| --- | --- | --- |
| Vercel | `npx vercel --prod` | [`vercel.json`](../vercel.json) |
| Netlify | `npx netlify deploy --prod --dir=.` | [`netlify.toml`](../netlify.toml) |
| Cloudflare Pages / S3+CloudFront | upload the directory | (rewrites must be added manually) |

`vercel.json` / `netlify.toml` provide:
- Clean-URL rewrites: `/booking`, `/portal`, `/admin`, `/embed` → the SPA with the right `?mode=`.
- Security headers.
- `/embed*` → `frame-ancestors *` so the WordPress iframe is allowed.

`.jsx` files must be served with a JavaScript content type. Vercel/Netlify/CF handle this; for a local server use [`.serve.py`](../.serve.py) (it serves `.jsx` as `application/javascript`, no-cache).

---

## Backend (Supabase)

1. **Schema + policies + seed** — run, in order, in the SQL editor (or `supabase db push`):
   - all `supabase/migrations/*.sql` (in filename order)
   - `supabase/seed.sql`
2. **Production RLS** — apply [`../.rls-tighten.sql`](../.rls-tighten.sql). Do **not** apply `.bootstrap-and-realtime.sql` in production (it opens writes to any signed-in user).
3. **Storage** — the migrations create the private buckets (`client-docs`, `certificates`, `templates`, `recordings`) and their policies.
4. **Edge functions** — deploy the ones you use:
   ```bash
   supabase functions deploy create-booking dispatch-automations calendar calendar-oauth-callback \
     transcribe recordings-ingest health ai invite-user client-lookup --project-ref <ref>
   ```
   > Do **not** also wire `send-booking-email` into the booking flow — confirmations already go through `dispatch-automations`; running both double-sends.
5. **Secrets + Vault** — see [CONFIGURATION.md](CONFIGURATION.md) §2–3.
6. **Staff** — invite each lawyer/admin in Authentication → Users, then map them in `public.staff` (see README §1) or use the `invite-user` function.

---

## WordPress plugin

Zip `wordpress-plugin/fast-ila-booking/`, upload via **Plugins → Add new → Upload**, activate, then set the embed URL under **Settings → Fast-ILA Booking** to your deployed site's `/embed`. Add `[fast_ila_booking]` to a page. Options table is in [`../README.md`](../README.md) §5.

---

## Go-live checklist

**Frontend**
- [ ] `config.js` has the production Supabase URL + anon key
- [ ] `features.enforceAuth: true`
- [ ] Static host rewrites + security headers active (deploy picked up `vercel.json`/`netlify.toml`)

**Database / RLS**
- [ ] All migrations + seed applied
- [ ] `.rls-tighten.sql` applied; `.bootstrap-and-realtime.sql` **not** in prod
- [ ] Verify anon can read **nothing** sensitive: `select * from bookings` as anon returns `[]` (see [SECURITY.md](SECURITY.md))
- [ ] No leftover wide-open `*_authed_write` policies on `lawyers/lenders/templates/ai_prompts/brokers`
- [ ] Realtime enabled on the tables the UI subscribes to

**Functions / secrets**
- [ ] Required edge functions deployed
- [ ] Supabase secrets set (Resend, Twilio, OpenAI, Anthropic, Google OAuth, `PORTAL_URL`, `FROM_EMAIL`, `FI_CRON_SECRET`)
- [ ] Vault armed (`fi_edge_url`, `fi_calendar_url`, `fi_recordings_url`, `fi_service_role_key`)
- [ ] `PORTAL_URL` / `FROM_EMAIL` point at the real domain (not `localhost` / `onboarding@resend.dev`)

**Email / SMS delivery**
- [ ] `fast-ila.co.uk` verified in Resend; `FROM_EMAIL=bookings@fast-ila.co.uk`
- [ ] Twilio upgraded (trial can only message verified numbers); valid E.164 sender

**Calendar / Meet**
- [ ] Google OAuth consent screen **published** (basic login)
- [ ] One firm **Workspace** account connected for Meet links (only it needs the sensitive Calendar scope)
- [ ] Redirect URI registered: `…/functions/v1/calendar-oauth-callback`

**Secret hygiene**
- [ ] **Rotate every key** that was pasted during setup (Supabase PAT, Google secret, Resend, Twilio, OpenAI, Anthropic) before public go-live

**Smoke test**
- [ ] Create a booking end-to-end; confirm it gets a ref, a Meet link, and a confirmation email
- [ ] Open the portal via the ref; sign step 1; confirm the signature/audit captured timestamp (+ IP/UA in live)
- [ ] Sign in as lawyer + admin; confirm role-correct nav
- [ ] Control center shows providers green; "Send due now" succeeds

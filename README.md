# Fast-ILA — Booking platform, client portal & WordPress plugin

End-to-end Independent Legal Advice (ILA) booking system for **Nexa Law Ltd / Fast-ILA**.

| Surface | Where it lives | What it does |
| --- | --- | --- |
| Public booking form | `/?mode=booking` (and `/embed` for WordPress) | 3-step booking that writes to Supabase |
| Client portal | `/?mode=portal&ref=FI-2026-…` | Sign care letter, upload ID/docs, declare paid, receive certificate |
| Internal dashboard | `/?mode=dashboard` | Lawyer + admin console — today/upcoming, Royal Mail queue, reports |
| WordPress plugin | `wordpress-plugin/fast-ila-booking/` | `[fast_ila_booking]` shortcode that iframes the booking form |
| Backend | `supabase/` | Postgres schema, RLS, edge functions, storage buckets |

The frontend is a **static** React app loaded via Babel-standalone — no build step. Drop it on any static host (Vercel, Netlify, Cloudflare Pages, S3+CloudFront).

---

## 1. Provision Supabase

1. Create a project at <https://supabase.com>.
2. In SQL editor, run, in order:
   - `supabase/migrations/20260528000001_schema.sql`
   - `supabase/migrations/20260528000002_policies.sql`
   - `supabase/seed.sql`
3. Copy your project **URL** and **anon key** from *Settings → API*.

If you prefer the CLI:

```bash
npx supabase link --project-ref <your-ref>
npx supabase db push                       # runs the migrations
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

### Edge functions

```bash
npx supabase functions deploy create-booking
npx supabase functions deploy send-booking-email

# Set secrets for the mailer
npx supabase secrets set RESEND_API_KEY=re_xxx PORTAL_URL=https://app.fast-ila.co.uk FROM_EMAIL=bookings@fast-ila.co.uk
```

### Storage buckets

The migration creates three private buckets: `client-docs`, `certificates`, `templates`. Storage policies in `policies.sql` enforce per-booking isolation.

### Invite staff

In **Authentication → Users**, invite each lawyer + admin. Then in SQL editor:

```sql
insert into public.staff (id, email, full_name, role, lawyer_id) values
  ('<user-uuid>', 'amelia@nexalaw.com',  'Amelia Hart',    'lawyer', 'amelia'),
  ('<user-uuid>', 'raj@nexalaw.com',     'Raj Patel',      'lawyer', 'raj'),
  ('<user-uuid>', 'karim@nexalaw.com',   'Karim',          'admin',  null);
```

---

## 2. Configure the frontend

Open `config.js` and paste your Supabase URL + anon key:

```js
window.FAST_ILA_CONFIG = {
  supabaseUrl: "https://abcd1234.supabase.co",
  supabaseAnonKey: "eyJhbGciOi…",
  // …
  features: { enforceAuth: true /* require magic-link sign-in for the portal */ },
};
```

Leave the values empty to run the demo against the seed data in `data.jsx` — the UI shows a yellow "Demo data" pill when not configured.

---

## 3. Run locally

The app is a static site, so any HTTP server will do:

```bash
python -m http.server 5173
# or
npx serve -p 5173
```

Then open <http://localhost:5173>.

URL shortcuts:

| Path | Surface |
| --- | --- |
| `/` | Mode switcher visible (development) |
| `/?mode=booking&chrome=off` | Booking form, no top chrome (used by WordPress) |
| `/?mode=portal&ref=FI-2026-00481` | Client portal for a specific booking |
| `/?mode=dashboard` | Internal console |

---

## 4. Deploy

### Vercel

```bash
npx vercel --prod
```

Picks up `vercel.json` for the clean-URL rewrites.

### Netlify

```bash
npx netlify deploy --prod --dir=.
```

Reads `netlify.toml`.

### Cloudflare Pages / S3 / any static host

Upload every file in this directory (omit `supabase/`, `wordpress-plugin/`, `node_modules/`).

---

## 5. WordPress plugin

The plugin in `wordpress-plugin/fast-ila-booking/` embeds the booking form on any WordPress page.

### Install

1. Zip the `fast-ila-booking` folder
2. WP Admin → **Plugins → Add new → Upload plugin**
3. Activate **Fast-ILA Booking**
4. Settings → **Fast-ILA Booking**: paste the embed URL (your deployed site, e.g. `https://app.fast-ila.co.uk/embed`)
5. Add the shortcode to any page:

```
[fast_ila_booking]
[fast_ila_booking height="900" service="urgent"]
[fast_ila_booking height="auto"]
```

### Options

| Attribute | Default | Purpose |
| --- | --- | --- |
| `height` | `1100` | Iframe height in pixels, or `auto` for resize-on-content |
| `service` | (none) | Pre-select a service (`urgent`, `standard`, `couples`, `wet`) |
| `theme` | `light` | `light` or `dark` |
| `layout` | `stacked` | `stacked` or `grid` |

### Gutenberg block

A "Fast-ILA Booking" block is registered with the same options. Insert from the block picker → category *Widgets*.

---

## 6. File map

```
.
├── index.html                # entry — loads React UMD, Babel, Supabase, then JSX
├── config.js                 # Supabase URL + anon key (edit this)
├── api.jsx                   # FastILA data layer (live or mock)
├── data.jsx                  # seed data + helpers (still used for demo mode)
├── booking-flow.jsx          # 3-step public booking form
├── client-portal.jsx         # 8-step client portal
├── dashboard-*.jsx           # internal console views
├── atoms.jsx, site-chrome.jsx, *.css   # UI primitives + styles
├── supabase/
│   ├── migrations/           # schema + RLS policies
│   ├── functions/            # Edge functions (create-booking, send-booking-email)
│   ├── seed.sql              # services, lawyers, matter types, templates
│   └── config.toml           # `supabase start` config
├── wordpress-plugin/
│   └── fast-ila-booking/     # WordPress plugin (shortcode + Gutenberg block)
├── vercel.json
├── netlify.toml
└── .env.example
```

---

## 7. Roadmap / not yet implemented

- Stripe / GoCardless integration on the **Pay** step (currently bank-transfer + client declaration)
- Google Meet room auto-creation (currently sent manually via confirmation email)
- Royal Mail Special Delivery API for tracking-number creation
- Calendar sync (ICS feed exists; OAuth-based two-way sync planned)
- AI brief generation (prompts stored; OpenAI/Anthropic call is a placeholder)

These all plug into existing schema columns (`payments`, `bookings.meet_link`, `tracking_number`, `ai_summary`) — no migration needed when you wire them up.

---

© Go Legal Services Ltd. Independent Legal Advice is provided by **Nexa Law Ltd**, an SRA-regulated firm (SRA No. 524963).

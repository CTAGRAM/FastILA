# Fast-ILA — Documentation

Deep-dive documentation for the **Fast-ILA** booking platform (Independent Legal Advice for **Nexa Law Ltd**, trading as **Fast-ILA**, SRA No. 524963).

> **Where to start**
> - New to the repo? Read [`../README.md`](../README.md) (setup & deploy) and [`../CLAUDE.md`](../CLAUDE.md) (file-by-file index) first.
> - Want the big picture? → [ARCHITECTURE.md](ARCHITECTURE.md)
> - Want to make a change? → [CONTRIBUTING.md](CONTRIBUTING.md)
> - Going to production? → [DEPLOYMENT.md](DEPLOYMENT.md) + [SECURITY.md](SECURITY.md)

---

## What is Fast-ILA?

A single static React app that presents **three product surfaces** plus a Supabase backend and a WordPress embed plugin:

| Surface | URL | Audience | What it does |
| --- | --- | --- | --- |
| **Public booking** | `?mode=booking` | Anyone (no auth) | 3-step form → creates a booking |
| **Client portal** | `?mode=portal&ref=FI-…` | The client | 8-step locked compliance flow: sign care letter, KYC, pay, docs, meet, declare understanding, receive certificate, feedback |
| **Internal dashboard** | `?mode=dashboard` | Lawyers / wet-signature specialists / admins | Schedule, bookings, Royal Mail queue, signing, reporting, automations, integrations |
| **WordPress plugin** | `wordpress-plugin/` | Marketing site editors | `[fast_ila_booking]` shortcode that iframes the booking form |
| **Backend** | `supabase/` | — | Postgres + RLS + Realtime + Edge Functions + Storage + pg_cron automations |

The frontend has **no build step** — it loads React, Babel, and Supabase from CDNs and runs `.jsx` in the browser. See [ARCHITECTURE.md](ARCHITECTURE.md) for why and how.

---

## Documentation map

| Doc | Read it when you want to… |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Understand the no-build/globals model, data flow, and live-vs-mock switch |
| [SURFACES.md](SURFACES.md) | Walk through every screen: booking flow, portal steps, dashboard views, roles |
| [DATA-LAYER.md](DATA-LAYER.md) | Use `window.FastILA.*` — the namespaces, the `mutate()` write path, `useStore()` |
| [BACKEND.md](BACKEND.md) | Understand Supabase: schema, migrations, edge functions, the automation engine, cron, Vault |
| [CONFIGURATION.md](CONFIGURATION.md) | Configure `config.js`, edge-function secrets, and the integrations |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Ship the frontend, deploy functions, and run the go-live checklist |
| [SECURITY.md](SECURITY.md) | Review RLS, secret handling, and the production hardening steps |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Add a component/view/namespace without breaking load order |
| [GLOSSARY.md](GLOSSARY.md) | Decode domain terms (ILA, CCL, wet signature, KYC, NPS…) |
| [CHANGELOG.md](CHANGELOG.md) | See the phased build history (automation, calendar, recordings, control center) |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Diagnose mock-mode-stuck, no-emails, no-Meet-link, RLS, and cron issues |

---

## 60-second quick start

```bash
# from the project root
python .serve.py 5173          # or: python -m http.server 5173  /  npx serve -p 5173
```

Open one of:

- <http://localhost:5173/?mode=dashboard> — internal console
- <http://localhost:5173/?mode=booking> — public booking form
- <http://localhost:5173/?mode=portal&ref=FI-2026-00481> — a client portal

With empty keys in `config.js` the app runs in **mock mode** against the seed data in `data.jsx` (a yellow "Demo data" pill shows). Paste a Supabase URL + anon key to switch to **live mode** automatically. See [CONFIGURATION.md](CONFIGURATION.md).

---

## Brand

Navy `#042b3d` / `#063952` · Lime `#d7ed3f` · Cream `#f8f5c2` · type **Sora** (headings) + **Inter** (body). Tokens live in [`../tokens.css`](../tokens.css). Pricing is shown **VAT-inclusive** (never "+ VAT") and service badges are non-comparative — both are compliance requirements, not styling choices.

---

© Go Legal Services Ltd. Independent Legal Advice is provided by **Nexa Law Ltd**, an SRA-regulated firm (SRA No. 524963).

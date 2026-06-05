# Security notes

Fast-ILA handles client PII (identity documents, addresses, signatures) and is used by an SRA-regulated firm, so the security posture matters. This doc records the model, the known history, and the hardening steps. It is a practitioner's note, **not** a formal audit.

---

## Trust model

- **The anon key is public by design.** It ships in `config.js`. What actually protects data is **Row-Level Security** — every table's access is gated by policy, not by hiding the key.
- **The service-role key bypasses RLS.** It must live *only* in Supabase secrets / Vault and *only* be used server-side (edge functions, cron). It must never reach the browser or `config.js`.
- **Edge functions are the privilege boundary.** Public functions (`create-booking`, `client-lookup`, `calendar-oauth-callback`) are deliberately narrow; everything else checks a staff JWT or a shared secret.

---

## RLS roles

| Role | Can |
| --- | --- |
| `anon` | INSERT a booking + client (the public form); read **nothing** sensitive |
| `client` | Read only their own rows (matched by `client_email` / `second_signatory_email`, case-insensitive after hardening) |
| `lawyer` | Rows scoped to their `lawyer_id` |
| `wet_specialist` | Wet-signature queue (added by `.rls-tighten.sql`) |
| `admin` | Everything |

Role comes from the JWT `app_metadata.role` (stamped by the bootstrap trigger / `invite-user`), read by `current_role()` / `is_staff()`.

---

## ⚠ Fixed: anon PII read leak (2026-06-03)

Running all three policy files (`policies.sql` + `.bootstrap-and-realtime.sql` + `.rls-tighten.sql`) left overlapping policies. `current_email()` returned `''` for anon, and a policy used `lower(coalesce(second_signatory_email,'')) = current_email()` → `'' = ''` → **TRUE**, so the public anon key could read **all** bookings/documents/signatures including client PII.

**Fix applied:** `public.current_email()` redefined to `nullif(lower(coalesce(auth.jwt()->>'email','')), '')` (returns `NULL`, never `''`). Verified anon then reads `[]` from those tables.

**Lesson / guardrail:** never compare a possibly-empty identity column to a possibly-empty session value with `coalesce(...,'')`. Use `NULL` and let the comparison be unknown/false. Always test RLS as the anon role after any policy change:

```sql
-- as anon: each of these must return []
select * from bookings;  select * from documents;  select * from signatures;
```

---

## Outstanding / verify before go-live

These were deferred and should be re-checked against the live project (the schema is additive, so they may still be present):

- [ ] **Leftover wide-open `*_authed_write` policies** on `lawyers`, `lenders`, `templates`, `ai_prompts`, `brokers` — any *authenticated* user could write them. Tighten to `is_staff()` / admin.
- [ ] **Duplicate base-vs-tightened policies** from running multiple policy files. Drop the superseded ones.
- [ ] Confirm `.bootstrap-and-realtime.sql` (dev open-writes) is **not** active in production.
- [ ] Confirm storage write policies are locked to staff.

---

## Secrets in `localStorage` (Integrations hub)

[`dashboard-integrations.jsx`](../dashboard-integrations.jsx) stores integration credentials **unencrypted** in `localStorage` (`fastila_integrations_v2`). Acceptable for a demo / single trusted operator on a trusted device; **not** a production secret store. Production provider keys belong in **Supabase secrets** (server-side), and the AI/email/SMS paths already route through edge functions that read those — so you don't need to put live provider keys in the browser at all.

---

## Compliance-relevant behaviours (don't regress these)

- Signatures capture a **timestamp**, and in live mode **IP + user-agent**.
- The declaration text and the **signatory list are snapshotted onto the booking** so the audit trail is immutable even if templates change later.
- Pricing is shown **VAT-inclusive** (never "+ VAT"); service badges are **non-comparative**.
- `booking_events` provides an append-only audit log.

---

## Key rotation

Several provider keys (Supabase PAT, Google OAuth secret, Resend, Twilio token, OpenAI, Anthropic) were pasted during setup/iteration. **Rotate all of them before public go-live.** The personal access token (`sbp_…`) in particular grants management access to *every* project on the account.

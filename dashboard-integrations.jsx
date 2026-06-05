/* global React, Icon, Modal, fiToast, FastILA, ConfirmModal */

// ============================================================================
// Integrations admin view.
// Each integration is a card. Click Connect → opens a modal with the right
// fields for that provider. Credentials persist in localStorage under
// `fastila_integrations_v2` so they survive reloads.
//
// What an integration "Connect" does depends on the provider:
//
//   • Supabase   → stores URL + anon key. Generates a config.js snippet the
//                  admin pastes once; full live mode requires a static reload.
//   • Google Cal → stores OAuth client id/secret. Real OAuth round-trip needs
//                  the Supabase Edge Function deployed.
//   • Outlook    → same as Google.
//   • n8n        → stores base URL + optional API key. Test button POSTs to
//                  the webhook with a {ping: true} payload so the admin can
//                  see the trigger fire in n8n's UI.
//   • Claude     → stores Anthropic API key + model. Test button calls the
//                  Edge Function which proxies to the API (live mode only).
//   • OpenAI     → alternative LLM key + model.
//   • SMTP       → email-sending credentials passed to n8n on every send.
//   • Royal Mail → Click & Drop API key for auto-tracking generation.
// ============================================================================

const INT_STORE_KEY = "fastila_integrations_v2";

const INT_CATALOG = [
  // --- Backend ---------------------------------------------------------------
  {
    id: "supabase",
    name: "Supabase",
    category: "Backend",
    icon: "shield",
    bg: "#3ecf8e",
    summary: "Production database, file storage, auth + magic links. Flips the platform from local mock storage to a real cloud backend.",
    fields: [
      { key: "url",     label: "Project URL",   type: "url",    placeholder: "https://abcd1234.supabase.co", required: true },
      { key: "anonKey", label: "Anon (public) key", type: "secret", placeholder: "eyJhbGciOi…",         required: true },
      { key: "enforceAuth", label: "Require magic-link sign-in for client portal", type: "boolean", default: true },
    ],
    docs: "After connecting here, paste the snippet from the connect dialog into config.js and refresh once to activate live mode.",
  },

  // --- Calendar --------------------------------------------------------------
  {
    id: "google_calendar",
    name: "Google Calendar + Meet",
    category: "Calendar",
    icon: "calendar",
    bg: "#4285F4",
    summary: "Auto-create a Meet link for each booking and push it onto the lawyer's Google Calendar. Reminders fire on the client's calendar too.",
    fields: [
      { key: "clientId",     label: "OAuth Client ID",     type: "text",   placeholder: "1234.apps.googleusercontent.com", required: true },
      { key: "clientSecret", label: "OAuth Client Secret", type: "secret", placeholder: "GOCSPX-…",                       required: true },
      { key: "redirectUri",  label: "Redirect URI",        type: "url",    placeholder: "https://app.fast-ila.co.uk/auth/google/callback", required: true },
      { key: "calendarId",   label: "Default calendar ID", type: "text",   placeholder: "primary", default: "primary" },
    ],
    docs: "Create an OAuth client in Google Cloud Console → APIs & Services → Credentials. Add Calendar + Meet scopes.",
  },
  // --- AI --------------------------------------------------------------------
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    category: "AI",
    icon: "sparkle",
    bg: "#d97757",
    summary: "Powers the AI Pre-Call Brief and the dashboard assistant. Recommended model: Claude Sonnet 4.6 for briefs, Haiku 4.5 for chat.",
    fields: [
      { key: "apiKey", label: "API key",       type: "secret", required: true, placeholder: "sk-ant-…" },
      { key: "briefModel", label: "Brief model",  type: "select", options: [
          { label: "Claude Sonnet 4.6 (best quality)", value: "claude-sonnet-4-6" },
          { label: "Claude Haiku 4.5 (fast/cheap)",    value: "claude-haiku-4-5-20251001" },
          { label: "Claude Opus 4.7 (max reasoning)",  value: "claude-opus-4-7" },
        ], default: "claude-sonnet-4-6" },
      { key: "chatModel", label: "Chat assistant model", type: "select", options: [
          { label: "Claude Haiku 4.5 (fast)",     value: "claude-haiku-4-5-20251001" },
          { label: "Claude Sonnet 4.6 (smarter)", value: "claude-sonnet-4-6" },
        ], default: "claude-haiku-4-5-20251001" },
    ],
    docs: "Get an API key at console.anthropic.com → Settings → API Keys.",
  },
  {
    id: "openai",
    name: "OpenAI (alternative)",
    category: "AI",
    icon: "sparkle",
    bg: "#10a37f",
    summary: "Alternative LLM provider. Use either OpenAI OR Anthropic, not both — whichever is connected drives the AI features.",
    fields: [
      { key: "apiKey", label: "API key",   type: "secret", required: true, placeholder: "sk-…" },
      { key: "briefModel", label: "Brief model", type: "select", options: [
          { label: "gpt-4o",     value: "gpt-4o" },
          { label: "gpt-4o-mini",value: "gpt-4o-mini" },
        ], default: "gpt-4o" },
    ],
    docs: "Get an API key at platform.openai.com → API keys.",
  },

  // --- Email delivery --------------------------------------------------------
  {
    id: "smtp",
    name: "SMTP / email provider",
    category: "Email",
    icon: "mail",
    bg: "#0a4a67",
    summary: "Outbound email — confirmations, reminders, payment chases, cert delivery and broadcasts — is sent server-side from your domain. The key lives in Supabase; manage it from the Control center.",
    fields: [
      { key: "provider",   label: "Provider",         type: "select", required: true, options: [
          { label: "Generic SMTP (Gmail / iCloud / Office 365 / etc.)", value: "smtp" },
          { label: "Resend (resend.com)",                                value: "resend" },
          { label: "SendGrid",                                           value: "sendgrid" },
          { label: "Mailgun",                                            value: "mailgun" },
          { label: "Amazon SES",                                         value: "ses" },
          { label: "Postmark",                                           value: "postmark" },
      ] },
      { key: "host",       label: "SMTP host (only for generic SMTP)", type: "text",   placeholder: "smtp.gmail.com" },
      { key: "port",       label: "SMTP port",                          type: "text",   placeholder: "587" },
      { key: "secure",     label: "Use TLS/SSL",                         type: "select", options: [
          { label: "Yes — STARTTLS / SSL", value: "true" },
          { label: "No",                    value: "false" },
      ] },
      { key: "username",   label: "Username (or API key for Resend/SES)", type: "text",   placeholder: "you@yourfirm.com or re_xxxxx" },
      { key: "password",   label: "Password / API secret",                type: "secret", required: true },
      { key: "fromName",   label: "From name",                            type: "text",   required: true, placeholder: "Fast-ILA" },
      { key: "fromEmail",  label: "From email",                           type: "text",   required: true, placeholder: "bookings@yourfirm.com" },
      { key: "replyTo",    label: "Reply-to (optional)",                  type: "text",   placeholder: "info@yourfirm.com" },
    ],
    docs: "Credentials are stored locally and included in every n8n webhook payload under `smtp:{}`. Your n8n workflow uses them in its email node so you only configure email once. For Gmail use an App Password; for Resend use your API key as both username and password.",
  },

  // --- Logistics -------------------------------------------------------------
  {
    id: "royal_mail",
    name: "Royal Mail Click & Drop",
    category: "Logistics",
    icon: "stamp",
    bg: "#cc0000",
    summary: "Auto-creates Special Delivery tracking numbers for wet-signature bookings and writes them onto the booking.",
    fields: [
      { key: "apiKey",     label: "Click & Drop API key",  type: "secret", required: true },
      { key: "accountNo",  label: "Account number",        type: "text",   required: true },
      { key: "service",    label: "Default service",       type: "select", options: [
          { label: "Special Delivery Guaranteed by 1pm",   value: "STL1" },
          { label: "Special Delivery Guaranteed by 9am",   value: "STL9" },
          { label: "Signed For 1st Class",                 value: "SF1" },
        ], default: "STL1" },
    ],
    docs: "Get a key at business.parcel.royalmail.com → Click & Drop → Settings → Integrations.",
  },
];

const loadIntegrations = () => {
  try { return JSON.parse(localStorage.getItem(INT_STORE_KEY) || "{}"); }
  catch (_e) { return {}; }
};
const saveIntegrations = (data) => {
  try {
    localStorage.setItem(INT_STORE_KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "integrations" } }));
  } catch (_e) {}
};

// ============================================================================

const SecretMask = ({ value }) => {
  if (!value) return <span className="cell-sub">—</span>;
  const s = String(value);
  return <span className="mono">{s.slice(0, 4)}{"•".repeat(Math.max(0, s.length - 8))}{s.slice(-4)}</span>;
};

const IntegrationCard = ({ entry, config, serverManaged, serverConnected, onConnect, onDisconnect, onOpenControl }) => {
  const localConnected = !!config && Object.values(config).some(v => v != null && v !== "");
  const connected = serverManaged ? serverConnected : localConnected;
  return (
    <div className="integration-card" style={{
      border: "1px solid #e4e8ec", borderRadius: 12, padding: 18, background: "#fff",
      display: "flex", flexDirection: "column", gap: 10, minHeight: 200,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, background: entry.bg,
            color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon name={entry.icon} size={20}/>
          </div>
          <div>
            <div style={{ fontWeight: 700, color: "#063952" }}>{entry.name}</div>
            <div style={{ fontSize: 11, color: "#5b6b76", textTransform: "uppercase", letterSpacing: "0.05em" }}>{entry.category}</div>
          </div>
        </div>
        <span className={`pill ${connected ? "pill-success" : "pill-muted"}`}>
          {connected ? <><Icon name="check" size={11} stroke={3}/> Connected</> : "Not connected"}
        </span>
      </div>
      <p style={{ fontSize: 13, color: "#5b6b76", margin: 0, flex: 1 }}>{entry.summary}</p>
      {serverManaged ? (
        <>
          <div style={{ fontSize: 11.5, color: connected ? "#1f7a46" : "#7a5a12", display: "flex", alignItems: "center", gap: 5 }}>
            <Icon name="lock" size={11}/> {connected ? "Key stored securely in Supabase" : "Set this key server-side (not in the browser)"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={onOpenControl}>
              <Icon name="shield" size={12}/> Manage in Control center
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-navy btn-sm" onClick={() => onConnect(entry)}>
            <Icon name={connected ? "edit" : "plus"} size={12}/> {connected ? "Edit" : "Connect"}
          </button>
          {connected && (
            <button className="btn btn-ghost btn-sm" onClick={() => onDisconnect(entry)} style={{ color: "#9a1c1c" }}>
              <Icon name="trash" size={12}/> Disconnect
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// These providers' credentials live SERVER-SIDE (Supabase secrets), not in the
// browser — so this tab reads their real status instead of localStorage.
const SERVER_MANAGED_IDS = ["supabase", "google_calendar", "anthropic", "openai", "smtp"];
const serverConnectedFor = (id, secrets, live) => {
  switch (id) {
    case "supabase":        return !!live;
    case "google_calendar": return !!secrets.CALENDAR_GOOGLE;
    case "outlook":         return !!secrets.CALENDAR_MS;
    case "anthropic":       return !!secrets.ANTHROPIC_API_KEY;
    case "openai":          return !!secrets.OPENAI_API_KEY;
    case "smtp":            return !!secrets.RESEND_API_KEY;   // we send email via Resend
    default:                return false;
  }
};

const ConnectModal = ({ open, onClose, entry, initial, onSaved }) => {
  const [form, setForm] = React.useState({});
  const [reveal, setReveal] = React.useState({});
  const [testStatus, setTestStatus] = React.useState(null);
  const [testing, setTesting] = React.useState(false);

  React.useEffect(() => {
    if (open && entry) {
      const base = {};
      for (const f of entry.fields) {
        base[f.key] = initial?.[f.key] != null ? initial[f.key] : (f.default != null ? f.default : (f.type === "boolean" ? false : ""));
      }
      setForm(base);
      setReveal({});
      setTestStatus(null);
    }
  }, [open, entry, initial]);

  if (!entry) return null;

  const setVal = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
  const missing = entry.fields.filter(f => f.required && !form[f.key]).map(f => f.label);

  const submit = () => {
    if (missing.length > 0) { fiToast("Missing required: " + missing.join(", "), "err"); return; }
    const all = loadIntegrations();
    all[entry.id] = form;
    saveIntegrations(all);
    // For Supabase, also seed the runtime config so the live banner reflects it
    if (entry.id === "supabase" && window.FAST_ILA_CONFIG) {
      window.FAST_ILA_CONFIG.supabaseUrl = form.url || "";
      window.FAST_ILA_CONFIG.supabaseAnonKey = form.anonKey || "";
      if (window.FAST_ILA_CONFIG.features) window.FAST_ILA_CONFIG.features.enforceAuth = !!form.enforceAuth;
    }
    onSaved && onSaved(form);
    fiToast(`${entry.name} ${initial ? "updated" : "connected"}`);
    onClose();
  };

  const runTest = async () => {
    if (!entry.test) return;
    setTesting(true);
    setTestStatus(null);
    try {
      const msg = await entry.test(form);
      setTestStatus({ ok: true, msg: typeof msg === "string" ? msg : "OK" });
    } catch (e) {
      setTestStatus({ ok: false, msg: e.message || String(e) });
    } finally {
      setTesting(false);
    }
  };

  // Generate a config.js snippet for Supabase to make setup obvious
  const supabaseSnippet = entry.id === "supabase"
    ? `window.FAST_ILA_CONFIG = {\n  supabaseUrl:     "${form.url || ""}",\n  supabaseAnonKey: "${form.anonKey || ""}",\n  portalReturnUrl: window.location.origin + window.location.pathname,\n  features: { realBackend: true, enforceAuth: ${!!form.enforceAuth}, sendEmails: true },\n  brand: { firm: "Your firm", domain: "your-domain.com", supportEmail: "info@your-domain.com" },\n};`
    : null;

  return (
    <Modal open={open} onClose={onClose} title={`Connect ${entry.name}`} subtitle={entry.summary} maxWidth={680}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {entry.canTest && (
            <button className="btn btn-ghost" onClick={runTest} disabled={testing || missing.length > 0}>
              {testing ? "Testing…" : <><Icon name="bolt" size={13}/> Test connection</>}
            </button>
          )}
          <button className="btn btn-navy" onClick={submit} disabled={missing.length > 0}>
            <Icon name="check" size={14}/> Save
          </button>
        </>
      }>
      <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {entry.fields.map(f => {
          if (f.type === "boolean") {
            return (
              <div key={f.key} style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, padding: "8px 0" }}>
                <input type="checkbox" id={`int-${f.key}`} checked={!!form[f.key]} onChange={(e) => setVal(f.key, e.target.checked)}/>
                <label htmlFor={`int-${f.key}`} style={{ fontSize: 13, color: "#063952", cursor: "pointer" }}>{f.label}</label>
              </div>
            );
          }
          if (f.type === "select") {
            return (
              <div key={f.key} style={{ gridColumn: "1 / -1" }}>
                <label className="field-label">{f.label}{f.required && " *"}</label>
                <select className="field-input" value={form[f.key] || ""} onChange={(e) => setVal(f.key, e.target.value)}>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            );
          }
          const isSecret = f.type === "secret";
          const isFull = f.type === "url" || isSecret || (entry.fields.length === 1);
          return (
            <div key={f.key} style={{ gridColumn: isFull ? "1 / -1" : "auto" }}>
              <label className="field-label">{f.label}{f.required && " *"}</label>
              <div style={{ position: "relative" }}>
                <input
                  className="field-input"
                  type={isSecret && !reveal[f.key] ? "password" : "text"}
                  value={form[f.key] || ""}
                  placeholder={f.placeholder || ""}
                  onChange={(e) => setVal(f.key, e.target.value)}
                  style={isSecret ? { paddingRight: 40 } : null}
                  autoComplete="off"
                  spellCheck={false}
                />
                {isSecret && (
                  <button type="button"
                    onClick={() => setReveal(r => ({ ...r, [f.key]: !r[f.key] }))}
                    style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                      background: "transparent", border: 0, padding: 4, cursor: "pointer", color: "#5b6b76" }}
                    title={reveal[f.key] ? "Hide" : "Reveal"}>
                    <Icon name={reveal[f.key] ? "x" : "search"} size={14}/>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {testStatus && (
          <div style={{
            gridColumn: "1 / -1", padding: "10px 12px", borderRadius: 8, fontSize: 13,
            background: testStatus.ok ? "#e6f7c8" : "#fff1f1",
            color:      testStatus.ok ? "#1a4205" : "#9a1c1c",
            border: "1px solid " + (testStatus.ok ? "#b9d995" : "#f3c2c2"),
          }}>
            <Icon name={testStatus.ok ? "check" : "x-circle"} size={13}/> {testStatus.msg}
          </div>
        )}

        {entry.docs && (
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5b6b76", background: "#f7f5ee", padding: 12, borderRadius: 8 }}>
            <Icon name="info" size={12}/> <strong>How to get credentials:</strong> {entry.docs}
          </div>
        )}

        {supabaseSnippet && form.url && form.anonKey && (
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">Step 2 — paste this into <span className="mono">config.js</span> and refresh once to enable live mode</label>
            <textarea
              className="field-input mono"
              rows={9}
              value={supabaseSnippet}
              readOnly
              onClick={(e) => e.target.select()}
              style={{ fontSize: 11, background: "#063952", color: "#e6f7c8" }}
            />
            <button className="btn btn-ghost btn-sm" type="button" style={{ marginTop: 6 }}
              onClick={() => { navigator.clipboard?.writeText(supabaseSnippet); fiToast("Snippet copied"); }}>
              <Icon name="external" size={12}/> Copy snippet
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
};

const IntegrationsView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  const [all, setAll] = React.useState(loadIntegrations);
  const [connectEntry, setConnectEntry] = React.useState(null);
  const [disconnectEntry, setDisconnectEntry] = React.useState(null);
  const [filter, setFilter] = React.useState("all");
  const live = FastILA?.mode === "live";
  const [secrets, setSecrets] = React.useState({});

  // Live-update if changed in another tab
  React.useEffect(() => {
    const onChange = () => setAll(loadIntegrations());
    window.addEventListener("fastila:store-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("fastila:store-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  // Pull the REAL server-side secret status (Google/email/AI etc. live in
  // Supabase secrets, not this browser) so the cards reflect reality.
  React.useEffect(() => {
    if (!live || !FastILA?.platform?.secrets) return;
    FastILA.platform.secrets().then(s => setSecrets(s || {})).catch(() => {});
  }, [live]);

  const isConnectedEntry = (e) => SERVER_MANAGED_IDS.includes(e.id)
    ? serverConnectedFor(e.id, secrets, live)
    : (all[e.id] && Object.values(all[e.id]).some(v => v != null && v !== ""));

  const openControl = () => { if (typeof window.fiSetDashView === "function") window.fiSetDashView("control"); };

  const categories = ["all", ...Array.from(new Set(INT_CATALOG.map(e => e.category)))];
  const list = filter === "all" ? INT_CATALOG : INT_CATALOG.filter(e => e.category === filter);
  const connectedCount = INT_CATALOG.filter(isConnectedEntry).length;

  const onSaved = () => setAll(loadIntegrations());

  const doDisconnect = () => {
    if (!disconnectEntry) return;
    const next = { ...all };
    delete next[disconnectEntry.id];
    saveIntegrations(next);
    setAll(next);
    fiToast(`${disconnectEntry.name} disconnected`);
    setDisconnectEntry(null);
  };

  return (
    <div className="dash-grid">
      <section className="panel integrations-banner">
        <div className="row items-center gap-3">
          <div className="integrations-banner-icon"><Icon name="settings" size={20}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>Integrations &amp; automation</h2>
            <p className="panel-sub">Provider keys (Supabase, Google, AI, email/SMS) are stored <strong>securely server-side</strong> and managed from the <strong>Control center</strong> — this page reads their real status. Only <strong>n8n</strong> &amp; <strong>Airtable</strong> are configured here in the browser.</p>
          </div>
        </div>
        <div className="row gap-2">
          <span className="pill pill-info">{connectedCount} of {INT_CATALOG.length} connected</span>
        </div>
      </section>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {categories.map(c => (
          <button
            key={c}
            className={`pill ${filter === c ? "pill-navy" : "pill-muted"}`}
            onClick={() => setFilter(c)}
            style={{ cursor: "pointer", border: 0 }}>
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
        {list.map(entry => (
          <IntegrationCard
            key={entry.id}
            entry={entry}
            config={all[entry.id]}
            serverManaged={SERVER_MANAGED_IDS.includes(entry.id)}
            serverConnected={serverConnectedFor(entry.id, secrets, live)}
            onConnect={(e) => setConnectEntry(e)}
            onDisconnect={(e) => setDisconnectEntry(e)}
            onOpenControl={openControl}
          />
        ))}
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">What fires what</h2>
        </header>
        <div style={{ padding: "8px 14px 18px", fontSize: 13, color: "#5b6b76" }}>
          <p style={{ marginTop: 8 }}>These run automatically off your Supabase backend:</p>
          <ul style={{ marginTop: 8, paddingLeft: 20, display: "grid", gap: 6 }}>
            <li><strong>Booking created</strong> → confirmation email + SMS queued · Google Calendar event + Meet link created</li>
            <li><strong>24h / 1h before call</strong> → reminder email + SMS sent</li>
            <li><strong>Payment outstanding (48h)</strong> → payment-chase email + SMS (auto-cancels once paid)</li>
            <li><strong>Documents uploaded</strong> → AI pre-call brief (Claude / OpenAI)</li>
            <li><strong>Recording uploaded / Meet ended</strong> → transcript + AI file note onto the booking</li>
            <li><strong>Wet-sig dispatch · ready to post</strong> → Royal Mail tracking written onto the booking</li>
          </ul>
        </div>
      </section>

      <ConnectModal
        open={!!connectEntry}
        onClose={() => setConnectEntry(null)}
        entry={connectEntry}
        initial={connectEntry ? all[connectEntry.id] : null}
        onSaved={onSaved}
      />
      <ConfirmModal
        open={!!disconnectEntry}
        onClose={() => setDisconnectEntry(null)}
        title={`Disconnect ${disconnectEntry?.name}?`}
        body={<p>Stored credentials will be removed from this browser. You can reconnect anytime.</p>}
        confirmLabel="Disconnect"
        danger
        onConfirm={doDisconnect}
      />
    </div>
  );
};

// Expose a tiny helper any other view can use to check "is integration X connected?"
window.fiIntegration = {
  get: (id) => {
    try { return JSON.parse(localStorage.getItem(INT_STORE_KEY) || "{}")[id] || null; }
    catch (_e) { return null; }
  },
  isConnected: (id) => {
    const c = window.fiIntegration.get(id);
    return !!c && Object.values(c).some(v => v != null && v !== "");
  },
};

Object.assign(window, { IntegrationsView });

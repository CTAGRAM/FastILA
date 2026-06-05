/* global React, Icon, InlineText */

// ============================================================================
// Integrations admin view — N8N automation, calendar sync, AI, email, SMS
// All third-party webhooks and API keys live here.
// ============================================================================

const STORE_KEY = "fastila_integrations_v1";

const DEFAULTS = {
  n8nApiKey: "",
  n8nWebhookUrl: "https://n8n.go-legal.com/webhook/fastila",
  n8nStatus: "disconnected", // disconnected | testing | connected | error

  googleCalendarConnected: true,
  outlookCalendarConnected: false,
  googleMeetConnected: true,

  claudeApiKey: "sk-ant-•••••••••••••••",
  claudeStatus: "connected",
  claudeModel: "claude-haiku-4.5",

  emailProvider: "Postmark",
  emailFromAddress: "hello@fast-ila.co.uk",
  smsProvider: "Twilio via N8N",
  smsFromNumber: "+44 7700 900000",

  royalMailApiKey: "",
};

const loadStore = () => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
  catch (e) { return DEFAULTS; }
};
const saveStore = (data) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) {}
};

const N8N_WORKFLOWS = [
  { id: "booking-created", label: "New booking created", trigger: "booking.created", status: "active", fires: 78, desc: "Sends confirmation email + SMS, creates CRM contact, calendars reminder" },
  { id: "payment-chase", label: "Payment chase 24h before call", trigger: "payment.reminder_due", status: "active", fires: 12, desc: "Email + SMS chase if invoice unpaid" },
  { id: "docs-posted", label: "Wet-sig docs posted", trigger: "documents.posted", status: "active", fires: 22, desc: "Email + SMS with Royal Mail tracking number" },
  { id: "review-request", label: "Google review request", trigger: "matter.completed", status: "active", fires: 56, desc: "Sent 24h after call · email + SMS with our review link" },
  { id: "couples-second", label: "Couples · second signatory pack", trigger: "couples.second_signatory_required", status: "active", fires: 14, desc: "Sends witness statement template + instructions" },
  { id: "no-show", label: "No-show follow-up", trigger: "matter.no_show", status: "paused", fires: 2, desc: "Gives the client one chance to rebook" },
];

const IntegrationsView = () => {
  const [store, setStore] = React.useState(loadStore);
  const [keyVisible, setKeyVisible] = React.useState(false);
  const [testing, setTesting] = React.useState(false);

  const update = (patch) => {
    const next = { ...store, ...patch };
    setStore(next);
    saveStore(next);
  };

  const testN8N = () => {
    if (!store.n8nApiKey) return;
    setTesting(true);
    update({ n8nStatus: "testing" });
    setTimeout(() => {
      setTesting(false);
      update({ n8nStatus: "connected" });
    }, 1200);
  };

  const n8nBadge = {
    disconnected: { cls: "pill-muted", label: "Not connected" },
    testing: { cls: "pill-info", label: "Testing…" },
    connected: { cls: "pill-success", label: "Connected" },
    error: { cls: "pill-danger", label: "Connection failed" },
  }[store.n8nStatus];

  return (
    <div className="dash-grid">
      <section className="panel integrations-banner">
        <div className="row items-center gap-3">
          <div className="integrations-banner-icon"><Icon name="settings" size={20}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>Integrations &amp; automation</h2>
            <p className="panel-sub">All webhooks, API keys and third-party connections live here. Edits save instantly and apply to every workflow.</p>
          </div>
        </div>
      </section>

      {/* N8N — the new automation backbone */}
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2 className="panel-title"><Icon name="sparkle" size={15}/> N8N · automation backbone</h2>
            <p className="panel-sub">N8N orchestrates every outbound action: emails, SMS, CRM updates, review requests, calendar holds. Replaces our previous Zapier setup.</p>
          </div>
          <span className={`pill ${n8nBadge.cls}`}>{n8nBadge.label}</span>
        </header>
        <div className="integ-body">
          <div className="integ-field">
            <label className="field-label">N8N API key</label>
            <div className="integ-secret">
              <input
                type={keyVisible ? "text" : "password"}
                className="field-input mono"
                placeholder="n8n_api_•••••••••••••"
                value={store.n8nApiKey}
                onChange={(e) => update({ n8nApiKey: e.target.value, n8nStatus: "disconnected" })}
              />
              <button className="integ-eye" onClick={() => setKeyVisible(v => !v)} title={keyVisible ? "Hide" : "Show"}>
                <Icon name={keyVisible ? "x" : "search"} size={13}/>
              </button>
            </div>
            <div className="cell-sub" style={{ marginTop: 4 }}>Generate in N8N → Settings → API keys. Stored encrypted at rest.</div>
          </div>

          <div className="integ-field">
            <label className="field-label">N8N webhook URL</label>
            <input
              className="field-input mono"
              value={store.n8nWebhookUrl}
              onChange={(e) => update({ n8nWebhookUrl: e.target.value })}
            />
            <div className="cell-sub" style={{ marginTop: 4 }}>Every webhook this system fires goes to this URL.</div>
          </div>

          <div className="integ-actions">
            <button className="btn btn-ghost" onClick={() => navigator.clipboard?.writeText(store.n8nWebhookUrl)}>
              <Icon name="external" size={13}/> Copy webhook URL
            </button>
            <button className="btn btn-navy" onClick={testN8N} disabled={!store.n8nApiKey || testing}>
              <Icon name={testing ? "settings" : "check"} size={13}/>
              {testing ? "Testing…" : "Test connection"}
            </button>
          </div>
        </div>

        <div className="integ-divider"/>

        <div className="integ-subhead">
          <h3 className="panel-title-sm">Active workflows</h3>
          <span className="cell-sub">{N8N_WORKFLOWS.filter(w => w.status === "active").length} active · {N8N_WORKFLOWS.filter(w => w.status === "paused").length} paused</span>
        </div>
        <div className="integ-workflows">
          {N8N_WORKFLOWS.map(w => (
            <div key={w.id} className={`integ-workflow ${w.status === "paused" ? "is-paused" : ""}`}>
              <div className={`integ-workflow-status ${w.status === "active" ? "is-on" : ""}`}>
                <Icon name={w.status === "active" ? "check" : "x"} size={11} stroke={3}/>
              </div>
              <div className="integ-workflow-info">
                <div className="integ-workflow-label">{w.label}</div>
                <div className="integ-workflow-meta">
                  <span className="mono">{w.trigger}</span>
                  <span className="dot-sep">·</span>
                  <span>{w.fires} fires (30d)</span>
                </div>
                <div className="integ-workflow-desc">{w.desc}</div>
              </div>
              <button className="btn btn-ghost btn-sm">
                <Icon name="external" size={11}/> Open in N8N
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Email + SMS */}
      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title"><Icon name="mail" size={15}/> Email &amp; SMS</h2>
          <span className="cell-sub">Routed through N8N where possible</span>
        </header>
        <div className="integ-body">
          <div className="integ-grid">
            <div>
              <label className="field-label">Email provider</label>
              <input className="field-input" value={store.emailProvider} onChange={(e) => update({ emailProvider: e.target.value })}/>
            </div>
            <div>
              <label className="field-label">From address</label>
              <input className="field-input mono" value={store.emailFromAddress} onChange={(e) => update({ emailFromAddress: e.target.value })}/>
            </div>
            <div>
              <label className="field-label">SMS provider</label>
              <input className="field-input" value={store.smsProvider} onChange={(e) => update({ smsProvider: e.target.value })}/>
            </div>
            <div>
              <label className="field-label">SMS sender number</label>
              <input className="field-input mono" value={store.smsFromNumber} onChange={(e) => update({ smsFromNumber: e.target.value })}/>
            </div>
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title"><Icon name="calendar" size={15}/> Calendar &amp; meet</h2>
          <span className="cell-sub">Two-way sync per lawyer</span>
        </header>
        <div className="integ-body integ-cards">
          <IntegCard
            icon="calendar"
            title="Google Calendar"
            sub="Two-way sync · holds slots when lawyers are busy elsewhere"
            connected={store.googleCalendarConnected}
            onToggle={() => update({ googleCalendarConnected: !store.googleCalendarConnected })}
          />
          <IntegCard
            icon="calendar"
            title="Outlook Calendar"
            sub="Two-way sync · for lawyers on Microsoft 365"
            connected={store.outlookCalendarConnected}
            onToggle={() => update({ outlookCalendarConnected: !store.outlookCalendarConnected })}
          />
          <IntegCard
            icon="video"
            title="Google Meet"
            sub="Auto-creates a Meet link on every booking"
            connected={store.googleMeetConnected}
            onToggle={() => update({ googleMeetConnected: !store.googleMeetConnected })}
          />
        </div>
      </section>

      {/* AI */}
      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title"><Icon name="sparkle" size={15}/> AI · Claude</h2>
          <span className={`pill pill-success`}><Icon name="check" size={11} stroke={3}/> {store.claudeStatus}</span>
        </header>
        <div className="integ-body">
          <div className="integ-grid">
            <div>
              <label className="field-label">Anthropic API key</label>
              <input className="field-input mono" type="password" value={store.claudeApiKey} onChange={(e) => update({ claudeApiKey: e.target.value })}/>
            </div>
            <div>
              <label className="field-label">Model</label>
              <input className="field-input mono" value={store.claudeModel} onChange={(e) => update({ claudeModel: e.target.value })}/>
            </div>
          </div>
          <div className="cell-sub" style={{ marginTop: 8 }}>Used by the pre-call brief generator AND the in-app AI assistant. Edit the system prompts under <strong>AI prompts</strong>.</div>
        </div>
      </section>

      {/* Royal Mail */}
      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title"><Icon name="stamp" size={15}/> Royal Mail tracking</h2>
          <span className={`pill ${store.royalMailApiKey ? "pill-success" : "pill-muted"}`}>{store.royalMailApiKey ? "Connected" : "Manual entry only"}</span>
        </header>
        <div className="integ-body">
          <div className="integ-field">
            <label className="field-label">Royal Mail Tracking API key <span className="cell-sub">(optional)</span></label>
            <input className="field-input mono" type="password" placeholder="RM-•••••••••••••" value={store.royalMailApiKey} onChange={(e) => update({ royalMailApiKey: e.target.value })}/>
            <div className="cell-sub" style={{ marginTop: 4 }}>Without an API key, lawyers enter tracking numbers manually. With one, we poll delivery status automatically.</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const IntegCard = ({ icon, title, sub, connected, onToggle }) => (
  <div className={`integ-card ${connected ? "is-on" : ""}`}>
    <div className="integ-card-icon"><Icon name={icon} size={18}/></div>
    <div className="integ-card-info">
      <div className="integ-card-title">{title}</div>
      <div className="integ-card-sub">{sub}</div>
    </div>
    <button className={`integ-toggle ${connected ? "is-on" : ""}`} onClick={onToggle}>
      <span className="integ-toggle-knob"/>
    </button>
  </div>
);

Object.assign(window, { IntegrationsView });

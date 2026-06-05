/* global React, Icon, FastILA, fiToast, fiSetDashView */

// ============================================================================
// Integrations Control Center (Phase 4)
// One screen: connection/health of every provider + live engine status + test
// actions + copy-paste setup. Reads platform health (armed schedulers + counts)
// and a secrets-presence check (booleans only). New, self-contained, additive.
// ============================================================================

const CC_NAVY = "#063952";
const CC_MUTED = "#5b6b76";

const ccTone = {
  ok:     { bg: "#e4f3e9", fg: "#1f7a46", label: "Connected" },
  active: { bg: "#e4f3e9", fg: "#1f7a46", label: "Active" },
  need:   { bg: "#fdf3dc", fg: "#7a5a12", label: "Needs setup" },
  dormant:{ bg: "#fdf3dc", fg: "#7a5a12", label: "Dormant" },
  opt:    { bg: "#eef1f3", fg: "#6b7b85", label: "Optional" },
  err:    { bg: "#fbe5e1", fg: "#a3271a", label: "Attention" },
};

const CCPill = ({ tone }) => {
  const t = ccTone[tone] || ccTone.opt;
  return <span style={{ background: t.bg, color: t.fg, padding: "2px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{t.label}</span>;
};

const CCCard = ({ icon, name, tone, detail, actions }) => (
  <div className="panel" style={{ padding: 14, border: "1px solid #e3e9ed", borderRadius: 12, display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#eef4f7", display: "grid", placeItems: "center", color: CC_NAVY }}><Icon name={icon} size={16}/></div>
      <div style={{ flex: 1, fontWeight: 700, color: CC_NAVY, fontSize: 13.5 }}>{name}</div>
      <CCPill tone={tone}/>
    </div>
    {detail && <div style={{ fontSize: 12, color: CC_MUTED, lineHeight: 1.45 }}>{detail}</div>}
    {actions && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: "auto" }}>{actions}</div>}
  </div>
);

const CCSection = ({ title, children }) => (
  <section style={{ marginBottom: 22 }}>
    <h2 style={{ fontSize: 13, fontWeight: 700, color: CC_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{title}</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>{children}</div>
  </section>
);

const ccCopy = (text, label) => {
  try { navigator.clipboard.writeText(text); fiToast((label || "Copied") + " ✓"); }
  catch (_e) { fiToast("Copy failed — select manually"); }
};
const go = (view) => { if (typeof fiSetDashView === "function") fiSetDashView(view); };

const ControlCenterView = () => {
  const tick = (typeof FastILA?.useStore === "function") ? FastILA.useStore()[0] : 0;
  const live = FastILA?.mode === "live";
  const supaUrl = FastILA?.config?.supabaseUrl || "";
  const ref = supaUrl.replace(/^https?:\/\//, "").split(".")[0] || "your-project";
  const fnBase = supaUrl ? `${supaUrl}/functions/v1` : "https://<ref>.supabase.co/functions/v1";

  const [health, setHealth] = React.useState(null);
  const [secrets, setSecrets] = React.useState(null);
  const [firm, setFirm] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState("");
  const [showSetup, setShowSetup] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!live) { setLoading(false); return; }
    try {
      const [h, s, f] = await Promise.all([
        FastILA.platform.health().catch(() => null),
        FastILA.platform.secrets().catch(() => null),
        FastILA.calendar.firmStatus().catch(() => null),
      ]);
      setHealth(h); setSecrets(s); setFirm(f);
    } finally { setLoading(false); }
  }, [live]);
  React.useEffect(() => { load(); }, [load, tick]);

  const counts = (health && health.counts) || {};
  const armed = (health && health.armed) || {};
  const sec = secrets || {};
  const firmConnected = !!(firm && firm.status === "connected");

  const connectFirm = async () => {
    try { const url = await FastILA.calendar.connectFirmUrl(); window.location.href = url; }
    catch (e) { fiToast(e.message || "Could not start Google connect"); }
  };
  const disconnectFirm = async () => {
    setBusy("firm");
    try { await FastILA.calendar.disconnectFirm(); fiToast("Firm calendar disconnected"); await load(); }
    catch (e) { fiToast(e.message); } finally { setBusy(""); }
  };

  const test = async (key, fn, okMsg) => {
    setBusy(key);
    try { const r = await fn(); fiToast(r?.mock ? "Demo mode — nothing ran" : okMsg(r)); await load(); }
    catch (e) { fiToast("Failed: " + e.message); }
    finally { setBusy(""); }
  };

  // status helpers
  const reqTone = (configured) => configured ? "ok" : "need";
  const optTone = (configured) => configured ? "ok" : "opt";

  const secretsCmd = `supabase secrets set \\
  RESEND_API_KEY=re_xxx FROM_EMAIL=bookings@fast-ila.co.uk \\
  TWILIO_ACCOUNT_SID=ACxxx TWILIO_AUTH_TOKEN=xxx TWILIO_FROM=+44xxx \\
  OPENAI_API_KEY=sk-xxx ANTHROPIC_API_KEY=sk-ant-xxx \\
  CALENDAR_GOOGLE_CLIENT_ID=xxx CALENDAR_GOOGLE_CLIENT_SECRET=xxx \\
  PORTAL_URL=https://app.fast-ila.co.uk \\
  --project-ref ${ref}`;
  const armCmd = `-- Run in Supabase SQL editor to ARM the schedulers (replace the key):
select vault.create_secret('<SERVICE_ROLE_KEY>', 'fi_service_role_key');
select vault.create_secret('${fnBase}/dispatch-automations', 'fi_edge_url');
select vault.create_secret('${fnBase}/calendar',             'fi_calendar_url');
select vault.create_secret('${fnBase}/recordings-ingest',    'fi_recordings_url');`;
  const redirectUri = `${supaUrl || "https://<ref>.supabase.co"}/functions/v1/calendar-oauth-callback`;

  const btn = (label, onClick, k, primary) => (
    <button className={`btn ${primary ? "btn-navy" : "btn-ghost"} btn-sm`} disabled={!!busy} onClick={onClick}>{busy === k ? "…" : label}</button>
  );

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 16px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: CC_NAVY, fontSize: 28 }}>Integrations control center</h1>
          <p style={{ color: CC_MUTED, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Every backend service in one place — what's connected, what still needs a key, and live health of your automations, calendars and transcripts. Run a test for any pipeline.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}><Icon name="arrow-right" size={12}/> Refresh</button>
      </header>

      {!live && (
        <section className="panel" style={{ padding: 16, marginBottom: 16, background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 12, color: "#7a4f00", fontSize: 13 }}>
          Demo mode — add your Supabase keys in config.js to see live status and run tests.
        </section>
      )}
      {loading && <div style={{ color: CC_MUTED, padding: 20 }}>Loading health…</div>}

      {live && !loading && (
        <>
          <CCSection title="Backend">
            <CCCard icon="bolt" name="Supabase" tone="ok"
              detail={<>Project <code>{ref}</code> · live backend connected.</>}/>
          </CCSection>

          <CCSection title="Messaging (reminders, confirmations)">
            <CCCard icon="mail" name="Email · Resend" tone={reqTone(sec.RESEND_API_KEY && sec.FROM_EMAIL)}
              detail={sec.RESEND_API_KEY && sec.FROM_EMAIL ? `Sent ${counts.msgs_sent ?? 0} · ${counts.msgs_failed ?? 0} failed.` : "Set RESEND_API_KEY + FROM_EMAIL to send email."}/>
            <CCCard icon="phone" name="SMS · Twilio" tone={reqTone(sec.TWILIO_ACCOUNT_SID && sec.TWILIO_AUTH_TOKEN && sec.TWILIO_SENDER)}
              detail={sec.TWILIO_ACCOUNT_SID && sec.TWILIO_AUTH_TOKEN && sec.TWILIO_SENDER ? "Ready to send SMS." : "Set TWILIO_ACCOUNT_SID + AUTH_TOKEN + FROM/Messaging SID."}/>
            <CCCard icon="bolt" name="Automation engine" tone={armed.dispatch ? "active" : "dormant"}
              detail={`${counts.rules_enabled ?? 0} rules on · ${counts.msgs_pending ?? 0} queued · ${counts.msgs_sent ?? 0} sent${counts.msgs_failed ? ` · ${counts.msgs_failed} failed` : ""}.${armed.dispatch ? "" : " Dormant until armed (see setup)."}`}
              actions={<>{btn("Send due now", () => test("disp", () => FastILA.automations.dispatchNow(), (r) => `Processed ${r?.processed ?? 0} · sent ${r?.sent ?? 0}`), "disp", true)}{btn("Open", () => go("autocenter"))}</>}/>
          </CCSection>

          <CCSection title="AI">
            <CCCard icon="sparkle" name="Transcription · OpenAI Whisper" tone={reqTone(sec.OPENAI_API_KEY)}
              detail={sec.OPENAI_API_KEY ? `${counts.transcripts ?? 0} transcripts created.` : "Set OPENAI_API_KEY to transcribe recordings."}/>
            <CCCard icon="sparkle" name="Summaries · Anthropic" tone={sec.ANTHROPIC_API_KEY ? "ok" : (sec.OPENAI_API_KEY ? "opt" : "need")}
              detail={sec.ANTHROPIC_API_KEY ? "Claude summarises file notes." : sec.OPENAI_API_KEY ? "Optional — falling back to OpenAI for summaries." : "Set ANTHROPIC_API_KEY or OPENAI_API_KEY for AI file notes."}/>
          </CCSection>

          <CCSection title="Calendars & transcripts">
            <CCCard icon="calendar" name="Firm Google calendar (Meet links)" tone={firmConnected ? "active" : (sec.CALENDAR_GOOGLE ? "need" : "opt")}
              detail={firmConnected
                ? `Connected: ${firm.account_email || "firm account"}. Every booking gets a Meet link; the lawyer & client are invited as attendees.`
                : sec.CALENDAR_GOOGLE ? "Connect ONE firm Google Workspace account — it mints every booking's Meet link (no per-lawyer setup)." : "Set CALENDAR_GOOGLE_CLIENT_ID + SECRET first, then connect."}
              actions={firmConnected
                ? <button className="btn btn-ghost btn-sm" disabled={busy === "firm"} onClick={disconnectFirm}>Disconnect</button>
                : <button className="btn btn-navy btn-sm" disabled={!sec.CALENDAR_GOOGLE} onClick={connectFirm}><Icon name="calendar" size={12}/> Connect firm Google</button>}/>
            <CCCard icon="calendar" name="Per-lawyer calendars (availability)" tone={reqTone(sec.CALENDAR_GOOGLE)}
              detail={sec.CALENDAR_GOOGLE ? `${counts.calendars_connected ?? 0} lawyer calendar(s) connected (optional — for diary busy-times).` : "Set CALENDAR_GOOGLE_CLIENT_ID + SECRET."}
              actions={btn("Open Calendars", () => go("calendars"))}/>
            <CCCard icon="calendar" name="Calendar sync scheduler" tone={armed.calendar ? "active" : "dormant"}
              detail={`${counts.calendars_connected ?? 0} connected${counts.calendars_error ? ` · ${counts.calendars_error} error` : ""}. ${armed.calendar ? "Syncing every 15 min." : "Dormant until armed."}`}
              actions={btn("Sync now", () => test("sync", () => FastILA.calendar.syncNow(), (r) => `Synced ${r?.connections ?? 0} calendar(s)`), "sync", true)}/>
            <CCCard icon="video" name="Transcript capture" tone={armed.recordings ? "active" : "dormant"}
              detail={`${counts.recordings ?? 0} recordings · ${counts.transcripts ?? 0} transcripts. ${armed.recordings ? "Pulling hourly." : "Dormant until armed."}`}
              actions={<>{btn("Pull now", () => test("ing", () => FastILA.recordings.ingestNow(), (r) => `Ingested ${r?.ingested ?? 0}`), "ing", true)}{btn("Open", () => go("recordings"))}</>}/>
          </CCSection>

          {/* Setup */}
          <section className="panel" style={{ padding: 16, border: "1px solid #e3e9ed", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setShowSetup(s => !s)}>
              <h2 className="panel-title" style={{ margin: 0, fontSize: 15 }}><Icon name="settings" size={15}/> Setup & arming commands</h2>
              <Icon name={showSetup ? "chevron-down" : "chevron-right"} size={16}/>
            </div>
            {showSetup && (
              <div style={{ marginTop: 14, display: "grid", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: CC_NAVY, marginBottom: 6 }}>1 · Set provider secrets (CLI)</div>
                  <pre style={ccPre}>{secretsCmd}</pre>
                  <button className="btn btn-ghost btn-sm" onClick={() => ccCopy(secretsCmd, "Command copied")}><Icon name="copy" size={12}/> Copy</button>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: CC_NAVY, marginBottom: 6 }}>2 · Arm the schedulers (SQL editor)</div>
                  <pre style={ccPre}>{armCmd}</pre>
                  <button className="btn btn-ghost btn-sm" onClick={() => ccCopy(armCmd, "SQL copied")}><Icon name="copy" size={12}/> Copy</button>
                </div>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: CC_NAVY, marginBottom: 6 }}>3 · OAuth redirect URI (register in Google + Microsoft)</div>
                  <pre style={ccPre}>{redirectUri}</pre>
                  <button className="btn btn-ghost btn-sm" onClick={() => ccCopy(redirectUri, "URL copied")}><Icon name="copy" size={12}/> Copy</button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

const ccPre = {
  background: "#0c2330", color: "#e6f7c8", borderRadius: 8, padding: "12px 14px",
  fontSize: 12, lineHeight: 1.5, overflowX: "auto", whiteSpace: "pre", margin: 0,
};

window.ControlCenterView = ControlCenterView;

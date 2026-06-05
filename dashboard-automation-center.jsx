/* global React, Icon, FastILA, fiToast */

// ============================================================================
// Automation Center — Supabase-native reminders / email / SMS
// ----------------------------------------------------------------------------
// Admin view to turn each automation on/off, tune its timing + channel, edit
// the message templates, and watch deliveries land in real time. The engine
// itself runs in Supabase (triggers → message queue → pg_cron → edge function),
// so everything here drives live behaviour with no n8n required.
//
// New, self-contained component — additive only. Uses the same design tokens
// (navy #063952, lime, panels, btns) as the rest of the dashboard.
// ============================================================================

const AC_NAVY = "#063952";
const AC_MUTED = "#5b6b76";

const acStatusStyle = (s) => ({
  sent:      { bg: "#e4f3e9", fg: "#1f7a46", label: "Sent" },
  pending:   { bg: "#fdf3dc", fg: "#7a5a12", label: "Queued" },
  failed:    { bg: "#fbe5e1", fg: "#a3271a", label: "Failed" },
  cancelled: { bg: "#eef1f3", fg: "#6b7b85", label: "Cancelled" },
  skipped:   { bg: "#eef1f3", fg: "#6b7b85", label: "Skipped" },
}[s] || { bg: "#eef1f3", fg: "#6b7b85", label: s || "—" });

const ACStatusPill = ({ status }) => {
  const s = acStatusStyle(status);
  return <span style={{ background: s.bg, color: s.fg, padding: "2px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, whiteSpace: "nowrap" }}>{s.label}</span>;
};

const ACChannelChips = ({ value, onChange }) => {
  const opts = [{ id: "email", label: "Email", icon: "mail" }, { id: "sms", label: "SMS", icon: "phone" }, { id: "both", label: "Both", icon: "bolt" }];
  return (
    <div style={{ display: "inline-flex", gap: 4, background: "#eef1f3", borderRadius: 8, padding: 3 }}>
      {opts.map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5, border: 0, cursor: "pointer",
            padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600,
            background: value === o.id ? AC_NAVY : "transparent",
            color: value === o.id ? "#e6f7c8" : AC_MUTED,
          }}>
          <Icon name={o.icon} size={12}/> {o.label}
        </button>
      ))}
    </div>
  );
};

const ACToggle = ({ on, onClick }) => (
  <button onClick={onClick} aria-pressed={on} title={on ? "Enabled" : "Disabled"}
    style={{
      width: 42, height: 24, borderRadius: 999, border: 0, cursor: "pointer", position: "relative",
      background: on ? "#2f8b5b" : "#cbd5db", transition: "background .15s", flexShrink: 0,
    }}>
    <span style={{
      position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%",
      background: "#fff", transition: "left .15s", boxShadow: "0 1px 2px rgba(0,0,0,.25)",
    }}/>
  </button>
);

// Human description of a rule's timing.
const acTimingText = (r) => {
  if (r.anchor === "immediate") return "Immediately on booking";
  const mins = Math.abs(r.offset_minutes || 0);
  const unit = mins % 60 === 0 ? `${mins / 60} hour${mins / 60 === 1 ? "" : "s"}` : `${mins} min`;
  if (r.anchor === "appointment") return (r.offset_minutes < 0 ? `${unit} before the call` : `${unit} after the call`);
  return `${unit} after booking`;  // booking_created
};

const ACRuleCard = ({ rule, onSave }) => {
  const [r, setR] = React.useState(rule);
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => { setR(rule); }, [rule.key, rule.updated_at]);

  const patch = (p) => setR(prev => ({ ...prev, ...p }));
  const commit = async (p) => {
    try { await onSave(r.key, p); }
    catch (e) { fiToast("Couldn't save: " + e.message); }
  };
  const toggle = () => { const next = !r.enabled; patch({ enabled: next }); commit({ enabled: next }); };
  const setChannel = (c) => { patch({ channel: c }); commit({ channel: c }); };

  const editable = r.anchor !== "immediate";
  const minsLabel = r.anchor === "appointment" ? "minutes before the call" : "minutes after booking";
  const minsValue = r.anchor === "appointment" ? Math.abs(r.offset_minutes || 0) : (r.offset_minutes || 0);
  const setMins = (v) => {
    const n = Math.max(0, parseInt(v || "0", 10) || 0);
    patch({ offset_minutes: r.anchor === "appointment" ? -n : n });
  };

  const saveAll = async () => {
    setSaving(true);
    await commit({
      channel: r.channel, enabled: r.enabled, offset_minutes: r.offset_minutes,
      template_subject: r.template_subject, template_body: r.template_body, sms_body: r.sms_body,
    });
    setSaving(false); setOpen(false); fiToast("Automation saved");
  };

  return (
    <div className="panel" style={{ padding: 16, marginBottom: 12, border: "1px solid #e3e9ed", borderRadius: 12, opacity: r.enabled ? 1 : 0.72 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <ACToggle on={r.enabled} onClick={toggle}/>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: AC_NAVY, fontSize: 14.5 }}>{r.label}</div>
          <div style={{ fontSize: 12.5, color: AC_MUTED, marginTop: 2 }}>{r.description}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, color: AC_NAVY, fontWeight: 600 }}>
          <Icon name="clock" size={13}/> {acTimingText(r)}
        </div>
        <ACChannelChips value={r.channel} onChange={setChannel}/>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => !o)}>
          <Icon name={open ? "chevron-down" : "edit"} size={12}/> {open ? "Close" : "Edit message"}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #eef1f3", display: "grid", gap: 12 }}>
          {editable && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label className="field-label" style={{ margin: 0 }}>Timing</label>
              <input className="field-input" type="number" min="0" value={minsValue}
                onChange={(e) => setMins(e.target.value)} style={{ width: 110 }}/>
              <span style={{ fontSize: 12.5, color: AC_MUTED }}>{minsLabel}</span>
            </div>
          )}
          {(r.channel === "email" || r.channel === "both") && (
            <>
              <div>
                <label className="field-label">Email subject</label>
                <input className="field-input" value={r.template_subject || ""} onChange={(e) => patch({ template_subject: e.target.value })}/>
              </div>
              <div>
                <label className="field-label">Email body</label>
                <textarea className="field-input" rows={6} value={r.template_body || ""} onChange={(e) => patch({ template_body: e.target.value })} style={{ resize: "vertical", fontFamily: "inherit" }}/>
              </div>
            </>
          )}
          {(r.channel === "sms" || r.channel === "both") && (
            <div>
              <label className="field-label">SMS text</label>
              <textarea className="field-input" rows={3} value={r.sms_body || ""} onChange={(e) => patch({ sms_body: e.target.value })} style={{ resize: "vertical", fontFamily: "inherit" }}/>
            </div>
          )}
          <div style={{ fontSize: 12, color: AC_MUTED }}>
            Tokens: <code>{"{{first_name}}"}</code> <code>{"{{client_name}}"}</code> <code>{"{{ref}}"}</code> <code>{"{{service_name}}"}</code> <code>{"{{lawyer_name}}"}</code> <code>{"{{date}}"}</code> <code>{"{{time}}"}</code> <code>{"{{amount}}"}</code> <code>{"{{portal_url}}"}</code>
          </div>
          <div>
            <button className="btn btn-navy btn-sm" onClick={saveAll} disabled={saving}>
              <Icon name="check" size={12}/> {saving ? "Saving…" : "Save message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ACStat = ({ label, value, tone }) => (
  <div style={{ background: "#fff", border: "1px solid #e3e9ed", borderRadius: 10, padding: "12px 16px", minWidth: 110 }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: tone || AC_NAVY }}>{value}</div>
    <div style={{ fontSize: 11.5, color: AC_MUTED, textTransform: "uppercase", letterSpacing: ".04em", marginTop: 2 }}>{label}</div>
  </div>
);

const AutomationCenterView = () => {
  const tick = (typeof FastILA?.useStore === "function") ? FastILA.useStore()[0] : 0;
  const live = FastILA?.mode === "live";
  const [rules, setRules] = React.useState([]);
  const [stats, setStats] = React.useState({ pending: 0, due: 0, sent: 0, failed: 0 });
  const [messages, setMessages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [running, setRunning] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [rs, st, ms] = await Promise.all([
        FastILA.automations.rules(),
        FastILA.automations.stats(),
        FastILA.automations.messages({ limit: 60 }),
      ]);
      setRules(rs); setStats(st); setMessages(ms);
    } catch (e) {
      fiToast("Couldn't load automations: " + e.message);
    } finally { setLoading(false); }
  }, []);

  React.useEffect(() => { load(); }, [load, tick]);

  const saveRule = async (key, patch) => {
    await FastILA.automations.updateRule(key, patch);
    // optimistic local update so the card reflects instantly
    setRules(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  };

  const sendDueNow = async () => {
    setRunning(true);
    try {
      const res = await FastILA.automations.dispatchNow();
      fiToast(res?.mock ? "Demo mode — nothing sent" : `Processed ${res?.processed ?? 0} · sent ${res?.sent ?? 0}${res?.failed ? ` · failed ${res.failed}` : ""}`);
      await load();
    } catch (e) { fiToast("Dispatch failed: " + e.message); }
    finally { setRunning(false); }
  };

  const fmt = (iso) => { try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (_e) { return iso; } };

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 16px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: AC_NAVY, fontSize: 28 }}>Automation Center</h1>
          <p style={{ color: AC_MUTED, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Confirmations, reminders and payment chases — sent automatically by your Supabase backend.
            Toggle any automation, tune the timing and channel, and edit the exact wording. Deliveries appear below as they happen.
          </p>
        </div>
      </header>

      {/* Engine status + live stats */}
      <section className="panel" style={{ padding: 16, marginBottom: 16, background: live ? AC_NAVY : "#fff7e6", color: live ? "#e6f7c8" : "#7a4f00", border: live ? "none" : "1px solid #f4d99a", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Icon name="bolt" size={18}/>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong style={{ fontSize: 14 }}>{live ? "Automation engine is live" : "Demo mode — engine not connected"}</strong>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
              {live
                ? "Messages queue automatically and a scheduler sends them every minute via Resend + Twilio."
                : "Add your Supabase keys in config.js to run real sends. You can still configure rules here."}
            </div>
          </div>
          <button className="btn btn-lime btn-sm" onClick={sendDueNow} disabled={running}>
            <Icon name="send" size={12}/> {running ? "Sending…" : "Send due now"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <ACStat label="Queued" value={stats.pending} tone="#7a5a12"/>
          <ACStat label="Due now" value={stats.due} tone="#a3271a"/>
          <ACStat label="Sent" value={stats.sent} tone="#1f7a46"/>
          <ACStat label="Failed" value={stats.failed} tone={stats.failed ? "#a3271a" : AC_NAVY}/>
        </div>
      </section>

      {/* Rules */}
      <h2 style={{ fontSize: 13, fontWeight: 700, color: AC_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Automations</h2>
      {loading && rules.length === 0
        ? <div style={{ color: AC_MUTED, padding: 20 }}>Loading…</div>
        : rules.map(r => <ACRuleCard key={r.key} rule={r} onSave={saveRule}/>)}

      {/* Activity log */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "26px 0 10px" }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, color: AC_MUTED, textTransform: "uppercase", letterSpacing: "0.06em", margin: 0 }}>Recent deliveries</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}><Icon name="arrow-right" size={12}/> Refresh</button>
      </div>
      <section className="panel" style={{ padding: 0, border: "1px solid #e3e9ed", borderRadius: 12, overflow: "hidden" }}>
        {!live ? (
          <div style={{ padding: 24, color: AC_MUTED, fontSize: 13 }}>Delivery history appears here once the backend is connected.</div>
        ) : messages.length === 0 ? (
          <div style={{ padding: 24, color: AC_MUTED, fontSize: 13 }}>No messages yet. They'll appear here as bookings come in.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#f7f9fa", textAlign: "left", color: AC_MUTED }}>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>When</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Channel</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Recipient</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Automation</th>
                <th style={{ padding: "10px 14px", fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {messages.map(m => (
                <tr key={m.id} style={{ borderTop: "1px solid #eef1f3" }}>
                  <td style={{ padding: "10px 14px", color: AC_MUTED, whiteSpace: "nowrap" }}>{fmt(m.sent_at || m.send_after || m.created_at)}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      <Icon name={m.channel === "sms" ? "phone" : "mail"} size={13}/> {m.channel === "sms" ? "SMS" : "Email"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: AC_NAVY }}>{m.to_email || m.to_phone || "—"}</td>
                  <td style={{ padding: "10px 14px", color: AC_MUTED }}>{m.rule_key || "—"}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <ACStatusPill status={m.status}/>
                    {m.status === "failed" && m.last_error && (
                      <div style={{ fontSize: 11, color: "#a3271a", marginTop: 3, maxWidth: 280 }} title={m.last_error}>{m.last_error}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

window.AutomationCenterView = AutomationCenterView;

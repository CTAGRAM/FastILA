/* global React, Icon, fiToast */

// ============================================================================
// BroadcastsView — admin-only marketing/comms tool. Composes HTML emails
// against a saved template library, picks an audience from the contacts/
// bookings database, and dispatches via n8n. Also keeps an audit log of all
// past sends so the firm can prove "no spam, opt-in honoured" if asked.
// ============================================================================

// A small starter library that's auto-seeded on first run so the admin sees
// something useful when they land. Saved per-edit into localStorage via
// FastILA.emailTemplates after that.
const STARTER_TEMPLATES = [
  {
    id: "starter-newsletter",
    name: "Monthly newsletter",
    subject: "{{month}} update from Nexa Law — what's new this month",
    body: `<!doctype html>
<html><body style="font-family: -apple-system, Inter, Helvetica, Arial, sans-serif; color: #1f2933; background: #f5f7f9; margin: 0; padding: 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 28px 32px 16px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #5b6b76; text-transform: uppercase;">Fast-ILA · Nexa Law Ltd</div>
      <h1 style="font-size: 26px; margin: 8px 0 4px; color: #063952;">Hi {{firstName}},</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #3d4a52; margin: 12px 0;">Quick monthly update on what we've been working on, lender changes you should know about, and where we can help.</p>
    </td></tr>
    <tr><td style="padding: 0 32px 16px;">
      <h2 style="font-size: 17px; color: #063952; margin: 16px 0 6px;">Lender changes this month</h2>
      <ul style="font-size: 14px; line-height: 1.6; color: #3d4a52; padding-left: 18px;">
        <li>[Lender] has updated their ILA template — we now use v3.4.</li>
        <li>[Lender] now accepts e-signed ILA certs (no more wet signing).</li>
      </ul>
      <h2 style="font-size: 17px; color: #063952; margin: 20px 0 6px;">Need ILA again?</h2>
      <p style="font-size: 14px; line-height: 1.5; color: #3d4a52; margin: 6px 0;">Book online in 3 minutes — same-day slots available most weeks.</p>
      <p style="margin: 16px 0;"><a href="{{bookingUrl}}" style="background: #063952; color: #e6f7c8; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">Book an appointment</a></p>
    </td></tr>
    <tr><td style="padding: 16px 32px 24px; border-top: 1px solid #eef0f3;">
      <div style="font-size: 11px; color: #5b6b76;">You're receiving this because you've booked an ILA appointment with us in the past. <a href="{{unsubscribeUrl}}" style="color: #5b6b76;">Unsubscribe</a></div>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "starter-broker-update",
    name: "Broker partner update",
    subject: "ILA capacity + turnaround update for your team",
    body: `<!doctype html>
<html><body style="font-family: -apple-system, Inter, Helvetica, Arial, sans-serif; color: #1f2933; background: #f5f7f9; margin: 0; padding: 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 28px 32px;">
      <h1 style="font-size: 24px; margin: 0 0 8px; color: #063952;">Hi {{firstName}},</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #3d4a52;">A quick update for your team on our current ILA capacity and turnaround:</p>
      <ul style="font-size: 14px; line-height: 1.7; color: #3d4a52; padding-left: 18px;">
        <li><strong>Next available slot:</strong> [DATE]</li>
        <li><strong>Average turnaround:</strong> 48h from booking to signed certificate</li>
        <li><strong>Wet-sig matters:</strong> add 2 days for postal</li>
      </ul>
      <p style="font-size: 14px; line-height: 1.5; color: #3d4a52; margin-top: 14px;">If your clients need to book, here's a direct link: <a href="{{bookingUrl}}" style="color: #063952;">{{bookingUrl}}</a></p>
      <p style="font-size: 14px; line-height: 1.5; color: #3d4a52;">Reply with any questions — happy to flex around urgent matters.</p>
    </td></tr>
    <tr><td style="padding: 14px 32px 22px; border-top: 1px solid #eef0f3; font-size: 11px; color: #5b6b76;">
      <a href="{{unsubscribeUrl}}" style="color: #5b6b76;">Unsubscribe from partner updates</a>
    </td></tr>
  </table>
</body></html>`,
  },
  {
    id: "starter-promo",
    name: "Promotion / offer",
    subject: "10% off your next ILA — for a limited time",
    body: `<!doctype html>
<html><body style="font-family: -apple-system, Inter, Helvetica, Arial, sans-serif; color: #1f2933; background: #f5f7f9; margin: 0; padding: 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 36px 32px; text-align: center;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #1e5128; text-transform: uppercase;">Returning client offer</div>
      <h1 style="font-size: 30px; margin: 10px 0 8px; color: #063952;">10% off your next ILA</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #3d4a52; max-width: 460px; margin: 8px auto;">Hi {{firstName}} — if you need another ILA in the next 30 days, use the code below for 10% off.</p>
      <div style="background: #e6f7c8; color: #063952; font-weight: 700; font-size: 22px; letter-spacing: 0.08em; padding: 14px; border-radius: 8px; margin: 18px auto; max-width: 220px; font-family: monospace;">WELCOMEBACK10</div>
      <p style="margin: 20px 0;"><a href="{{bookingUrl}}" style="background: #063952; color: #e6f7c8; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 15px;">Book with the code</a></p>
      <p style="font-size: 12px; color: #5b6b76; margin-top: 14px;">Code expires in 30 days. One use per client.</p>
    </td></tr>
    <tr><td style="padding: 14px 32px 22px; border-top: 1px solid #eef0f3; font-size: 11px; color: #5b6b76;">
      <a href="{{unsubscribeUrl}}" style="color: #5b6b76;">Unsubscribe</a>
    </td></tr>
  </table>
</body></html>`,
  },
];

const _seedStarterTemplates = () => {
  try {
    const existing = FastILA.emailTemplates.list();
    if (existing.length === 0) {
      STARTER_TEMPLATES.forEach(t => FastILA.emailTemplates.save(t));
    }
  } catch (_e) {}
};

const SAMPLE_PREVIEW_VARS = {
  firstName: "Priya",
  fullName: "Priya Mehta",
  email: "priya@example.co.uk",
  month: new Date().toLocaleString("en-GB", { month: "long", year: "numeric" }),
  bookingUrl: window.location.origin + window.location.pathname,
  unsubscribeUrl: "https://example.com/unsub",
};

const renderTokens = (str) => {
  return String(str || "").replace(/\{\{(\w+)\}\}/g, (m, k) => SAMPLE_PREVIEW_VARS[k] !== undefined ? SAMPLE_PREVIEW_VARS[k] : m);
};

const BroadcastsView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  React.useEffect(() => { _seedStarterTemplates(); }, []);

  const contacts = FastILA.contacts.list();
  const optedIn = contacts.filter(c => c.optIn !== false);
  const withBookings = contacts.filter(c => {
    const e = (c.email || "").toLowerCase();
    return e && (window.BOOKINGS || []).some(b => (b.clientEmail || "").toLowerCase() === e);
  });
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || []))).sort();

  const [templates, setTemplates] = React.useState(FastILA.emailTemplates.list());
  const [editingTpl, setEditingTpl] = React.useState(null);

  // Composer state
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");
  const [format, setFormat] = React.useState("html");
  const [activeTplId, setActiveTplId] = React.useState(null);
  const [fromName, setFromName] = React.useState("Fast-ILA");
  const [replyTo, setReplyTo] = React.useState("");

  // Audience state
  const [audienceMode, setAudienceMode] = React.useState("opted_in"); // all | opted_in | with_bookings | with_tag | custom
  const [tagFilter, setTagFilter] = React.useState(allTags[0] || "");
  const [customIds, setCustomIds] = React.useState([]);

  const [sending, setSending] = React.useState(false);
  const [sentHistory, setSentHistory] = React.useState(FastILA.mailshots.list());

  // Recompute audience
  const audienceList = (() => {
    if (audienceMode === "all") return contacts;
    if (audienceMode === "opted_in") return optedIn;
    if (audienceMode === "with_bookings") return withBookings;
    if (audienceMode === "with_tag") return contacts.filter(c => (c.tags || []).includes(tagFilter)).filter(c => c.optIn !== false);
    if (audienceMode === "custom") return contacts.filter(c => customIds.includes(c.id) && c.optIn !== false);
    return [];
  })();

  const applyTemplate = (tpl) => {
    setSubject(tpl.subject || "");
    setBody(tpl.body || "");
    setActiveTplId(tpl.id);
  };
  const saveAsTemplate = () => {
    const name = prompt("Template name:", "New broadcast template");
    if (!name) return;
    const saved = FastILA.emailTemplates.save({ name, subject, body });
    setTemplates(FastILA.emailTemplates.list());
    setActiveTplId(saved.id);
    fiToast(`Saved as "${name}"`);
  };
  const updateCurrentTemplate = () => {
    if (!activeTplId) return;
    const cur = FastILA.emailTemplates.get(activeTplId);
    if (!cur) return;
    FastILA.emailTemplates.save({ ...cur, subject, body });
    setTemplates(FastILA.emailTemplates.list());
    fiToast(`Updated "${cur.name}"`);
  };
  const [pendingDelete, setPendingDelete] = React.useState(null);
  const [renamingId, setRenamingId] = React.useState(null);
  const [renameValue, setRenameValue] = React.useState("");
  const doDelete = (id) => {
    FastILA.emailTemplates.remove(id);
    setTemplates(FastILA.emailTemplates.list());
    if (activeTplId === id) { setActiveTplId(null); setSubject(""); setBody(""); }
    setPendingDelete(null);
    fiToast("Template deleted");
  };
  const startRename = (t) => { setRenamingId(t.id); setRenameValue(t.name); };
  const commitRename = (id) => {
    const cur = FastILA.emailTemplates.get(id);
    if (cur && renameValue.trim() && renameValue.trim() !== cur.name) {
      FastILA.emailTemplates.save({ ...cur, name: renameValue.trim() });
      setTemplates(FastILA.emailTemplates.list());
      fiToast("Template renamed");
    }
    setRenamingId(null);
  };

  const send = async () => {
    if (!subject.trim()) { fiToast("Add a subject line"); return; }
    if (!body.trim()) { fiToast("Write a message"); return; }
    if (audienceList.length === 0) { fiToast("Audience is empty"); return; }
    if (!confirm(`Send "${subject}" to ${audienceList.length} recipient${audienceList.length === 1 ? "" : "s"}?`)) return;
    setSending(true);
    try {
      const payload = {
        subject, body, format,
        fromName, replyTo,
        templateName: activeTplId ? (FastILA.emailTemplates.get(activeTplId) || {}).name : null,
        audience: audienceMode === "custom"
          ? null
          : { rule: audienceMode, tag: audienceMode === "with_tag" ? tagFilter : undefined },
        contactIds: audienceMode === "custom" ? customIds : [],
      };
      const row = await FastILA.mailshots.send(payload);
      setSentHistory(FastILA.mailshots.list());
      fiToast(`Broadcast sent to ${row.recipientCount} recipient${row.recipientCount === 1 ? "" : "s"} (${row.delivery})`);
    } catch (e) {
      fiToast("Send failed: " + (e.message || e), "err");
    }
    setSending(false);
  };

  const n8nConnected = window.fiIntegration?.isConnected?.("n8n");
  const smtp = window.fiIntegration?.get?.("smtp") || {};
  const smtpConnected = !!(smtp.password && smtp.fromEmail);

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 12px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: "#063952", fontSize: 28 }}>Broadcasts</h1>
          <p style={{ color: "#5b6b76", marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Send an HTML email to past clients and broker partners. Saved templates, audience filters by opt-in / tag / booking history, and full audit log of past sends. Delivery routes through n8n.
          </p>
        </div>
      </header>

      {/* Delivery status — n8n + SMTP */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ padding: 14, background: n8nConnected ? "#e8f5e9" : "#fff7e6", border: "1px solid " + (n8nConnected ? "#b8e0bb" : "#f4d99a"), borderRadius: 10, color: n8nConnected ? "#1e5128" : "#7a4f00", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Icon name={n8nConnected ? "check" : "warning"} size={14} stroke={n8nConnected ? 3 : 2}/>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong>n8n {n8nConnected ? "connected" : "not connected"}</strong>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              {n8nConnected
                ? <>Every broadcast fires a <code>mailshot.send</code> event to your n8n workflow.</>
                : <>Connect n8n in <strong>Integrations</strong> to actually deliver the broadcasts.</>}
            </div>
          </div>
        </div>
        <div style={{ padding: 14, background: smtpConnected ? "#e8f5e9" : "#eaf5fb", border: "1px solid " + (smtpConnected ? "#b8e0bb" : "#b8d7e6"), borderRadius: 10, color: smtpConnected ? "#1e5128" : "#0a3a55", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Icon name={smtpConnected ? "check" : "mail"} size={14} stroke={smtpConnected ? 3 : 2}/>
          <div style={{ fontSize: 13, lineHeight: 1.5, flex: 1 }}>
            <strong>SMTP / email provider {smtpConnected ? `· ${smtp.provider || "smtp"}` : "not set"}</strong>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              {smtpConnected
                ? <>Sending from <strong>{smtp.fromName ? `${smtp.fromName} <${smtp.fromEmail}>` : smtp.fromEmail}</strong>. Credentials are passed through to n8n on every send.</>
                : <>Optional: add SMTP / Resend / SES credentials in <strong>Integrations</strong> so n8n can send without you wiring email per workflow. You can also configure email directly in n8n if you prefer.</>}
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16, alignItems: "start" }}>
        {/* Template library */}
        <section className="panel" style={{ padding: 14 }}>
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong style={{ color: "#063952", fontSize: 14 }}>Templates</strong>
            <button className="btn btn-ghost btn-sm" onClick={() => { setSubject(""); setBody(""); setActiveTplId(null); }} title="Start a blank template">
              <Icon name="plus" size={11}/> New
            </button>
          </header>
          <div style={{ display: "grid", gap: 6 }}>
            {templates.length === 0 && (
              <div style={{ fontSize: 12, color: "#5b6b76", padding: 6 }}>No templates yet — start one with the button above.</div>
            )}
            {templates.map(t => {
              const isActive = activeTplId === t.id;
              const isRenaming = renamingId === t.id;
              const isPendingDelete = pendingDelete === t.id;
              return (
                <div key={t.id} style={{
                  padding: 0, borderRadius: 8, overflow: "hidden",
                  background: isActive ? "#063952" : "white",
                  color: isActive ? "#e6f7c8" : "#063952",
                  border: "1px solid " + (isActive ? "#063952" : "#e4e8ec"),
                  transition: "background 100ms ease",
                }}>
                  {/* Main row — click to load into composer */}
                  <button
                    type="button"
                    onClick={() => !isRenaming && applyTemplate(t)}
                    disabled={isRenaming}
                    style={{
                      width: "100%", padding: "10px 12px", background: "transparent", border: "none", color: "inherit",
                      cursor: isRenaming ? "default" : "pointer",
                      display: "flex", alignItems: "flex-start", gap: 8, textAlign: "left",
                      minWidth: 0,
                    }}
                  >
                    <Icon name="mail" size={13} style={{ marginTop: 2, flexShrink: 0 }}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isRenaming ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(t.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(t.id);
                            if (e.key === "Escape") setRenamingId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="field-input"
                          style={{ fontSize: 13, padding: "4px 6px", color: "#063952" }}
                        />
                      ) : (
                        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3, wordBreak: "break-word" }}>{t.name}</div>
                      )}
                      <div style={{ fontSize: 11, opacity: 0.75, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject || "(no subject)"}</div>
                    </div>
                  </button>

                  {/* Action row — explicit Load / Edit / Delete buttons */}
                  <div style={{
                    display: "flex", gap: 4,
                    padding: "4px 8px 8px",
                    borderTop: isActive ? "1px solid rgba(230,247,200,0.15)" : "1px solid #eef0f3",
                  }}>
                    {!isPendingDelete ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); applyTemplate(t); }}
                          title="Load into composer for editing"
                          style={{
                            flex: 1, padding: "5px 8px", border: "none", borderRadius: 4,
                            background: isActive ? "rgba(230,247,200,0.12)" : "#f5f7f9",
                            color: "inherit", cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                            display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
                          }}
                        >
                          <Icon name="edit" size={10}/> Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); startRename(t); }}
                          title="Rename"
                          style={{
                            padding: "5px 8px", border: "none", borderRadius: 4,
                            background: isActive ? "rgba(230,247,200,0.12)" : "#f5f7f9",
                            color: "inherit", cursor: "pointer", fontSize: 11.5,
                          }}
                        >
                          <Icon name="edit" size={10}/>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPendingDelete(t.id); }}
                          title="Delete"
                          style={{
                            padding: "5px 8px", border: "none", borderRadius: 4,
                            background: isActive ? "rgba(255,150,150,0.18)" : "#fbe9e7",
                            color: isActive ? "#ffd6cc" : "#9a1c1c", cursor: "pointer", fontSize: 11.5,
                          }}
                        >
                          <Icon name="trash" size={10}/>
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 11, padding: "5px 4px", color: isActive ? "#ffd6cc" : "#9a1c1c", fontWeight: 600 }}>Delete?</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); doDelete(t.id); }}
                          style={{
                            padding: "5px 10px", border: "none", borderRadius: 4,
                            background: "#9a1c1c", color: "white", cursor: "pointer", fontSize: 11.5, fontWeight: 600,
                          }}
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPendingDelete(null); }}
                          style={{
                            padding: "5px 8px", border: "none", borderRadius: 4,
                            background: isActive ? "rgba(230,247,200,0.12)" : "#f5f7f9",
                            color: "inherit", cursor: "pointer", fontSize: 11.5,
                          }}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <hr style={{ margin: "16px 0 12px", border: 0, borderTop: "1px solid #eef0f3" }}/>

          {/* Audience picker */}
          <strong style={{ color: "#063952", fontSize: 14, display: "block", marginBottom: 8 }}>Audience</strong>
          <div style={{ display: "grid", gap: 6 }}>
            {[
              { id: "opted_in", label: "Opted-in contacts", count: optedIn.length },
              { id: "with_bookings", label: "Past clients only", count: withBookings.length },
              { id: "all", label: "Everyone in contacts", count: contacts.length, warn: true },
              { id: "with_tag", label: "By tag", count: tagFilter ? contacts.filter(c => (c.tags || []).includes(tagFilter)).length : 0 },
            ].map(opt => (
              <label key={opt.id} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 6,
                background: audienceMode === opt.id ? "#eaf5fb" : "transparent",
                border: "1px solid " + (audienceMode === opt.id ? "#b8d7e6" : "transparent"),
                cursor: "pointer", fontSize: 13,
              }}>
                <input type="radio" name="audience" checked={audienceMode === opt.id} onChange={() => setAudienceMode(opt.id)}/>
                <span style={{ flex: 1, color: "#063952" }}>{opt.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: opt.warn ? "#7a4f00" : "#5b6b76" }}>{opt.count}</span>
              </label>
            ))}
            {audienceMode === "with_tag" && allTags.length > 0 && (
              <select className="field-input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ marginTop: 4 }}>
                {allTags.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            {audienceMode === "with_tag" && allTags.length === 0 && (
              <div style={{ fontSize: 11, color: "#5b6b76", padding: "0 8px" }}>No tags yet — add tags on contacts to use this filter.</div>
            )}
          </div>

          <div style={{ marginTop: 12, padding: 10, background: "#f5f7f9", borderRadius: 6, fontSize: 12, color: "#063952" }}>
            <Icon name="users" size={11}/> <strong>{audienceList.length}</strong> {audienceList.length === 1 ? "recipient" : "recipients"} will be emailed
          </div>
        </section>

        {/* Composer + preview */}
        <section className="panel" style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>
              <label className="field-label">From name</label>
              <input className="field-input" value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Fast-ILA"/>
            </div>
            <div>
              <label className="field-label">Reply-to (optional)</label>
              <input className="field-input" value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="info@yourfirm.com"/>
            </div>
          </div>

          <label className="field-label">Subject</label>
          <input className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. {{month}} update from Nexa Law"/>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setFormat("html")} className={`btn btn-sm ${format === "html" ? "btn-navy" : "btn-ghost"}`}>HTML</button>
              <button onClick={() => setFormat("text")} className={`btn btn-sm ${format === "text" ? "btn-navy" : "btn-ghost"}`}>Plain text</button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {activeTplId && <button className="btn btn-ghost btn-sm" onClick={updateCurrentTemplate} title="Save changes to this template"><Icon name="check" size={11} stroke={3}/> Update template</button>}
              <button className="btn btn-ghost btn-sm" onClick={saveAsTemplate} title="Save current as a new template"><Icon name="plus" size={11}/> Save as new template</button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div>
              <label className="field-label">{format === "html" ? "HTML body" : "Message body"}</label>
              <textarea
                className="field-input"
                rows={18}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={format === "html"
                  ? '<!doctype html><html><body>… use {{firstName}} for personalisation …</body></html>'
                  : 'Hi {{firstName}}, …'}
                style={{ fontFamily: "monospace", fontSize: 12.5, resize: "vertical" }}
              />
              <div style={{ fontSize: 11, color: "#5b6b76", marginTop: 4 }}>
                Tokens: <code>{`{{firstName}}`}</code> <code>{`{{fullName}}`}</code> <code>{`{{email}}`}</code> <code>{`{{bookingUrl}}`}</code> <code>{`{{unsubscribeUrl}}`}</code>
              </div>
            </div>
            <div>
              <label className="field-label">Live preview</label>
              {format === "html" ? (
                <iframe
                  title="preview"
                  srcDoc={renderTokens(body) || "<div style='padding: 40px; color: #5b6b76; font-family: sans-serif; text-align: center;'>Start typing to see a preview…</div>"}
                  style={{ width: "100%", height: 360, border: "1px solid #e4e8ec", borderRadius: 6, background: "white" }}
                />
              ) : (
                <pre style={{ width: "100%", height: 360, border: "1px solid #e4e8ec", borderRadius: 6, padding: 14, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", overflowY: "auto", margin: 0, fontFamily: "inherit", background: "white" }}>
                  {renderTokens(body) || "Start typing to see a preview…"}
                </pre>
              )}
              <div style={{ fontSize: 11, color: "#5b6b76", marginTop: 4 }}>
                Preview substitutes sample values: firstName=Priya, etc.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14, gap: 8 }}>
            <button className="btn btn-navy" onClick={send} disabled={sending || audienceList.length === 0 || !subject.trim() || !body.trim()}>
              <Icon name="send" size={13}/> {sending ? "Sending…" : `Send to ${audienceList.length} recipient${audienceList.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      </div>

      {/* Past sends */}
      <section className="panel" style={{ padding: 14, marginTop: 16 }}>
        <header className="panel-head" style={{ padding: 0, marginBottom: 10 }}>
          <h2 className="panel-title" style={{ fontSize: 15 }}><Icon name="clock" size={14}/> Past broadcasts</h2>
        </header>
        {sentHistory.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", color: "#5b6b76", fontSize: 13 }}>
            <Icon name="mail" size={20}/> <div style={{ marginTop: 6 }}>No broadcasts sent yet</div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {sentHistory.map(m => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, background: "#f5f7f9", borderRadius: 6 }}>
                <Icon name="mail" size={14}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: "#063952", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</div>
                  <div style={{ fontSize: 11, color: "#5b6b76", marginTop: 2 }}>
                    {new Date(m.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{m.recipientCount} sent{m.skippedOptOut > 0 ? `, ${m.skippedOptOut} opted out` : ""}
                    {m.templateName ? ` · ${m.templateName}` : ""}
                    {" · "}delivered via {m.delivery}
                  </div>
                </div>
                <span className={`pill ${m.delivery === "n8n" ? "pill-success" : "pill-muted"}`}>{m.delivery === "n8n" ? "Sent via n8n" : "Logged only"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

Object.assign(window, { BroadcastsView });

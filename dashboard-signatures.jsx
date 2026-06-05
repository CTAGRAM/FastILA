/* global React, Icon, Avatar, StatusPill, SERVICES, LAWYERS, BOOKINGS */

// ============================================================================
// Lawyer Signatures — unified view that makes it extremely clear which
// matters need a DIGITAL cert and which need a WET signature.
// Tabbed: Digital · Wet (Royal Mail). Each tab is a simple stage kanban.
// ============================================================================

// Synthesise digital-signature stage from the booking data.
// Non-wet, completed-or-scheduled matters all need a digital ILA cert.
const deriveDigitalStage = (b) => {
  if (b.digitalStage) return b.digitalStage;
  if (b.status === "completed" && !b.certSent) return "to-issue";
  if (b.certSent && !b.certDelivered) return "sent";
  if (b.certDelivered) return "delivered";
  // Default for completed digital matters in mock data
  if (b.status === "completed") return "to-issue";
  return null; // pre-call — no cert yet
};

const SignaturesView = ({ role = "lawyer", onOpenDetail }) => {
  const [mode, setMode] = React.useState("digital");
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);

  const lawyerId = role === "lawyer" ? "amelia" : null;
  const base = lawyerId ? BOOKINGS.filter(b => b.lawyerId === lawyerId) : BOOKINGS;

  const wet = base.filter(b => b.serviceId === "wet");
  const digital = base.filter(b => b.serviceId !== "wet" && b.status === "completed");

  // Pseudo-staging for digital (some completed already, others to issue, one delivered)
  const digitalStaged = digital.map((b, i) => ({
    ...b,
    digitalStage: i === 0 ? "delivered" : i === 1 ? "sent" : "to-issue",
  }));

  const digitalCounts = {
    "to-issue": digitalStaged.filter(b => deriveDigitalStage(b) === "to-issue").length,
    "sent": digitalStaged.filter(b => deriveDigitalStage(b) === "sent").length,
    "delivered": digitalStaged.filter(b => deriveDigitalStage(b) === "delivered").length,
  };
  const wetCounts = {
    awaiting: wet.filter(b => b.dispatch === "awaiting_signature").length,
    signed: wet.filter(b => b.dispatch === "signed").length,
    ready: wet.filter(b => b.dispatch === "ready_to_post").length,
    posted: wet.filter(b => b.dispatch === "posted").length,
    delivered: wet.filter(b => b.dispatch === "delivered").length,
  };

  // Wet matters waiting for a tracking number (ready to post)
  const needsTracking = wet.filter(b => b.dispatch === "ready_to_post" || b.dispatch === "signed");

  return (
    <div className="dash-grid">
      {/* Quick-action bar — biggest buttons up top */}
      <div className="quick-actions-bar">
        <button
          className="quick-action quick-action-primary"
          onClick={() => { setMode("wet"); setQuickAddOpen(true); }}
        >
          <div className="quick-action-icon"><Icon name="package" size={20}/></div>
          <div className="quick-action-text">
            <div className="quick-action-label">Add tracking number</div>
            <div className="quick-action-sub">{needsTracking.length} matter{needsTracking.length === 1 ? "" : "s"} ready to post</div>
          </div>
          {needsTracking.length > 0 && <span className="quick-action-count">{needsTracking.length}</span>}
        </button>

        <button
          className="quick-action"
          onClick={() => setMode("digital")}
        >
          <div className="quick-action-icon"><Icon name="send" size={20}/></div>
          <div className="quick-action-text">
            <div className="quick-action-label">Issue digital cert</div>
            <div className="quick-action-sub">{digitalCounts["to-issue"]} call{digitalCounts["to-issue"] === 1 ? "" : "s"} done · cert to send</div>
          </div>
          {digitalCounts["to-issue"] > 0 && <span className="quick-action-count">{digitalCounts["to-issue"]}</span>}
        </button>

        <button
          className="quick-action"
          onClick={() => { setMode("wet"); }}
        >
          <div className="quick-action-icon"><Icon name="check-circle" size={20}/></div>
          <div className="quick-action-text">
            <div className="quick-action-label">Mark delivered</div>
            <div className="quick-action-sub">{wetCounts.posted} in transit with Royal Mail</div>
          </div>
        </button>
      </div>

      {quickAddOpen && (
        <QuickTrackingModal
          matters={wet}
          priorityIds={new Set(needsTracking.map(m => m.ref))}
          onClose={() => setQuickAddOpen(false)}
        />
      )}

      {/* Big split header — pick your lane */}
      <div className="sig-split">
        <button
          className={`sig-split-card ${mode === "digital" ? "is-active" : ""}`}
          onClick={() => setMode("digital")}
        >
          <div className="sig-split-icon sig-split-icon-digital">
            <Icon name="send" size={22}/>
          </div>
          <div className="sig-split-info">
            <div className="sig-split-title">Digital signatures</div>
            <div className="sig-split-sub">e-Sign &amp; email to lender · most matters</div>
          </div>
          <div className="sig-split-count">
            <strong>{digital.length}</strong>
            <span>matters</span>
          </div>
        </button>

        <button
          className={`sig-split-card ${mode === "wet" ? "is-active" : ""}`}
          onClick={() => setMode("wet")}
        >
          <div className="sig-split-icon sig-split-icon-wet">
            <Icon name="stamp" size={22}/>
          </div>
          <div className="sig-split-info">
            <div className="sig-split-title">Wet signatures · Royal Mail</div>
            <div className="sig-split-sub">Client posts in · we sign · we post out</div>
          </div>
          <div className="sig-split-count">
            <strong>{wet.length}</strong>
            <span>matters</span>
          </div>
        </button>
      </div>

      {/* Digital view */}
      {mode === "digital" && (
        <DigitalSignatureBoard matters={digitalStaged} counts={digitalCounts} onOpenDetail={onOpenDetail}/>
      )}

      {/* Wet view */}
      {mode === "wet" && (
        <WetSignatureBoard matters={wet} counts={wetCounts} onOpenDetail={onOpenDetail} onQuickAdd={() => setQuickAddOpen(true)}/>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// QuickTrackingModal — one tap to add a Royal Mail tracking number for any
// wet-signature matter. Groups matters by stage so the lawyer always finds
// what they're looking for, with a clear empty state and a path to per-matter
// tracking via the booking detail page.
// ----------------------------------------------------------------------------
const QuickTrackingModal = ({ matters = [], priorityIds, onClose }) => {
  const [savedIds, setSavedIds] = React.useState(new Set());
  const [tracking, setTracking] = React.useState({});
  const [service, setService] = React.useState({});
  const [expanded, setExpanded] = React.useState({}); // for collapsed groups

  // Group: priority (ready to post / signed), already-tracked, earlier-stage
  const priority    = matters.filter(m => priorityIds && priorityIds.has(m.ref));
  const tracked     = matters.filter(m => m.trackingNumber);
  const earlierIds  = new Set([...priority.map(m => m.ref), ...tracked.map(m => m.ref)]);
  const earlier     = matters.filter(m => !earlierIds.has(m.ref));

  const save = async (m) => {
    const num = (tracking[m.ref] || "").trim();
    const svc = service[m.ref] || "Royal Mail Special Delivery 1pm";
    if (!num) return;
    try {
      await FastILA.bookings.setTracking(m.ref, num, svc);
      await FastILA.bookings.setDispatch(m.ref, "posted");
      FastILA.bookings.addNote(m.ref, `Tracking added: ${num} (${svc})`);
      // Optional n8n notify
      const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
      if (n8n && n8n.webhookUrl) {
        try {
          await fetch(n8n.webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
            body: JSON.stringify({
              event: "booking.dispatch.posted",
              ref: m.ref, clientName: m.clientName, clientEmail: m.clientEmail,
              trackingNumber: num, trackingService: svc,
              portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(m.ref),
            }),
          });
        } catch (_e) {}
      }
      setSavedIds(prev => new Set([...prev, m.ref]));
      if (window.fiToast) window.fiToast(`Tracking saved for ${m.clientName}`);
    } catch (e) {
      if (window.fiToast) window.fiToast("Save failed: " + (e.message || e), "err");
    }
  };

  const renderRow = (m, opts = {}) => {
    const isSaved = savedIds.has(m.ref);
    const existingNum = m.trackingNumber;
    return (
      <div key={m.ref} className={`quick-track-row ${isSaved ? "is-saved" : ""}`}>
        <div className="quick-track-info">
          <div className="quick-track-name">{m.clientName}</div>
          <div className="quick-track-meta">
            <span className="pill pill-cream">{m.ref}</span>
            <span className="cell-sub">→ {m.lender || "—"}</span>
            {m.dispatch && <span className="pill pill-muted" style={{ marginLeft: 4 }}>{m.dispatch.replace(/_/g, " ")}</span>}
          </div>
        </div>
        {isSaved ? (
          <div className="quick-track-done">
            <Icon name="check" size={13} stroke={3}/>
            <span className="mono">{tracking[m.ref]}</span>
            <span className="cell-sub">· client notified</span>
          </div>
        ) : (
          <div className="quick-track-input-wrap">
            <input
              className="field-input mono"
              placeholder={existingNum || "QY 0000 0000 0 GB"}
              value={tracking[m.ref] || ""}
              onChange={(e) => setTracking(prev => ({ ...prev, [m.ref]: e.target.value }))}
              onKeyDown={(e) => e.key === "Enter" && save(m)}
            />
            <select
              className="field-select"
              value={service[m.ref] || "Royal Mail Special Delivery 1pm"}
              onChange={(e) => setService(prev => ({ ...prev, [m.ref]: e.target.value }))}
            >
              <option>Royal Mail Special Delivery 1pm</option>
              <option>Royal Mail Special Delivery 9am</option>
              <option>Royal Mail Tracked 24</option>
              <option>Royal Mail Tracked 48</option>
              <option>Royal Mail Signed For 1st Class</option>
            </select>
            <button className="btn btn-lime" onClick={() => save(m)} disabled={!(tracking[m.ref] || "").trim()}>
              <Icon name="check" size={13} stroke={3}/> {existingNum ? "Update" : "Save"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const Group = ({ id, title, count, tone, body, defaultOpen = true }) => {
    const open = expanded[id] !== undefined ? expanded[id] : defaultOpen;
    return (
      <div className="quick-track-group" style={{ marginBottom: 14, border: "1px solid #e4e8ec", borderRadius: 8, overflow: "hidden" }}>
        <button
          onClick={() => setExpanded(prev => ({ ...prev, [id]: !open }))}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: tone === "priority" ? "#fff7e6" : "#f5f7f9", border: "none", cursor: "pointer", textAlign: "left" }}
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} size={14}/>
          <strong style={{ color: "#063952", flex: 1 }}>{title}</strong>
          <span className="pill pill-muted">{count}</span>
        </button>
        {open && <div style={{ padding: "10px 14px" }}>{body}</div>}
      </div>
    );
  };

  // Decide overall empty state
  const noWetBookings = matters.length === 0;

  return (
    <div className="docpicker-overlay" onClick={onClose}>
      <div className="docpicker quick-tracking" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 760 }}>
        <header className="docpicker-head">
          <div>
            <h3 style={{ margin: 0 }}>Add Royal Mail tracking</h3>
            <p className="cell-sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Type the tracking number for a wet-signature matter and press <strong>Enter</strong> (or click Save). The client gets emailed/SMS'd automatically if n8n is connected.
            </p>
          </div>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>

        <div className="docpicker-body" style={{ maxHeight: "60vh", overflowY: "auto" }}>
          {noWetBookings ? (
            <div style={{ padding: 32, textAlign: "center", color: "#5b6b76" }}>
              <Icon name="package" size={28}/>
              <h4 style={{ marginTop: 10, color: "#063952" }}>No wet-signature bookings yet</h4>
              <p style={{ fontSize: 13, maxWidth: 420, margin: "8px auto 0" }}>
                When a client books a <strong>wet signature</strong> service, it'll appear here so you can post out the pack and add a tracking number. You can also add tracking from any booking's detail page → <em>More → Add Royal Mail tracking</em>.
              </p>
            </div>
          ) : (
            <>
              {priority.length > 0 ? (
                <Group id="priority" tone="priority" title="Ready to post — tracking needed" count={priority.length}
                  body={priority.map(m => renderRow(m))}/>
              ) : (
                <div style={{ background: "#eaf5fb", border: "1px solid #b8d7e6", color: "#0a3a55", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                  <Icon name="info" size={13}/> <strong>No matters in the "ready to post" stage right now.</strong> You can still add or update tracking on any wet matter below.
                </div>
              )}

              {tracked.length > 0 && (
                <Group id="tracked" title="Already has tracking — update if needed" count={tracked.length} defaultOpen={priority.length === 0}
                  body={tracked.map(m => renderRow(m))}/>
              )}

              {earlier.length > 0 && (
                <Group id="earlier" title="Earlier in the flow (awaiting client docs / signature)" count={earlier.length} defaultOpen={false}
                  body={earlier.map(m => renderRow(m))}/>
              )}
            </>
          )}
        </div>

        <footer className="docpicker-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="cell-sub">{savedIds.size} of {matters.length} updated this session</span>
          <button className="btn btn-navy" onClick={onClose}>Done</button>
        </footer>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Digital — simple 3-stage board
// ----------------------------------------------------------------------------
const DigitalSignatureBoard = ({ matters, counts, onOpenDetail }) => {
  const stages = [
    { id: "to-issue", title: "1 · To issue", subtitle: "Call done · cert to be drafted & sent", tone: "warning", cta: "Open editor" },
    { id: "sent", title: "2 · Sent to lender", subtitle: "Awaiting lender acknowledgement", tone: "info", cta: "Resend / chase" },
    { id: "delivered", title: "3 · Delivered & closed", subtitle: "Lender confirmed receipt", tone: "success", cta: "View receipt" },
  ];

  return (
    <>
      <section className="panel sig-help-panel">
        <div className="sig-help">
          <Icon name="info" size={14}/>
          <span>
            <strong>How digital works:</strong> after the call, click <em>Open editor</em> to apply your signature to the lender's template, then send the signed PDF + audit trail straight to the lender by email. No printing, no postage.
          </span>
        </div>
      </section>

      <div className="sig-board">
        {stages.map(stage => {
          const items = matters.filter(m => deriveDigitalStage(m) === stage.id);
          return (
            <div key={stage.id} className="sig-col">
              <div className={`sig-col-head sig-col-head-${stage.tone}`}>
                <div>
                  <div className="sig-col-title">{stage.title}</div>
                  <div className="sig-col-sub" dangerouslySetInnerHTML={{ __html: stage.subtitle }}/>
                </div>
                <span className="sig-col-count">{items.length}</span>
              </div>
              <div className="sig-col-body">
                {items.length === 0 ? (
                  <div className="sig-col-empty">Nothing here</div>
                ) : items.map(m => (
                  <DigitalCard key={m.ref} matter={m} cta={stage.cta} stage={stage.id} onOpenDetail={onOpenDetail}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const DigitalCard = ({ matter, cta, stage, onOpenDetail }) => {
  const [sent, setSent] = React.useState(false);
  const onAction = (e) => {
    e.stopPropagation();
    setSent(true);
  };

  return (
    <div className="sig-card" onClick={() => onOpenDetail && onOpenDetail(matter.ref)} role="button" tabIndex={0}>
      <div className="sig-card-name">{matter.clientName}</div>
      <div className="sig-card-meta">
        <span className="pill pill-cream">{SERVICES.find(s => s.id === matter.serviceId)?.short}</span>
        <span className="sig-card-lender">{matter.lender || "—"}</span>
      </div>
      {sent ? (
        <div className="sig-card-saved">
          <Icon name="check" size={12} stroke={3}/>
          {stage === "to-issue" ? "Signed & sent to lender" : stage === "sent" ? "Chase email sent" : "Receipt downloaded"}
        </div>
      ) : (
        <button className="sig-card-cta" onClick={onAction}>
          {cta} <Icon name="arrow-right" size={12}/>
        </button>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// Wet — 5-stage board (mirrors the existing Royal Mail kanban)
// ----------------------------------------------------------------------------
const WetSignatureBoard = ({ matters, counts, onOpenDetail, onQuickAdd }) => {
  const stages = [
    { id: "awaiting_signature", title: "1 · Waiting for docs", subtitle: "From the client", tone: "warning", cta: "Docs arrived" },
    { id: "signed", title: "2 · Received · to sign", subtitle: "In our office", tone: "info", cta: "Mark signed" },
    { id: "ready_to_post", title: "3 · Ready to post out", subtitle: "Add tracking number", tone: "info", cta: "Add tracking" },
    { id: "posted", title: "4 · Posted · in transit", subtitle: "With Royal Mail", tone: "muted", cta: "Mark delivered" },
    { id: "delivered", title: "5 · Delivered", subtitle: "Done", tone: "success", cta: "Close" },
  ];

  return (
    <>
      <section className="panel sig-help-panel">
        <div className="sig-help sig-help-wet">
          <Icon name="info" size={14}/>
          <span>
            <strong>How wet works:</strong> the client posts the original to us. We sign &amp; witness, then post to the lender / conveyancer / back to the client by Royal Mail Special Delivery.{" "}
            {onQuickAdd && <button className="sig-help-cta" onClick={onQuickAdd}><Icon name="package" size={11}/> Quick: add tracking for all</button>}
          </span>
        </div>
      </section>

      <div className="sig-board sig-board-wide">
        {stages.map(stage => {
          const items = matters.filter(m => m.dispatch === stage.id);
          return (
            <div key={stage.id} className="sig-col">
              <div className={`sig-col-head sig-col-head-${stage.tone}`}>
                <div>
                  <div className="sig-col-title">{stage.title}</div>
                  <div className="sig-col-sub" dangerouslySetInnerHTML={{ __html: stage.subtitle }}/>
                </div>
                <span className="sig-col-count">{items.length}</span>
              </div>
              <div className="sig-col-body">
                {items.length === 0 ? (
                  <div className="sig-col-empty">Nothing here</div>
                ) : items.map(m => (
                  <WetCard key={m.ref} matter={m} cta={stage.cta} stage={stage.id} onOpenDetail={onOpenDetail}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

const WetCard = ({ matter, cta, stage, onOpenDetail }) => {
  const [trackingMode, setTrackingMode] = React.useState(false);
  const [tracking, setTracking] = React.useState(matter.trackingNumber || "");
  const [done, setDone] = React.useState(false);

  const onCta = (e) => {
    e.stopPropagation();
    if (stage === "ready_to_post") {
      setTrackingMode(true);
    } else {
      setDone(true);
    }
  };

  const onSaveTracking = (e) => {
    e.stopPropagation();
    if (!tracking.trim()) return;
    setDone(true);
    setTrackingMode(false);
  };

  return (
    <div className="sig-card" onClick={() => onOpenDetail && onOpenDetail(matter.ref)} role="button" tabIndex={0}>
      <div className="sig-card-name">{matter.clientName}</div>
      <div className="sig-card-meta">
        <span className="sig-card-lender">{matter.lender || "—"}</span>
      </div>
      {matter.trackingNumber && !done && (
        <div className="sig-card-tracking mono">{matter.trackingNumber}</div>
      )}
      {trackingMode ? (
        <div className="sig-track-entry" onClick={(e) => e.stopPropagation()}>
          <input
            autoFocus
            className="sig-track-input mono"
            placeholder="QY 0000 0000 0 GB"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSaveTracking(e)}
          />
          <button className="sig-track-save" onClick={onSaveTracking} disabled={!tracking.trim()}>
            <Icon name="check" size={11} stroke={3}/>
          </button>
        </div>
      ) : done ? (
        <div className="sig-card-saved">
          <Icon name="check" size={12} stroke={3}/>
          {stage === "ready_to_post" ? "Saved & client notified" : "Updated"}
        </div>
      ) : (
        <button className="sig-card-cta" onClick={onCta}>
          {cta} <Icon name="arrow-right" size={12}/>
        </button>
      )}
    </div>
  );
};

Object.assign(window, { SignaturesView });

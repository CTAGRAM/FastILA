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
          matters={needsTracking}
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
// QuickTrackingModal — one tap to add a tracking number for any matter
// Shows every matter waiting for tracking, with inline input + lender pre-filled
// ----------------------------------------------------------------------------
const QuickTrackingModal = ({ matters, onClose }) => {
  const [savedIds, setSavedIds] = React.useState(new Set());
  const [tracking, setTracking] = React.useState({});
  const [service, setService] = React.useState({});

  const save = (id) => {
    if (!tracking[id]?.trim()) return;
    setSavedIds(prev => new Set([...prev, id]));
  };

  return (
    <div className="docpicker-overlay" onClick={onClose}>
      <div className="docpicker quick-tracking" onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <div>
            <h3>Add tracking numbers</h3>
            <p className="cell-sub" style={{ margin: "2px 0 0", fontSize: 12 }}>Type the Royal Mail tracking number for each matter. Press Enter to save — the client gets emailed + SMS-ed instantly.</p>
          </div>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>
        <div className="docpicker-body">
          {matters.length === 0 ? (
            <div className="lender-empty" style={{ padding: 24, textAlign: "center" }}>
              <Icon name="check-circle" size={16}/> Nothing to track — all matters are up to date.
            </div>
          ) : matters.map(m => {
            const isSaved = savedIds.has(m.ref);
            return (
              <div key={m.ref} className={`quick-track-row ${isSaved ? "is-saved" : ""}`}>
                <div className="quick-track-info">
                  <div className="quick-track-name">{m.clientName}</div>
                  <div className="quick-track-meta">
                    <span className="pill pill-cream">Wet Sig</span>
                    <span className="cell-sub">→ {m.lender || "—"}</span>
                  </div>
                </div>
                {isSaved ? (
                  <div className="quick-track-done">
                    <Icon name="check" size={13} stroke={3}/>
                    <span className="mono">{tracking[m.ref]}</span>
                    <span className="cell-sub">· Client notified</span>
                  </div>
                ) : (
                  <div className="quick-track-input-wrap">
                    <input
                      className="field-input mono"
                      placeholder="QY 0000 0000 0 GB"
                      value={tracking[m.ref] || ""}
                      onChange={(e) => setTracking(prev => ({ ...prev, [m.ref]: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && save(m.ref)}
                    />
                    <select
                      className="field-select"
                      value={service[m.ref] || "Special Delivery 1pm"}
                      onChange={(e) => setService(prev => ({ ...prev, [m.ref]: e.target.value }))}
                    >
                      <option>Special Delivery 1pm</option>
                      <option>Special Delivery 9am</option>
                      <option>Tracked 24</option>
                      <option>Tracked 48</option>
                    </select>
                    <button className="btn btn-lime" onClick={() => save(m.ref)} disabled={!tracking[m.ref]?.trim()}>
                      <Icon name="check" size={13} stroke={3}/> Save
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <footer className="docpicker-foot">
          <span className="cell-sub">{savedIds.size} of {matters.length} saved</span>
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
    { id: "to-issue", title: "1 · To issue", subtitle: "Call done · cert to be drafted &amp; sent", tone: "warning", cta: "Open editor" },
    { id: "sent", title: "2 · Sent to lender", subtitle: "Awaiting lender acknowledgement", tone: "info", cta: "Resend / chase" },
    { id: "delivered", title: "3 · Delivered &amp; closed", subtitle: "Lender confirmed receipt", tone: "success", cta: "View receipt" },
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

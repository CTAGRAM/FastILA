/* global React, Icon, Avatar, fiToast */

// ============================================================================
// WetSignatureQueueView — the dedicated dashboard view for a wet-signature
// specialist (e.g. Aashma). She doesn't run ILA calls solo — she joins as the
// second lawyer on wet matters and manages the post-out flow end-to-end.
//
// Layout: 4 columns, one per stage of the wet flow.
//   1. Awaiting client's pack   (client posts their signed bundle to us)
//   2. In our office            (received — needs solicitor signature)
//   3. Posted to lender         (in transit, track delivery)
//   4. Delivered                (matter complete)
//
// Each card shows everything she needs at a glance + a primary action button
// that advances the stage. Click any card to jump into the booking detail
// where the full WetSignatureFlow panel handles the long-form actions.
// ============================================================================
const WetSignatureQueueView = ({ onOpenDetail }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const allBookings = (window.BOOKINGS || []).filter(b => b.status !== "cancelled");
  const isWet = (b) => b.serviceId === "wet" || b.certMode === "wet";
  const wet = allBookings.filter(isWet);

  const [search, setSearch] = React.useState("");
  // Persist preferred view across sessions
  const [viewMode, setViewMode] = React.useState(() => {
    try { return localStorage.getItem("fastila_wet_view") || "spreadsheet"; } catch (_e) { return "spreadsheet"; }
  });
  const changeViewMode = (m) => { setViewMode(m); try { localStorage.setItem("fastila_wet_view", m); } catch (_e) {} };

  const matchesSearch = (b) => !search
    || (b.clientName || "").toLowerCase().includes(search.toLowerCase())
    || (b.ref || "").toLowerCase().includes(search.toLowerCase())
    || (b.lender || "").toLowerCase().includes(search.toLowerCase())
    || (b.postName || "").toLowerCase().includes(search.toLowerCase())
    || (b.trackingNumber || "").toLowerCase().includes(search.toLowerCase());

  const filtered = wet.filter(matchesSearch);

  const groups = {
    awaiting: filtered.filter(b => (b.dispatch || "awaiting_signature") === "awaiting_signature"),
    received: filtered.filter(b => b.dispatch === "signed" || b.dispatch === "ready_to_post"),
    posted:   filtered.filter(b => b.dispatch === "posted"),
    delivered:filtered.filter(b => b.dispatch === "delivered"),
  };
  const totalActiveCount = groups.awaiting.length + groups.received.length + groups.posted.length;

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 12px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: "#063952", fontSize: 28 }}>Wet signature queue</h1>
          <p style={{ color: "#5b6b76", marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Every wet-signature matter on one page. Change the stage from the dropdown · type a tracking number inline · tick "delivered" to close. Edits sync to the client (email + SMS + their portal) the moment you save.
          </p>
        </div>
        {/* View toggle */}
        <div style={{ display: "inline-flex", border: "1px solid #e4e8ec", borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
          <button onClick={() => changeViewMode("spreadsheet")} style={{ padding: "8px 12px", background: viewMode === "spreadsheet" ? "#063952" : "white", color: viewMode === "spreadsheet" ? "#e6f7c8" : "#063952", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="doc" size={11}/> Spreadsheet
          </button>
          <button onClick={() => changeViewMode("board")} style={{ padding: "8px 12px", background: viewMode === "board" ? "#063952" : "white", color: viewMode === "board" ? "#e6f7c8" : "#063952", border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Icon name="package" size={11}/> Board
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi icon="package" label="Awaiting client's pack" value={groups.awaiting.length} tone="warn"/>
        <Kpi icon="edit" label="In your office" value={groups.received.length} tone="info"/>
        <Kpi icon="stamp" label="Posted to lender" value={groups.posted.length} tone="info"/>
        <Kpi icon="check-circle" label="Delivered (complete)" value={groups.delivered.length} tone="success"/>
        <Kpi icon="bolt" label="Active workload" value={totalActiveCount} tone="neutral"/>
      </div>

      <input
        className="field-input"
        placeholder="Search by client, ref, lender, post-to recipient, or tracking number…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 480, marginBottom: 16 }}
      />

      {wet.length === 0 ? (
        <section className="panel" style={{ padding: 32, textAlign: "center", color: "#5b6b76" }}>
          <Icon name="stamp" size={32}/>
          <h3 style={{ marginTop: 10, color: "#063952" }}>No wet-signature matters yet</h3>
          <p style={{ fontSize: 13, maxWidth: 460, margin: "8px auto 0" }}>
            When a client books a wet-signature ILA — or a solicitor switches a digital booking to wet mode in the cert workflow — it'll appear here for you to manage.
          </p>
        </section>
      ) : viewMode === "spreadsheet" ? (
        <WetSpreadsheet bookings={filtered} onOpenDetail={onOpenDetail}/>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
          <Column title="1 · Awaiting client's pack" sub="Client posts their signed bundle to us" tone="warn" items={groups.awaiting} action={["Mark received", "package", advanceTo("signed")]} onOpenDetail={onOpenDetail}/>
          <Column title="2 · In your office" sub="Sign & witness, set post-to address" tone="info" items={groups.received} action={["Open detail", "external", null]} onOpenDetail={onOpenDetail}/>
          <Column title="3 · Posted to lender" sub="Royal Mail tracking active" tone="info" items={groups.posted} action={["Mark delivered", "check-circle", advanceTo("delivered")]} onOpenDetail={onOpenDetail}/>
          <Column title="4 · Delivered" sub="Matter complete" tone="success" items={groups.delivered} action={null} onOpenDetail={onOpenDetail}/>
        </div>
      )}
    </div>
  );
};

const Kpi = ({ icon, label, value, tone }) => {
  const colors = {
    warn:    { bg: "#fff7e6", border: "#f4d99a", fg: "#7a4f00" },
    info:    { bg: "#eaf5fb", border: "#b8d7e6", fg: "#0a3a55" },
    success: { bg: "#e8f5e9", border: "#b8e0bb", fg: "#1e5128" },
    neutral: { bg: "white",  border: "#e4e8ec", fg: "#063952" },
  }[tone] || { bg: "white", border: "#e4e8ec", fg: "#063952" };
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.fg, padding: 14, borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.8 }}>
        <Icon name={icon} size={12}/>
        <span>{label}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
};

// advance helper — returns a click handler that bumps dispatch + logs a note + fires n8n
const advanceTo = (nextStage) => async (booking, e) => {
  e && e.stopPropagation && e.stopPropagation();
  try {
    await FastILA.bookings.setDispatch(booking.ref, nextStage);
    const noteMap = {
      signed: "Signed pack received from client by post",
      delivered: "Royal Mail confirmed delivery to recipient",
    };
    if (noteMap[nextStage]) FastILA.bookings.addNote(booking.ref, noteMap[nextStage]);
    const eventMap = {
      signed: "booking.wet.client_pack_received",
      delivered: "booking.wet.delivered",
    };
    const ev = eventMap[nextStage];
    if (ev) {
      const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
      if (n8n && n8n.webhookUrl) {
        try {
          fetch(n8n.webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
            body: JSON.stringify({
              event: ev, ref: booking.ref,
              clientName: booking.clientName, clientEmail: booking.clientEmail, phone: booking.phone,
              postedTo: booking.postName || null,
              portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref),
            }),
          });
        } catch (_e) {}
      }
    }
    fiToast(`Advanced ${booking.ref} → ${nextStage.replace(/_/g, " ")}`);
  } catch (e) {
    fiToast("Failed: " + (e.message || e), "err");
  }
};

const Column = ({ title, sub, tone, items, action, onOpenDetail }) => {
  const toneClr = {
    warn:    { bar: "#f4d99a", bg: "#fff7e6" },
    info:    { bar: "#b8d7e6", bg: "#eaf5fb" },
    success: { bar: "#b8e0bb", bg: "#e8f5e9" },
  }[tone] || { bar: "#e4e8ec", bg: "#f5f7f9" };
  return (
    <div style={{ background: "white", border: "1px solid #e4e8ec", borderRadius: 10, overflow: "hidden", minHeight: 200 }}>
      <header style={{ padding: "12px 14px", background: toneClr.bg, borderBottom: `1px solid ${toneClr.bar}` }}>
        <div style={{ fontWeight: 700, color: "#063952", fontSize: 14 }}>{title}</div>
        <div style={{ fontSize: 12, color: "#5b6b76", marginTop: 2 }}>{sub} · <strong>{items.length}</strong></div>
      </header>
      <div style={{ padding: 10, display: "grid", gap: 8 }}>
        {items.length === 0 && <div style={{ padding: 16, textAlign: "center", color: "#9aa6ad", fontSize: 12 }}>Nothing here</div>}
        {items.map(b => <BookingCard key={b.ref} booking={b} action={action} onOpenDetail={onOpenDetail}/>)}
      </div>
    </div>
  );
};

const BookingCard = ({ booking, action, onOpenDetail }) => {
  const lawyer = (window.LAWYERS || []).find(l => l.id === booking.lawyerId);
  const dateLabel = (() => {
    if (!booking.date) return "—";
    try {
      const d = new Date(booking.date);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    } catch (_e) { return booking.date; }
  })();
  const [actLabel, actIcon, actFn] = action || [];
  const openDetail = () => onOpenDetail && onOpenDetail(booking.ref);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openDetail(); } }}
      style={{ background: "white", border: "1px solid #e4e8ec", borderRadius: 8, padding: 10, textAlign: "left", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
        <strong style={{ color: "#063952", fontSize: 13.5 }}>{booking.clientName}</strong>
        <span style={{ fontFamily: "monospace", fontSize: 11, color: "#5b6b76" }}>{booking.ref}</span>
      </div>
      <div style={{ fontSize: 11.5, color: "#5b6b76", display: "flex", gap: 6, flexWrap: "wrap" }}>
        <span><Icon name="calendar" size={10}/> {dateLabel} {booking.time || ""}</span>
        <span><Icon name="user" size={10}/> {lawyer ? lawyer.name : "Solicitor TBD"}</span>
      </div>
      {booking.lender && (
        <div style={{ fontSize: 11.5, color: "#5b6b76" }}>
          <Icon name="award" size={10}/> Lender: <strong style={{ color: "#063952" }}>{booking.lender}</strong>
        </div>
      )}
      {booking.postName && (
        <div style={{
          fontSize: 11.5,
          padding: "8px 10px",
          background: "#f7fbf2",
          border: "1px solid #cfe2b2",
          borderRadius: 6,
          marginTop: 2,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, color: "#063952", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="send" size={10}/> Post to {booking.postRecipient ? `(${booking.postRecipient})` : ""}
            </span>
            {booking.postAddress && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const text = `${booking.postName}\n${booking.postAddress}`;
                  if (navigator.clipboard) navigator.clipboard.writeText(text);
                  if (window.fiToast) window.fiToast("Address copied");
                }}
                title="Copy full address"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5b6b76", padding: 0 }}
              >
                <Icon name="copy" size={10}/>
              </button>
            )}
          </div>
          <div style={{ fontWeight: 600, color: "#063952" }}>{booking.postName}</div>
          {booking.postAddress ? (
            <div style={{ color: "#3d4a52", whiteSpace: "pre-wrap", marginTop: 2, lineHeight: 1.35, fontSize: 11 }}>{booking.postAddress}</div>
          ) : (
            <div style={{ color: "#7a4f00", fontStyle: "italic", marginTop: 2, fontSize: 11 }}>
              <Icon name="warning" size={9}/> No postal address yet — open the matter to add it.
            </div>
          )}
        </div>
      )}
      {!booking.postName && (
        <div style={{ fontSize: 11, color: "#7a4f00", padding: "4px 0" }}>
          <Icon name="warning" size={10}/> Post-to address not set yet
        </div>
      )}
      <TrackingEditor booking={booking}/>
      <QuickPostActions booking={booking}/>
      {actFn && (
        <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={(e) => actFn(booking, e)} className="btn btn-navy btn-sm">
            <Icon name={actIcon} size={11}/> {actLabel}
          </button>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// QuickPostActions — one-click "Mark posted + email tracking to client" and
// "Re-email tracking" buttons on the queue card. Aashma can complete the
// post-out + client notification in literally one click without opening
// anything. Tracking number must already be set (use TrackingEditor above).
// ----------------------------------------------------------------------------
const QuickPostActions = ({ booking }) => {
  const [busy, setBusy] = React.useState(false);
  const stop = (e) => e && e.stopPropagation && e.stopPropagation();

  if (!booking.trackingNumber) return null;  // need tracking first

  const cleanNum = (booking.trackingNumber || "").replace(/\s/g, "");
  const trackingUrl = `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(cleanNum)}`;
  const portalUrl = window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref);
  const firstName = ((booking.clientName || "").split(" ")[0] || "there");

  const sendTrackingEmail = async () => {
    const subject = `Your ILA pack is on its way — tracking ${booking.trackingNumber}`;
    const body = `Hi ${firstName},\n\nYour signed ILA pack has been posted to ${booking.postName || "the lender"} by ${booking.trackingService || "Royal Mail"}.\n\nTracking number: ${booking.trackingNumber}\nTrack live: ${trackingUrl}\n\nYou can also see this update in your portal:\n${portalUrl}\n\nKind regards,\nYour ILA solicitor`;
    const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
    if (n8n && n8n.webhookUrl) {
      try {
        await fetch(n8n.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
          body: JSON.stringify({
            event: "booking.wet.posted",
            ref: booking.ref,
            clientName: booking.clientName,
            clientEmail: booking.clientEmail,
            phone: booking.phone,
            trackingNumber: booking.trackingNumber,
            trackingService: booking.trackingService,
            trackingUrl,
            postedTo: booking.postName || null,
            portalUrl,
            message: { subject, body },
            channels: booking.phone ? ["email", "sms"] : ["email"],
          }),
        });
      } catch (_e) {}
    }
    try {
      await FastILA.bookings.update(booking.ref, { lastTrackingEmailAt: new Date().toISOString() });
    } catch (_e) {}
    FastILA.bookings.addNote(booking.ref, `Tracking email sent to ${booking.clientEmail || "client"}: ${booking.trackingNumber}`);
    if (window.fiToast) window.fiToast(`Tracking emailed to ${booking.clientName}`);
  };

  const markPostedAndEmail = async (e) => {
    stop(e);
    setBusy(true);
    try {
      if (booking.dispatch !== "posted" && booking.dispatch !== "delivered") {
        await FastILA.bookings.setDispatch(booking.ref, "posted");
        FastILA.bookings.addNote(booking.ref, `Posted to ${booking.postName || "lender"} with tracking ${booking.trackingNumber}`);
      }
      await sendTrackingEmail();
    } finally { setBusy(false); }
  };

  const reEmailOnly = async (e) => {
    stop(e);
    setBusy(true);
    try { await sendTrackingEmail(); } finally { setBusy(false); }
  };

  // For "ready_to_post" / "signed" / undefined: show the big "Mark posted + email" button
  if (booking.dispatch !== "posted" && booking.dispatch !== "delivered") {
    return (
      <button
        onClick={markPostedAndEmail}
        disabled={busy}
        title="Marks as posted, fires Royal Mail tracking email to the client (and SMS if phone on file), and adds an audit note — one click."
        style={{
          marginTop: 4,
          padding: "8px 10px",
          background: "#1e5128",
          color: "white",
          border: "none",
          borderRadius: 6,
          fontWeight: 700,
          fontSize: 12.5,
          cursor: busy ? "default" : "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
        }}
      >
        <Icon name="send" size={12}/>
        {busy ? "Sending…" : "Mark posted + email tracking"}
      </button>
    );
  }

  // For "posted" / "delivered": offer a re-email + show last sent time
  return (
    <button
      onClick={reEmailOnly}
      disabled={busy}
      title="Re-send the tracking email to the client (e.g. they lost the original)"
      style={{
        marginTop: 4,
        padding: "6px 10px",
        background: "#eaf5fb",
        color: "#063952",
        border: "1px solid #b8d7e6",
        borderRadius: 6,
        fontSize: 11.5,
        fontWeight: 600,
        cursor: busy ? "default" : "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
      }}
    >
      <Icon name="mail" size={11}/>
      {busy
        ? "Sending…"
        : booking.lastTrackingEmailAt
          ? `Re-send tracking email (last ${new Date(booking.lastTrackingEmailAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })})`
          : "Email tracking to client"}
    </button>
  );
};

// ----------------------------------------------------------------------------
// TrackingEditor — inline add/edit of Royal Mail tracking on a queue card so
// the lawyer doesn't have to open the matter detail. Shows the navy chip when
// not editing; flips to an input + service select + Save when the lawyer wants
// to add or change it. All clicks stop propagation so they don't open the
// detail page underneath.
// ----------------------------------------------------------------------------
const TrackingEditor = ({ booking }) => {
  const [editing, setEditing] = React.useState(false);
  const [num, setNum] = React.useState(booking.trackingNumber || "");
  const [svc, setSvc] = React.useState(booking.trackingService || "Royal Mail Special Delivery 1pm");
  const [saving, setSaving] = React.useState(false);

  // If the booking's tracking changes from elsewhere, mirror it
  React.useEffect(() => {
    setNum(booking.trackingNumber || "");
    setSvc(booking.trackingService || "Royal Mail Special Delivery 1pm");
  }, [booking.trackingNumber, booking.trackingService]);

  const stop = (e) => e && e.stopPropagation && e.stopPropagation();

  const save = async (e) => {
    stop(e);
    const v = (num || "").trim();
    if (!v) { if (window.fiToast) window.fiToast("Add a tracking number"); return; }
    setSaving(true);
    try {
      await FastILA.bookings.setTracking(booking.ref, v, svc);
      // If we were earlier in the wet flow, advance to "posted" so the queue
      // moves the card to the right column too.
      if (booking.dispatch === "ready_to_post" || !booking.dispatch || booking.dispatch === "signed") {
        await FastILA.bookings.setDispatch(booking.ref, "posted");
      }
      FastILA.bookings.addNote(booking.ref, `Tracking ${booking.trackingNumber ? "updated" : "added"} from queue: ${v} (${svc})`);
      // Fire n8n so the client gets the tracking link via email/SMS
      const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
      if (n8n && n8n.webhookUrl) {
        try {
          fetch(n8n.webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
            body: JSON.stringify({
              event: "booking.wet.posted",
              ref: booking.ref,
              clientName: booking.clientName,
              clientEmail: booking.clientEmail,
              phone: booking.phone,
              trackingNumber: v,
              trackingService: svc,
              postedTo: booking.postName || null,
              portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref),
            }),
          }).catch(() => {});
        } catch (_e) {}
      }
      if (window.fiToast) window.fiToast(`Tracking saved · ${booking.clientName}`);
      setEditing(false);
    } catch (err) {
      if (window.fiToast) window.fiToast("Save failed: " + (err.message || err), "err");
    }
    setSaving(false);
  };

  if (editing) {
    return (
      <div
        onClick={stop}
        style={{
          marginTop: 4, padding: 8,
          background: "white", border: "1px solid #063952", borderRadius: 6,
          display: "grid", gap: 6,
        }}
      >
        <input
          className="field-input mono"
          placeholder="QY 0000 0000 0 GB"
          value={num}
          onChange={(e) => setNum(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
          onClick={stop}
          autoFocus
          style={{ fontSize: 12, padding: "4px 8px" }}
        />
        <select
          className="field-input"
          value={svc}
          onChange={(e) => setSvc(e.target.value)}
          onClick={stop}
          style={{ fontSize: 12, padding: "4px 8px" }}
        >
          <option>Royal Mail Special Delivery 1pm</option>
          <option>Royal Mail Special Delivery 9am</option>
          <option>Royal Mail Tracked 24</option>
          <option>Royal Mail Tracked 48</option>
          <option>Royal Mail Signed For 1st Class</option>
        </select>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={save} className="btn btn-navy btn-sm" disabled={saving} style={{ flex: 1, fontSize: 11.5, padding: "5px 8px" }}>
            <Icon name="check" size={11} stroke={3}/> {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={(e) => { stop(e); setEditing(false); setNum(booking.trackingNumber || ""); }} className="btn btn-ghost btn-sm" style={{ fontSize: 11.5, padding: "5px 8px" }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (booking.trackingNumber) {
    const cleanNum = (booking.trackingNumber || "").replace(/\s/g, "");
    const rmUrl = cleanNum ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(cleanNum)}` : null;
    return (
      <div
        onClick={stop}
        style={{
          marginTop: 4, padding: "6px 8px",
          background: "#063952", color: "#e6f7c8", borderRadius: 4,
          display: "flex", alignItems: "center", gap: 6,
          fontFamily: "monospace", fontSize: 11.5,
        }}
      >
        <Icon name="stamp" size={10}/>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{booking.trackingNumber}</span>
        {rmUrl && (
          <a
            href={rmUrl} target="_blank" rel="noopener noreferrer"
            onClick={stop}
            title="Open in Royal Mail tracker"
            style={{ color: "inherit", display: "inline-flex", padding: "2px 4px", opacity: 0.85 }}
          >
            <Icon name="external" size={10}/>
          </a>
        )}
        <button
          onClick={(e) => { stop(e); setEditing(true); }}
          title="Edit tracking"
          style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", padding: "2px 4px", opacity: 0.85 }}
        >
          <Icon name="edit" size={10}/>
        </button>
      </div>
    );
  }

  // No tracking yet
  return (
    <button
      onClick={(e) => { stop(e); setEditing(true); }}
      style={{
        marginTop: 4, padding: "6px 8px",
        background: "#fff7e6", border: "1px dashed #f4d99a", borderRadius: 4,
        color: "#7a4f00", fontSize: 11.5, fontWeight: 600,
        display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", width: "100%", justifyContent: "center",
      }}
      title="Add Royal Mail tracking inline"
    >
      <Icon name="plus" size={10}/> Add tracking
    </button>
  );
};

// ============================================================================
// WetSpreadsheet — Excel/Google-Sheets style table. Each row is a wet matter.
// Every cell that can change is inline-editable. The moment Aashma changes
// the stage dropdown or types a tracking number, the client gets an email +
// SMS through n8n (if connected) and the same update lands on their portal.
// All edits sync via the shared FastILA store, so the same row updates
// instantly across admin, lawyer, and wet-specialist views.
// ============================================================================

const STAGE_OPTIONS = [
  { id: "awaiting_signature", label: "1 · Awaiting client's pack",  tone: "warn"    },
  { id: "signed",             label: "2 · Received in office",       tone: "info"    },
  { id: "ready_to_post",      label: "3 · Solicitor signed",         tone: "info"    },
  { id: "posted",             label: "4 · Posted to recipient",      tone: "info"    },
  { id: "delivered",          label: "5 · Delivered (complete)",     tone: "success" },
];
const STAGE_TONE_COLOR = {
  warn:    { bg: "#fff7e6", fg: "#7a4f00", dot: "#d48800" },
  info:    { bg: "#eaf5fb", fg: "#0a3a55", dot: "#0a4a67" },
  success: { bg: "#e8f5e9", fg: "#1e5128", dot: "#1e5128" },
};
const STAGE_EVENTS = {
  awaiting_signature: null,
  signed:             "booking.wet.client_pack_received",
  ready_to_post:      "booking.wet.solicitor_signed",
  posted:             "booking.wet.posted",
  delivered:          "booking.wet.delivered",
};
const STAGE_NOTES = {
  signed:        "Signed pack received from client by post",
  ready_to_post: "Solicitor signed & witnessed — ready to post",
  posted:        "Posted to recipient",
  delivered:     "Royal Mail confirmed delivery",
};

const fireWetUpdate = (booking, event, extra = {}) => {
  if (!event) return;
  const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
  if (!n8n || !n8n.webhookUrl) return;
  try {
    fetch(n8n.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
      body: JSON.stringify({
        event,
        ref: booking.ref,
        clientName: booking.clientName,
        clientEmail: booking.clientEmail,
        phone: booking.phone,
        trackingNumber: booking.trackingNumber || null,
        trackingService: booking.trackingService || null,
        postedTo: booking.postName || null,
        portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref),
        channels: booking.phone ? ["email", "sms"] : ["email"],
        ...extra,
      }),
    }).catch(() => {});
  } catch (_e) {}
};

const WetSpreadsheet = ({ bookings, onOpenDetail }) => {
  // Tracking edit state — local until the user blurs/Enter, then commit
  const [editingTrackId, setEditingTrackId] = React.useState(null);
  const [trackDraft, setTrackDraft] = React.useState("");
  const [trackSvcDraft, setTrackSvcDraft] = React.useState("Royal Mail Special Delivery 1pm");

  const onStageChange = async (booking, newStage) => {
    const prev = booking.dispatch || "awaiting_signature";
    if (newStage === prev) return;
    await FastILA.bookings.setDispatch(booking.ref, newStage);
    const note = STAGE_NOTES[newStage] || `Stage advanced to ${newStage}`;
    FastILA.bookings.addNote(booking.ref, note);
    fireWetUpdate(booking, STAGE_EVENTS[newStage]);
    if (window.fiToast) window.fiToast(`${booking.clientName}: ${STAGE_OPTIONS.find(o => o.id === newStage).label.split(" · ")[1]}${booking.phone ? " — client notified by email + SMS" : " — client notified by email"}`);
  };

  const commitTracking = async (booking) => {
    const num = (trackDraft || "").trim();
    if (!num) { setEditingTrackId(null); return; }
    await FastILA.bookings.setTracking(booking.ref, num, trackSvcDraft);
    // Auto-advance to "posted" if still earlier in the flow
    if (booking.dispatch !== "posted" && booking.dispatch !== "delivered") {
      await FastILA.bookings.setDispatch(booking.ref, "posted");
    }
    await FastILA.bookings.update(booking.ref, { lastTrackingEmailAt: new Date().toISOString() });
    FastILA.bookings.addNote(booking.ref, `Tracking added from spreadsheet: ${num} (${trackSvcDraft})`);
    fireWetUpdate({ ...booking, trackingNumber: num, trackingService: trackSvcDraft, dispatch: "posted" }, "booking.wet.posted");
    if (window.fiToast) window.fiToast(`Tracking saved + client notified · ${booking.clientName}`);
    setEditingTrackId(null);
  };

  const togglePostedAddress = async (booking) => {
    // Inline edit for post-to fields via prompt — simple but effective; full
    // detail page has the structured form.
    const newName = window.prompt(`Recipient name for ${booking.clientName} (e.g. "Shawbrook Bank plc"):`, booking.postName || "");
    if (newName === null) return;
    const newAddress = window.prompt(`Postal address (multi-line — paste as one block):`, booking.postAddress || "");
    if (newAddress === null) return;
    await FastILA.bookings.update(booking.ref, {
      postName: newName.trim() || null,
      postAddress: newAddress.trim() || null,
      postRecipient: booking.postRecipient || "lender",
    });
    FastILA.bookings.addNote(booking.ref, `Post-to address updated: ${newName}`);
    if (window.fiToast) window.fiToast("Post-to address saved");
  };

  // Sort: not delivered first, then by date
  const sorted = [...bookings].sort((a, b) => {
    const aDone = a.dispatch === "delivered" ? 1 : 0;
    const bDone = b.dispatch === "delivered" ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return String(a.date || "").localeCompare(String(b.date || ""));
  });

  if (sorted.length === 0) {
    return (
      <section className="panel" style={{ padding: 28, textAlign: "center", color: "#5b6b76" }}>
        <Icon name="search" size={20}/>
        <div style={{ marginTop: 8 }}>No matches for the current search.</div>
      </section>
    );
  }

  return (
    <section className="panel" style={{ padding: 0, overflow: "hidden", borderRadius: 10 }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1100 }}>
          <thead>
            <tr style={{ background: "#f5f7f9", borderBottom: "1px solid #e4e8ec" }}>
              <SheetTh w={36}>✓</SheetTh>
              <SheetTh w={130}>Ref</SheetTh>
              <SheetTh w={180}>Client</SheetTh>
              <SheetTh w={120}>ILA solicitor</SheetTh>
              <SheetTh w={110}>Call date</SheetTh>
              <SheetTh w={220}>Stage</SheetTh>
              <SheetTh w={280}>Post-to (recipient + address)</SheetTh>
              <SheetTh w={260}>Royal Mail tracking</SheetTh>
              <SheetTh w={60}></SheetTh>
            </tr>
          </thead>
          <tbody>
            {sorted.map(b => {
              const stage = b.dispatch || "awaiting_signature";
              const stageObj = STAGE_OPTIONS.find(o => o.id === stage) || STAGE_OPTIONS[0];
              const isDelivered = stage === "delivered";
              const stageColor = STAGE_TONE_COLOR[stageObj.tone];
              const lawyer = (window.LAWYERS || []).find(l => l.id === b.lawyerId);
              const isEditingTrack = editingTrackId === b.ref;
              const cleanTrack = (b.trackingNumber || "").replace(/\s/g, "");
              const rmUrl = cleanTrack ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(cleanTrack)}` : null;
              return (
                <tr key={b.ref} style={{ borderBottom: "1px solid #eef0f3", background: isDelivered ? "#fafbf7" : "white", opacity: isDelivered ? 0.7 : 1 }}>
                  {/* Cross-off checkbox (mark delivered) */}
                  <SheetTd>
                    <input
                      type="checkbox"
                      checked={isDelivered}
                      onChange={(e) => onStageChange(b, e.target.checked ? "delivered" : "posted")}
                      title={isDelivered ? "Re-open (mark posted)" : "Cross off as delivered — client gets email/SMS"}
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                  </SheetTd>
                  {/* Ref — click to open detail */}
                  <SheetTd>
                    <button
                      onClick={() => onOpenDetail && onOpenDetail(b.ref)}
                      style={{ background: "transparent", border: "none", padding: 0, color: "#063952", fontFamily: "monospace", fontSize: 12, cursor: "pointer", textDecoration: "underline", textDecorationStyle: "dotted" }}
                      title="Open matter detail"
                    >
                      {b.ref}
                    </button>
                  </SheetTd>
                  {/* Client */}
                  <SheetTd>
                    <div style={{ fontWeight: 700, color: "#063952", fontSize: 13, textDecoration: isDelivered ? "line-through" : "none" }}>{b.clientName}</div>
                    {b.lender && <div style={{ fontSize: 11, color: "#5b6b76" }}>{b.lender}</div>}
                  </SheetTd>
                  {/* ILA solicitor */}
                  <SheetTd>
                    {lawyer
                      ? <span style={{ fontSize: 12, color: "#063952" }}>{lawyer.name}</span>
                      : <span style={{ fontSize: 12, color: "#9aa6ad" }}>—</span>}
                  </SheetTd>
                  {/* Call date */}
                  <SheetTd>
                    <span style={{ fontSize: 12, color: "#3d4a52" }}>{b.date || "—"}{b.time ? ` ${b.time}` : ""}</span>
                  </SheetTd>
                  {/* Stage dropdown */}
                  <SheetTd>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: stageColor.dot, flexShrink: 0 }}/>
                      <select
                        value={stage}
                        onChange={(e) => onStageChange(b, e.target.value)}
                        style={{
                          flex: 1, padding: "5px 8px", border: "1px solid #d6dee5", borderRadius: 4,
                          background: stageColor.bg, color: stageColor.fg, fontWeight: 600,
                          fontSize: 12, cursor: "pointer",
                        }}
                        title="Change stage — client gets email + SMS instantly"
                      >
                        {STAGE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                      </select>
                    </div>
                  </SheetTd>
                  {/* Post-to */}
                  <SheetTd>
                    {b.postName ? (
                      <button
                        onClick={() => togglePostedAddress(b)}
                        title="Click to edit recipient + address"
                        style={{ width: "100%", background: "transparent", border: "1px dashed transparent", borderRadius: 4, padding: "4px 6px", textAlign: "left", cursor: "pointer" }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#cfd8de"; e.currentTarget.style.background = "#fafbf7"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{ fontWeight: 600, color: "#063952", fontSize: 12.5 }}>{b.postName}</div>
                        {b.postAddress && (
                          <div style={{ fontSize: 11, color: "#5b6b76", whiteSpace: "pre-line", marginTop: 2, lineHeight: 1.3 }}>{b.postAddress}</div>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => togglePostedAddress(b)}
                        style={{ background: "#fff7e6", border: "1px dashed #f4d99a", borderRadius: 4, padding: "5px 8px", fontSize: 11.5, color: "#7a4f00", fontWeight: 600, cursor: "pointer", width: "100%" }}
                      >
                        <Icon name="plus" size={10}/> Add post-to address
                      </button>
                    )}
                  </SheetTd>
                  {/* Tracking — inline editable */}
                  <SheetTd>
                    {isEditingTrack ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <input
                          autoFocus
                          value={trackDraft}
                          onChange={(e) => setTrackDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") commitTracking(b); if (e.key === "Escape") setEditingTrackId(null); }}
                          placeholder="QY 0000 0000 0 GB"
                          style={{ padding: "5px 8px", fontFamily: "monospace", fontSize: 12, border: "1px solid #063952", borderRadius: 4 }}
                        />
                        <select
                          value={trackSvcDraft}
                          onChange={(e) => setTrackSvcDraft(e.target.value)}
                          style={{ padding: "4px 6px", fontSize: 11.5, border: "1px solid #d6dee5", borderRadius: 4 }}
                        >
                          <option>Royal Mail Special Delivery 1pm</option>
                          <option>Royal Mail Special Delivery 9am</option>
                          <option>Royal Mail Tracked 24</option>
                          <option>Royal Mail Tracked 48</option>
                          <option>Royal Mail Signed For 1st Class</option>
                        </select>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button onClick={() => commitTracking(b)} style={{ flex: 1, padding: "4px 8px", background: "#063952", color: "white", border: "none", borderRadius: 4, fontSize: 11.5, fontWeight: 600, cursor: "pointer" }}>
                            Save + email client
                          </button>
                          <button onClick={() => setEditingTrackId(null)} style={{ padding: "4px 8px", background: "white", border: "1px solid #d6dee5", borderRadius: 4, fontSize: 11.5, cursor: "pointer" }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : b.trackingNumber ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <code style={{ flex: 1, background: "#063952", color: "#e6f7c8", padding: "4px 8px", borderRadius: 4, fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.trackingNumber}</code>
                        {rmUrl && (
                          <a href={rmUrl} target="_blank" rel="noopener noreferrer" title="Open in Royal Mail tracker" style={{ display: "inline-flex", padding: 3, color: "#5b6b76" }}>
                            <Icon name="external" size={11}/>
                          </a>
                        )}
                        <button
                          onClick={() => { setTrackDraft(b.trackingNumber); setTrackSvcDraft(b.trackingService || "Royal Mail Special Delivery 1pm"); setEditingTrackId(b.ref); }}
                          title="Edit tracking"
                          style={{ background: "transparent", border: "none", cursor: "pointer", color: "#5b6b76", padding: 2 }}
                        >
                          <Icon name="edit" size={11}/>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setTrackDraft(""); setTrackSvcDraft("Royal Mail Special Delivery 1pm"); setEditingTrackId(b.ref); }}
                        style={{ width: "100%", background: "#fff7e6", border: "1px dashed #f4d99a", borderRadius: 4, padding: "5px 8px", fontSize: 11.5, color: "#7a4f00", fontWeight: 600, cursor: "pointer" }}
                      >
                        <Icon name="plus" size={10}/> Add tracking
                      </button>
                    )}
                  </SheetTd>
                  {/* Open detail */}
                  <SheetTd style={{ textAlign: "right" }}>
                    <button
                      onClick={() => onOpenDetail && onOpenDetail(b.ref)}
                      title="Open full matter detail"
                      style={{ background: "transparent", border: "1px solid #d6dee5", borderRadius: 4, padding: "5px 8px", cursor: "pointer", color: "#063952" }}
                    >
                      <Icon name="external" size={11}/>
                    </button>
                  </SheetTd>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer hint */}
      <div style={{ padding: "10px 14px", background: "#f5f7f9", borderTop: "1px solid #e4e8ec", fontSize: 11.5, color: "#5b6b76", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <span><Icon name="info" size={11}/> Edit any cell — changes save instantly and the client gets email + SMS via n8n.</span>
        <span><strong>{sorted.length}</strong> matter{sorted.length === 1 ? "" : "s"} shown</span>
      </div>
    </section>
  );
};

const SheetTh = ({ children, w }) => (
  <th style={{ padding: "10px 12px", fontWeight: 700, color: "#5b6b76", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", width: w, whiteSpace: "nowrap" }}>{children}</th>
);
const SheetTd = ({ children, style }) => (
  <td style={{ padding: "8px 12px", verticalAlign: "top", ...style }}>{children}</td>
);

Object.assign(window, { WetSignatureQueueView });

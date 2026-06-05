/* global React, Icon, Avatar, SERVICES, LAWYERS, BOOKINGS, FastILA, fmtDateLong */
// Fast-ILA action helpers + modals.
// One place that owns: New booking, Reschedule, Add tracking, Add note,
// Confirm cancel, Document preview, Lawyer add/edit, Lender add/edit.
//
// Every visible button in the dashboard, royal-mail kanban, lawyers view, etc.
// routes through one of these — so they all persist via FastILA and broadcast
// to other open tabs. No more decorative buttons.

// =============================================================================
// Generic Modal
// =============================================================================
const Modal = ({ open, onClose, title, subtitle, children, footer, maxWidth = 560 }) => {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fi-modal-backdrop" onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(6,57,82,0.45)",
      zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
    }}>
      <div className="fi-modal" onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.3)",
        maxWidth, width: "100%", maxHeight: "90vh", display: "flex", flexDirection: "column",
      }}>
        <div className="fi-modal-head" style={{
          padding: "20px 24px", borderBottom: "1px solid #eef0f3",
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#063952" }}>{title}</h3>
            {subtitle && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5b6b76" }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: "transparent", border: 0, padding: 6, cursor: "pointer", color: "#5b6b76",
          }}><Icon name="x" size={18}/></button>
        </div>
        <div className="fi-modal-body" style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {children}
        </div>
        {footer && (
          <div className="fi-modal-foot" style={{
            padding: "16px 24px", borderTop: "1px solid #eef0f3",
            display: "flex", justifyContent: "flex-end", gap: 8,
          }}>{footer}</div>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// New Booking modal — admin/lawyer creates a booking directly
// =============================================================================
const NewBookingModal = ({ open, onClose, onCreated, defaultLawyerId }) => {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const ymd = (d) => d.toISOString().slice(0, 10);

  const [form, setForm] = React.useState({
    serviceId: "standard",
    lawyerId: defaultLawyerId || "",
    date: ymd(tomorrow),
    time: "10:00",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    lender: "",
    matterType: "personal-guarantee",
    legal: "",
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        serviceId: "standard",
        lawyerId: defaultLawyerId || "",
        date: ymd(tomorrow),
        time: "10:00",
        clientName: "",
        clientEmail: "",
        clientPhone: "",
        lender: "",
        matterType: "personal-guarantee",
        legal: "",
      });
      setError(null);
    }
  }, [open, defaultLawyerId]);

  const svc = SERVICES.find(s => s.id === form.serviceId);
  const eligibleLawyers = LAWYERS.filter(l => l.services.includes(form.serviceId));
  const canSubmit = form.serviceId && form.date && form.time && form.clientName && form.clientEmail && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const assignedLawyerId = form.lawyerId || eligibleLawyers[0]?.id || (LAWYERS[0] && LAWYERS[0].id);
      const res = await FastILA.bookings.create({
        service_id: form.serviceId,
        lawyer_id: assignedLawyerId,
        appointment_date: form.date,
        appointment_time: form.time,
        client_name: form.clientName,
        client_email: form.clientEmail,
        client_phone: form.clientPhone,
        lender: form.lender,
        legal_summary: form.legal,
        amount: svc?.price,
        source: "internal",
      });
      onCreated && onCreated(res.ref);
      onClose();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New booking"
      subtitle="Create a booking directly — bypasses the public form"
      maxWidth={640}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="btn btn-navy" onClick={submit} disabled={!canSubmit}>
            {submitting ? "Saving…" : <>Create booking <Icon name="check" size={14}/></>}
          </button>
        </>
      }
    >
      <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Service</label>
          <select className="field-input" value={form.serviceId} onChange={(e) => update("serviceId", e.target.value)}>
            {SERVICES.map(s => <option key={s.id} value={s.id}>{s.name} — £{s.price}</option>)}
          </select>
        </div>

        <div>
          <label className="field-label">Lawyer</label>
          <select className="field-input" value={form.lawyerId} onChange={(e) => update("lawyerId", e.target.value)}>
            <option value="">— Auto-assign —</option>
            {eligibleLawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label">Date</label>
          <input className="field-input" type="date" value={form.date} onChange={(e) => update("date", e.target.value)}/>
        </div>
        <div>
          <label className="field-label">Time (Europe/London)</label>
          <input className="field-input" type="time" value={form.time} onChange={(e) => update("time", e.target.value)}/>
        </div>
        <div>
          <label className="field-label">Matter type</label>
          <select className="field-input" value={form.matterType} onChange={(e) => update("matterType", e.target.value)}>
            {(window.MATTER_TYPES || []).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1", marginTop: 8, fontWeight: 600, color: "#063952" }}>Client</div>
        <div>
          <label className="field-label">Full name *</label>
          <input className="field-input" value={form.clientName} onChange={(e) => update("clientName", e.target.value)} placeholder="As on the certificate"/>
        </div>
        <div>
          <label className="field-label">Email *</label>
          <input className="field-input" type="email" value={form.clientEmail} onChange={(e) => update("clientEmail", e.target.value)} placeholder="client@email.com"/>
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input className="field-input" value={form.clientPhone} onChange={(e) => update("clientPhone", e.target.value)} placeholder="+44…"/>
        </div>
        <div>
          <label className="field-label">Lender</label>
          <input className="field-input" value={form.lender} onChange={(e) => update("lender", e.target.value)} placeholder="e.g. Shawbrook Bank"/>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Legal summary</label>
          <textarea className="field-textarea" rows={3} value={form.legal} onChange={(e) => update("legal", e.target.value)} placeholder="A sentence or two on the matter…"/>
        </div>

        {error && (
          <div style={{ gridColumn: "1 / -1", color: "#9a1c1c", fontSize: 13, padding: "8px 10px", background: "#fff1f1", border: "1px solid #f3c2c2", borderRadius: 6 }}>
            <Icon name="x-circle" size={13}/> {error}
          </div>
        )}
      </div>
    </Modal>
  );
};

// =============================================================================
// Change / upgrade service modal
//
// Common case: client books "Standard ILA" digital. After the Meet, the lawyer
// realises the lender needs a wet signature. They open this modal, pick "Wet
// signature / Weekend" and the booking's serviceId + amount update, and
// dispatch is set to "awaiting_signature" so the matter joins the Royal Mail
// queue. Revenue + sidebar counts update automatically because everything
// reads from BOOKINGS via the store.
// =============================================================================
const ChangeServiceModal = ({ open, onClose, booking, onChanged }) => {
  const [serviceId, setServiceId] = React.useState(booking?.serviceId || "standard");
  const [note, setNote] = React.useState("");
  React.useEffect(() => {
    if (open && booking) {
      setServiceId(booking.serviceId);
      setNote("");
    }
  }, [open, booking?.ref]);

  if (!booking) return null;
  const current = SERVICES.find(s => s.id === booking.serviceId) || { name: booking.serviceId, price: booking.amount || 0, delivery: "digital" };
  const next = SERVICES.find(s => s.id === serviceId) || current;
  const delta = (next.price || 0) - (booking.amount || current.price || 0);
  const becomingWet = next.delivery === "postal" && current.delivery !== "postal";
  const becomingDigital = next.delivery === "digital" && current.delivery === "postal";

  const submit = async () => {
    if (serviceId === booking.serviceId) { onClose(); return; }
    const patch = {
      serviceId: next.id,
      amount: next.price,
      duration: next.duration || booking.duration,
    };
    // Auto-set dispatch state when switching to / from wet signature
    if (becomingWet) {
      patch.dispatch = booking.dispatch || "awaiting_signature";
    } else if (becomingDigital) {
      patch.dispatch = null;
      patch.trackingNumber = null;
      patch.trackingService = null;
    }
    FastILA.bookings.update(booking.ref, patch);
    FastILA.bookings.addNote(
      booking.ref,
      `Service changed: ${current.name} (£${booking.amount || current.price}) → ${next.name} (£${next.price})${delta !== 0 ? `, fee delta ${delta > 0 ? "+" : ""}£${delta}` : ""}${note ? `. Note: ${note}` : ""}`
    );
    if (delta > 0 && booking.payment === "paid") {
      // The original fee was paid — additional amount becomes pending
      FastILA.bookings.update(booking.ref, { payment: "pending" });
    }
    if (typeof window.fiNotify === "function") {
      window.fiNotify("Service changed", `${booking.ref}: ${current.short || current.name} → ${next.short || next.name}`, booking.ref, "info");
    }

    // Fire n8n webhook with everything the workflow needs to ask the client
    // for the top-up payment. Designed so admin can wire this in n8n:
    //   trigger: HTTP webhook  →  send email + SMS  →  log in CRM
    const n8n = window.fiIntegration?.get?.("n8n");
    const firm = window.FastILA?.firm?.get?.() || {};
    const bankCfg = firm.clientAccount || {};
    const paymentRef = fiPaymentReference(booking);
    const portalUrl = window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref);

    const eventName = delta > 0
      ? "booking.service_upgraded"
      : delta < 0
        ? "booking.service_downgraded"
        : "booking.service_changed";

    if (n8n?.webhookUrl) {
      try {
        await fetch(n8n.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
          body: JSON.stringify({
            event: eventName,
            ref: booking.ref,
            client: {
              name: booking.clientName,
              email: booking.clientEmail,
              phone: booking.phone,
            },
            firm: {
              name: firm.firm || firm.tradingAs || "",
              supportEmail: firm.supportEmail || "",
              tradingAs: firm.tradingAs || "",
            },
            previousService: {
              id: current.id, name: current.name, price: booking.amount || current.price, delivery: current.delivery,
            },
            newService: {
              id: next.id, name: next.name, price: next.price, delivery: next.delivery,
            },
            payment: {
              delta,                       // positive = top-up, negative = refund
              direction: delta > 0 ? "top_up_required" : delta < 0 ? "refund_due" : "no_change",
              amountToPay: delta > 0 ? delta : 0,
              amountToRefund: delta < 0 ? Math.abs(delta) : 0,
              newTotal: next.price,
              reference: paymentRef,
              account: {
                bank: bankCfg.bank || "",
                sortCode: bankCfg.sortCode || "",
                accountNumber: bankCfg.account || "",
                accountName: (firm.firm || "") + " Client Account",
              },
            },
            portalUrl,
            note,
            at: new Date().toISOString(),
          }),
        });
        FastILA.bookings.addNote(booking.ref, `n8n notified: ${eventName} (delta £${delta}, ref ${paymentRef})`);
        toast(`${booking.ref} → ${next.short || next.name}${delta !== 0 ? ` · n8n notified ${delta > 0 ? "top-up" : "refund"} £${Math.abs(delta)}` : ""}`);
      } catch (e) {
        FastILA.bookings.addNote(booking.ref, `n8n webhook failed: ${e.message}`);
        toast(`Service changed — n8n webhook failed`, "err");
      }
    } else {
      toast(`${booking.ref} → ${next.short || next.name}${delta !== 0 ? ` (${delta > 0 ? "+" : ""}£${delta}) — connect n8n to auto-notify client` : ""}`);
    }

    onChanged && onChanged();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Change / upgrade service"
      subtitle={`${booking.ref} — ${booking.clientName}`}
      maxWidth={600}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit} disabled={serviceId === booking.serviceId && !note}>
            <Icon name="check" size={14}/> Apply change
          </button>
        </>
      }>
      <div style={{ marginBottom: 14, padding: 12, background: "#f7f5ee", borderRadius: 8, fontSize: 13 }}>
        <strong style={{ color: "#063952" }}>Currently:</strong>{" "}
        <span style={{ color: "#5b6b76" }}>{current.name || current.short} · £{booking.amount || current.price}{current.delivery === "postal" ? " · wet signature" : " · digital"}</span>
      </div>

      <label className="field-label">New service</label>
      <select
        className="field-input"
        value={serviceId}
        onChange={(e) => setServiceId(e.target.value)}
      >
        {(SERVICES || []).map(s => (
          <option key={s.id} value={s.id}>
            {s.name} — £{s.price}{s.delivery === "postal" ? " (wet)" : " (digital)"}
          </option>
        ))}
      </select>

      {/* n8n status indicator */}
      {(() => {
        const isLive = window.fiIntegration?.isConnected?.("n8n");
        return (
          <div style={{
            marginTop: 12, padding: 10, borderRadius: 8, fontSize: 12,
            background: isLive ? "#e6f7c8" : "#fff7e6",
            color:      isLive ? "#1a4205" : "#7a4d00",
            border: "1px solid " + (isLive ? "#b9d995" : "#f0d49a"),
          }}>
            <Icon name={isLive ? "check" : "info"} size={12}/>{" "}
            {isLive
              ? <>n8n connected — saving will fire <code style={{ fontFamily: "monospace" }}>booking.service_upgraded</code> with the payment delta + reference. Wire your n8n workflow to email + SMS the client.</>
              : <>n8n is not connected. The service will change locally, but the client won't be auto-notified. Connect n8n in <strong>Integrations</strong> to enable.</>
            }
          </div>
        );
      })()}

      {/* Price delta + dispatch impact summary */}
      {serviceId !== booking.serviceId && (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: "1px solid " + (delta > 0 ? "#b9d995" : delta < 0 ? "#f3c2c2" : "#c8d4dc"), background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong style={{ color: "#063952" }}>Fee change</strong>
            <span className={`pill ${delta > 0 ? "pill-success" : delta < 0 ? "pill-warning" : "pill-muted"}`}>
              {delta > 0 ? `+£${delta} due` : delta < 0 ? `Refund £${Math.abs(delta)}` : "No change"}
            </span>
          </div>
          <div style={{ fontSize: 13, color: "#5b6b76" }}>
            {becomingWet && (
              <div style={{ marginBottom: 6 }}>
                <Icon name="stamp" size={12}/> <strong>Joins Royal Mail queue</strong> — dispatch set to <em>awaiting signature</em>. Use "Add tracking number" when posting out.
              </div>
            )}
            {becomingDigital && (
              <div style={{ marginBottom: 6 }}>
                <Icon name="info" size={12}/> Switching back to digital — any wet-sig tracking will be cleared.
              </div>
            )}
            {delta > 0 && booking.payment === "paid" && (
              <div>
                <Icon name="card" size={12}/> Booking was paid — payment status reverts to <strong>pending</strong> for the £{delta} top-up. Send the client an updated invoice externally.
              </div>
            )}
            {delta > 0 && booking.payment !== "paid" && (
              <div><Icon name="card" size={12}/> Client will be charged the new total of £{next.price}.</div>
            )}
            {delta < 0 && (
              <div><Icon name="card" size={12}/> Refund the £{Math.abs(delta)} difference externally.</div>
            )}
          </div>
        </div>
      )}

      <label className="field-label" style={{ marginTop: 14 }}>Internal note (logged to audit) <span className="bk-optional" style={{ color: "#5b6b76", fontSize: 11 }}>(optional)</span></label>
      <textarea
        className="field-textarea"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. Lender confirmed wet-only after the call · 15:42"
      />
    </Modal>
  );
};

// =============================================================================
// Reschedule modal
// =============================================================================
const RescheduleModal = ({ open, onClose, booking, onRescheduled }) => {
  const [date, setDate] = React.useState(booking?.date || "");
  const [time, setTime] = React.useState(booking?.time || "");
  const [lawyerId, setLawyerId] = React.useState(booking?.lawyerId || "");
  React.useEffect(() => {
    if (open && booking) {
      setDate(booking.date);
      setTime(booking.time);
      setLawyerId(booking.lawyerId || "");
    }
  }, [open, booking]);

  const submit = () => {
    if (!booking) return;
    FastILA.bookings.reschedule(booking.ref, date, time, lawyerId);
    FastILA.bookings.addNote(booking.ref, `Rescheduled to ${date} ${time}`);
    onRescheduled && onRescheduled();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Reschedule" subtitle={booking ? booking.ref : ""}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit}>Save change <Icon name="check" size={14}/></button>
        </>
      }>
      <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="field-label">Date</label>
          <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
        </div>
        <div>
          <label className="field-label">Time</label>
          <input className="field-input" type="time" value={time} onChange={(e) => setTime(e.target.value)}/>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Lawyer</label>
          <select className="field-input" value={lawyerId} onChange={(e) => setLawyerId(e.target.value)}>
            {LAWYERS.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// Add Tracking modal (Royal Mail)
// =============================================================================
const TrackingModal = ({ open, onClose, booking, onSaved }) => {
  const [num, setNum] = React.useState(booking?.trackingNumber || "");
  const [svc, setSvc] = React.useState(booking?.trackingService || "Royal Mail Special Delivery 1pm");
  React.useEffect(() => {
    if (open && booking) {
      setNum(booking.trackingNumber || `QY ${Math.floor(1000 + Math.random()*9000)} ${Math.floor(1000 + Math.random()*9000)} ${Math.floor(Math.random()*10)} GB`);
      setSvc(booking.trackingService || "Royal Mail Special Delivery 1pm");
    }
  }, [open, booking]);

  const submit = () => {
    if (!booking) return;
    FastILA.bookings.setTracking(booking.ref, num, svc);
    FastILA.bookings.setDispatch(booking.ref, "posted");
    FastILA.bookings.addNote(booking.ref, `Tracking added: ${num} (${svc})`);
    onSaved && onSaved();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add tracking number"
      subtitle={booking ? booking.ref + " — " + booking.clientName : ""}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit}>Mark posted <Icon name="stamp" size={14}/></button>
        </>
      }>
      <label className="field-label">Tracking number</label>
      <input className="field-input" value={num} onChange={(e) => setNum(e.target.value)} placeholder="QY 1234 5678 9 GB"/>
      <label className="field-label" style={{ marginTop: 12 }}>Royal Mail service</label>
      <select className="field-input" value={svc} onChange={(e) => setSvc(e.target.value)}>
        <option>Royal Mail Special Delivery 1pm</option>
        <option>Royal Mail Special Delivery 9am</option>
        <option>Royal Mail Signed For 1st Class</option>
      </select>
    </Modal>
  );
};

// =============================================================================
// Cancel booking confirm
// =============================================================================
const CancelConfirm = ({ open, onClose, booking, onConfirmed }) => {
  const [reason, setReason] = React.useState("");
  React.useEffect(() => { if (open) setReason(""); }, [open]);
  const submit = () => {
    if (!booking) return;
    FastILA.bookings.cancel(booking.ref, reason || "No reason given");
    FastILA.bookings.addNote(booking.ref, `Cancelled: ${reason || "no reason"}`);
    onConfirmed && onConfirmed();
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Cancel this booking?"
      subtitle={booking ? booking.ref + " — " + booking.clientName : ""}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Keep it</button>
          <button className="btn btn-navy" onClick={submit} style={{ background: "#9a1c1c", borderColor: "#9a1c1c" }}>
            <Icon name="x" size={14}/> Cancel booking
          </button>
        </>
      }>
      <p style={{ marginTop: 0 }}>The client will be notified and the slot will free up. This can't be undone — you'd have to create a new booking.</p>
      <label className="field-label">Reason (internal)</label>
      <textarea className="field-textarea" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Client postponed; lender withdrew offer; double-booked"/>
    </Modal>
  );
};

// =============================================================================
// Add Note modal — internal-only on a booking
// =============================================================================
const NoteModal = ({ open, onClose, booking, onSaved }) => {
  const [text, setText] = React.useState("");
  React.useEffect(() => { if (open) setText(""); }, [open]);
  const submit = () => {
    if (!booking || !text.trim()) return;
    FastILA.bookings.addNote(booking.ref, text.trim());
    onSaved && onSaved();
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add internal note" subtitle={booking?.ref}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit} disabled={!text.trim()}>Save note</button>
        </>
      }>
      <textarea className="field-textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder="What happened? Pre-call observation, follow-up, anything the team needs to know."/>
    </Modal>
  );
};

// =============================================================================
// Document Preview modal — shows the actual file when we have bytes for it.
// =============================================================================
const DocPreviewModal = ({ open, onClose, doc }) => {
  const [objectUrl, setObjectUrl] = React.useState(null);
  const [mime, setMime] = React.useState(null);
  const [wordHtml, setWordHtml] = React.useState(null);  // rendered Word doc as HTML
  const [wordError, setWordError] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !doc) return;
    let url = null;
    let cancelled = false;
    let createdUrl = false;
    setWordHtml(null); setWordError(null);
    async function load() {
      setLoading(true);
      let blob = null;
      try {
        // Priority: IndexedDB blob (mock uploads) → Supabase signed URL → in-memory blobUrl
        if (doc.storage_key) {
          try {
            const db = await new Promise((res, rej) => {
              const r = window.indexedDB.open("fastila_files", 1);
              r.onsuccess = () => res(r.result);
              r.onerror = () => rej(r.error);
            });
            blob = await new Promise((res, rej) => {
              const tx = db.transaction("blobs", "readonly");
              const r = tx.objectStore("blobs").get(doc.storage_key);
              r.onsuccess = () => res(r.result || null);
              r.onerror = () => rej(r.error);
            });
          } catch (_e) { /* IDB unavailable — fall through */ }
          if (blob && !cancelled) {
            url = URL.createObjectURL(blob); createdUrl = true;
            setObjectUrl(url);
            setMime(blob.type || doc.mime_type || "application/octet-stream");
          }
        }
        if (!blob && doc.storage_path && window.FastILA?.documents?.getBlob) {
          blob = await window.FastILA.documents.getBlob(doc);
          if (blob && !cancelled) {
            url = URL.createObjectURL(blob); createdUrl = true;
            setObjectUrl(url);
            setMime(blob.type || doc.mime_type);
          }
        }
        // Final fallback — caller passed a blobUrl (e.g. just-picked file).
        if (!blob && doc.blobUrl && !cancelled) {
          setObjectUrl(doc.blobUrl);
          setMime(doc.mime_type || null);
          // Fetch the blob from the URL so Word preview can still run mammoth.
          try {
            const res = await fetch(doc.blobUrl);
            blob = await res.blob();
          } catch (_e) { /* ignore */ }
        }

        // Word document preview via mammoth.js (DOCX only — old .doc is binary and not supported in-browser)
        if (blob && !cancelled) {
          const filename = (doc.filename || doc.name || "").toLowerCase();
          const isDocx = filename.endsWith(".docx") || (blob.type || "").includes("officedocument.wordprocessingml");
          const isLegacyDoc = filename.endsWith(".doc") && !filename.endsWith(".docx");
          if (isDocx && window.mammoth) {
            try {
              const buf = await blob.arrayBuffer();
              const result = await window.mammoth.convertToHtml({ arrayBuffer: buf });
              if (!cancelled) setWordHtml(result.value || "<em>(empty document)</em>");
            } catch (e) {
              if (!cancelled) setWordError("Could not render the Word document inline: " + (e.message || e));
            }
          } else if (isLegacyDoc) {
            setWordError("Legacy .doc format isn't supported for inline preview. Please ask the sender for a .docx or .pdf, or use Download.");
          }
        }
      } catch (e) { console.warn("[DocPreview] load failed", e); }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
      if (url && createdUrl) URL.revokeObjectURL(url);
    };
  }, [open, doc]);

  const sizeText = doc
    ? (doc.size_bytes ? Math.round(doc.size_bytes/1024) + " KB" : (doc.size || ""))
    : "";
  const mimeText = doc ? (doc.mime_type || mime || "") : "";
  const subtitleText = [sizeText, mimeText].filter(Boolean).join(" · ") || "—";
  const filename = doc ? (doc.filename || doc.name || "") : "";
  const isImage = (mime || "").startsWith("image/") || (mimeText || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(filename);
  const isPdf = mime === "application/pdf" || mimeText === "application/pdf" || /\.pdf$/i.test(filename);
  const isWord = /\.(docx?|odt)$/i.test(filename) || (mimeText || "").includes("officedocument.wordprocessingml") || (mimeText || "").includes("msword");

  return (
    <Modal open={open} onClose={onClose} title={doc?.name || doc?.filename || "Document"}
      subtitle={subtitleText}
      maxWidth={820}
      footer={
        <>
          {objectUrl && (
            <>
              <button className="btn btn-ghost" onClick={() => {
                const a = document.createElement("a"); a.href = objectUrl; a.download = doc.filename || doc.name || "document"; a.click();
              }}><Icon name="download" size={14}/> Download</button>
              <button className="btn btn-ghost" onClick={() => window.open(objectUrl, "_blank", "noopener")}>
                <Icon name="external" size={14}/> Open in new tab
              </button>
            </>
          )}
          <button className="btn btn-navy" onClick={onClose}>Close</button>
        </>
      }>
      {objectUrl ? (
        isImage ? (
          <img src={objectUrl} alt={doc?.name || doc?.filename || "Preview"} style={{ width: "100%", borderRadius: 10, maxHeight: 540, objectFit: "contain", background: "#f7f5ee" }}/>
        ) : isPdf ? (
          <iframe src={objectUrl} title={doc?.name || doc?.filename} style={{ width: "100%", height: 540, border: 0, borderRadius: 10 }}/>
        ) : isWord ? (
          wordHtml ? (
            // Render the converted Word document — sandbox the iframe so its
            // styles can't escape and inject one to make the body readable.
            <iframe
              title={doc?.name || doc?.filename}
              srcDoc={`<!doctype html><html><head><style>
                body { font-family: -apple-system, Inter, Helvetica, Arial, sans-serif; color: #1f2933; padding: 24px; line-height: 1.6; max-width: 760px; margin: 0 auto; background: white; }
                h1, h2, h3 { color: #063952; }
                p { margin: 0 0 12px; }
                table { border-collapse: collapse; margin: 12px 0; }
                td, th { border: 1px solid #cfd8de; padding: 6px 10px; }
                img { max-width: 100%; }
              </style></head><body>${wordHtml}</body></html>`}
              style={{ width: "100%", height: 540, border: 0, borderRadius: 10, background: "white" }}
            />
          ) : wordError ? (
            <div style={{
              minHeight: 360, background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
              padding: 32, color: "#7a4f00", textAlign: "center",
            }}>
              <Icon name="warning" size={32}/>
              <div style={{ fontWeight: 600 }}>Word preview unavailable</div>
              <div style={{ fontSize: 13, maxWidth: 420 }}>{wordError}</div>
            </div>
          ) : (
            <div style={{
              minHeight: 360, background: "#f7f5ee", borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
              padding: 32, color: "#5b6b76",
            }}>
              <div style={{ width: 28, height: 28, border: "3px solid #cfd8de", borderTopColor: "#063952", borderRadius: "50%", animation: "fi-spin 0.8s linear infinite" }}/>
              <div style={{ fontSize: 13 }}>Converting Word document for preview…</div>
            </div>
          )
        ) : (
          <div style={{
            minHeight: 360, background: "#f7f5ee", border: "1px dashed #c8d4dc", borderRadius: 12,
            display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
            padding: 32, color: "#5b6b76", textAlign: "center",
          }}>
            <Icon name="doc" size={42}/>
            <div style={{ fontWeight: 600, color: "#063952" }}>{doc?.name || doc?.filename}</div>
            <div style={{ fontSize: 13, maxWidth: 380 }}>
              Inline preview not available for this file type. Use Download or Open in new tab.
            </div>
          </div>
        )
      ) : loading ? (
        <div style={{
          minHeight: 360, background: "#f7f5ee", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
          padding: 32, color: "#5b6b76",
        }}>
          <div style={{ width: 28, height: 28, border: "3px solid #cfd8de", borderTopColor: "#063952", borderRadius: "50%", animation: "fi-spin 0.8s linear infinite" }}/>
          <div style={{ fontSize: 13 }}>Loading document…</div>
        </div>
      ) : (
        <div style={{
          minHeight: 360, background: "#f7f5ee", border: "1px dashed #c8d4dc", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12,
          padding: 32, color: "#5b6b76", textAlign: "center",
        }}>
          <Icon name="doc" size={42}/>
          <div style={{ fontWeight: 600, color: "#063952" }}>{doc?.name || doc?.filename || "Document"}</div>
          <div style={{ fontSize: 13, maxWidth: 380 }}>
            This is a seed/sample document — there's no real file behind it. Upload from the client portal to preview the actual file here.
          </div>
        </div>
      )}
    </Modal>
  );
};

// =============================================================================
// Lawyer Edit modal
// =============================================================================
// =============================================================================
// LanguageChips — togglable presets + custom add input. Custom languages are
// persisted in localStorage so they show up as presets next time.
// =============================================================================
const LANG_CUSTOM_KEY = "fastila_custom_languages_v1";
const LANG_PRESETS = ["English","French","Spanish","Portuguese","Hindi","Gujarati","Polish","Arabic","German","Italian","Mandarin","Cantonese","Urdu","Bengali","Romanian","Russian","Turkish"];

function loadCustomLanguages() {
  try { return JSON.parse(localStorage.getItem(LANG_CUSTOM_KEY) || "[]"); }
  catch (_e) { return []; }
}
function persistCustomLanguage(lang) {
  try {
    const list = loadCustomLanguages();
    if (!list.includes(lang)) localStorage.setItem(LANG_CUSTOM_KEY, JSON.stringify([...list, lang]));
  } catch (_e) {}
}

const LanguageChips = ({ value = [], onToggle, onAdd }) => {
  const [adding, setAdding] = React.useState(false);
  const [custom, setCustom] = React.useState("");
  const customLangs = loadCustomLanguages();
  // Merge presets + persisted custom + anything already on the lawyer record that isn't either
  const all = Array.from(new Set([...LANG_PRESETS, ...customLangs, ...value]));

  const addCustom = () => {
    const lang = custom.trim();
    if (!lang) return;
    persistCustomLanguage(lang);
    onAdd && onAdd(lang);
    setCustom("");
    setAdding(false);
  };

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      {all.map(l => {
        const selected = value.includes(l);
        return (
          <button key={l} type="button" onClick={() => onToggle(l)} style={{
            padding: "6px 10px", border: "1px solid", borderRadius: 999, fontSize: 13, cursor: "pointer",
            borderColor: selected ? "#0a4a67" : "#c8d4dc",
            background:  selected ? "#0a4a67" : "transparent",
            color:       selected ? "#fff"    : "#063952",
          }}>{l}</button>
        );
      })}
      {adding ? (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input
            className="field-input"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addCustom(); }
              if (e.key === "Escape") { setAdding(false); setCustom(""); }
            }}
            placeholder="Type a language…"
            autoFocus
            style={{ width: 180, padding: "5px 10px", fontSize: 13 }}
          />
          <button type="button" className="btn btn-navy btn-sm" onClick={addCustom} disabled={!custom.trim()}>Add</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setCustom(""); }}>Cancel</button>
        </span>
      ) : (
        <button type="button" onClick={() => setAdding(true)} style={{
          padding: "6px 10px", border: "1px dashed #c8d4dc", borderRadius: 999, fontSize: 13,
          background: "transparent", color: "#5b6b76", cursor: "pointer",
        }}>+ Add custom language</button>
      )}
    </div>
  );
};

// IndexedDB blob helpers for lawyer photos (same store as templates/documents)
async function _putPhotoBlob(key, blob) {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) return reject(new Error("IndexedDB not supported"));
    const req = window.indexedDB.open("fastila_files", 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
    };
    req.onsuccess = () => {
      const tx = req.result.transaction("blobs", "readwrite");
      tx.objectStore("blobs").put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    req.onerror = () => reject(req.error);
  });
}

const LawyerEditModal = ({ open, onClose, lawyer, onSaved }) => {
  const [form, setForm] = React.useState({
    name: "", initials: "", sra: "", bio: "", email: "",
    kind: "ila_solicitor",  // "ila_solicitor" runs ILA calls; "wet_specialist" only handles wet-sig post-out
    languages: [], services: [],
    work_days: [1, 2, 3, 4, 5], work_start: "09:00", work_end: "17:00", slot_minutes: 45,
    photoKey: null, photoUpdatedAt: null,
  });
  const [photoPreview, setPhotoPreview] = React.useState(null);
  const [photoFile, setPhotoFile] = React.useState(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => {
    if (open && lawyer) {
      setForm({
        name: lawyer.name || "",
        initials: lawyer.initials || "",
        sra: lawyer.sra || "",
        bio: lawyer.bio || "",
        email: lawyer.email || "",
        kind: lawyer.kind || "ila_solicitor",
        languages: lawyer.languages || [],
        services: lawyer.services || [],
        work_days: lawyer.work_days || lawyer.workDays || [1, 2, 3, 4, 5],
        work_start: (lawyer.work_start || "09:00").slice(0, 5),
        work_end: (lawyer.work_end || "17:00").slice(0, 5),
        slot_minutes: lawyer.slot_minutes || lawyer.slotMinutes || 45,
        photoKey: lawyer.photoKey || null,
        photoUpdatedAt: lawyer.photoUpdatedAt || null,
      });
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }, [open, lawyer]);

  const toggle = (key, val) => setForm(f => ({
    ...f,
    [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val],
  }));

  const pickPhoto = () => fileRef.current?.click();
  const onPhotoChosen = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      if (window.fiToast) window.fiToast("Please choose an image (JPG/PNG/WebP)", "err");
      return;
    }
    setPhotoFile(f);
    const url = URL.createObjectURL(f);
    setPhotoPreview(url);
  };
  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setForm(f => ({ ...f, photoKey: null, photoUpdatedAt: Date.now() }));
  };

  const [saving, setSaving] = React.useState(false);
  const [inviting, setInviting] = React.useState(false);

  // Live dashboard-access status (pending → verified) for this lawyer's email.
  const [accessTick, setAccessTick] = React.useState(0);
  React.useEffect(() => {
    const h = () => setAccessTick(t => t + 1);
    window.addEventListener("fastila:store-changed", h);
    return () => window.removeEventListener("fastila:store-changed", h);
  }, []);
  const isLive = !window.FastILA || window.FastILA.mode === "live";
  const accessRole = form.kind === "wet_specialist" ? "wet_specialist" : "lawyer";
  const invite = (isLive && window.FastILA && FastILA.team)
    ? (FastILA.team.byEmail(form.email) || (lawyer && FastILA.team.byLawyerId(lawyer.id)) || null)
    : null;
  void accessTick; // recompute `invite` on every store change

  const sendInvite = async (em) => {
    const email = (em || form.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) { if (window.fiToast) window.fiToast("Add a valid email first", "err"); return; }
    setInviting(true);
    try {
      await FastILA.team.invite({ email, full_name: form.name, role: accessRole, lawyer_id: lawyer && lawyer.id });
      if (window.fiToast) window.fiToast("Approval email sent to " + email, "ok");
    } catch (e) {
      if (window.fiToast) window.fiToast("Invite failed: " + (e.message || e), "err");
    } finally { setInviting(false); }
  };

  const submit = async () => {
    if (!lawyer) return;
    if (!form.name || !form.name.trim()) { if (window.fiToast) window.fiToast("Please enter the lawyer's name", "err"); return; }
    let next = { ...form };
    // If the user picked a new photo, persist it to IndexedDB and store the key
    if (photoFile) {
      const key = `lawyers/${lawyer.id}/photo-${Date.now()}-${photoFile.name}`;
      try {
        await _putPhotoBlob(key, photoFile);
        if (window.__avatarCache) {
          if (form.photoKey) window.__avatarCache.delete(form.photoKey);
          window.__avatarCache.delete(key);
        }
        next.photoKey = key;
        next.photoUpdatedAt = Date.now();
      } catch (e) {
        if (window.fiToast) window.fiToast("Photo upload failed: " + e.message, "err");
        return;
      }
    }
    setSaving(true);
    try {
      await FastILA.lawyers.update(lawyer.id, next);   // awaits the live upsert + refresh
      // 2-step dashboard access: auto-send the approve/reject email the first
      // time an email is set (don't re-spam on later profile edits — the
      // "Resend" button covers that).
      const em = (form.email || "").trim().toLowerCase();
      if (em && em.includes("@") && isLive && FastILA.team && !FastILA.team.byEmail(em)) {
        try { await FastILA.team.invite({ email: em, full_name: form.name, role: accessRole, lawyer_id: lawyer.id }); }
        catch (e) { if (window.fiToast) window.fiToast("Saved, but invite email failed: " + (e.message || e), "err"); }
      }
      onSaved && onSaved();
      onClose();
    } catch (e) {
      if (window.fiToast) window.fiToast("Couldn't save lawyer: " + (e.message || e), "err");
    } finally {
      setSaving(false);
    }
  };

  // What to render in the live preview
  const previewSrc = photoPreview || (form.photoKey ? null : null);

  return (
    <Modal open={open} onClose={onClose} title={lawyer ? "Edit lawyer" : "Add lawyer"}
      subtitle={lawyer?.sra}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit} disabled={saving}>{saving ? "Saving…" : <>Save <Icon name="check" size={14}/></>}</button>
        </>
      }>
      {/* Photo block — sits above the form so it's the first thing visible */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 0 16px", borderBottom: "1px solid #eef0f3", marginBottom: 16 }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: lawyer?.photoBg || "#0a4a67",
          display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff",
          fontWeight: 700, fontSize: 26, overflow: "hidden", flexShrink: 0 }}>
          {previewSrc
            ? <img src={previewSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/>
            : form.photoKey
              ? <Avatar lawyer={{ ...lawyer, photoKey: form.photoKey, photoUpdatedAt: form.photoUpdatedAt }} size={80}/>
              : (form.initials || (form.name || "??").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase())}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: "#063952", marginBottom: 4 }}>Profile picture</div>
          <div style={{ fontSize: 12, color: "#5b6b76", marginBottom: 8 }}>
            JPG, PNG or WebP — square works best. Shown on the booking form, dashboard, and the client's portal.
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost btn-sm" type="button" onClick={pickPhoto}>
              <Icon name="package" size={13}/> {form.photoKey || photoFile ? "Replace photo" : "Upload photo"}
            </button>
            {(form.photoKey || photoFile) && (
              <button className="btn btn-ghost btn-sm" type="button" onClick={removePhoto} style={{ color: "#9a1c1c" }}>
                <Icon name="trash" size={13}/> Remove
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhotoChosen}/>
          </div>
        </div>
      </div>

      <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="field-label">Name</label>
          <input className="field-input" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}/>
        </div>
        <div>
          <label className="field-label">Initials</label>
          <input className="field-input" value={form.initials} onChange={(e) => setForm(f => ({ ...f, initials: e.target.value }))}/>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">SRA number</label>
          <input className="field-input" value={form.sra} onChange={(e) => setForm(f => ({ ...f, sra: e.target.value }))}/>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Email <span style={{ fontWeight: 400, color: "#5b6b76" }}>— for calendar/Meet invites + dashboard access</span></label>
          <input className="field-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="lawyer@fast-ila.co.uk"/>
        </div>
        {isLive && form.email && form.email.includes("@") && (() => {
          const st = invite && invite.status;
          const badge = st === "approved"
            ? { label: "Verified", bg: "#eaf7d8", fg: "#3f6212", dot: "#65a30d" }
            : st === "pending"
              ? { label: "In progress", bg: "#fff3d6", fg: "#92660a", dot: "#e0a106" }
              : st === "rejected"
                ? { label: "Declined", bg: "#fde4e4", fg: "#9a1c1c", dot: "#dc2626" }
                : { label: "No access yet", bg: "#eef2f4", fg: "#5b6b76", dot: "#9fb3bd" };
          return (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "#f7f9fa", border: "1px solid #eef0f3", borderRadius: 10, padding: "10px 12px" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#063952", display: "flex", alignItems: "center", gap: 7 }}>
                  <Icon name="shield" size={13}/> Dashboard access
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: badge.fg, background: badge.bg, borderRadius: 20, padding: "2px 9px" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: badge.dot }}/> {badge.label}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#5b6b76", marginTop: 3 }}>
                  {st === "approved" ? "They've approved their email and can sign in."
                    : st === "pending" ? "Approval email sent — waiting for them to click Approve."
                    : st === "rejected" ? "They declined. Resend to invite again."
                    : "Saving with an email sends them an approve/reject email."}
                </div>
              </div>
              {st && (
                <button className="btn btn-ghost btn-sm" type="button" disabled={inviting} onClick={() => sendInvite(form.email)}>
                  <Icon name="mail" size={13}/> {inviting ? "Sending…" : "Resend"}
                </button>
              )}
            </div>
          );
        })()}
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Bio</label>
          <textarea className="field-textarea" rows={3} value={form.bio} onChange={(e) => setForm(f => ({ ...f, bio: e.target.value }))}/>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Lawyer role</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { id: "ila_solicitor",  label: "ILA solicitor",  desc: "Runs ILA calls. Shows up on the booking form so clients can book them.", icon: "user" },
              { id: "wet_specialist", label: "Wet-signature specialist", desc: "Joins wet-sig calls as the second lawyer + manages the post-out flow. Hidden from the booking form.", icon: "stamp" },
            ].map(k => (
              <button key={k.id} type="button" onClick={() => setForm(f => ({ ...f, kind: k.id }))} style={{
                display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left",
                padding: 12, borderRadius: 8, cursor: "pointer",
                background: form.kind === k.id ? "#063952" : "white",
                color: form.kind === k.id ? "#e6f7c8" : "#063952",
                border: "1px solid " + (form.kind === k.id ? "#063952" : "#e4e8ec"),
              }}>
                <Icon name={k.icon} size={16}/>
                <span style={{ display: "block" }}>
                  <strong style={{ display: "block", fontSize: 13.5 }}>{k.label}</strong>
                  <span style={{ display: "block", fontSize: 11.5, marginTop: 2, opacity: 0.85, lineHeight: 1.4 }}>{k.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Languages</label>
          <LanguageChips
            value={form.languages}
            onToggle={(l) => toggle("languages", l)}
            onAdd={(l) => setForm(f => ({ ...f, languages: f.languages.includes(l) ? f.languages : [...f.languages, l] }))}
          />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Services they cover</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(SERVICES || []).map(s => (
              <button key={s.id} onClick={() => toggle("services", s.id)} type="button" style={{
                padding: "6px 10px", border: "1px solid", borderRadius: 999, fontSize: 13, cursor: "pointer",
                borderColor: form.services.includes(s.id) ? "#0a4a67" : "#c8d4dc",
                background: form.services.includes(s.id) ? "#0a4a67" : "transparent",
                color: form.services.includes(s.id) ? "#fff" : "#063952",
              }}>{s.short}</button>
            ))}
          </div>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Working hours &amp; availability</label>
          <div style={{ fontSize: 12, color: "#5b6b76", margin: "0 0 8px" }}>Drives the booking form's real availability (minus this lawyer's connected Google diary).</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            {[{ d: 1, l: "Mon" }, { d: 2, l: "Tue" }, { d: 3, l: "Wed" }, { d: 4, l: "Thu" }, { d: 5, l: "Fri" }, { d: 6, l: "Sat" }, { d: 0, l: "Sun" }].map(x => (
              <button key={x.d} type="button" onClick={() => toggle("work_days", x.d)} style={{
                padding: "6px 12px", border: "1px solid", borderRadius: 999, fontSize: 13, cursor: "pointer",
                borderColor: form.work_days.includes(x.d) ? "#0a4a67" : "#c8d4dc",
                background: form.work_days.includes(x.d) ? "#0a4a67" : "transparent",
                color: form.work_days.includes(x.d) ? "#fff" : "#063952",
              }}>{x.l}</button>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
            <div>
              <label className="field-label" style={{ fontSize: 11.5 }}>Start</label>
              <input className="field-input" type="time" value={form.work_start} onChange={(e) => setForm(f => ({ ...f, work_start: e.target.value }))}/>
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11.5 }}>End</label>
              <input className="field-input" type="time" value={form.work_end} onChange={(e) => setForm(f => ({ ...f, work_end: e.target.value }))}/>
            </div>
            <div>
              <label className="field-label" style={{ fontSize: 11.5 }}>Slot length</label>
              <select className="field-input" value={form.slot_minutes} onChange={(e) => setForm(f => ({ ...f, slot_minutes: parseInt(e.target.value, 10) }))}>
                {[30, 45, 60, 90].map(n => <option key={n} value={n}>{n} min</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// Confirm dialog (generic yes/no)
// =============================================================================
const ConfirmModal = ({ open, onClose, title, body, confirmLabel = "Confirm", danger, onConfirm }) => (
  <Modal open={open} onClose={onClose} title={title}
    footer={
      <>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn btn-navy"
          onClick={() => { onConfirm && onConfirm(); onClose(); }}
          style={danger ? { background: "#9a1c1c", borderColor: "#9a1c1c" } : null}
        >{confirmLabel}</button>
      </>
    }>
    <div>{body}</div>
  </Modal>
);

// =============================================================================
// Toast — short-lived notifications after actions
// =============================================================================
const ToastHost = () => {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const onShow = (e) => {
      const id = Date.now() + Math.random();
      setItems(prev => [...prev, { id, message: e.detail.message, tone: e.detail.tone || "ok" }]);
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), 4000);
    };
    window.addEventListener("fastila:toast", onShow);
    return () => window.removeEventListener("fastila:toast", onShow);
  }, []);

  if (!items.length) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, display: "flex", flexDirection: "column", gap: 8,
      zIndex: 10000, maxWidth: 360,
    }}>
      {items.map(t => (
        <div key={t.id} style={{
          background: t.tone === "err" ? "#9a1c1c" : "#063952",
          color: "#fff", padding: "10px 14px", borderRadius: 10,
          boxShadow: "0 12px 24px -10px rgba(0,0,0,0.35)", fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <Icon name={t.tone === "err" ? "x-circle" : "check"} size={14}/>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};

const toast = (message, tone = "ok") => {
  try { window.dispatchEvent(new CustomEvent("fastila:toast", { detail: { message, tone } })); } catch (_e) {}
};

// =============================================================================
// Template helpers — read uploaded admin templates from the same store that
// dashboard-templates.jsx writes to. Returns metadata + a function to materialise
// the blob as an object URL for in-page preview.
// =============================================================================
const TemplateStore = {
  list() {
    try {
      const raw = localStorage.getItem("fastila_templates_v2");
      return raw ? Object.values(JSON.parse(raw)) : [];
    } catch (_e) { return []; }
  },
  /** Find the one template matching a subKind (e.g. "ccl", "bank", "privacy", "tcs", "complaints"). */
  bySubKind(subKind) {
    return TemplateStore.list().find(t => t.subKind === subKind) || null;
  },
  /** Get a blob URL for a stored template (one-time materialisation). Caller revokes. */
  async asObjectUrl(template) {
    const blob = await TemplateStore.getBlob(template);
    return blob ? URL.createObjectURL(blob) : null;
  },
  /** Read raw PDF bytes for a stored template — needed for pdf-lib signing. */
  async getBlob(template) {
    if (!template || !template.storage_key) return null;
    try {
      const db = await new Promise((res, rej) => {
        const r = window.indexedDB.open("fastila_files", 1);
        r.onupgradeneeded = () => {
          const d = r.result;
          if (!d.objectStoreNames.contains("blobs")) d.createObjectStore("blobs");
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      const blob = await new Promise((res, rej) => {
        const tx = db.transaction("blobs", "readonly");
        const r = tx.objectStore("blobs").get(template.storage_key);
        r.onsuccess = () => res(r.result || null);
        r.onerror = () => rej(r.error);
      });
      return blob || null;
    } catch (_e) { return null; }
  },
  async getBytes(template) {
    const blob = await TemplateStore.getBlob(template);
    return blob ? new Uint8Array(await blob.arrayBuffer()) : null;
  },
};

// =============================================================================
// Quick actions — pure functions wrapping FastILA + toast
// =============================================================================
const Actions = {
  markComplete: (ref) => {
    FastILA.bookings.setStatus(ref, "completed");
    notify("Booking completed", `${ref} marked complete`, ref, "success");
    toast(`${ref} marked complete`);
  },
  markNoShow:   (ref) => {
    FastILA.bookings.setStatus(ref, "no-show");
    notify("No-show recorded", `${ref} marked no-show`, ref, "warn");
    toast(`${ref} marked no-show`);
  },
  markPaid:     (ref) => {
    FastILA.payments.declarePaid(ref, "admin-verified");
    notify("Payment received", `${ref} payment confirmed`, ref, "success");
    toast(`${ref} payment confirmed`);
  },
  markScheduled:(ref) => {
    FastILA.bookings.setStatus(ref, "scheduled");
    toast(`${ref} re-scheduled`);
  },
  // Lawyer marks the matter ready to close — goes into the admin's monthly
  // closure report so the admin team can actually close it externally.
  markReadyToClose: (ref, by = null, note = "") => {
    FastILA.bookings.update(ref, {
      readyToCloseAt: new Date().toISOString(),
      readyToCloseBy: by,
      readyToCloseNote: note || null,
    });
    FastILA.bookings.addNote(ref, `Matter marked ready to close${by ? " by " + by : ""}${note ? " — " + note : ""}`);
    notify("Matter ready to close", `${ref} added to the admin closure report`, ref, "success");
    toast(`${ref} ready to close — admin notified`);
  },
  unmarkReadyToClose: (ref) => {
    FastILA.bookings.update(ref, {
      readyToCloseAt: null,
      readyToCloseBy: null,
      readyToCloseNote: null,
    });
    FastILA.bookings.addNote(ref, "Ready-to-close flag removed");
    toast(`${ref} no longer flagged for closure`);
  },
  // Manual override for an After-the-Call checklist step. Stored on the
  // booking as `manualConfirms[stepKey] = { by, at }`. UI displays the row
  // as Done with a "manually confirmed" hint.
  confirmStep: (ref, stepKey, by = null) => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b) return;
    const next = { ...(b.manualConfirms || {}), [stepKey]: { by, at: new Date().toISOString() } };
    FastILA.bookings.update(ref, { manualConfirms: next });
    FastILA.bookings.addNote(ref, `Step "${stepKey}" manually confirmed${by ? " by " + by : ""}`);
    toast(`Step confirmed`);
  },
  unconfirmStep: (ref, stepKey) => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b || !b.manualConfirms) return;
    const next = { ...b.manualConfirms };
    delete next[stepKey];
    FastILA.bookings.update(ref, { manualConfirms: next });
    FastILA.bookings.addNote(ref, `Step "${stepKey}" un-confirmed`);
    toast(`Step un-confirmed`);
  },
  // Per-booking custom to-do tasks. Lawyer adds anything that isn't covered
  // by the standard checklist (e.g. "Client wants wet signature instead",
  // "Lender hasn't received cert — chase").
  addLawyerTask: (ref, title, by = null) => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b) return;
    if (!title || !title.trim()) return;
    const task = {
      id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: title.trim(),
      status: "open",
      createdBy: by,
      createdAt: new Date().toISOString(),
    };
    const next = [...(b.lawyerTasks || []), task];
    FastILA.bookings.update(ref, { lawyerTasks: next });
    FastILA.bookings.addNote(ref, `Task added: "${task.title}"${by ? " by " + by : ""}`);
    toast(`Task added`);
    return task;
  },
  completeLawyerTask: (ref, taskId, by = null) => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b) return;
    const next = (b.lawyerTasks || []).map(t => t.id === taskId
      ? { ...t, status: "done", completedBy: by, completedAt: new Date().toISOString() }
      : t);
    FastILA.bookings.update(ref, { lawyerTasks: next });
    toast(`Task done`);
  },
  uncompleteLawyerTask: (ref, taskId) => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b) return;
    const next = (b.lawyerTasks || []).map(t => t.id === taskId
      ? { ...t, status: "open", completedBy: null, completedAt: null }
      : t);
    FastILA.bookings.update(ref, { lawyerTasks: next });
    toast(`Task re-opened`);
  },
  removeLawyerTask: (ref, taskId) => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b) return;
    const next = (b.lawyerTasks || []).filter(t => t.id !== taskId);
    FastILA.bookings.update(ref, { lawyerTasks: next });
    toast(`Task removed`);
  },
  // Admin confirms the matter has been formally closed on the external platform
  markExternallyClosed: (ref, by = null) => {
    FastILA.bookings.update(ref, {
      externallyClosedAt: new Date().toISOString(),
      externallyClosedBy: by,
      status: "closed",
    });
    FastILA.bookings.addNote(ref, `Externally closed${by ? " by " + by : ""}`);
    notify("Matter closed", `${ref} closed on the external system`, ref, "success");
    toast(`${ref} closed`);
  },
  advanceDispatch: (ref, to) => {
    FastILA.bookings.setDispatch(ref, to);
    notify("Royal Mail update", `${ref} → ${to.replace(/_/g, " ")}`, ref);
    toast(`${ref} → ${to.replace(/_/g," ")}`);
  },
  sendReminder: (ref, type = "general") => {
    const b = (window.BOOKINGS || []).find(x => x.ref === ref);
    if (!b) { toast("Booking not found", "err"); return; }
    const n8n = window.fiIntegration?.get?.("n8n");
    if (n8n?.webhookUrl) {
      fetch(n8n.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
        body: JSON.stringify({
          event: `booking.reminder.${type}`,
          ref, clientName: b.clientName, clientEmail: b.clientEmail,
          appointmentDate: b.date, appointmentTime: b.time,
          portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(ref),
        }),
      }).catch(() => {});
    }
    FastILA.bookings.addNote(ref, `Reminder sent (${type})${n8n?.webhookUrl ? " via n8n" : " — n8n not connected"}`);
    notify("Reminder sent", `Reminder queued for ${ref}`, ref);
    toast(n8n?.webhookUrl ? `Reminder fired via n8n for ${ref}` : `Reminder logged (connect n8n in Integrations to actually send)`);
  },
  download: (filename, text) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },
  exportBookings: () => {
    FastILA.util.exportCsv("bookings.csv", BOOKINGS, [
      { label: "Ref",      value: "ref" },
      { label: "Client",   value: "clientName" },
      { label: "Email",    value: "clientEmail" },
      { label: "Phone",    value: "phone" },
      { label: "Service",  value: (b) => SERVICES.find(s => s.id === b.serviceId)?.name || b.serviceId },
      { label: "Lawyer",   value: (b) => LAWYERS.find(l => l.id === b.lawyerId)?.name || b.lawyerId },
      { label: "Date",     value: "date" },
      { label: "Time",     value: "time" },
      { label: "Status",   value: "status" },
      { label: "Payment",  value: "payment" },
      { label: "Amount £", value: "amount" },
      { label: "Lender",   value: "lender" },
      { label: "Source",   value: "source" },
      { label: "Dispatch", value: "dispatch" },
      { label: "Tracking", value: "trackingNumber" },
    ]);
    toast("Exported bookings.csv");
  },
  exportRevenue: () => {
    const months = window.MONTHLY_REVENUE || [];
    FastILA.util.exportCsv("revenue-by-month.csv", months, [
      { label: "Month",         value: "month" },
      { label: "Gross £",       value: "gross" },
      { label: "Net £",         value: "net" },
      { label: "Bookings",      value: "bookings" },
    ]);
    toast("Exported revenue-by-month.csv");
  },
  exportLawyers: () => {
    FastILA.util.exportCsv("lawyers.csv", LAWYERS, [
      { label: "Name",     value: "name" },
      { label: "SRA",      value: "sra" },
      { label: "Languages",value: (l) => (l.languages || []).join("; ") },
      { label: "Services", value: (l) => (l.services  || []).join("; ") },
      { label: "Rating",   value: "rating" },
      { label: "Reviews",  value: "reviews" },
    ]);
    toast("Exported lawyers.csv");
  },
  copyToClipboard: (text, label = "Copied") => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => toast(label));
    } else {
      toast(label);
    }
  },
};

// =============================================================================
// Profile edit modal — for a logged-in user
// =============================================================================
const ProfileEditModal = ({ open, onClose, user, onSaved }) => {
  const [form, setForm] = React.useState({ fullName: "", email: "", phone: "", title: "" });
  React.useEffect(() => {
    if (open && user) setForm({
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      title: user.title || "",
    });
  }, [open, user]);

  const submit = () => {
    if (!user) return;
    FastILA.users.update(user.id, form);
    onSaved && onSaved();
    fiToast("Profile updated");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="My profile"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit}>Save profile <Icon name="check" size={14}/></button>
        </>
      }>
      <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Full name</label>
          <input className="field-input" value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}/>
        </div>
        <div>
          <label className="field-label">Email (sign-in)</label>
          <input className="field-input" type="email" value={form.email} disabled style={{ background: "#f7f5ee", cursor: "not-allowed" }}/>
        </div>
        <div>
          <label className="field-label">Phone</label>
          <input className="field-input" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}/>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Title (shown in audit log)</label>
          <input className="field-input" value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior Solicitor"/>
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// Invite User modal — admin creates lawyer / admin accounts
// =============================================================================
const InviteUserModal = ({ open, onClose, onCreated }) => {
  const [form, setForm] = React.useState({ fullName: "", email: "", role: "lawyer", lawyerId: "" });
  React.useEffect(() => {
    if (open) setForm({ fullName: "", email: "", role: "lawyer", lawyerId: "" });
  }, [open]);

  const canSubmit = form.fullName.trim() && /.+@.+\..+/.test(form.email);
  const submit = () => {
    if (!canSubmit) return;
    // If role is lawyer and no lawyerId chosen, create the lawyer record too
    let lawyerId = form.lawyerId || null;
    if (form.role === "lawyer" && !lawyerId) {
      lawyerId = `lawyer-${Date.now()}`;
      const initials = form.fullName.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
      FastILA.lawyers.update(lawyerId, {
        id: lawyerId,
        name: form.fullName,
        initials,
        sra: "",
        photoBg: "#0a4a67",
        languages: ["English"],
        services: ["standard", "urgent"],
        rating: 5.0,
        reviews: 0,
        bio: "",
      });
      (window.LAWYERS = window.LAWYERS || []).push({
        id: lawyerId, name: form.fullName, initials, sra: "", photoBg: "#0a4a67",
        languages: ["English"], services: ["standard", "urgent"], rating: 5.0, reviews: 0, bio: "",
      });
    }
    const user = FastILA.users.add({
      fullName: form.fullName, email: form.email, role: form.role, lawyerId,
    });
    onCreated && onCreated(user);
    fiToast(`${form.role === "admin" ? "Admin" : "Lawyer"} invited: ${form.email}`);
    onClose();
  };

  const existingLawyers = (window.LAWYERS || []).filter(l => l.id);
  return (
    <Modal open={open} onClose={onClose} title="Invite team member"
      subtitle="Adds an account. Real email invites go out in live (Supabase) mode."
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit} disabled={!canSubmit}>
            <Icon name="mail" size={14}/> Send invite
          </button>
        </>
      }>
      <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="field-label">Role</label>
          <select className="field-input" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="lawyer">Lawyer</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="field-label">Link to lawyer (optional)</label>
          <select className="field-input" value={form.lawyerId} onChange={(e) => setForm(f => ({ ...f, lawyerId: e.target.value }))} disabled={form.role !== "lawyer"}>
            <option value="">— New lawyer profile —</option>
            {existingLawyers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Full name *</label>
          <input className="field-input" value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Amelia Hart"/>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="field-label">Email *</label>
          <input className="field-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="amelia@nexalaw.com"/>
        </div>
        <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#5b6b76", background: "#f7f5ee", padding: 10, borderRadius: 8 }}>
          <Icon name="info" size={12}/> In demo mode they sign in by email only (no password). In live (Supabase) mode they receive a real magic-link email.
        </div>
      </div>
    </Modal>
  );
};

// =============================================================================
// Notifications panel (slide-over)
// =============================================================================
const NotificationsPanel = ({ open, onClose }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const list = FastILA.notifications.list();
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,57,82,0.35)", zIndex: 9998 }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 380, maxWidth: "100%",
        background: "#fff", boxShadow: "-12px 0 36px -10px rgba(6,57,82,0.2)",
        zIndex: 9999, display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #eef0f3", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#063952" }}>Notifications</h3>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "#5b6b76" }}>
              {list.length === 0 ? "Nothing yet" : `${list.length} item${list.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {list.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => FastILA.notifications.markAllRead()}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} aria-label="Close" style={{ background: "transparent", border: 0, padding: 6, cursor: "pointer" }}><Icon name="x" size={18}/></button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {list.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "#5b6b76" }}>
              <Icon name="bell" size={28}/>
              <p style={{ marginTop: 12, fontSize: 14 }}>You're all caught up.</p>
              <p style={{ fontSize: 12 }}>Bookings, payments, and Royal Mail dispatch updates appear here.</p>
            </div>
          ) : list.map(n => (
            <button
              key={n.id}
              onClick={() => { FastILA.notifications.markRead(n.id); onClose(); }}
              style={{
                display: "block", textAlign: "left", width: "100%",
                padding: "14px 20px", borderBottom: "1px solid #eef0f3", background: n.read ? "#fff" : "#f0faff",
                cursor: "pointer", border: 0, borderLeft: n.read ? "0" : "3px solid #0a4a67",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong style={{ fontSize: 14, color: "#063952" }}>{n.title}</strong>
                <span style={{ fontSize: 11, color: "#5b6b76", whiteSpace: "nowrap" }}>{new Date(n.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5b6b76" }}>{n.body}</p>
              {n.ref && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#0a4a67", fontFamily: "monospace" }}>{n.ref}</p>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// First-run setup wizard — opens automatically when there are no users
// =============================================================================
const FirstRunWizard = ({ open, onClose }) => {
  const [step, setStep] = React.useState(1);
  const [firm, setFirm] = React.useState({
    firm: "Nexa Law Ltd",
    tradingAs: "Fast-ILA",
    domain: "fast-ila.co.uk",
    supportEmail: "info@fast-ila.co.uk",
    sraNumber: "",
  });
  const [admin, setAdmin] = React.useState({ fullName: "", email: "" });
  const [clearDemo, setClearDemo] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      setStep(1);
      setFirm(FastILA.firm.get());
      setAdmin({ fullName: "", email: "" });
      setClearDemo(true);
    }
  }, [open]);

  if (!open) return null;
  const totalSteps = 3;
  const next = () => setStep(s => Math.min(s + 1, totalSteps));
  const back = () => setStep(s => Math.max(s - 1, 1));
  const finish = () => {
    FastILA.firm.update(firm);
    if (admin.email && admin.fullName) {
      FastILA.users.add({ email: admin.email, fullName: admin.fullName, role: "admin" });
    }
    if (clearDemo) FastILA.admin.clearDemoData();
    fiToast("Setup complete — your platform is ready");
    onClose();
  };

  return (
    <Modal open={open} onClose={() => {}} title={`Welcome — set up your firm (${step}/${totalSteps})`}
      maxWidth={680}
      footer={
        <>
          {step > 1 && <button className="btn btn-ghost" onClick={back}>Back</button>}
          {step < totalSteps && <button className="btn btn-navy" onClick={next}>Continue <Icon name="arrow-right" size={14}/></button>}
          {step === totalSteps && <button className="btn btn-navy" onClick={finish}><Icon name="check" size={14}/> Finish setup</button>}
        </>
      }>
      {step === 1 && (
        <>
          <p style={{ marginTop: 0 }}>First, tell us about your firm. This shows up on the client care letter, footer, and confirmation emails.</p>
          <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label className="field-label">Legal entity *</label>
              <input className="field-input" value={firm.firm} onChange={(e) => setFirm(f => ({ ...f, firm: e.target.value }))}/>
            </div>
            <div>
              <label className="field-label">Trading as</label>
              <input className="field-input" value={firm.tradingAs} onChange={(e) => setFirm(f => ({ ...f, tradingAs: e.target.value }))}/>
            </div>
            <div>
              <label className="field-label">Domain</label>
              <input className="field-input" value={firm.domain} onChange={(e) => setFirm(f => ({ ...f, domain: e.target.value }))}/>
            </div>
            <div>
              <label className="field-label">Support email</label>
              <input className="field-input" type="email" value={firm.supportEmail} onChange={(e) => setFirm(f => ({ ...f, supportEmail: e.target.value }))}/>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">SRA number (if applicable)</label>
              <input className="field-input" value={firm.sraNumber} onChange={(e) => setFirm(f => ({ ...f, sraNumber: e.target.value }))} placeholder="SRA 524963"/>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <p style={{ marginTop: 0 }}>Create your admin account. You'll use this email to sign in to the dashboard. You can invite more team members later from Settings.</p>
          <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Your full name *</label>
              <input className="field-input" value={admin.fullName} onChange={(e) => setAdmin(a => ({ ...a, fullName: e.target.value }))}/>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Your email *</label>
              <input className="field-input" type="email" value={admin.email} onChange={(e) => setAdmin(a => ({ ...a, email: e.target.value }))} placeholder="you@yourfirm.com"/>
            </div>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p style={{ marginTop: 0 }}>Last step. The platform ships with demo bookings, lawyers, and clients so you can see how it looks. You can keep them as examples or wipe them now to start fresh.</p>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <label style={{ flex: 1, border: "1px solid " + (clearDemo ? "#0a4a67" : "#c8d4dc"), borderRadius: 10, padding: 14, cursor: "pointer", background: clearDemo ? "#f0faff" : "transparent" }}>
              <input type="radio" name="cd" checked={clearDemo} onChange={() => setClearDemo(true)} style={{ marginRight: 8 }}/>
              <strong>Clean slate</strong>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5b6b76" }}>Remove all demo bookings, lawyers, signatures. Start with an empty platform.</p>
            </label>
            <label style={{ flex: 1, border: "1px solid " + (!clearDemo ? "#0a4a67" : "#c8d4dc"), borderRadius: 10, padding: 14, cursor: "pointer", background: !clearDemo ? "#f0faff" : "transparent" }}>
              <input type="radio" name="cd" checked={!clearDemo} onChange={() => setClearDemo(false)} style={{ marginRight: 8 }}/>
              <strong>Keep demo data</strong>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#5b6b76" }}>Walk through the demo bookings first. You can clear them later from Settings.</p>
            </label>
          </div>
        </>
      )}
    </Modal>
  );
};

// =============================================================================
// Notification helpers — fire from action handlers
// =============================================================================
function notify(title, body, ref, kind = "info") {
  try { FastILA.notifications.add({ title, body, ref, kind }); } catch (_e) {}
}

// =============================================================================
// Payment reference — always KAO/{CLIENT NAME}. Single source of truth so the
// client portal, change-service modal, and n8n payloads stay in lockstep.
// Falls back gracefully when the client's name isn't captured yet.
// Strips spaces / punctuation and uppercases so it satisfies UK bank reference
// rules (alphanumeric, no spaces, max ~18 chars).
// =============================================================================
function fiPaymentReference(clientNameOrBooking) {
  const name = typeof clientNameOrBooking === "string"
    ? clientNameOrBooking
    : (clientNameOrBooking && (clientNameOrBooking.clientName || clientNameOrBooking.name)) || "";
  // Full client name, uppercase, alphanumeric only (UK bank reference rules).
  const clean = (name || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `KAO/${clean || "CLIENTNAME"}`;
}

// =============================================================================
// Signed declaration PDF — generated by both client portal and dashboard side
// so the lawyer/admin can always export the same audit-grade evidence pack.
// =============================================================================
function fiBuildDeclarationPDF(opts = {}) {
  try {
    const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDFCtor) {
      if (window.fiToast) window.fiToast("PDF library still loading — try again in a moment");
      return false;
    }
    const firm = (window.FastILA && FastILA.firm && FastILA.firm.get && FastILA.firm.get()) || {};
    const tradingAs = firm.tradingAs || "Nexa Law Ltd";
    const platform = firm.brand || firm.name || "Fast-ILA";

    const doc = new jsPDFCtor({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 56;
    let y = M;

    const ensure = (need) => { if (y + need > pageH - M) { doc.addPage(); y = M; } };

    doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(20);
    doc.text("Signed Declaration of Independent Legal Advice", M, y); y += 22;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(90);
    doc.text(`Issued by ${tradingAs}  ·  Hosted on ${platform}`, M, y); y += 14;
    doc.text(`Booking ref: ${opts.bookingRef || "—"}    Matter type: ${opts.matterType || "—"}`, M, y); y += 20;
    doc.setDrawColor(220); doc.line(M, y, pageW - M, y); y += 18;

    doc.setTextColor(20); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`Part 1 — ${opts.matterTitle || "Understanding"}`, M, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    (opts.matterItems || []).forEach((it, idx) => {
      const ticked = !!(opts.checks || {})[it.id];
      const lines = doc.splitTextToSize(`${idx + 1}. ${it.q}`, pageW - M * 2 - 18);
      ensure(lines.length * 12 + 8);
      doc.setFont("helvetica", "bold"); doc.text(ticked ? "[Y]" : "[ ]", M, y); doc.setFont("helvetica", "normal");
      doc.text(lines, M + 22, y); y += lines.length * 12 + 6;
    });

    y += 8; ensure(80);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Part 2 — Your declaration", M, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const decls = opts.declarations || {};
    const part2 = [
      ["attended", `I attended the Independent Legal Advice call with ${tradingAs}.`],
      ["watchedVideos", "I watched the explainer video(s) provided in my portal."],
      ["voluntary", "I am entering into this transaction voluntarily and of my own free will."],
      ["noDuress", "I am signing this declaration free from duress, undue influence or pressure."],
      ["documentsTrue", "The documents I uploaded are the documents I will be signing for the lender."],
    ];
    part2.forEach(([id, text], idx) => {
      const ticked = !!decls[id];
      const lines = doc.splitTextToSize(`${idx + 1}. ${text}`, pageW - M * 2 - 18);
      ensure(lines.length * 12 + 8);
      doc.setFont("helvetica", "bold"); doc.text(ticked ? "[Y]" : "[ ]", M, y); doc.setFont("helvetica", "normal");
      doc.text(lines, M + 22, y); y += lines.length * 12 + 6;
    });

    y += 14; ensure(160);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("Part 3 — Signed & dated", M, y); y += 16;
    doc.setFont("helvetica", "normal"); doc.setFontSize(10);
    const auth = `Each signatory below confirms everything above is true and authorises ${tradingAs} to issue the ILA certificate to the lender.`;
    const authLines = doc.splitTextToSize(auth, pageW - M * 2);
    doc.text(authLines, M, y); y += authLines.length * 12 + 10;

    // Build a normalised list of signatories — accept either the new
    // `signatories` array OR fall back to the legacy single-signature fields.
    const sigList = (opts.signatories && opts.signatories.length > 0)
      ? opts.signatories
      : (opts.signature ? [{
          name: opts.printName, role: "Client",
          signature: opts.signature, printName: opts.printName,
          date: opts.signedAt,
        }] : []);

    if (sigList.length === 0) {
      doc.setFontSize(9); doc.setTextColor(150);
      doc.text("(No signatures captured yet)", M, y + 18);
      y += 32;
    } else {
      const cols = sigList.length === 1 ? 1 : 2;
      const colW = (pageW - M * 2 - (cols - 1) * 20) / cols;
      const blockH = 110;
      for (let i = 0; i < sigList.length; i++) {
        const s = sigList[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx  = M + col * (colW + 20);
        if (col === 0) ensure(blockH + 14);
        const by  = y + row * (blockH + 14);

        doc.setDrawColor(220); doc.setFillColor(250, 251, 252);
        doc.roundedRect(bx, by, colW, blockH, 4, 4, "FD");
        doc.setFontSize(7); doc.setTextColor(120);
        doc.text((s.role || `Signatory ${i + 1}`).toUpperCase(), bx + 8, by + 12);

        if (s.signature && /^data:image\//.test(s.signature)) {
          try {
            const imgW = colW - 24;
            const imgH = 44;
            doc.addImage(s.signature, "PNG", bx + 12, by + 18, imgW, imgH);
          } catch (_e) {}
        }
        doc.setDrawColor(150);
        doc.line(bx + 12, by + 70, bx + colW - 12, by + 70);
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(20);
        doc.text(`Signed: ${s.printName || s.name || "—"}`, bx + 12, by + 84);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(90);
        doc.text(`Date: ${s.date || new Date().toISOString().slice(0, 10)}`, bx + 12, by + 98);
      }
      const rows = Math.ceil(sigList.length / cols);
      y += rows * (blockH + 14);
    }

    ensure(70);
    doc.setDrawColor(220); doc.line(M, y, pageW - M, y); y += 14;
    doc.setFontSize(8); doc.setTextColor(120);
    const ua = (navigator.userAgent || "").slice(0, 80);
    const audit = `Audit: ${opts.auditNote || "signed in client portal"} at ${new Date().toISOString()}  ·  user-agent ${ua}`;
    doc.text(doc.splitTextToSize(audit, pageW - M * 2), M, y); y += 18;
    doc.text(`This document is held by ${tradingAs} as evidence of independent legal advice and retained per our retention policy.`, M, y, { maxWidth: pageW - M * 2 });

    const safeRef = (opts.bookingRef || "matter").replace(/[^a-z0-9_-]+/gi, "-");
    doc.save(`signed-declaration-${safeRef}.pdf`);
    if (window.fiToast) window.fiToast("Signed declaration downloaded");
    return true;
  } catch (e) {
    console.warn("[declaration pdf]", e);
    if (window.fiToast) window.fiToast("Could not generate PDF — please try again");
    return false;
  }
}

// =============================================================================
// AI pre-call brief — calls the connected provider (Anthropic preferred, then
// OpenAI). Sends booking + matter doc filenames as context; the LLM produces a
// structured brief the lawyer reads before the call.
// =============================================================================
async function fiGenerateBrief({ booking, matterType, docs = [] } = {}) {
  // Pull the admin's custom system prompt if they've set one in Prompts panel.
  let systemPrompt =
    "You are an experienced UK solicitor preparing an Independent Legal Advice (ILA) pre-call brief. " +
    "Read the supplied matter context and produce a concise brief structured as: 1) Parties; 2) The transaction; " +
    "3) Key terms (loan amount, rate, term, security); 4) Material risks; 5) Questions to ask the client; " +
    "6) Documents the client must execute. Be plain-English, no legalese. Cite document filenames in parentheses.";
  try {
    if (window.FastILA && FastILA.prompts && FastILA.prompts.list) {
      const all = FastILA.prompts.list();
      const p = all && all.precall_brief;
      if (p && p.prompt) systemPrompt = p.prompt;
    }
  } catch (_e) {}

  const docList = (docs || []).map(d => `- ${d.filename || d.name} (${Math.round((d.size_bytes || 0) / 1024)} KB, uploaded ${d.uploaded_at || "—"})`).join("\n") || "(no documents uploaded yet)";
  const userMessage = [
    `Booking ref: ${booking.ref || "—"}`,
    `Client: ${booking.clientName || "—"}`,
    `Matter type: ${matterType || booking.matterType || "—"}`,
    `Service: ${booking.serviceId || "—"}`,
    `Lender (if known): ${booking.lender || "—"}`,
    `Client's stated issue: ${booking.summary || "—"}`,
    "",
    "Matter documents uploaded by client:",
    docList,
    "",
    "Produce the brief now.",
  ].join("\n");

  try {
    const res = await FastILA.ai.complete(systemPrompt, [{ role: "user", content: userMessage }], { max_tokens: 1500 });
    return { text: (res.text || "").trim() || "(no content returned)", provider: res.provider };
  } catch (e) {
    return { error: e.message || "AI request failed" };
  }
}

// =============================================================================
// Signed CCL — overlays the client's signature(s) onto the admin-uploaded
// client care letter PDF at a fixed signature panel on the last page.
// Used by both client portal (download own copy) and the lawyer/admin side
// (download the audit-grade signed CCL for evidence / lender pack).
//
// opts: { templateBytes, signatories[{name, role, signature, printName, date}],
//          bookingRef, clientName }
// =============================================================================
async function fiBuildSignedCCL(opts = {}) {
  try {
    if (!window.PDFLib) {
      if (window.fiToast) window.fiToast("PDF library still loading — try again in a moment");
      return null;
    }
    if (!opts.templateBytes) {
      if (window.fiToast) window.fiToast("No client care letter template has been uploaded yet");
      return null;
    }
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.load(opts.templateBytes);
    const font     = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const firm = (window.FastILA && FastILA.firm && FastILA.firm.get && FastILA.firm.get()) || {};
    const tradingAs = firm.tradingAs || "Nexa Law Ltd";

    const sigs = (opts.signatories || []).filter(s => s && s.signature);
    if (sigs.length === 0) {
      if (window.fiToast) window.fiToast("No signature captured yet — sign the CCL first");
      return null;
    }

    // Stamp panel is added to a NEW final page so we never overlap anything
    // the firm wrote on the original PDF. The user gets the original content
    // verbatim + a clean "Signed by" page they can show the lender.
    const last = pdf.getPage(pdf.getPageCount() - 1);
    const { width: prevW, height: prevH } = last.getSize();
    const newPage = pdf.addPage([prevW || 595.28, prevH || 841.89]);
    const W = newPage.getSize().width;
    const H = newPage.getSize().height;
    const M = 50;
    let y = H - M;

    newPage.drawText("Signed Client Care Letter", { x: M, y: y - 6, size: 18, font: fontBold, color: rgb(0.02, 0.22, 0.32) });
    y -= 28;
    newPage.drawText(`Booking ref: ${opts.bookingRef || "—"}    Issued by: ${tradingAs}`, { x: M, y, size: 10, font, color: rgb(0.36, 0.42, 0.46) });
    y -= 18;
    newPage.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.78, 0.81, 0.84) });
    y -= 24;

    newPage.drawText("This page is appended automatically when the signatory(ies) confirm and sign", { x: M, y, size: 9, font, color: rgb(0.45, 0.52, 0.58) });
    y -= 12;
    newPage.drawText("the Client Care Letter through their Fast-ILA client portal.", { x: M, y, size: 9, font, color: rgb(0.45, 0.52, 0.58) });
    y -= 28;

    // Each signature block: 230pt wide x ~110pt tall. Two columns when there are 2+.
    const cols = sigs.length === 1 ? 1 : 2;
    const colW = (W - M * 2 - (cols - 1) * 24) / cols;

    for (let i = 0; i < sigs.length; i++) {
      const s = sigs[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const blockX = M + col * (colW + 24);
      const blockY = y - row * 130;

      // Need a new page if we've run out of vertical room
      if (blockY < M + 110) {
        const overflow = pdf.addPage([W, H]);
        // restart: draw header on overflow page and reset y
        overflow.drawText("Signed Client Care Letter — continued", { x: M, y: H - M, size: 14, font: fontBold, color: rgb(0.02, 0.22, 0.32) });
        // re-anchor remaining signatories using overflow page; recursive layout is overkill — bail out
        // (we keep it simple: cap at 6 in the UI anyway)
        let oy = H - M - 30;
        for (let j = i; j < sigs.length; j++) {
          const ss = sigs[j];
          await drawSignatureBlock(pdf, overflow, ss, M, oy, W - M * 2, font, fontBold, rgb);
          oy -= 130;
        }
        break;
      }
      await drawSignatureBlock(pdf, newPage, s, blockX, blockY, colW, font, fontBold, rgb);
    }

    // Audit footer at bottom of the stamp page
    const footY = M + 6;
    newPage.drawLine({ start: { x: M, y: footY + 26 }, end: { x: W - M, y: footY + 26 }, thickness: 0.5, color: rgb(0.86, 0.88, 0.90) });
    const ua = (navigator.userAgent || "").slice(0, 70);
    newPage.drawText(`Audit: signed in client portal at ${new Date().toISOString()}  ·  ${ua}`, { x: M, y: footY + 12, size: 7.5, font, color: rgb(0.45, 0.52, 0.58) });
    newPage.drawText(`Held by ${tradingAs} as evidence of independent legal advice retention.`, { x: M, y: footY, size: 7.5, font, color: rgb(0.45, 0.52, 0.58) });

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const safeRef = (opts.bookingRef || "matter").replace(/[^a-z0-9_-]+/gi, "-");
    const a = document.createElement("a");
    a.href = url; a.download = `signed-CCL-${safeRef}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    if (window.fiToast) window.fiToast("Signed CCL downloaded");
    return blob;
  } catch (e) {
    console.warn("[signed CCL pdf]", e);
    if (window.fiToast) window.fiToast("Could not generate signed CCL — please try again");
    return null;
  }
}

async function drawSignatureBlock(pdf, page, sig, x, y, blockW, font, fontBold, rgb) {
  // Box outline
  page.drawRectangle({ x, y: y - 110, width: blockW, height: 110, borderColor: rgb(0.78, 0.81, 0.84), borderWidth: 0.5, color: rgb(0.98, 0.99, 0.99) });
  page.drawText((sig.role || "Signatory"), { x: x + 8, y: y - 14, size: 8, font, color: rgb(0.45, 0.52, 0.58) });

  // Signature image — embed PNG (signature pad outputs PNG data URL)
  if (sig.signature && /^data:image\//.test(sig.signature)) {
    try {
      const b64 = sig.signature.split(",")[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const isPng = /^data:image\/png/.test(sig.signature);
      const embedded = await (isPng ? pdf.embedPng(bytes) : pdf.embedJpg(bytes));
      const dims = embedded.scale(1);
      const maxW = blockW - 24;
      const maxH = 50;
      const ratio = Math.min(maxW / dims.width, maxH / dims.height);
      const w = dims.width * ratio;
      const h = dims.height * ratio;
      page.drawImage(embedded, { x: x + 12, y: y - 22 - h, width: w, height: h });
    } catch (e) { /* fall back to printed name only */ }
  }
  // Underline + printed name + date
  page.drawLine({ start: { x: x + 12, y: y - 80 }, end: { x: x + blockW - 12, y: y - 80 }, thickness: 0.5, color: rgb(0.4, 0.46, 0.50) });
  page.drawText(`Signed:  ${sig.printName || sig.name || "—"}`, { x: x + 12, y: y - 94, size: 9, font: fontBold, color: rgb(0.02, 0.22, 0.32) });
  page.drawText(`Date:    ${sig.date || new Date().toISOString().slice(0, 10)}`, { x: x + 12, y: y - 105, size: 9, font, color: rgb(0.30, 0.38, 0.44) });
}

// PreviewHost — mount once at the top of the app so any component can call
// window.fiPreviewDoc(doc) to open the unified preview modal (PDF iframe,
// Word HTML via mammoth, image, audit-pack signed PDFs, etc.).
const PreviewHost = () => {
  const [doc, setDoc] = React.useState(null);
  React.useEffect(() => {
    window.fiPreviewDoc = (d) => setDoc(d || null);
    return () => { delete window.fiPreviewDoc; };
  }, []);
  return <DocPreviewModal open={!!doc} onClose={() => setDoc(null)} doc={doc}/>;
};

// Expose so dashboards can use without importing
Object.assign(window, {
  Modal, NewBookingModal, RescheduleModal, TrackingModal, CancelConfirm,
  NoteModal, DocPreviewModal, LawyerEditModal, ConfirmModal, ToastHost,
  ProfileEditModal, InviteUserModal, NotificationsPanel, FirstRunWizard,
  ChangeServiceModal,
  Actions, fiToast: toast, fiNotify: notify, TemplateStore,
  fiBuildDeclarationPDF, fiGenerateBrief, fiBuildSignedCCL, fiBuildExecutedCert,
  fiPaymentReference, fiGenerateNote, PreviewHost,
});

// =============================================================================
// AI-draft a lawyer note. Three tone variants — picked based on which tab the
// note belongs to (client-facing, internal admin, lawyer-only). Uses whichever
// AI provider the firm has connected (Anthropic preferred, then OpenAI).
// =============================================================================
async function fiGenerateNote({ booking, tab = "client", currentText = "", extra = {} } = {}) {
  const tones = {
    client: {
      style: "Warm, plain-English, second-person. No legalese. Address the client by first name. Recap what was discussed on the call in 2-3 short paragraphs, then list 2-4 concrete next steps as bullets.",
      sample: "Hi {firstName} — thanks for the call earlier. Quick recap of what we covered…",
    },
    admin: {
      style: "Terse operational note for the firm admin. Bulleted facts only — payments, refunds, scheduling, escalations, things to action.",
      sample: "- Client requested split payment\n- Need to confirm reference with Lloyds",
    },
    lawyer: {
      style: "First-person private working notes for the lawyer's own file. Capture legal observations, clauses to flag, things to remember for next time. Concise, abbreviations OK.",
      sample: "PG limited to facility amount; cross-default clause on cl 4.2 worth re-reading next time. Client confirmed understood JS&S.",
    },
    reminder: {
      style: "Warm but clear ask. Short opening line greeting the client by first name. State plainly what they need to upload (use a bulleted list if more than one item). Reassure them it only takes a few minutes from their phone. End with a polite sign-off. Include the literal token {{portalUrl}} on its own line where the link should appear (it will be replaced when the message is sent). Length: short — under 120 words. No legalese. No emoji.",
      sample: "Hi {firstName},\n\nWe're getting ready for your ILA call and still need a couple of bits from you:\n  • photo ID\n  • recent proof of address\n\nIt should take less than 5 minutes from your phone — open your portal here:\n{{portalUrl}}\n\nAny problems, just reply.\n\nThanks,\nYour ILA solicitor",
    },
  };
  const t = tones[tab] || tones.client;

  const firstName = ((booking && booking.clientName) || "").split(" ")[0] || "the client";
  const ctx = [
    `Booking ref: ${(booking && booking.ref) || "—"}`,
    `Client: ${(booking && booking.clientName) || "—"} (first name: ${firstName})`,
    `Service: ${(booking && booking.serviceId) || "—"}`,
    `Matter type: ${(booking && booking.matterType) || "—"}`,
    `Lender: ${(booking && booking.lender) || "—"}`,
    `Client's stated issue: ${(booking && booking.summary) || "—"}`,
    booking && booking.date ? `Appointment: ${booking.date} ${booking.time || ""}` : "",
    extra && extra.missingDocs && extra.missingDocs.length ? `\nDocuments still missing from the client:\n  - ${extra.missingDocs.join("\n  - ")}` : "",
    extra && extra.channels && extra.channels.length ? `Delivery channels: ${extra.channels.join(", ")} (compose accordingly — be concise enough to read on SMS).` : "",
    booking && booking.aiBrief ? `\nAI brief for this matter:\n${booking.aiBrief}` : "",
    currentText ? `\nThe lawyer has already started typing — refine/extend (don't replace) this:\n"""\n${currentText}\n"""` : "",
  ].filter(Boolean).join("\n");

  const systemPrompt = `You are drafting a "${tab}" note for an Independent Legal Advice (ILA) matter. ${t.style} Do NOT invent facts; if a detail isn't in the context, leave it out. Sample tone: "${t.sample}"`;
  const userMessage = `Draft the note now based on the context below.\n\n${ctx}`;

  try {
    const res = await FastILA.ai.complete(systemPrompt, [{ role: "user", content: userMessage }], { max_tokens: 800 });
    return { text: (res.text || "").trim() || "(no content)", provider: res.provider };
  } catch (e) {
    return { error: e.message || "AI request failed" };
  }
}

// =============================================================================
// Executed ILA certificate — used when the lender requires BOTH the solicitor
// and the client/signatory to sign. The lawyer uploads their signed cert PDF
// from the dashboard; the client then signs in the portal and this helper
// stamps the client's signature onto the final page of the lawyer-signed PDF.
// =============================================================================
async function fiBuildExecutedCert(opts = {}) {
  try {
    if (!window.PDFLib) {
      if (window.fiToast) window.fiToast("PDF library still loading — try again in a moment");
      return null;
    }
    if (!opts.templateBytes) {
      if (window.fiToast) window.fiToast("Lawyer hasn't uploaded the signed certificate yet");
      return null;
    }
    if (!opts.signature || !/^data:image\//.test(opts.signature)) {
      if (window.fiToast) window.fiToast("No client signature captured");
      return null;
    }
    const { PDFDocument, StandardFonts, rgb } = window.PDFLib;
    const pdf = await PDFDocument.load(opts.templateBytes);
    const font     = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const firm = (window.FastILA && FastILA.firm && FastILA.firm.get && FastILA.firm.get()) || {};
    const tradingAs = firm.tradingAs || "Nexa Law Ltd";

    // Append a clean "Executed by client" page so we never collide with the
    // lawyer's existing signature panel on the lender template.
    const last = pdf.getPage(pdf.getPageCount() - 1);
    const { width: prevW, height: prevH } = last.getSize();
    const newPage = pdf.addPage([prevW || 595.28, prevH || 841.89]);
    const W = newPage.getSize().width;
    const H = newPage.getSize().height;
    const M = 50;
    let y = H - M;

    newPage.drawText("ILA Certificate — Executed", { x: M, y: y - 6, size: 18, font: fontBold, color: rgb(0.02, 0.22, 0.32) });
    y -= 28;
    newPage.drawText(`Booking ref: ${opts.bookingRef || "—"}    Issued by: ${tradingAs}`, { x: M, y, size: 10, font, color: rgb(0.36, 0.42, 0.46) });
    y -= 18;
    newPage.drawLine({ start: { x: M, y }, end: { x: W - M, y }, thickness: 0.5, color: rgb(0.78, 0.81, 0.84) });
    y -= 24;

    newPage.drawText("The signatory below has confirmed their understanding and acceptance of the", { x: M, y, size: 10, font, color: rgb(0.30, 0.38, 0.44) });
    y -= 13;
    newPage.drawText("Independent Legal Advice given and consented to the issue of this certificate.", { x: M, y, size: 10, font, color: rgb(0.30, 0.38, 0.44) });
    y -= 36;

    // Box outline
    newPage.drawRectangle({ x: M, y: y - 110, width: W - M * 2, height: 110, borderColor: rgb(0.78, 0.81, 0.84), borderWidth: 0.5, color: rgb(0.98, 0.99, 0.99) });
    newPage.drawText("SIGNATORY", { x: M + 10, y: y - 14, size: 8, font, color: rgb(0.45, 0.52, 0.58) });

    // Signature image
    try {
      const b64 = opts.signature.split(",")[1];
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const isPng = /^data:image\/png/.test(opts.signature);
      const embedded = await (isPng ? pdf.embedPng(bytes) : pdf.embedJpg(bytes));
      const dims = embedded.scale(1);
      const maxW = W - M * 2 - 28;
      const maxH = 50;
      const ratio = Math.min(maxW / dims.width, maxH / dims.height);
      const w = dims.width * ratio;
      const h = dims.height * ratio;
      newPage.drawImage(embedded, { x: M + 14, y: y - 24 - h, width: w, height: h });
    } catch (_e) {}
    newPage.drawLine({ start: { x: M + 14, y: y - 80 }, end: { x: M + 280, y: y - 80 }, thickness: 0.5, color: rgb(0.4, 0.46, 0.50) });
    newPage.drawText(`Signed:  ${opts.printName || opts.clientName || "—"}`, { x: M + 14, y: y - 94, size: 9, font: fontBold, color: rgb(0.02, 0.22, 0.32) });
    newPage.drawText(`Date:    ${opts.signedAt || new Date().toISOString().slice(0, 10)}`, { x: M + 14, y: y - 105, size: 9, font, color: rgb(0.30, 0.38, 0.44) });

    // Audit footer
    const footY = M + 6;
    newPage.drawLine({ start: { x: M, y: footY + 26 }, end: { x: W - M, y: footY + 26 }, thickness: 0.5, color: rgb(0.86, 0.88, 0.90) });
    const ua = (navigator.userAgent || "").slice(0, 70);
    newPage.drawText(`Audit: client signed in portal at ${new Date().toISOString()}  ·  ${ua}`, { x: M, y: footY + 12, size: 7.5, font, color: rgb(0.45, 0.52, 0.58) });
    newPage.drawText(`Held by ${tradingAs} as evidence of independent legal advice retention.`, { x: M, y: footY, size: 7.5, font, color: rgb(0.45, 0.52, 0.58) });

    const bytes = await pdf.save();
    const blob = new Blob([bytes], { type: "application/pdf" });
    if (opts.download !== false) {
      const url = URL.createObjectURL(blob);
      const safeRef = (opts.bookingRef || "matter").replace(/[^a-z0-9_-]+/gi, "-");
      const a = document.createElement("a");
      a.href = url; a.download = `executed-cert-${safeRef}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (window.fiToast) window.fiToast("Executed certificate downloaded");
    }
    return blob;
  } catch (e) {
    console.warn("[executed cert pdf]", e);
    if (window.fiToast) window.fiToast("Could not generate executed certificate — please try again");
    return null;
  }
}

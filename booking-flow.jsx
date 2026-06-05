/* global React, Icon, Avatar, ServiceBadge, SERVICES, LAWYERS, TODAY, addDays, ymd, fmtDateLong, buildAvailability */

// ============================================================================
// CalendarMonth — month grid with availability hints
// ============================================================================
const CalendarMonth = ({ availability, selectedDate, onSelect, anchor }) => {
  const [cursor, setCursor] = React.useState(() => new Date(anchor || TODAY));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  // Monday-start grid
  const startOffset = (first.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + last.getDate()) / 7) * 7;
  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayN = i - startOffset + 1;
    if (dayN < 1 || dayN > last.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month, dayN));
    }
  }
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

  return (
    <div className="bk-cal">
      <div className="bk-cal-head">
        <button
          className="bk-cal-nav"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Previous month"
        ><Icon name="chevron-left" size={18}/></button>
        <div className="bk-cal-title">{months[month]} {year}</div>
        <button
          className="bk-cal-nav"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Next month"
        ><Icon name="chevron-right" size={18}/></button>
      </div>
      <div className="bk-cal-dow">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="bk-cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="bk-cal-cell bk-cell-empty"/>;
          const key = ymd(d);
          const slots = availability[key] || [];
          const hasSlots = slots.length > 0;
          const level = !hasSlots ? "none" : slots.length >= 4 ? "high" : "low";
          const isSelected = selectedDate === key;
          const isToday = ymd(TODAY) === key;
          return (
            <button
              key={i}
              className={[
                "bk-cal-cell",
                hasSlots ? "bk-cell-open" : "bk-cell-closed",
                `bk-cell-${level}`,
                isSelected ? "bk-cell-selected" : "",
                isToday ? "bk-cell-today" : "",
              ].join(" ")}
              disabled={!hasSlots}
              onClick={() => onSelect(key)}
              title={hasSlots ? `${slots.length} slot${slots.length === 1 ? "" : "s"} available` : "Fully booked"}
            >
              <span>{d.getDate()}</span>
              {hasSlots && <span className="bk-cell-bar"/>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Screen 1 — Service Select
// ============================================================================
const ServiceCard = ({ service, layout, onClick, recommended }) => {
  const dur = service.duration >= 60 ? `${service.duration / 60} hour` : `${service.duration} minutes`;

  if (layout === "grid") {
    return (
      <button className={`svc-card svc-card-grid ${recommended ? "svc-card-recommend" : ""}`} onClick={onClick}>
        <div className="svc-card-grid-head">
          <div className="svc-icon"><Icon name={service.icon} size={22}/></div>
          {service.badge && <ServiceBadge badge={service.badge} badgeStyle={service.badgeStyle}/>}
        </div>
        <div className="svc-card-grid-body">
          <div className="svc-name">{service.short}</div>
          <div className="svc-desc">{service.description}</div>
        </div>
        <div className="svc-card-grid-foot">
          <div className="svc-price">£{service.price}</div>
          <div className="svc-dur"><Icon name="clock" size={14}/> {dur}</div>
        </div>
      </button>
    );
  }

  // default: stacked
  return (
    <button className={`svc-card svc-card-stack ${recommended ? "svc-card-recommend" : ""}`} onClick={onClick}>
      <div className="svc-stack-icon">
        <Icon name={service.icon} size={20}/>
      </div>
      <div className="svc-stack-body">
        <div className="svc-stack-row">
          <span className="svc-name">{service.short}</span>
          <span className="svc-price">£{service.price}</span>
          {service.badge && <ServiceBadge badge={service.badge} badgeStyle={service.badgeStyle}/>}
        </div>
        <div className="svc-stack-meta">
          <Icon name="clock" size={13}/> {dur}
          <span className="svc-sep">·</span>
          <span>{service.description}</span>
        </div>
      </div>
      <div className="svc-stack-cta"><Icon name="chevron-right" size={20}/></div>
    </button>
  );
};

const ScreenServiceSelect = ({ layout, onPickService, theme }) => {
  // No services configured (admin hasn't set any up)
  if (!SERVICES || SERVICES.length === 0) {
    return (
      <div className={`bk-screen bk-screen-services ${theme === "dark" ? "is-dark" : ""}`}>
        <div className="bk-screen-head">
          <h2 className="bk-title display">Booking unavailable</h2>
        </div>
        <div style={{ padding: "32px 12px", textAlign: "center", color: "#5b6b76" }}>
          <Icon name="info" size={36}/>
          <p style={{ marginTop: 12 }}>No services are currently available. Please check back later.</p>
        </div>
      </div>
    );
  }
  return (
    <div className={`bk-screen bk-screen-services ${theme === "dark" ? "is-dark" : ""}`}>
      <div className="bk-screen-head">
        <h2 className="bk-title display">Choose your service</h2>
      </div>

      <div className={`svc-list svc-list-${layout || "stacked"}`}>
        {SERVICES.map(s => (
          <ServiceCard
            key={s.id}
            service={s}
            layout={layout}
            recommended={s.id === "standard"}
            onClick={() => onPickService(s.id)}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Screen 2 — Date + Lawyer
// ============================================================================
const ScreenDateLawyer = ({ service, state, setState, onBack, onNext }) => {
  const tick = (window.FastILA && FastILA.useStore) ? FastILA.useStore()[0] : 0;
  const FA = window.FastILA && FastILA.availability;
  // Real diary-driven availability: per-lawyer when one is chosen, else the
  // union across eligible lawyers. Falls back to the legacy generator only if
  // the data layer isn't present.
  const availability = React.useMemo(() => {
    if (FA && FA.forLawyer) {
      return state.lawyerId ? FA.forLawyer(state.lawyerId, service.id) : FA.forService(service.id);
    }
    return (typeof buildAvailability === "function") ? buildAvailability(service.id) : {};
  }, [service.id, state.lawyerId, tick]);
  const [tab, setTab] = React.useState(state.lawyerId ? "specific" : "earliest");

  // Wet-signature specialists don't take ILA bookings on their own — they only
  // assist as the second lawyer on wet matters. Hide them from the client-facing
  // booking form so clients can only book a primary ILA solicitor.
  const eligibleLawyers = (LAWYERS || [])
    .filter(l => (l.kind || "ila_solicitor") !== "wet_specialist")
    .filter(l => (l.services || []).includes(service.id));

  // No lawyers configured for this service — bail out gracefully
  if (eligibleLawyers.length === 0) {
    return (
      <div className="bk-screen bk-screen-cal">
        <div className="bk-screen-head bk-screen-head-row">
          <button className="bk-back" onClick={onBack}>
            <Icon name="arrow-left" size={16}/> Back
          </button>
          <div><h2 className="bk-title display">No lawyer available</h2></div>
          <div/>
        </div>
        <div style={{ padding: "32px 12px", textAlign: "center", color: "#5b6b76" }}>
          <Icon name="info" size={36}/>
          <p style={{ marginTop: 12, maxWidth: 480, marginInline: "auto" }}>
            We don't have any lawyers configured for <strong>{service.name}</strong> right now. Please contact us or pick a different service.
          </p>
        </div>
      </div>
    );
  }

  const onDateSelect = (key) => setState({ ...state, date: key, time: null });
  const onTimeSelect = (t) => setState({ ...state, time: t });
  const onLawyerSelect = (id) => setState({ ...state, lawyerId: id });

  const earliestSlots = React.useMemo(() => {
    if (FA && FA.earliest) return FA.earliest(service.id, 5);
    // Fallback (no data layer): rotate slots across eligible lawyers.
    const result = [];
    for (const d of Object.keys(availability).sort()) {
      for (const t of availability[d]) {
        if (result.length < 5) result.push({ date: d, time: t, lawyer: eligibleLawyers[result.length % eligibleLawyers.length] });
      }
      if (result.length >= 5) break;
    }
    return result;
  }, [service.id, tick]);

  // availability is already lawyer-specific (and diary/booking-filtered) when a
  // lawyer is selected, so the day's slots come straight from it.
  const slotsForDay = state.date ? (availability[state.date] || []) : [];
  const canContinue = state.date && state.time;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fmtPretty = (key) => {
    const [y, m, d] = key.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return `${days[dt.getDay()]} ${d} ${months[m - 1]}`;
  };

  return (
    <div className="bk-screen bk-screen-cal">
      <div className="bk-screen-head bk-screen-head-row">
        <button className="bk-back" onClick={onBack}>
          <Icon name="arrow-left" size={16}/> Back
        </button>
        <div>
          <h2 className="bk-title display">Pick a time</h2>
        </div>
        <div className="bk-summary-chip">
          <span className="pill pill-cream">{service.short}</span>
          <span className="bk-summary-price">£{service.price}</span>
        </div>
      </div>

      <div className="bk-tabs">
        <button
          className={`bk-tab ${tab === "earliest" ? "is-active" : ""}`}
          onClick={() => setTab("earliest")}
        >
          <Icon name="bolt" size={15}/>
          Earliest available
        </button>
        <button
          className={`bk-tab ${tab === "specific" ? "is-active" : ""}`}
          onClick={() => setTab("specific")}
        >
          <Icon name="user" size={15}/>
          Pick a specific lawyer
        </button>
      </div>

      {tab === "earliest" && (
        <div className="bk-earliest-list">
          {earliestSlots.map((s, i) => {
            const isSel = state.date === s.date && state.time === s.time && state.lawyerId === s.lawyer.id;
            return (
              <button
                key={i}
                className={`bk-earliest-row ${isSel ? "is-selected" : ""}`}
                onClick={() => setState({ ...state, date: s.date, time: s.time, lawyerId: s.lawyer.id })}
              >
          {!isSel && (
            <div className="bk-earliest-row-l">
              <Avatar lawyer={s.lawyer} size={38}/>
              <div>
                <div className="bk-earliest-name">{s.lawyer.name}</div>
                <div className="bk-earliest-langs">{s.lawyer.languages.join(" · ")}</div>
              </div>
            </div>
          )}
          {isSel && (
            <div className="bk-earliest-row-l">
              <Avatar lawyer={s.lawyer} size={38}/>
              <div>
                <div className="bk-earliest-name">{s.lawyer.name}</div>
                <div className="bk-earliest-langs">{s.lawyer.languages.join(" · ")}</div>
              </div>
            </div>
          )}
                <div className="bk-earliest-row-r">
                  <div className="bk-earliest-date">{fmtPretty(s.date)}</div>
                  <div className="bk-earliest-time">{s.time} <span className="bk-earliest-tz">Europe/London</span></div>
                </div>
                <Icon name="chevron-right" size={18}/>
              </button>
            );
          })}
        </div>
      )}

      {tab === "specific" && (
        <>
          <div className="bk-lawyer-grid">
            {eligibleLawyers.map(l => {
              const sel = state.lawyerId === l.id;
              return (
                <button
                  key={l.id}
                  className={`bk-lawyer-card ${sel ? "is-selected" : ""}`}
                  onClick={() => onLawyerSelect(l.id)}
                >
                  <Avatar lawyer={l} size={52}/>
                  <div className="bk-lawyer-info">
                    <div className="bk-lawyer-name">{l.name}</div>
                    <div className="bk-lawyer-langs">{l.languages.join(" · ")}</div>
                  </div>
                  <div className="bk-lawyer-next">
                    <div className="bk-lawyer-next-lbl">Next available</div>
                    <div className="bk-lawyer-next-time">{l.nextSlot}</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bk-cal-row">
            <div className="bk-cal-wrap">
              <CalendarMonth
                availability={availability}
                selectedDate={state.date}
                onSelect={onDateSelect}
                anchor={TODAY}
              />
              <div className="bk-cal-legend">
                <span><i className="dot dot-high"/> Good availability</span>
                <span><i className="dot dot-low"/> Limited</span>
                <span><i className="dot dot-closed"/> Fully booked</span>
                <span><i className="dot dot-selected"/> Selected</span>
              </div>
            </div>
            <div className="bk-times">
              <div className="bk-times-head">
                {state.date ? (
                  <>
                    <span>Available times — </span>
                    <strong>{fmtPretty(state.date)}</strong>
                  </>
                ) : (
                  <span className="bk-times-empty">Select a date to see times</span>
                )}
              </div>
              {state.date && (
                <div className="bk-times-grid">
                  {slotsForDay.map(t => (
                    <button
                      key={t}
                      className={`bk-time ${state.time === t ? "is-selected" : ""}`}
                      onClick={() => onTimeSelect(t)}
                    >{t}</button>
                  ))}
                </div>
              )}
              {!state.lawyerId && state.date && (
                <div className="bk-times-hint">Showing slots across all qualified lawyers. Choose a lawyer above to filter.</div>
              )}
            </div>
          </div>
        </>
      )}

      <div className="bk-screen-foot">
        <div className="bk-notice">
          <Icon name="info" size={15}/>
          Times shown in Europe/London. Cancel free up to 24 hours before.
        </div>
        <button className="btn btn-navy btn-lg" disabled={!canContinue} onClick={onNext}>
          Continue <Icon name="arrow-right" size={16}/>
        </button>
      </div>
    </div>
  );
};

// Fixed matter types for the booking form (ids align with the matter_types
// table so they persist as bookings.matter_type; "other" stores null).
const MATTER_OPTIONS = [
  { id: "personal-guarantee",   label: "Personal / Director Guarantee" },
  { id: "jbsp-mortgage",        label: "Joint Borrower Sole Proprietor (JBSP)" },
  { id: "occupiers-consent",    label: "Occupier's Consent / Consent to Mortgage" },
  { id: "transfer-of-equity",   label: "Transfer of Equity" },
  { id: "deed-of-subordination",label: "Deed of Subordination / Postponement" },
  { id: "bridging-loan",        label: "Bridging Loan" },
  { id: "disponer-certificate", label: "Gifted Deposit / Disponer's Certificate" },
  { id: "other",                label: "Other / not sure yet" },
];

// ============================================================================
// Screen 3 — Details
// ============================================================================
const ScreenDetails = ({ service, state, setState, onBack, onSubmit, submitting, submitError }) => {
  const [form, setForm] = React.useState(state.form || {
    name: "", email: "", phone: "", lender: "", legal: "",
    sigName: "", sigEmail: "", sigPhone: "", sigRel: "",
    postAddress: "", postRecipient: "client",
  });

  const update = (k, v) => {
    const next = { ...form, [k]: v };
    setForm(next);
    setState({ ...state, form: next });
  };

  // Returning-client check (debounced). Privacy-safe: only learns whether the
  // email has booked before — NO details are fetched or prefilled. History is
  // shown in the authenticated client portal.
  const [returning, setReturning] = React.useState(null);
  React.useEffect(() => {
    const em = (form.email || "").trim();
    if (!em.includes("@") || !window.FastILA?.clients?.lookupPublic) { setReturning(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try { const r = await FastILA.clients.lookupPublic(em); if (!cancelled) setReturning(r); }
      catch (_e) { if (!cancelled) setReturning(null); }
    }, 600);
    return () => { cancelled = true; clearTimeout(t); };
  }, [form.email]);

  const lawyer = LAWYERS.find(l => l.id === state.lawyerId);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = state.date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateLabel = `${days[dt.getDay()]} ${d} ${months[m - 1]} ${y}`;

  const startH = parseInt(state.time);
  const startM = parseInt(state.time.split(":")[1]);
  const end = new Date(dt);
  end.setHours(startH, startM + service.duration);
  const endLabel = `${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;

  const requiredOK = form.name && form.email && form.phone && form.matterType;
  const couplesOK = service.id !== "couples" || (form.sigName && form.sigEmail);
  const needsPostage = service.delivery === "postal";
  const wetOK = !needsPostage || form.postAddress;
  const canSubmit = requiredOK && couplesOK && wetOK;

  return (
    <div className="bk-screen bk-screen-form">
      <div className="bk-screen-head bk-screen-head-row">
        <button className="bk-back" onClick={onBack}>
          <Icon name="arrow-left" size={16}/> Back
        </button>
        <div>
          <h2 className="bk-title display">Your details</h2>
        </div>
        <div className="bk-summary-chip">
          <span className="bk-summary-price">£{service.price}</span>
        </div>
      </div>

      <div className="bk-confirm-strip">
        <div className="bk-confirm-l">
          <div className="bk-confirm-title">
            You are booking: <strong>{service.name}</strong>
            {service.badge && <span className="pill pill-cream" style={{ marginLeft: 8 }}>{service.badge}</span>}
          </div>
          <div className="bk-confirm-meta">
            <span><Icon name="calendar" size={14}/> {dateLabel}</span>
            <span><Icon name="clock" size={14}/> {state.time} – {endLabel}</span>
            <span><Icon name="globe" size={14}/> Europe/London</span>
            {lawyer && (
              <span className="bk-confirm-lawyer">
                <Avatar lawyer={lawyer} size={20}/> {lawyer.name}
              </span>
            )}
          </div>
          <div className="bk-confirm-meet">
            <Icon name="video" size={14}/>
            Google Meet · photo ID required
          </div>
        </div>
        <div className="bk-confirm-r">
          <div className="bk-confirm-amt-lbl">Fixed fee</div>
          <div className="bk-confirm-amt">£{service.price}</div>
          <div className="bk-confirm-amt-foot">Payment details to follow</div>
        </div>
      </div>

      <div className="bk-form">
        <div className="bk-form-grid">
          <div className="bk-form-col-2">
            <label className="field-label">Full name<span className="req">*</span></label>
            <input className="field-input" value={form.name || ""} onChange={(e) => update("name", e.target.value)} placeholder="As it should appear on the certificate"/>
          </div>
          <div>
            <label className="field-label">Email<span className="req">*</span></label>
            <input className="field-input" type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="you@email.com"/>
          </div>
          <div>
            <label className="field-label">Phone<span className="req">*</span></label>
            <input
              className="field-input"
              type="tel"
              value={form.phone || ""}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+44 7700 900000"
            />
          </div>
          <div className="bk-form-col-2">
            <label className="field-label">Lender <span className="bk-optional">(optional)</span></label>
            <input className="field-input" value={form.lender || ""} onChange={(e) => update("lender", e.target.value)} placeholder="e.g. Shawbrook Bank"/>
          </div>
        </div>

        {returning && returning.returning && (
          <div className="bk-welcome-back" style={{ marginTop: 4, fontSize: 12.5, color: "#1f7a46", background: "#f4faf6", border: "1px solid #d7eade", borderRadius: 10, padding: "10px 12px", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Icon name="check" size={14}/>
            <span><strong>Welcome back!</strong> You've booked with us before — your past bookings &amp; certificates are in your <strong>client portal</strong> (sign in with this email after booking to view them). Just complete the form below to make a new booking.</span>
          </div>
        )}

        {service.id === "couples" && (
          <div className="bk-form-cond">
            <div className="bk-form-cond-head">
              <Icon name="users" size={16}/>
              Second signatory
            </div>
            <p className="bk-form-cond-note">Their name goes on the certificate. Both of you can use the <strong>same witness</strong> — as long as they're not a relative and not involved in the transaction.</p>
            <div className="bk-form-grid">
              <div>
                <label className="field-label">Name<span className="req">*</span></label>
                <input className="field-input" value={form.sigName} onChange={(e) => update("sigName", e.target.value)}/>
              </div>
              <div>
                <label className="field-label">Email<span className="req">*</span></label>
                <input className="field-input" type="email" value={form.sigEmail} onChange={(e) => update("sigEmail", e.target.value)}/>
              </div>
            </div>
          </div>
        )}

        {needsPostage && (
          <div className="bk-form-cond">
            <div className="bk-form-cond-head">
              <Icon name="stamp" size={16}/>
              Postage details
            </div>
            <ol className="bk-wet-steps">
              <li>After your Google Meet, you'll post the unsigned documents to us by Special Delivery.</li>
              <li>We sign them, then post on to your lender, conveyancer, or back to you. (Please arrange your own witness at the meeting.)</li>
            </ol>
            <label className="field-label" style={{ marginTop: 4 }}>Who should we post the signed documents to?<span className="req">*</span></label>
            <div className="bk-radio-row">
              <label className={`bk-radio ${form.postRecipient === "client" ? "is-checked" : ""}`}>
                <input type="radio" name="postR" checked={form.postRecipient === "client"} onChange={() => update("postRecipient", "client")}/>
                <span>Back to me</span>
              </label>
              <label className={`bk-radio ${form.postRecipient === "lender" ? "is-checked" : ""}`}>
                <input type="radio" name="postR" checked={form.postRecipient === "lender"} onChange={() => update("postRecipient", "lender")}/>
                <span>Lender / conveyancer</span>
              </label>
            </div>
            <label className="field-label" style={{ marginTop: 10 }}>Postal address<span className="req">*</span></label>
            <textarea className="field-textarea" rows={2} value={form.postAddress} onChange={(e) => update("postAddress", e.target.value)} placeholder="Recipient name, full UK address, post code"/>
          </div>
        )}

        <div className="bk-form-grid">
          <div className="bk-form-col-2">
            <label className="field-label">What do you require independent legal advice on?<span className="req">*</span></label>
            <select
              className="field-input"
              value={form.matterType || ""}
              onChange={(e) => {
                const id = e.target.value;
                const opt = MATTER_OPTIONS.find(o => o.id === id);
                const next = { ...form, matterType: id, legal: opt ? opt.label : "" };
                setForm(next); setState({ ...state, form: next });
              }}
            >
              <option value="">Select the matter type…</option>
              {MATTER_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <div style={{ fontSize: 12, color: "#5b6b76", marginTop: 6 }}>Pick the closest match — it helps your lawyer prepare. Choose "Other / not sure yet" if unsure.</div>
          </div>
        </div>

        <div className="bk-next-note">
          <Icon name="user" size={15}/>
          <span>After booking you'll be taken to your <strong>client portal</strong> to sign the client care letter, upload your ID &amp; documents, and arrange payment by bank transfer. Your slot is held — nothing to pay now.</span>
        </div>

        <div className="bk-cancel-policy">
          <Icon name="info" size={15}/>
          <span>Cancellations and reschedules must be made at least <strong>24 hours before</strong> your appointment.</span>
        </div>

        {submitError && (
          <div className="bk-submit-error" role="alert" style={{
            background: "#fff1f1", color: "#9a1c1c", border: "1px solid #f3c2c2",
            padding: "10px 12px", borderRadius: 8, marginTop: 10, fontSize: 13,
          }}>
            <Icon name="x-circle" size={14}/> Booking failed — {submitError}. Please try again or email info@fast-ila.co.uk.
          </div>
        )}
        <button
          className="btn btn-navy btn-lg btn-block bk-submit"
          disabled={!canSubmit || submitting}
          onClick={onSubmit}
        >
          {submitting ? <>Securing your slot…</> : <>Confirm appointment <Icon name="arrow-right" size={16}/></>}
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Confirmation
// ============================================================================
const ScreenConfirm = ({ service, state, onAgain }) => {
  const lawyer = LAWYERS.find(l => l.id === state.lawyerId);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const [y, m, d] = state.date.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dateLabel = `${days[dt.getDay()]} ${d} ${months[m - 1]} ${y}`;
  const meetLink = state.meetLink || null;

  // Open the client portal for this booking (deep-link + context).
  const goPortal = () => {
    try {
      if (state.ref) { window.FastILA_currentBooking = { bookingRef: state.ref }; localStorage.setItem("fastila_last_ref", state.ref); }
      const email = state.form && state.form.email; if (email) localStorage.setItem("fastila_last_email", email);
    } catch (_e) { /* ignore */ }
    window.location.href = "?mode=portal" + (state.ref ? "&ref=" + encodeURIComponent(state.ref) : "");
  };

  // "Add to my calendar" — Google Calendar template with the real time + Meet link.
  const addToCalendar = () => {
    const [sh, sm] = String(state.time).split(":").map(Number);
    const startDt = new Date(y, m - 1, d, sh || 9, sm || 0);
    const endDt = new Date(startDt.getTime() + (service.duration || 45) * 60000);
    const pad = (n) => String(n).padStart(2, "0");
    const fmt = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
    const details = `Your Independent Legal Advice appointment with Fast-ILA.` +
      (meetLink ? `\\nJoin: ${meetLink}` : `\\nThe Google Meet link will be in your confirmation email.`) +
      (state.ref ? `\\nReference: ${state.ref}` : "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${encodeURIComponent("Fast-ILA · " + service.name)}` +
      `&dates=${fmt(startDt)}/${fmt(endDt)}&ctz=Europe/London` +
      `&details=${encodeURIComponent(details)}` +
      (meetLink ? `&location=${encodeURIComponent(meetLink)}` : "");
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="bk-screen bk-screen-confirm">
      <div className="bk-confirm-hero">
        <div className="bk-confirm-mark">
          <Icon name="check" size={36} stroke={2.5}/>
        </div>
        <h2 className="bk-title display">You're booked in</h2>
        <p className="bk-subtitle">Confirmation email and SMS are on their way to you now.</p>
      </div>

      <div className="bk-confirm-card">
        {state.ref && (
          <div className="bk-confirm-row">
            <div className="bk-confirm-label">Reference</div>
            <div className="bk-confirm-value"><strong>{state.ref}</strong></div>
          </div>
        )}
        <div className="bk-confirm-row">
          <div className="bk-confirm-label">Service</div>
          <div className="bk-confirm-value">{service.name}</div>
        </div>
        <div className="bk-confirm-row">
          <div className="bk-confirm-label">Date &amp; time</div>
          <div className="bk-confirm-value">{dateLabel} · {state.time} Europe/London</div>
        </div>
        {lawyer && (
          <div className="bk-confirm-row">
            <div className="bk-confirm-label">Lawyer</div>
            <div className="bk-confirm-value bk-confirm-lawyer-row">
              <Avatar lawyer={lawyer} size={28}/> {lawyer.name}
            </div>
          </div>
        )}
        <div className="bk-confirm-row">
          <div className="bk-confirm-label">Fixed fee</div>
          <div className="bk-confirm-value"><strong>£{service.price}</strong> · payment details to follow by email</div>
        </div>
        <div className="bk-confirm-row">
          <div className="bk-confirm-label">Meeting</div>
          <div className="bk-confirm-value">
            {meetLink ? (
              <a className="bk-meet-link" href={meetLink} target="_blank" rel="noopener noreferrer">
                <Icon name="video" size={14}/> {meetLink.replace(/^https?:\/\//, "")}
              </a>
            ) : (
              <span className="bk-meet-link" style={{ cursor: "default" }}>
                <Icon name="video" size={14}/> Google Meet link will be in your confirmation email
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="bk-confirm-next">
        <div className="bk-confirm-next-title">Next: open your client portal</div>
        <p className="bk-confirm-portal-lede">Sign your client care letter, upload your ID &amp; documents, and arrange payment by bank transfer. Your slot is held — do this any time before your call.</p>
        <ol className="bk-confirm-steps">
          <li><strong>Sign the client care letter</strong> from Nexa Law Ltd.</li>
          <li><strong>Upload ID &amp; proof of address</strong> for AML.</li>
          <li><strong>Pay by bank transfer</strong> into our SRA-regulated client account.</li>
          <li><strong>Upload the documents</strong> your lawyer needs to read before the call.</li>
        </ol>
      </div>

      <div className="bk-confirm-portal-cta">
        <div>
          <div className="bk-confirm-portal-title">Open your client portal</div>
          <div className="bk-confirm-portal-sub">We've also emailed you a sign-in link — use either</div>
        </div>
        <button className="btn btn-lime btn-lg" onClick={goPortal}>
          <Icon name="arrow-right" size={16}/> Continue to portal
        </button>
      </div>

      <div className="bk-confirm-cta-row">
        <button className="btn btn-ghost" onClick={onAgain}>
          <Icon name="arrow-left" size={14}/> Book another
        </button>
        <button className="btn btn-lime btn-lg" onClick={addToCalendar}>
          <Icon name="calendar" size={16}/> Add to my calendar
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Wrapper — Booking flow state machine
// ============================================================================
const BookingFlow = ({ layout = "stacked", theme = "light", initialScreen = "service" }) => {
  const [screen, setScreen] = React.useState(initialScreen); // service | datetime | details | done
  const [state, setState] = React.useState({
    serviceId: null,
    date: null,
    time: null,
    lawyerId: null,
    form: null,
    ref: null,
    submitting: false,
    submitError: null,
  });

  const service = state.serviceId ? SERVICES.find(s => s.id === state.serviceId) : null;

  const onPickService = (sid) => {
    setState(s => ({ ...s, serviceId: sid }));
    setScreen("datetime");
  };

  const restart = () => {
    setState({ serviceId: null, date: null, time: null, lawyerId: null, form: null, ref: null, submitting: false, submitError: null });
    setScreen("service");
  };

  // Persist booking via FastILA (Supabase when configured; mock fallback otherwise)
  const persistBooking = async () => {
    if (state.submitting) return;
    setState(s => ({ ...s, submitting: true, submitError: null }));
    const svc = service;
    const f = state.form || {};
    const payload = {
      service_id: state.serviceId,
      lawyer_id: state.lawyerId,
      appointment_date: state.date,
      appointment_time: state.time,
      client_name: f.name,
      client_email: f.email,
      client_phone: f.phone,
      lender: f.lender || null,
      legal_summary: f.legal || null,
      matter_type: (f.matterType && f.matterType !== "other") ? f.matterType : null,
      second_signatory_name: f.sigName || null,
      second_signatory_email: f.sigEmail || null,
      post_recipient: f.postRecipient || null,
      post_address: f.postAddress || null,
      amount: svc?.price,
      source: (typeof window !== "undefined" && window.location && window.location.hostname) || "fast-ila.co.uk",
    };
    try {
      const api = (typeof window !== "undefined" && window.FastILA) ? window.FastILA : null;
      if (!api) {
        setState(s => ({ ...s, submitting: false, ref: `FI-${new Date().getFullYear()}-${String(Math.floor(Math.random()*900)+100).padStart(5,"0")}` }));
        setScreen("done");
        return;
      }
      const result = await api.bookings.create(payload);
      setState(s => ({ ...s, submitting: false, ref: result.ref, meetLink: result.meet_link || null }));
      try {
        // Stash the booking ref locally so the client portal can pick it up by deep link.
        if (typeof localStorage !== "undefined") {
          localStorage.setItem("fastila_last_ref", result.ref);
          localStorage.setItem("fastila_last_email", payload.client_email);
        }
      } catch (e) { /* ignore */ }
      // Surface in admin's notifications bell
      try {
        if (typeof window.fiNotify === "function") {
          window.fiNotify("New booking", `${payload.client_name} — ${svc?.name || ""}`, result.ref, "success");
        }
      } catch (_e) { /* ignore */ }
      setScreen("done");
    } catch (err) {
      console.error("[BookingFlow] persist failed", err);
      setState(s => ({ ...s, submitting: false, submitError: err.message || String(err) }));
    }
  };

  return (
    <div className={`bk-shell bk-theme-${theme}`}>
      <div className="bk-stepper">
        <div className={`bk-step ${screen === "service" ? "is-active" : (state.serviceId ? "is-done" : "")}`}>
          <span className="bk-step-num">1</span>
          <span>Service</span>
        </div>
        <i className="bk-step-line"/>
        <div className={`bk-step ${screen === "datetime" ? "is-active" : (state.date && state.time ? "is-done" : "")}`}>
          <span className="bk-step-num">2</span>
          <span>Date &amp; time</span>
        </div>
        <i className="bk-step-line"/>
        <div className={`bk-step ${screen === "details" ? "is-active" : (screen === "done" ? "is-done" : "")}`}>
          <span className="bk-step-num">3</span>
          <span>Details</span>
        </div>
        <i className="bk-step-line"/>
        <div className={`bk-step ${screen === "done" ? "is-active" : ""}`}>
          <span className="bk-step-num"><Icon name="check" size={12} stroke={3}/></span>
          <span>Done</span>
        </div>
      </div>

      <div className="bk-body">
        {screen === "service" && (
          <ScreenServiceSelect
            layout={layout}
            theme={theme}
            onPickService={onPickService}
          />
        )}
        {screen === "datetime" && service && (
          <ScreenDateLawyer
            service={service}
            state={state}
            setState={setState}
            onBack={() => setScreen("service")}
            onNext={() => setScreen("details")}
          />
        )}
        {screen === "details" && service && (
          <ScreenDetails
            service={service}
            state={state}
            setState={setState}
            onBack={() => setScreen("datetime")}
            onSubmit={persistBooking}
            submitting={state.submitting}
            submitError={state.submitError}
          />
        )}
        {screen === "done" && service && (
          <ScreenConfirm
            service={service}
            state={state}
            onAgain={restart}
          />
        )}
      </div>
    </div>
  );
};

Object.assign(window, { BookingFlow });

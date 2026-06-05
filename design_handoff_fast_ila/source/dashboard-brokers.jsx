/* global React, Icon, Avatar */

// ============================================================================
// Brokers — referral panel CRM for the admin
// Track every broker who refers clients, their volume, and send mailings.
// ============================================================================

const SEED_BROKERS = [
  { id: "b1", name: "Sarah Patel", firm: "Patel Finance Brokers", email: "sarah@patelfinance.co.uk", phone: "07700 900111", tier: "platinum", referrals30: 8, referralsTotal: 47, lastReferral: "26 May 2026", commissionPct: 0, notes: "Top referrer. Mostly bridging + PG matters with OakNorth and Together Money.", subscribed: true, addedAt: "12 Jan 2025" },
  { id: "b2", name: "James Hardwick", firm: "Hardwick Mortgages Ltd", email: "james@hardwickmortgages.com", phone: "07700 900222", tier: "gold", referrals30: 4, referralsTotal: 28, lastReferral: "22 May 2026", commissionPct: 0, notes: "Specialises in JBSP. Always wants Amelia.", subscribed: true, addedAt: "8 Mar 2025" },
  { id: "b3", name: "Priti Shah", firm: "Shah Property Finance", email: "priti@shahpropfin.co.uk", phone: "07700 900333", tier: "gold", referrals30: 3, referralsTotal: 22, lastReferral: "20 May 2026", commissionPct: 0, notes: "BTL portfolio clients — Shawbrook & Aldermore.", subscribed: true, addedAt: "1 Jun 2025" },
  { id: "b4", name: "David Lin", firm: "Linwood Capital", email: "david@linwoodcapital.uk", phone: "07700 900444", tier: "silver", referrals30: 2, referralsTotal: 14, lastReferral: "18 May 2026", commissionPct: 0, notes: "Commercial bridging. Tight on turnaround.", subscribed: true, addedAt: "14 Sep 2025" },
  { id: "b5", name: "Anya Kowalski", firm: "Kowalski & Co Brokers", email: "anya@kowalski.broker", phone: "07700 900555", tier: "silver", referrals30: 2, referralsTotal: 11, lastReferral: "14 May 2026", commissionPct: 0, notes: "Polish-speaking clients mostly. Refers Sofia.", subscribed: true, addedAt: "22 Oct 2025" },
  { id: "b6", name: "Marcus Brown", firm: "Brown & Sons Finance", email: "marcus@brownsons.co.uk", phone: "07700 900666", tier: "silver", referrals30: 1, referralsTotal: 9, lastReferral: "10 May 2026", commissionPct: 0, notes: "Older clients, prefers wet signatures.", subscribed: true, addedAt: "30 Nov 2025" },
  { id: "b7", name: "Olu Adeyemi", firm: "Independent", email: "olu.adeyemi@gmail.com", phone: "07700 900777", tier: "bronze", referrals30: 1, referralsTotal: 5, lastReferral: "5 May 2026", commissionPct: 0, notes: "Self-employed IFA.", subscribed: false, addedAt: "12 Jan 2026" },
  { id: "b8", name: "Hannah Wilson", firm: "Wilson Bridging", email: "hannah@wilsonbridging.com", phone: "07700 900888", tier: "bronze", referrals30: 0, referralsTotal: 3, lastReferral: "12 Apr 2026", commissionPct: 0, notes: "New broker, signed onboarded Q1 2026.", subscribed: true, addedAt: "4 Feb 2026" },
  { id: "b9", name: "Tom Whitfield", firm: "Whitfield Property", email: "tom@whitfieldprop.uk", phone: "07700 900999", tier: "bronze", referrals30: 0, referralsTotal: 2, lastReferral: "28 Mar 2026", commissionPct: 0, notes: "", subscribed: true, addedAt: "8 Feb 2026" },
];

const MAILING_HISTORY = [
  { id: "m1", subject: "Spring 2026 update: new lender panel & turnaround stats", sentAt: "28 Mar 2026", recipients: 32, opened: 24, clicked: 11, channel: "email" },
  { id: "m2", subject: "Year-end review · thank-you for the referrals", sentAt: "18 Dec 2025", recipients: 28, opened: 22, clicked: 8, channel: "email" },
  { id: "m3", subject: "Reminder: same-day urgent ILA from £175", sentAt: "10 Oct 2025", recipients: 25, opened: 17, clicked: 6, channel: "email" },
];

const TIER_COLORS = {
  platinum: { cls: "pill-info", label: "Platinum" },
  gold: { cls: "pill-warning", label: "Gold" },
  silver: { cls: "pill-muted", label: "Silver" },
  bronze: { cls: "pill-muted", label: "Bronze" },
};

const BrokersView = () => {
  const [brokers, setBrokers] = React.useState(SEED_BROKERS);
  const [search, setSearch] = React.useState("");
  const [tierFilter, setTierFilter] = React.useState("all");
  const [selectedId, setSelectedId] = React.useState(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState(new Set());

  const update = (id, patch) => setBrokers(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
  const remove = (id) => setBrokers(prev => prev.filter(b => b.id !== id));
  const add = () => {
    const id = `b-${Date.now()}`;
    const fresh = { id, name: "", firm: "", email: "", phone: "", tier: "bronze", referrals30: 0, referralsTotal: 0, lastReferral: "—", subscribed: true, addedAt: "today", notes: "" };
    setBrokers([fresh, ...brokers]);
    setSelectedId(id);
  };

  if (selectedId) {
    const broker = brokers.find(b => b.id === selectedId);
    if (!broker) { setSelectedId(null); return null; }
    return <BrokerDetail broker={broker} onBack={() => setSelectedId(null)} onUpdate={(patch) => update(selectedId, patch)} onRemove={() => { remove(selectedId); setSelectedId(null); }}/>;
  }

  const filtered = brokers.filter(b => {
    if (tierFilter !== "all" && b.tier !== tierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.name.toLowerCase().includes(q) && !b.firm.toLowerCase().includes(q) && !b.email.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = {
    total: brokers.length,
    active30: brokers.filter(b => b.referrals30 > 0).length,
    referrals30: brokers.reduce((s, b) => s + b.referrals30, 0),
    subscribed: brokers.filter(b => b.subscribed).length,
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map(b => b.id)));
  };

  return (
    <div className="dash-grid">
      <section className="panel brokers-banner">
        <div className="row items-center gap-3">
          <div className="brokers-banner-icon"><Icon name="users" size={20}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>Broker panel</h2>
            <p className="panel-sub">The brokers who refer clients to Fast-ILA. Track volume, manage relationships, send periodic mailings to grow the panel.</p>
          </div>
        </div>
        <div className="lenders-banner-stats">
          <div><strong>{stats.total}</strong><span>Brokers</span></div>
          <div><strong>{stats.active30}</strong><span>Active (30d)</span></div>
          <div><strong>{stats.referrals30}</strong><span>Referrals (30d)</span></div>
          <div><strong>{stats.subscribed}</strong><span>Mailing list</span></div>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div className="row items-center gap-3 flex-1">
            <h2 className="panel-title">All brokers</h2>
            <span className="pill pill-muted">{filtered.length} of {brokers.length}</span>
            {selectedIds.size > 0 && <span className="pill pill-info">{selectedIds.size} selected</span>}
          </div>
          <div className="panel-actions">
            {selectedIds.size > 0 && (
              <button className="btn btn-navy" onClick={() => setComposerOpen(true)}>
                <Icon name="send" size={14}/> Send to {selectedIds.size}
              </button>
            )}
            <button className="btn btn-navy" onClick={() => setComposerOpen(true)}>
              <Icon name="mail" size={14}/> New mailing
            </button>
            <button className="btn btn-navy" onClick={add}>
              <Icon name="plus" size={14}/> Add broker
            </button>
            <button className="btn btn-ghost"><Icon name="download" size={14}/> Export CSV</button>
          </div>
        </header>

        <div className="filter-bar">
          <div className="filter-search">
            <Icon name="search" size={15}/>
            <input className="filter-search-input" placeholder="Search by name, firm or email…" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <div className="lenders-filter-chips">
            {[
              { id: "all", label: "All tiers" },
              { id: "platinum", label: "Platinum" },
              { id: "gold", label: "Gold" },
              { id: "silver", label: "Silver" },
              { id: "bronze", label: "Bronze" },
            ].map(t => (
              <button key={t.id} className={`video-chip ${tierFilter === t.id ? "is-active" : ""}`} onClick={() => setTierFilter(t.id)}>{t.label}</button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th style={{ width: 32 }}>
                  <input type="checkbox" checked={selectedIds.size > 0 && selectedIds.size === filtered.length} onChange={toggleAll}/>
                </th>
                <th>Broker</th>
                <th>Firm</th>
                <th>Tier</th>
                <th>Referrals · 30d</th>
                <th>Referrals · all time</th>
                <th>Last referral</th>
                <th>Mailing list</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const tier = TIER_COLORS[b.tier];
                return (
                  <tr key={b.id} className="dash-row dash-row-clickable" onClick={() => setSelectedId(b.id)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(b.id)} onChange={() => toggleSelect(b.id)}/>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <div className="cell-strong cell-link">{b.name || <em>Unnamed</em>}</div>
                        <div className="cell-sub">{b.email}</div>
                      </div>
                    </td>
                    <td>{b.firm}</td>
                    <td><span className={`pill ${tier.cls}`}>{tier.label}</span></td>
                    <td className="cell-mono">{b.referrals30}</td>
                    <td className="cell-mono">{b.referralsTotal}</td>
                    <td className="cell-mono cell-sub">{b.lastReferral}</td>
                    <td>{b.subscribed
                      ? <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Subscribed</span>
                      : <span className="pill pill-muted">Unsubscribed</span>}</td>
                    <td>
                      <button className="cell-action" onClick={(e) => { e.stopPropagation(); setSelectedId(b.id); }}>
                        <Icon name="chevron-right" size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title"><Icon name="mail" size={15}/> Recent mailings</h2>
          <button className="btn btn-navy btn-sm" onClick={() => setComposerOpen(true)}>
            <Icon name="plus" size={12}/> New mailing
          </button>
        </header>
        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Sent</th>
                <th>Recipients</th>
                <th>Opened</th>
                <th>Clicked</th>
                <th>Channel</th>
              </tr>
            </thead>
            <tbody>
              {MAILING_HISTORY.map(m => (
                <tr key={m.id} className="dash-row">
                  <td><div className="cell-strong">{m.subject}</div></td>
                  <td className="cell-mono cell-sub">{m.sentAt}</td>
                  <td className="cell-mono">{m.recipients}</td>
                  <td className="cell-mono">{m.opened} <span className="cell-sub">({Math.round(m.opened / m.recipients * 100)}%)</span></td>
                  <td className="cell-mono">{m.clicked} <span className="cell-sub">({Math.round(m.clicked / m.recipients * 100)}%)</span></td>
                  <td><span className="pill pill-muted">{m.channel}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {composerOpen && (
        <MailingComposer
          brokers={brokers}
          preselected={selectedIds}
          onClose={() => { setComposerOpen(false); setSelectedIds(new Set()); }}
        />
      )}
    </div>
  );
};

// ============================================================================
// Broker detail page
// ============================================================================
const BrokerDetail = ({ broker, onBack, onUpdate, onRemove }) => {
  const tier = TIER_COLORS[broker.tier];

  return (
    <div className="dash-grid">
      <div className="dash-grid-row">
        <button className="dash-breadcrumb" onClick={onBack}>
          <Icon name="arrow-left" size={14}/> Back to brokers
        </button>
      </div>

      <div className="lender-head">
        <div>
          <div className="row items-center gap-3" style={{ marginBottom: 6 }}>
            <span className={`pill ${tier.cls}`}>{tier.label}</span>
            <span className="pill pill-muted">{broker.referralsTotal} referrals all time</span>
            {broker.subscribed
              ? <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Mailing list</span>
              : <span className="pill pill-muted">Unsubscribed</span>}
          </div>
          <h1 className="display lender-title">
            <InlineText value={broker.name} onChange={(v) => onUpdate({ name: v })} placeholder="Broker name" fontSize="28px"/>
          </h1>
          <div className="detail-meta">
            <span>Added {broker.addedAt}</span>
            <span className="dot-sep">·</span>
            <span><Icon name="edit" size={11}/> Click any field to edit</span>
          </div>
        </div>
        <div className="detail-head-actions">
          <button className="btn btn-navy"><Icon name="mail" size={13}/> Send mailing</button>
          <button className="btn btn-danger-outline" onClick={() => { if (confirm("Remove this broker?")) onRemove(); }}>
            <Icon name="trash" size={13}/> Remove
          </button>
        </div>
      </div>

      <div className="lender-detail-grid">
        <div className="lender-detail-main">
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Broker details</h2>
            </header>
            <div className="lender-block">
              <label className="lender-field-label">Firm</label>
              <div className="lender-field-value lender-field-text">
                <InlineText value={broker.firm} onChange={(v) => onUpdate({ firm: v })} placeholder="Firm name"/>
              </div>

              <label className="lender-field-label">Tier</label>
              <div className="lender-field-value">
                <InlineSelect
                  value={broker.tier}
                  options={[
                    { value: "platinum", label: "Platinum" },
                    { value: "gold", label: "Gold" },
                    { value: "silver", label: "Silver" },
                    { value: "bronze", label: "Bronze" },
                  ]}
                  onChange={(v) => onUpdate({ tier: v })}
                  renderValue={(v) => {
                    const x = TIER_COLORS[v];
                    return <span className={`pill ${x.cls}`}>{x.label}</span>;
                  }}
                />
              </div>

              <label className="lender-field-label">Notes</label>
              <div className="lender-field-value lender-field-text">
                <InlineText value={broker.notes} onChange={(v) => onUpdate({ notes: v })} placeholder="Anything to remember about this broker…" multiline/>
              </div>

              <label className="lender-field-label">Mailing list</label>
              <div className="lender-field-value">
                <label className="row items-center gap-2" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={broker.subscribed} onChange={(e) => onUpdate({ subscribed: e.target.checked })}/>
                  <span>{broker.subscribed ? "Subscribed to periodic mailings" : "Unsubscribed — we won't email them"}</span>
                </label>
              </div>
            </div>
          </section>

          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="package" size={15}/> Recent referrals</h2>
              <span className="pill pill-muted">{broker.referrals30} in last 30 days</span>
            </header>
            <div className="lender-empty" style={{ padding: "16px 20px" }}>
              <Icon name="info" size={13}/> Referrals will appear here as bookings are tagged to this broker.
            </div>
          </section>
        </div>

        <aside className="lender-detail-aside">
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Contact</h2>
            </header>
            <div className="aside-body">
              <div className="aside-row aside-row-stack">
                <span className="aside-label">Email</span>
                <InlineText value={broker.email} onChange={(v) => onUpdate({ email: v })} placeholder="email@…" mono/>
              </div>
              <div className="aside-row aside-row-stack">
                <span className="aside-label">Phone</span>
                <InlineText value={broker.phone} onChange={(v) => onUpdate({ phone: v })} placeholder="07000 000000" mono/>
              </div>
            </div>
          </section>

          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Referral stats</h2>
            </header>
            <div className="aside-body">
              <div className="aside-row"><span className="aside-label">Last 30 days</span><strong className="cell-strong">{broker.referrals30}</strong></div>
              <div className="aside-row"><span className="aside-label">All time</span><strong className="cell-strong">{broker.referralsTotal}</strong></div>
              <div className="aside-row"><span className="aside-label">Last referral</span><span>{broker.lastReferral}</span></div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

// ============================================================================
// MailingComposer — broker mailings · email-only (via N8N → Postmark/SendGrid)
// ============================================================================
const MAILING_TEMPLATES = [
  { id: "blank", label: "Blank email", subject: "", body: "" },
  { id: "intro", label: "Intro / re-engage", subject: "Quick update from Fast-ILA — here's what's new",
    body: "Hi {name},\n\nA quick update from the team at Fast-ILA. We've just added [new feature / new lender / faster turnaround] which we thought might be useful for your clients.\n\nIf any of your clients need ILA, we're booking same-day urgent slots from £175 inclusive.\n\nBest,\nNexa Law" },
  { id: "thanks", label: "Thank you for referrals", subject: "Thank you — looking forward to working with you again",
    body: "Hi {name},\n\nThanks for the {referrals30} referrals you've sent us recently. We really appreciate it.\n\nIf you ever need anything — a same-day slot, a quick chat about a deal, or a status update on one of your clients — just reply to this email.\n\nBest,\nNexa Law" },
  { id: "new-lender", label: "New lender added", subject: "We've added a new lender to our panel",
    body: "Hi {name},\n\nWe've just added [LENDER NAME] to our panel. If any of your clients are using them, we can now give ILA on their template directly.\n\nLet us know if you've got a deal in the pipeline.\n\nBest,\nNexa Law" },
];

const MailingComposer = ({ brokers, preselected, onClose }) => {
  const [step, setStep] = React.useState("audience"); // audience | compose | sent
  const [audience, setAudience] = React.useState(
    preselected.size > 0 ? "selected" : "all-subscribed"
  );
  const [tierFilter, setTierFilter] = React.useState(["platinum", "gold", "silver", "bronze"]);
  const [templateId, setTemplateId] = React.useState("intro");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  React.useEffect(() => {
    const tpl = MAILING_TEMPLATES.find(t => t.id === templateId);
    if (tpl) {
      setSubject(tpl.subject);
      setBody(tpl.body);
    }
  }, [templateId]);

  let recipients = brokers;
  if (audience === "selected") recipients = brokers.filter(b => preselected.has(b.id));
  if (audience === "all-subscribed") recipients = brokers.filter(b => b.subscribed);
  if (audience === "by-tier") recipients = brokers.filter(b => b.subscribed && tierFilter.includes(b.tier));

  const toggleTier = (t) => {
    setTierFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const send = () => {
    setStep("sent");
    setTimeout(() => onClose(), 2400);
  };

  return (
    <div className="docpicker-overlay" onClick={onClose}>
      <div className="docpicker mailing-composer" onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <h3>
            {step === "audience" && "Step 1 · Who are we sending to?"}
            {step === "compose" && `Step 2 · Compose · ${recipients.length} recipients`}
            {step === "sent" && "Sending…"}
          </h3>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>

        {step === "audience" && (
          <div className="docpicker-body">
            <button className={`mailing-aud ${audience === "all-subscribed" ? "is-active" : ""}`} onClick={() => setAudience("all-subscribed")}>
              <Icon name="users" size={16}/>
              <div>
                <div className="docpicker-item-name">Everyone on the mailing list</div>
                <div className="docpicker-item-meta">{brokers.filter(b => b.subscribed).length} subscribed brokers</div>
              </div>
            </button>
            <button className={`mailing-aud ${audience === "by-tier" ? "is-active" : ""}`} onClick={() => setAudience("by-tier")}>
              <Icon name="award" size={16}/>
              <div>
                <div className="docpicker-item-name">By tier</div>
                <div className="docpicker-item-meta">Pick which tiers to include</div>
              </div>
            </button>
            {preselected.size > 0 && (
              <button className={`mailing-aud ${audience === "selected" ? "is-active" : ""}`} onClick={() => setAudience("selected")}>
                <Icon name="check" size={16}/>
                <div>
                  <div className="docpicker-item-name">Selected brokers</div>
                  <div className="docpicker-item-meta">{preselected.size} you ticked on the list</div>
                </div>
              </button>
            )}

            {audience === "by-tier" && (
              <div className="mailing-tiers">
                {["platinum", "gold", "silver", "bronze"].map(t => (
                  <label key={t} className={`mailing-tier ${tierFilter.includes(t) ? "is-active" : ""}`}>
                    <input type="checkbox" checked={tierFilter.includes(t)} onChange={() => toggleTier(t)}/>
                    <span>{TIER_COLORS[t].label}</span>
                    <span className="cell-sub">{brokers.filter(b => b.tier === t && b.subscribed).length}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="docpicker-section">
              <div className="docpicker-section-label">How it's sent</div>
              <div className="mailing-channel-info">
                <Icon name="mail" size={14}/>
                <div>
                  <div><strong>Email only</strong> — via N8N → Postmark (configured in Integrations).</div>
                  <div className="cell-sub">Brokers are never sent SMS. Unsubscribe links in every email update the database automatically.</div>
                </div>
              </div>
            </div>

            <div className="row justify-between items-center" style={{ marginTop: 8 }}>
              <span className="cell-sub">{recipients.length} recipients selected</span>
              <button className="btn btn-navy" onClick={() => setStep("compose")} disabled={recipients.length === 0}>
                Next: compose <Icon name="arrow-right" size={13}/>
              </button>
            </div>
          </div>
        )}

        {step === "compose" && (
          <div className="docpicker-body">
            <div className="docpicker-section">
              <div className="docpicker-section-label">Start from a template</div>
              <select className="field-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                {MAILING_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Subject</label>
              <input className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line"/>
            </div>
            <div>
              <label className="field-label">Message</label>
              <textarea className="field-textarea" rows={9} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Hi {name},…"/>
              <div className="cell-sub" style={{ marginTop: 4 }}>
                Use <code>{"{name}"}</code>, <code>{"{firm}"}</code>, <code>{"{referrals30}"}</code> as merge fields — N8N fills them per broker.
              </div>
            </div>
            <div className="row justify-between">
              <button className="btn btn-ghost" onClick={() => setStep("audience")}><Icon name="arrow-left" size={13}/> Audience</button>
              <button className="btn btn-lime" onClick={send} disabled={!subject.trim() || !body.trim()}>
                <Icon name="send" size={13}/> Send to {recipients.length}
              </button>
            </div>
          </div>
        )}

        {step === "sent" && (
          <div className="docpicker-body" style={{ textAlign: "center", padding: "36px 20px" }}>
            <div className="bk-confirm-mark" style={{ margin: "0 auto 16px" }}>
              <Icon name="check" size={32} stroke={3}/>
            </div>
            <h2 className="display" style={{ marginBottom: 8 }}>Mailing queued</h2>
            <p style={{ color: "var(--ink-muted)" }}>
              Sent to <strong>{recipients.length} broker{recipients.length === 1 ? "" : "s"}</strong> via N8N.
              You'll see open and click stats here within a few hours.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

Object.assign(window, { BrokersView });

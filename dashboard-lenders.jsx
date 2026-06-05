/* global React, Icon, Avatar, StatusPill, SERVICES, LAWYERS, BOOKINGS */

// ============================================================================
// Lenders knowledge base — admin-edited, shared across all lawyers
// ADMIN: every field is inline-editable (list AND detail) — autosaves
// LAWYER: read-only with "Flag a change" button to suggest edits
// ============================================================================

// No seeded lenders — admin adds their own knowledge base via "Add lender".
const LENDERS = [];

const SIG_OPTIONS = [
  { value: "digital", label: "Digital accepted" },
  { value: "wet", label: "Wet signature only" },
  { value: "both", label: "Both — case-by-case" },
];

const sigBadge = (sig) => {
  if (sig === "digital") return { cls: "pill-success", label: "Digital accepted" };
  if (sig === "wet") return { cls: "pill-warning", label: "Wet signature only" };
  if (sig === "both") return { cls: "pill-info", label: "Both — case-by-case" };
  return { cls: "pill-muted", label: "Unknown" };
};

// ============================================================================
// Inline edit primitives — autosave on blur/enter, no edit mode toggle
// ============================================================================
const InlineText = ({ value, onChange, placeholder, multiline, mono, fontSize, readOnly }) => {
  const [editing, setEditing] = React.useState(false);
  const [v, setV] = React.useState(value || "");
  const inputRef = React.useRef(null);

  React.useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select?.(); } }, [editing]);
  React.useEffect(() => { setV(value || ""); }, [value]);

  if (readOnly) {
    return <span className={`inline-readonly ${mono ? "mono" : ""}`}>{value || <span className="inline-empty">—</span>}</span>;
  }

  if (editing) {
    const commit = () => { onChange(v); setEditing(false); };
    const cancel = () => { setV(value || ""); setEditing(false); };
    const Input = multiline ? "textarea" : "input";
    return (
      <Input
        ref={inputRef}
        className={`inline-input ${mono ? "mono" : ""}`}
        style={fontSize ? { fontSize } : undefined}
        rows={multiline ? 3 : undefined}
        value={v}
        placeholder={placeholder}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
          if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
      />
    );
  }

  return (
    <button className={`inline-display ${mono ? "mono" : ""}`} onClick={() => setEditing(true)} style={fontSize ? { fontSize } : undefined}>
      {value
        ? (multiline ? <span className="inline-multiline">{value}</span> : value)
        : <span className="inline-empty">{placeholder || "+ Add"}</span>}
      <Icon name="edit" size={11} className="inline-edit-icon"/>
    </button>
  );
};

const InlineSelect = ({ value, options, onChange, readOnly, renderValue }) => {
  if (readOnly) return renderValue ? renderValue(value) : <span>{value}</span>;
  const [open, setOpen] = React.useState(false);
  if (open) {
    return (
      <select
        autoFocus
        className="inline-input"
        defaultValue={value}
        onChange={(e) => { onChange(e.target.value); setOpen(false); }}
        onBlur={() => setOpen(false)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <button className="inline-display" onClick={() => setOpen(true)}>
      {renderValue ? renderValue(value) : <span>{value}</span>}
      <Icon name="edit" size={11} className="inline-edit-icon"/>
    </button>
  );
};

// ============================================================================
// LendersView — full list
// ============================================================================
const LendersView = ({ role = "admin" }) => {
  const isAdmin = role === "admin";
  const [filter, setFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [lenders, setLenders] = React.useState(LENDERS);
  const [selectedId, setSelectedId] = React.useState(null);
  const [flash, setFlash] = React.useState(null); // { lenderId, field }

  const updateLender = (id, patch) => {
    setLenders(prev => prev.map(l => l.id === id
      ? { ...l, ...patch, updatedAt: "today", updatedBy: "you" }
      : l));
    setFlash({ lenderId: id });
    setTimeout(() => setFlash(null), 1200);
  };

  if (selectedId) {
    const lender = lenders.find(l => l.id === selectedId);
    return <LenderDetail lender={lender} role={role} onBack={() => setSelectedId(null)} onUpdate={(patch) => updateLender(selectedId, patch)}/>;
  }

  const filtered = lenders.filter(l => {
    if (filter !== "all" && l.sig !== filter) return false;
    if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    digital: lenders.filter(l => l.sig === "digital").length,
    wet: lenders.filter(l => l.sig === "wet").length,
    both: lenders.filter(l => l.sig === "both").length,
  };

  const addLender = () => {
    const id = `new-${Date.now()}`;
    const lender = { id, name: "New lender", sig: "digital", forms: 0, notes: "", updatedBy: "you", updatedAt: "today", matters: 0, certEmail: "", phone: "", postalAddress: "", typicalMatters: [], sla: "", quirks: "", templates: [] };
    setLenders(prev => [lender, ...prev]);
    setSelectedId(id);
  };

  return (
    <div className="dash-grid">
      <section className="panel lenders-banner">
        <div className="row items-center gap-3">
          <div className="lenders-banner-icon"><Icon name="award" size={20}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>Lender knowledge base</h2>
            <p className="panel-sub">{isAdmin
              ? "Every cell below is editable — click signature, notes, or any field on the detail page. Changes save instantly and sync to every lawyer."
              : "Quick reference of every lender's signature preference. Click any lender for full details. Updated by Karim — flag anything that's changed."}</p>
          </div>
        </div>
        <div className="lenders-banner-stats">
          <div><strong>{counts.digital}</strong><span>Digital</span></div>
          <div><strong>{counts.wet}</strong><span>Wet only</span></div>
          <div><strong>{counts.both}</strong><span>Both</span></div>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <div className="row items-center gap-3 flex-1">
            <h2 className="panel-title">All lenders</h2>
            <span className="pill pill-muted">{filtered.length} of {lenders.length}</span>
            {isAdmin && <span className="pill pill-info"><Icon name="edit" size={11}/> Inline edit</span>}
          </div>
          <div className="panel-actions">
            {isAdmin && <button className="btn btn-navy" onClick={addLender}><Icon name="plus" size={14}/> Add lender</button>}
            <button className="btn btn-ghost" onClick={() => {
              FastILA.util.exportCsv("lenders.csv", lenders, [
                { label: "Name", value: "name" },
                { label: "Category", value: "category" },
                { label: "Accepts digital", value: (l) => l.accepts_digital ? "Yes" : "No" },
                { label: "Requires wet", value: (l) => l.requires_wet ? "Yes" : "No" },
                { label: "Notes", value: "notes" },
              ]);
              fiToast("Exported lenders.csv");
            }}><Icon name="download" size={14}/> Export</button>
          </div>
        </header>

        <div className="filter-bar">
          <div className="filter-search">
            <Icon name="search" size={15}/>
            <input className="filter-search-input" placeholder="Search lender…" value={search} onChange={(e) => setSearch(e.target.value)}/>
          </div>
          <div className="lenders-filter-chips">
            {[
              { id: "all", label: "All" },
              { id: "digital", label: "Digital accepted" },
              { id: "wet", label: "Wet only" },
              { id: "both", label: "Both" },
            ].map(t => (
              <button
                key={t.id}
                className={`video-chip ${filter === t.id ? "is-active" : ""}`}
                onClick={() => setFilter(t.id)}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div className="table-wrap">
          <table className="dash-table lenders-table">
            <thead>
              <tr>
                <th>Lender</th>
                <th>Signature</th>
                <th>Notes</th>
                <th>Templates</th>
                <th>Matters</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const b = sigBadge(l.sig);
                const isFlashed = flash?.lenderId === l.id;
                return (
                  <tr key={l.id} className={`dash-row ${isFlashed ? "row-flash" : ""}`}>
                    <td>
                      <button className="cell-strong cell-link lender-name-btn" onClick={() => setSelectedId(l.id)}>
                        {l.name}
                      </button>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <InlineSelect
                        value={l.sig}
                        options={SIG_OPTIONS}
                        onChange={(v) => updateLender(l.id, { sig: v })}
                        readOnly={!isAdmin}
                        renderValue={(v) => {
                          const x = sigBadge(v);
                          return <span className={`pill ${x.cls}`}>{x.label}</span>;
                        }}
                      />
                    </td>
                    <td className="cell-sub" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
                      <InlineText
                        value={l.notes}
                        onChange={(v) => updateLender(l.id, { notes: v })}
                        placeholder="Add a note…"
                        multiline
                        readOnly={!isAdmin}
                      />
                    </td>
                    <td><span className="pill pill-muted">{l.templates?.length || l.forms} on file</span></td>
                    <td className="cell-mono">{l.matters}</td>
                    <td className="cell-sub cell-mono">{l.updatedAt} · {l.updatedBy}</td>
                    <td>
                      <button className="cell-action" onClick={() => setSelectedId(l.id)} title="Open lender">
                        <Icon name="chevron-right" size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="lenders-foot">
          <Icon name="info" size={13}/>
          <span>
            {isAdmin
              ? <>Changes you save here are <strong>shared instantly</strong> with every lawyer — they'll see the new preference next time they open a matter for this lender. Every edit is audit-logged with your name and timestamp.</>
              : <>Lawyers can flag changes; only admin can edit the data.</>}
          </span>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// Lender detail page — every field is inline-editable for admin
// ============================================================================
const LenderDetail = ({ lender, role, onBack, onUpdate }) => {
  const isAdmin = role === "admin";
  const [savedFlash, setSavedFlash] = React.useState(false);
  const b = sigBadge(lender.sig);

  const relatedMatters = BOOKINGS.filter(b => (b.lender || "").toLowerCase() === lender.name.toLowerCase());

  const save = (patch) => {
    onUpdate(patch);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  return (
    <div className="dash-grid">
      <div className="dash-grid-row">
        <button className="dash-breadcrumb" onClick={onBack}>
          <Icon name="arrow-left" size={14}/> Back to lenders
        </button>
      </div>

      <div className="lender-head">
        <div>
          <div className="row items-center gap-3" style={{ marginBottom: 6 }}>
            <span className={`pill ${b.cls}`}>{b.label}</span>
            <span className="pill pill-muted">{lender.matters} matters · all time</span>
            {savedFlash && <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Saved</span>}
          </div>
          <h1 className="display lender-title">
            <InlineText
              value={lender.name}
              onChange={(v) => save({ name: v })}
              placeholder="Lender name"
              readOnly={!isAdmin}
              fontSize="28px"
            />
          </h1>
          <div className="detail-meta">
            <span>Last updated {lender.updatedAt}</span>
            <span className="dot-sep">·</span>
            <span>by {lender.updatedBy}</span>
            {isAdmin && (
              <>
                <span className="dot-sep">·</span>
                <span className="cell-link"><Icon name="edit" size={11}/> Click any field below to edit</span>
              </>
            )}
          </div>
        </div>
        <div className="detail-head-actions">
          {isAdmin
            ? <button className="btn btn-danger-outline" onClick={() => { if (confirm("Remove this lender?")) onBack(); }}>
                <Icon name="trash" size={13}/> Delete
              </button>
            : <button className="btn btn-ghost" onClick={() => {
                const note = prompt("What needs to change about this lender? (sent to admin)");
                if (note && note.trim()) {
                  if (typeof window.fiNotify === "function") {
                    window.fiNotify(`Lender flag · ${lender.name}`, note.trim(), null, "warn");
                  }
                  if (typeof window.fiToast === "function") window.fiToast("Flagged for admin review");
                }
              }}><Icon name="info" size={14}/> Flag a change</button>}
        </div>
      </div>

      <div className="lender-detail-grid">
        <div className="lender-detail-main">
          {/* Signature preference */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="edit" size={15}/> Signature preference</h2>
              {isAdmin
                ? <span className="cell-sub"><Icon name="info" size={11}/> Editable inline</span>
                : <span className="cell-sub">Admin-controlled</span>}
            </header>
            <div className="lender-block">
              <label className="lender-field-label">Signature mode</label>
              <div className="lender-field-value">
                <InlineSelect
                  value={lender.sig}
                  options={SIG_OPTIONS}
                  onChange={(v) => save({ sig: v })}
                  readOnly={!isAdmin}
                  renderValue={(v) => {
                    const x = sigBadge(v);
                    return <span className={`pill ${x.cls}`}>{x.label}</span>;
                  }}
                />
              </div>

              <label className="lender-field-label">Notes (visible to all lawyers)</label>
              <div className="lender-field-value lender-field-text">
                <InlineText
                  value={lender.notes}
                  onChange={(v) => save({ notes: v })}
                  placeholder="Add notes that every lawyer should see…"
                  multiline
                  readOnly={!isAdmin}
                />
              </div>

              <label className="lender-field-label">SLA &amp; delivery</label>
              <div className="lender-field-value lender-field-text">
                <InlineText
                  value={lender.sla}
                  onChange={(v) => save({ sla: v })}
                  placeholder="e.g. 24h email, Special Delivery 1pm…"
                  readOnly={!isAdmin}
                />
              </div>

              <label className="lender-field-label">Quirks &amp; gotchas</label>
              <div className="lender-field-value lender-field-text">
                <InlineText
                  value={lender.quirks}
                  onChange={(v) => save({ quirks: v })}
                  placeholder="Anything lawyers should watch out for on this lender…"
                  multiline
                  readOnly={!isAdmin}
                />
              </div>
            </div>
          </section>

          {/* Templates */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="package" size={15}/> Templates on file</h2>
              {isAdmin && <button className="btn btn-navy btn-sm"><Icon name="plus" size={13}/> Add template</button>}
            </header>
            <div className="lender-tpl-list">
              {lender.templates && lender.templates.length > 0 ? lender.templates.map((t, i) => (
                <div key={i} className="lender-tpl-row">
                  <div className="lender-tpl-icon"><Icon name="doc" size={14}/></div>
                  <div className="lender-tpl-info">
                    <div className="lender-tpl-name">{t.name}</div>
                    <div className="lender-tpl-meta"><span className="mono">{t.version}</span> · {t.size} · updated {t.updatedAt}</div>
                  </div>
                  <div className="row gap-2">
                    <button className="btn btn-ghost btn-sm"><Icon name="external" size={12}/> Preview</button>
                    <button className="btn btn-ghost btn-sm"><Icon name="download" size={12}/> Download</button>
                    {isAdmin && <button className="btn btn-ghost btn-sm"><Icon name="edit" size={12}/> Replace</button>}
                    {isAdmin && <button className="btn btn-ghost btn-sm"><Icon name="trash" size={12}/></button>}
                  </div>
                </div>
              )) : (
                <div className="lender-empty">No templates on file yet.</div>
              )}
            </div>
          </section>

          {/* Recent matters */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="users" size={15}/> Recent matters with this lender</h2>
              <span className="pill pill-muted">{relatedMatters.length} matter{relatedMatters.length === 1 ? "" : "s"}</span>
            </header>
            {relatedMatters.length === 0 ? (
              <div className="lender-empty" style={{ padding: "20px" }}>No matters with this lender yet.</div>
            ) : (
              <div className="table-wrap">
                <table className="dash-table">
                  <thead>
                    <tr><th>Client</th><th>Service</th><th>Lawyer</th><th>Date</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {relatedMatters.map(m => {
                      const svc = SERVICES.find(s => s.id === m.serviceId);
                      const lawyer = LAWYERS.find(l => l.id === m.lawyerId);
                      return (
                        <tr key={m.ref}>
                          <td><div className="cell-strong">{m.clientName}</div></td>
                          <td><span className="pill pill-cream">{svc?.short}</span></td>
                          <td>
                            <div className="row items-center gap-2">
                              <Avatar lawyer={lawyer} size={22}/>
                              <span>{lawyer.name.split(" ")[0]}</span>
                            </div>
                          </td>
                          <td className="cell-mono">{m.date}</td>
                          <td><StatusPill status={m.status}/></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="lender-detail-aside">
          {/* Contact details */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Lender contact</h2>
              {isAdmin && <span className="cell-sub"><Icon name="info" size={11}/> Click to edit</span>}
            </header>
            <div className="aside-body">
              <div className="aside-row aside-row-stack">
                <span className="aside-label">Cert delivery email</span>
                <InlineText
                  value={lender.certEmail}
                  onChange={(v) => save({ certEmail: v })}
                  placeholder="email@lender.co.uk"
                  mono
                  readOnly={!isAdmin}
                />
              </div>
              <div className="aside-row aside-row-stack">
                <span className="aside-label">Phone</span>
                <InlineText
                  value={lender.phone}
                  onChange={(v) => save({ phone: v })}
                  placeholder="020 0000 0000"
                  mono
                  readOnly={!isAdmin}
                />
              </div>
              <div className="aside-row aside-row-stack">
                <span className="aside-label">Postal address</span>
                <InlineText
                  value={lender.postalAddress}
                  onChange={(v) => save({ postalAddress: v })}
                  placeholder="Full address…"
                  multiline
                  readOnly={!isAdmin}
                />
              </div>
            </div>
          </section>

          {/* Typical matters */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Typical matter types</h2>
            </header>
            <div className="aside-body">
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {(lender.typicalMatters || []).map(m => (
                  <span key={m} className="pill pill-cream pill-removable">
                    {m}
                    {isAdmin && (
                      <button
                        className="pill-x"
                        onClick={() => save({ typicalMatters: lender.typicalMatters.filter(x => x !== m) })}
                        aria-label="Remove"
                      ><Icon name="x" size={10}/></button>
                    )}
                  </span>
                ))}
                {isAdmin && <AddMatterTypeButton onAdd={(m) => save({ typicalMatters: [...(lender.typicalMatters || []), m] })} existing={lender.typicalMatters || []}/>}
              </div>
            </div>
          </section>

          {/* Change history */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Change history</h2>
            </header>
            <div className="audit-list">
              <div className="audit-row">
                <span className="audit-time mono">{lender.updatedAt}</span>
                <span>Last edit · <span className="audit-actor">{lender.updatedBy}</span></span>
              </div>
              <div className="audit-row">
                <span className="audit-time mono">12 Jan 2026</span>
                <span>Template uploaded · <span className="audit-actor">Karim Osman</span></span>
              </div>
              <div className="audit-row">
                <span className="audit-time mono">8 Nov 2025</span>
                <span>Lender added · <span className="audit-actor">Karim Osman</span></span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

const MATTER_TYPE_OPTIONS = ["Personal Guarantee", "Occupier's Consent", "JBSP", "Bridging Loan", "Transfer of Equity", "Deed of Subordination", "Gifted Deposit", "Statutory Declaration"];

const AddMatterTypeButton = ({ onAdd, existing }) => {
  const [open, setOpen] = React.useState(false);
  const available = MATTER_TYPE_OPTIONS.filter(o => !existing.includes(o));
  if (!open) {
    return (
      <button className="pill-add" onClick={() => setOpen(true)}>
        <Icon name="plus" size={11}/> Add
      </button>
    );
  }
  return (
    <select
      autoFocus
      className="pill-select"
      defaultValue=""
      onChange={(e) => { if (e.target.value) onAdd(e.target.value); setOpen(false); }}
      onBlur={() => setOpen(false)}
    >
      <option value="">Choose…</option>
      {available.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
};

Object.assign(window, { LendersView, InlineText, InlineSelect });

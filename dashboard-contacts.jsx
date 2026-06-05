/* global React, Icon, fiToast */

// ============================================================================
// ContactsView — the firm's mailing-list database. Two ways contacts get in:
//   1. CSV import (existing clients the firm already has on file)
//   2. Auto-added from every new booking (the booker + co-signatory)
//
// Once in, contacts can be opted-out, tagged, manually added/edited, and used
// in the Broadcasts view audience picker.
// ============================================================================

const ContactsView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const contacts = FastILA.contacts.list();
  const allTags = Array.from(new Set(contacts.flatMap(c => c.tags || []))).sort();

  const [search, setSearch] = React.useState("");
  const [tagFilter, setTagFilter] = React.useState("");
  const [sourceFilter, setSourceFilter] = React.useState("all");
  const [optInFilter, setOptInFilter] = React.useState("all");
  const [importOpen, setImportOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(null);

  const filtered = contacts.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!(c.fullName || "").toLowerCase().includes(q)
        && !(c.email || "").toLowerCase().includes(q)
        && !(c.phone || "").toLowerCase().includes(q)
        && !(c.tags || []).some(t => t.toLowerCase().includes(q))
      ) return false;
    }
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;
    if (sourceFilter !== "all" && (c.source || "") !== sourceFilter) return false;
    if (optInFilter === "in" && c.optIn === false) return false;
    if (optInFilter === "out" && c.optIn !== false) return false;
    return true;
  });

  // KPIs
  const totalContacts = contacts.length;
  const optedIn = contacts.filter(c => c.optIn !== false).length;
  const fromBookings = contacts.filter(c => (c.source || "").startsWith("booking")).length;
  const imported = contacts.filter(c => c.source === "imported").length;

  const exportCsv = () => {
    const header = "name,email,phone,source,tags,optIn,bookings\n";
    const rows = contacts.map(c => [
      JSON.stringify(c.fullName || ""),
      JSON.stringify(c.email || ""),
      JSON.stringify(c.phone || ""),
      JSON.stringify(c.source || ""),
      JSON.stringify((c.tags || []).join(";")),
      c.optIn === false ? "false" : "true",
      JSON.stringify((c.bookingRefs || []).join(";")),
    ].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `fastila-contacts-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    fiToast(`Exported ${contacts.length} contacts`);
  };

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 12px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: "#063952", fontSize: 28 }}>Contacts</h1>
          <p style={{ color: "#5b6b76", marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            The firm's mailing-list database. Every new booking automatically adds the client (and any co-signatory) here. You can also bulk-import an existing client list from CSV. Use these contacts in the Broadcasts view to send mailshots.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" onClick={exportCsv} disabled={contacts.length === 0}>
            <Icon name="download" size={13}/> Export CSV
          </button>
          <button className="btn btn-ghost" onClick={() => setImportOpen(true)}>
            <Icon name="package" size={13}/> Import CSV
          </button>
          <button className="btn btn-navy" onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={13}/> Add contact
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi label="Total contacts" value={totalContacts} icon="users" tone="navy"/>
        <Kpi label="Opted in" value={optedIn} icon="check" tone="success"/>
        <Kpi label="From bookings" value={fromBookings} icon="doc" tone="info"/>
        <Kpi label="Imported" value={imported} icon="package" tone="warn"/>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          className="field-input"
          placeholder="Search by name, email, phone, tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 220 }}
        />
        <select className="field-input" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All sources</option>
          <option value="booking">From bookings</option>
          <option value="booking-cosignatory">Co-signatories</option>
          <option value="imported">Imported (CSV)</option>
          <option value="manual">Added manually</option>
        </select>
        <select className="field-input" value={optInFilter} onChange={(e) => setOptInFilter(e.target.value)} style={{ width: 150 }}>
          <option value="all">All</option>
          <option value="in">Opted in</option>
          <option value="out">Opted out</option>
        </select>
        {allTags.length > 0 && (
          <select className="field-input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ width: 180 }}>
            <option value="">All tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <span style={{ fontSize: 12, color: "#5b6b76", marginLeft: "auto" }}>{filtered.length} of {contacts.length}</span>
      </div>

      {/* Table */}
      <section className="panel" style={{ padding: 0, overflow: "hidden" }}>
        {contacts.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#5b6b76" }}>
            <Icon name="users" size={32}/>
            <h3 style={{ marginTop: 12, color: "#063952" }}>No contacts yet</h3>
            <p style={{ fontSize: 13, maxWidth: 460, margin: "8px auto 16px" }}>
              Contacts are added automatically every time a new booking is created. To bring in your existing client database, use <strong>Import CSV</strong> above.
            </p>
            <button className="btn btn-navy" onClick={() => setImportOpen(true)}>
              <Icon name="package" size={13}/> Import your existing client database
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f5f7f9", borderBottom: "1px solid #e4e8ec" }}>
                  <Th>Name</Th>
                  <Th>Email</Th>
                  <Th>Phone</Th>
                  <Th>Source</Th>
                  <Th>Tags</Th>
                  <Th>Opt-in</Th>
                  <Th>Bookings</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #eef0f3" }}>
                    <Td><strong style={{ color: "#063952" }}>{c.fullName || "—"}</strong></Td>
                    <Td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{c.email || "—"}</span></Td>
                    <Td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{c.phone || "—"}</span></Td>
                    <Td>
                      <span className={`pill ${c.source === "imported" ? "pill-warning" : c.source === "manual" ? "pill-muted" : "pill-info"}`}>
                        {c.source || "unknown"}
                      </span>
                    </Td>
                    <Td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {(c.tags || []).slice(0, 4).map(t => <span key={t} className="pill pill-muted" style={{ fontSize: 10 }}>{t}</span>)}
                        {(c.tags || []).length > 4 && <span className="pill pill-muted" style={{ fontSize: 10 }}>+{(c.tags || []).length - 4}</span>}
                      </div>
                    </Td>
                    <Td>
                      <input
                        type="checkbox"
                        checked={c.optIn !== false}
                        onChange={(e) => { FastILA.contacts.setOptIn(c.id, e.target.checked); }}
                        title={c.optIn !== false ? "Opted in (click to opt out)" : "Opted out (click to opt in)"}
                      />
                    </Td>
                    <Td>
                      {(c.bookingRefs || []).length > 0
                        ? <span style={{ fontSize: 11, color: "#5b6b76" }}>{(c.bookingRefs || []).length}</span>
                        : <span style={{ fontSize: 11, color: "#cfd8de" }}>0</span>}
                    </Td>
                    <Td style={{ textAlign: "right" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c)}>
                        <Icon name="edit" size={11}/>
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        if (confirm(`Remove ${c.fullName || c.email}?`)) FastILA.contacts.remove(c.id);
                      }} style={{ color: "#9a1c1c" }}>
                        <Icon name="trash" size={11}/>
                      </button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)}/>
      <ContactEditorModal open={addOpen} onClose={() => setAddOpen(false)} contact={null}/>
      <ContactEditorModal open={!!editing} onClose={() => setEditing(null)} contact={editing}/>
    </div>
  );
};

const Th = ({ children }) => <th style={{ padding: "10px 12px", fontWeight: 700, color: "#5b6b76", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left" }}>{children}</th>;
const Td = ({ children, style }) => <td style={{ padding: "10px 12px", ...style }}>{children}</td>;

const Kpi = ({ icon, label, value, tone }) => {
  const colors = {
    navy:    { bg: "#063952", fg: "#e6f7c8" },
    success: { bg: "#e8f5e9", fg: "#1e5128" },
    info:    { bg: "#eaf5fb", fg: "#0a3a55" },
    warn:    { bg: "#fff7e6", fg: "#7a4f00" },
  }[tone];
  return (
    <div style={{ background: colors.bg, color: colors.fg, padding: 14, borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.85 }}>
        <Icon name={icon} size={12}/> {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
};

// ============================================================================
// CSV import modal
// ============================================================================
const ImportCsvModal = ({ open, onClose }) => {
  const [csvText, setCsvText] = React.useState("");
  const [tag, setTag] = React.useState("imported");
  const [defaultOptIn, setDefaultOptIn] = React.useState(true);
  const [preview, setPreview] = React.useState(null);
  const [imported, setImported] = React.useState(null);
  const fileRef = React.useRef(null);

  React.useEffect(() => { if (!open) { setCsvText(""); setPreview(null); setImported(null); } }, [open]);

  const parseCsv = (txt) => {
    // Simple CSV parse: handles quoted fields with commas/newlines
    const rows = [];
    let cur = []; let field = ""; let inQuotes = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (inQuotes) {
        if (ch === '"' && txt[i + 1] === '"') { field += '"'; i++; }
        else if (ch === '"') { inQuotes = false; }
        else { field += ch; }
      } else {
        if (ch === '"') { inQuotes = true; }
        else if (ch === ",") { cur.push(field); field = ""; }
        else if (ch === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
        else if (ch === "\r") { /* skip */ }
        else { field += ch; }
      }
    }
    if (field.length || cur.length) { cur.push(field); rows.push(cur); }
    if (rows.length === 0) return { headers: [], rows: [] };
    const headers = rows[0].map(h => h.trim().toLowerCase());
    const data = rows.slice(1).filter(r => r.some(c => c && c.trim())).map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = (r[i] || "").trim(); });
      return obj;
    });
    return { headers, rows: data };
  };

  const onPickFile = () => fileRef.current?.click();
  const onFileChosen = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setCsvText(String(r.result || "")); doParse(String(r.result || "")); };
    r.readAsText(f);
    e.target.value = "";
  };

  const doParse = (txt) => {
    const { headers, rows } = parseCsv(txt || csvText);
    // Smart column mapping
    const find = (cands) => headers.find(h => cands.some(c => h === c || h.includes(c))) || null;
    const colName  = find(["name", "fullname", "client name"]);
    const colEmail = find(["email", "e-mail"]);
    const colPhone = find(["phone", "mobile", "tel"]);
    const colTags  = find(["tags", "tag"]);
    const colOptIn = find(["opt in", "optin", "opt-in", "subscribed"]);
    const sample = rows.slice(0, 8).map(r => ({
      fullName: colName ? r[colName] : "",
      email: colEmail ? r[colEmail] : "",
      phone: colPhone ? r[colPhone] : "",
      tagsRaw: colTags ? r[colTags] : "",
      optInRaw: colOptIn ? r[colOptIn] : "",
    }));
    setPreview({ headers, rowCount: rows.length, columnMap: { colName, colEmail, colPhone, colTags, colOptIn }, sample, rows });
  };

  const doImport = () => {
    if (!preview) return;
    const { rows, columnMap, sample: _s } = preview;
    const baseTag = tag.trim();
    const made = rows.map(r => {
      const optInRaw = columnMap.colOptIn ? String(r[columnMap.colOptIn] || "").toLowerCase() : "";
      const optedOut = optInRaw === "false" || optInRaw === "no" || optInRaw === "0" || optInRaw === "out" || optInRaw === "unsubscribed";
      const tagsRaw = columnMap.colTags ? String(r[columnMap.colTags] || "") : "";
      const tags = [...(tagsRaw ? tagsRaw.split(/[;,|]/).map(t => t.trim()).filter(Boolean) : []), ...(baseTag ? [baseTag] : [])];
      return {
        fullName: columnMap.colName ? r[columnMap.colName] : null,
        email: columnMap.colEmail ? r[columnMap.colEmail] : null,
        phone: columnMap.colPhone ? r[columnMap.colPhone] : null,
        tags: Array.from(new Set(tags)),
        source: "imported",
        optIn: optedOut ? false : defaultOptIn,
      };
    }).filter(c => c.email || c.fullName);
    let added = 0, merged = 0;
    made.forEach(c => {
      const existing = c.email ? FastILA.contacts.findByEmail(c.email) : null;
      FastILA.contacts.upsert(c);
      if (existing) merged++; else added++;
    });
    setImported({ added, merged, total: made.length });
    fiToast(`Imported ${added} new, merged ${merged} existing`);
  };

  if (!open) return null;
  return (
    <div className="docpicker-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="docpicker" style={{ maxWidth: 720, width: "94%" }} onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <div>
            <h3 style={{ margin: 0 }}>Import contacts from CSV</h3>
            <p className="cell-sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Paste CSV or upload a file. The first row should be headers. We auto-detect name / email / phone / tags / opt-in columns.
            </p>
          </div>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>

        <div className="docpicker-body" style={{ display: "grid", gap: 12 }}>
          {!imported ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn btn-ghost btn-sm" onClick={onPickFile}><Icon name="package" size={11}/> Upload .csv file</button>
                <span style={{ fontSize: 12, color: "#5b6b76" }}>or paste below</span>
                <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={onFileChosen}/>
              </div>

              <textarea
                className="field-input"
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={`name,email,phone,tags,opt-in\nPriya Mehta,priya@example.co.uk,+447700900123,returning-client,true\nRohan Mehta,rohan@example.co.uk,,returning-client,true`}
                style={{ fontFamily: "monospace", fontSize: 12.5 }}
              />
              <button className="btn btn-navy btn-sm" onClick={() => doParse(csvText)} disabled={!csvText.trim()}>
                <Icon name="check" size={11}/> Preview
              </button>

              {preview && (
                <>
                  <div style={{ background: "#eaf5fb", border: "1px solid #b8d7e6", borderRadius: 6, padding: 10, fontSize: 12.5, color: "#0a3a55" }}>
                    <strong>{preview.rowCount}</strong> rows detected. Columns mapped:
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 12 }}>
                      <li>Name: <code>{preview.columnMap.colName || "— not found"}</code></li>
                      <li>Email: <code>{preview.columnMap.colEmail || "— not found"}</code></li>
                      <li>Phone: <code>{preview.columnMap.colPhone || "— not found"}</code></li>
                      <li>Tags: <code>{preview.columnMap.colTags || "— not found"}</code></li>
                      <li>Opt-in: <code>{preview.columnMap.colOptIn || "— not found (will default to opted in)"}</code></li>
                    </ul>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: 8 }}>
                    <div>
                      <label className="field-label">Apply this tag to all imported contacts</label>
                      <input className="field-input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. legacy-clients-2024"/>
                    </div>
                    <div>
                      <label className="field-label">Default opt-in</label>
                      <select className="field-input" value={defaultOptIn ? "in" : "out"} onChange={(e) => setDefaultOptIn(e.target.value === "in")}>
                        <option value="in">Opted in</option>
                        <option value="out">Opted out</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ background: "white", border: "1px solid #e4e8ec", borderRadius: 6, padding: 10, fontSize: 12 }}>
                    <strong style={{ color: "#063952" }}>Sample (first 8 rows)</strong>
                    <table style={{ width: "100%", marginTop: 6, fontSize: 11.5 }}>
                      <thead>
                        <tr style={{ color: "#5b6b76" }}>
                          <Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th>Tags</Th><Th>Opt-in</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.sample.map((s, i) => (
                          <tr key={i} style={{ borderTop: "1px solid #eef0f3" }}>
                            <Td>{s.fullName || "—"}</Td>
                            <Td style={{ fontFamily: "monospace" }}>{s.email || "—"}</Td>
                            <Td style={{ fontFamily: "monospace" }}>{s.phone || "—"}</Td>
                            <Td>{s.tagsRaw || "—"}</Td>
                            <Td>{s.optInRaw || (defaultOptIn ? "in" : "out")}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          ) : (
            <div style={{ padding: 20, textAlign: "center" }}>
              <div style={{ width: 56, height: 56, background: "#1e5128", color: "white", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name="check" size={28} stroke={3}/>
              </div>
              <h3 style={{ marginTop: 12, color: "#063952" }}>Import complete</h3>
              <p style={{ fontSize: 14, color: "#5b6b76", marginTop: 6 }}>
                <strong>{imported.added}</strong> new contacts added.
                {imported.merged > 0 && <> <strong>{imported.merged}</strong> existing contacts updated.</>}
              </p>
            </div>
          )}
        </div>

        <footer className="docpicker-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          {!imported ? (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-navy" onClick={doImport} disabled={!preview}>
                <Icon name="check" size={12} stroke={3}/> Import {preview ? preview.rowCount : 0} contacts
              </button>
            </>
          ) : (
            <button className="btn btn-navy" onClick={onClose}>Done</button>
          )}
        </footer>
      </div>
    </div>
  );
};

// ============================================================================
// Contact add / edit modal
// ============================================================================
const ContactEditorModal = ({ open, onClose, contact }) => {
  const [form, setForm] = React.useState({ fullName: "", email: "", phone: "", tags: "", optIn: true });
  React.useEffect(() => {
    if (!open) return;
    if (contact) {
      setForm({
        fullName: contact.fullName || "",
        email: contact.email || "",
        phone: contact.phone || "",
        tags: (contact.tags || []).join(", "),
        optIn: contact.optIn !== false,
      });
    } else {
      setForm({ fullName: "", email: "", phone: "", tags: "", optIn: true });
    }
  }, [open, contact]);

  if (!open) return null;
  const save = () => {
    if (!form.email && !form.fullName) { fiToast("Add a name or email"); return; }
    const tags = form.tags.split(/[;,]/).map(t => t.trim()).filter(Boolean);
    const payload = {
      ...(contact ? { id: contact.id } : {}),
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      tags,
      optIn: form.optIn,
      source: contact ? contact.source : "manual",
    };
    if (contact) FastILA.contacts.update(contact.id, payload);
    else FastILA.contacts.upsert(payload);
    fiToast(contact ? "Contact updated" : "Contact added");
    onClose();
  };
  return (
    <div className="docpicker-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="docpicker" style={{ maxWidth: 520, width: "94%" }} onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <div>
            <h3 style={{ margin: 0 }}>{contact ? "Edit contact" : "Add contact"}</h3>
          </div>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>
        <div className="docpicker-body" style={{ display: "grid", gap: 10 }}>
          <div><label className="field-label">Full name</label><input className="field-input" value={form.fullName} onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))}/></div>
          <div><label className="field-label">Email</label><input className="field-input" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}/></div>
          <div><label className="field-label">Phone</label><input className="field-input" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}/></div>
          <div><label className="field-label">Tags (comma-separated)</label><input className="field-input" value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="returning-client, broker-pack, vip"/></div>
          <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
            <input type="checkbox" checked={form.optIn} onChange={(e) => setForm(f => ({ ...f, optIn: e.target.checked }))}/>
            Opted in to receive marketing emails
          </label>
        </div>
        <footer className="docpicker-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={save}><Icon name="check" size={12} stroke={3}/> {contact ? "Save" : "Add contact"}</button>
        </footer>
      </div>
    </div>
  );
};

Object.assign(window, { ContactsView });

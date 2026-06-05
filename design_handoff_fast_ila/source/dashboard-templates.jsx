/* global React, Icon, MATTER_TYPES */

// ============================================================================
// Templates library (admin-only)
// Firm-wide PDFs the admin uploads ONCE; they auto-populate per booking.
//
//  - Client care letter (master template — system personalises per booking)
//  - Client account details (firm-wide, identical for every client)
//  - ILA certificate templates (one per lender)
//  - Other policy PDFs
// ============================================================================

const TEMPLATE_GROUPS = [
  {
    id: "core",
    title: "Core client documents",
    desc: "These are sent to every client through the portal. Upload once; the system personalises the CCL per booking.",
    items: [
      {
        id: "ccl",
        name: "Client care letter (master)",
        desc: "We auto-fill the client name, matter, lawyer and fee, then drop it into each client's portal.",
        file: "CCL_Master_v4.pdf",
        size: "118 KB",
        version: "v4 · 12 Feb 2026",
        updatedBy: "Karim Osman",
        usedIn: 78,
        kind: "ccl",
      },
      {
        id: "bank",
        name: "Client account details",
        desc: "Our SRA-regulated client account. Same PDF for every client. Reference format is generated as KAO/[surname].",
        file: "Client_Account_Details.pdf",
        size: "94 KB",
        version: "v2 · 4 Jan 2026",
        updatedBy: "Karim Osman",
        usedIn: 78,
        kind: "bank",
      },
    ],
  },
  {
    id: "lender",
    title: "Lender ILA certificate templates",
    desc: "The lender's own form for the ILA certificate. Upload each lender's template once; lawyers pick the matching one per booking.",
    items: [
      { id: "shawbrook", name: "Shawbrook Bank plc", file: "Shawbrook_ILA_Cert_v3.2.pdf", size: "240 KB", version: "v3.2 · 8 Mar 2026", updatedBy: "Amelia Hart", usedIn: 18, kind: "lender" },
      { id: "together", name: "Together Money", file: "Together_ILA_Cert_v2.1.pdf", size: "180 KB", version: "v2.1 · 22 Feb 2026", updatedBy: "Raj Patel", usedIn: 14, kind: "lender" },
      { id: "aldermore", name: "Aldermore Bank", file: "Aldermore_PG_Cert.pdf", size: "220 KB", version: "v1 · 18 Jan 2026", updatedBy: "Amelia Hart", usedIn: 9, kind: "lender" },
      { id: "precise", name: "Precise Mortgages", file: "Precise_ILA_v1.4.pdf", size: "260 KB", version: "v1.4 · 4 Feb 2026", updatedBy: "Sofia Martín", usedIn: 11, kind: "lender" },
      { id: "shawbrook-occ", name: "Shawbrook · Occupier's Consent", file: "Shawbrook_OC_v2.pdf", size: "140 KB", version: "v2 · 3 Mar 2026", updatedBy: "Amelia Hart", usedIn: 4, kind: "lender" },
      { id: "kensington", name: "Kensington Mortgages", file: "Kensington_ILA_Form.pdf", size: "190 KB", version: "v1 · 28 Jan 2026", updatedBy: "Tom Whitfield", usedIn: 7, kind: "lender" },
    ],
  },
  {
    id: "policy",
    title: "Firm policies",
    desc: "Linked from the portal footer and the client care letter.",
    items: [
      { id: "privacy", name: "Privacy Policy", file: "Fast-ILA_Privacy_v3.pdf", size: "210 KB", version: "v3 · 1 Apr 2026", updatedBy: "Karim Osman", usedIn: 78, kind: "policy" },
      { id: "tcs", name: "Terms & Conditions", file: "Fast-ILA_T&Cs_v2.pdf", size: "180 KB", version: "v2 · 1 Apr 2026", updatedBy: "Karim Osman", usedIn: 78, kind: "policy" },
      { id: "complaints", name: "Complaints procedure", file: "Complaints_Procedure_v1.pdf", size: "92 KB", version: "v1 · 12 Jan 2026", updatedBy: "Karim Osman", usedIn: 78, kind: "policy" },
    ],
  },
];

const TemplateRow = ({ item }) => {
  const iconName = item.kind === "lender" ? "award" : item.kind === "bank" ? "pound" : item.kind === "policy" ? "shield" : "doc";
  return (
    <div className="tpl-row">
      <div className="tpl-row-icon"><Icon name={iconName} size={16}/></div>
      <div className="tpl-row-info">
        <div className="tpl-row-name">{item.name}</div>
        {item.desc && <div className="tpl-row-desc">{item.desc}</div>}
        <div className="tpl-row-meta">
          <span className="mono">{item.file}</span>
          <span className="dot-sep">·</span>
          <span>{item.size}</span>
          <span className="dot-sep">·</span>
          <span>{item.version}</span>
          <span className="dot-sep">·</span>
          <span>updated by {item.updatedBy}</span>
        </div>
      </div>
      <div className="tpl-row-stats">
        <span className="tpl-used"><Icon name="package" size={11}/> {item.usedIn} bookings using this</span>
      </div>
      <div className="tpl-row-actions">
        <button className="btn btn-ghost btn-sm"><Icon name="external" size={12}/> Preview</button>
        <button className="btn btn-ghost btn-sm"><Icon name="download" size={12}/></button>
        <button className="btn btn-navy btn-sm"><Icon name="edit" size={12}/> Replace</button>
      </div>
    </div>
  );
};

const TemplatesView = () => {
  const [showAddLender, setShowAddLender] = React.useState(false);

  return (
    <div className="dash-grid">
      {/* Firm-wide e-signing assets */}
      <FirmStampCard/>
      <section className="panel tpl-banner">
        <div className="tpl-banner-l">
          <div className="tpl-banner-icon"><Icon name="package" size={22}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>Templates &amp; firm-wide documents</h2>
            <p className="panel-sub">Upload once. The system personalises and pushes them to every client's portal automatically — no manual copy-pasting.</p>
          </div>
        </div>
        <div className="tpl-banner-stats">
          <div><strong>9</strong><span>templates live</span></div>
          <div><strong>78</strong><span>bookings using them</span></div>
        </div>
      </section>

      {TEMPLATE_GROUPS.map(group => (
        <section key={group.id} className="panel">
          <header className="panel-head">
            <div>
              <h2 className="panel-title">{group.title}</h2>
              <p className="panel-sub">{group.desc}</p>
            </div>
            {group.id === "lender" && (
              <button className="btn btn-navy" onClick={() => setShowAddLender(true)}>
                <Icon name="plus" size={14}/> Add lender template
              </button>
            )}
          </header>
          <div className="tpl-list">
            {group.items.map(item => <TemplateRow key={item.id} item={item}/>)}
            {group.id === "lender" && showAddLender && (
              <div className="tpl-add">
                <div className="tpl-add-zone">
                  <Icon name="package" size={22}/>
                  <div>
                    <div className="tpl-add-title">Drag the lender's template PDF here</div>
                    <div className="tpl-add-sub">We'll OCR the signature fields and let you set up the envelope</div>
                  </div>
                </div>
                <div className="tpl-add-actions">
                  <input className="field-input" placeholder="Lender name — e.g. Paragon Bank"/>
                  <button className="btn btn-ghost" onClick={() => setShowAddLender(false)}>Cancel</button>
                  <button className="btn btn-navy">Save template</button>
                </div>
              </div>
            )}
          </div>
        </section>
      ))}

      <section className="panel tpl-flow">
        <header className="panel-head">
          <h2 className="panel-title">How clients see your templates</h2>
        </header>
        <div className="tpl-flow-body">
          <div className="tpl-flow-step">
            <div className="tpl-flow-num">1</div>
            <div>
              <div className="tpl-flow-title">You upload here</div>
              <div className="tpl-flow-sub">PDF only · we store the master untouched</div>
            </div>
          </div>
          <Icon name="arrow-right" size={16}/>
          <div className="tpl-flow-step">
            <div className="tpl-flow-num">2</div>
            <div>
              <div className="tpl-flow-title">Auto-personalised per booking</div>
              <div className="tpl-flow-sub">CCL gets the client's name, matter, lawyer and fee</div>
            </div>
          </div>
          <Icon name="arrow-right" size={16}/>
          <div className="tpl-flow-step">
            <div className="tpl-flow-num">3</div>
            <div>
              <div className="tpl-flow-title">Shows up in client portal</div>
              <div className="tpl-flow-sub">Client downloads, signs, you see it sync back live</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

Object.assign(window, { TemplatesView });

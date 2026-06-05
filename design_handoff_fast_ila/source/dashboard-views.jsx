/* global React, Icon, Avatar, StatusPill, ServiceBadge, SERVICES, LAWYERS, BOOKINGS, KPI, KpiCard, fmtDateLong, fmtDateShort, addDays, ymd, TODAY */

// ============================================================================
// View — Booking detail
// ============================================================================
const DetailView = ({ bookingRef, role = "admin", onBack }) => {
  const booking = BOOKINGS.find(b => b.ref === bookingRef) || BOOKINGS[2]; // default to Mehta (has AI summary)
  const svc = SERVICES.find(s => s.id === booking.serviceId);
  const lawyer = LAWYERS.find(l => l.id === booking.lawyerId);
  const isWet = booking.serviceId === "wet";

  const [briefApproved, setBriefApproved] = React.useState(false);
  const [briefGenerating, setBriefGenerating] = React.useState(false);
  const [matterType, setMatterType] = React.useState("personal-guarantee");
  const [docs, setDocs] = React.useState([
    { name: "Shawbrook Loan Facility Agreement.pdf", pages: 28, size: "2.1 MB" },
    { name: "Personal Guarantee & Indemnity.pdf", pages: 12, size: "640 KB" },
    { name: "Property Schedule — Hackney + Camden.pdf", pages: 7, size: "320 KB" },
  ]);
  const currentMatter = MATTER_TYPES.find(m => m.id === matterType) || MATTER_TYPES[0];

  return (
    <div className="dash-grid">
      <div className="dash-grid-row">
        <button className="dash-breadcrumb" onClick={onBack}>
          <Icon name="arrow-left" size={14}/> Back to bookings
        </button>
      </div>

      <div className="detail-head">
        <div>
          <div className="row items-center gap-3" style={{ marginBottom: 6 }}>
            <span className="pill pill-cream">{svc.short}</span>
            <StatusPill status={booking.status}/>
            <StatusPill status={booking.payment}/>
            {booking.dispatch && <StatusPill status={booking.dispatch}/>}
          </div>
          <h1 className="display detail-name">{booking.clientName}</h1>
          <div className="detail-meta">
            <span>{fmtDateLong(new Date(...booking.date.split("-").map((n, i) => i === 1 ? +n - 1 : +n)))}</span>
            <span className="dot-sep">·</span>
            <span>{booking.time} Europe/London</span>
            <span className="dot-sep">·</span>
            <span>{svc.duration} minutes</span>
          </div>
        </div>
        <div className="detail-head-actions">
          <button className="btn btn-ghost"><Icon name="more" size={16}/></button>
          <button className="btn btn-ghost"><Icon name="edit" size={14}/> Reschedule</button>
          <button className="btn btn-navy"><Icon name="video" size={14}/> Join Google Meet</button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          {/* AI Pre-Call Brief */}
          <section className="panel ai-panel">
            <header className="panel-head">
              <div className="row items-center gap-3">
                <div className="ai-badge">
                  <Icon name="sparkle" size={14}/>
                  AI Pre-Call Brief
                </div>
                {!briefGenerating && docs.length > 0 && (
                  <span className="pill pill-muted">{docs.length} docs · 47 pages · generated 09:12</span>
                )}
              </div>
              {!briefApproved && docs.length > 0 && !briefGenerating && (
                <button className="btn btn-ghost" onClick={() => setBriefApproved(true)}>
                  <Icon name="check" size={14}/> Mark reviewed
                </button>
              )}
              {briefApproved && <span className="pill pill-success"><Icon name="check" size={12}/> Reviewed</span>}
            </header>

            {/* Matter-type selector */}
            <div className="matter-strip">
              <div className="matter-strip-label">
                <Icon name="tag" size={13}/>
                Matter type
              </div>
              <select
                className="matter-select"
                value={matterType}
                onChange={(e) => setMatterType(e.target.value)}
              >
                {MATTER_TYPES.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <div className="matter-strip-desc">{currentMatter.desc}</div>
            </div>

            {/* We act for the guarantor — disclaimer banner */}
            <div className="who-we-act-for">
              <Icon name="shield" size={15}/>
              <div>
                <strong>We act for the guarantor / signatory only.</strong> Not for the borrower (typically the company), not for the lender. Confirm this with the client at the start of the call.
              </div>
            </div>

            {/* Document upload zone */}
            <div className="docs-zone">
              {docs.length === 0 ? (
                <button className="docs-empty" onClick={() => setDocs([
                  { name: "Shawbrook Loan Facility Agreement.pdf", pages: 28, size: "2.1 MB" },
                  { name: "Personal Guarantee & Indemnity.pdf", pages: 12, size: "640 KB" },
                ])}>
                  <div className="docs-empty-icon"><Icon name="package" size={28}/></div>
                  <div className="docs-empty-title">Drag &amp; drop the client's documents here</div>
                  <div className="docs-empty-sub">PDF, DOCX up to 25 MB each · or click to browse</div>
                </button>
              ) : (
                <>
                  <div className="docs-list">
                    {docs.map((d, i) => (
                      <div key={i} className="doc-pill">
                        <div className="doc-pill-icon"><Icon name="doc" size={14}/></div>
                        <div className="doc-pill-info">
                          <div className="doc-pill-name">{d.name}</div>
                          <div className="doc-pill-meta">{d.pages} pages · {d.size}</div>
                        </div>
                        <button className="doc-pill-x" onClick={() => setDocs(docs.filter((_, j) => j !== i))} aria-label="Remove"><Icon name="x" size={12}/></button>
                      </div>
                    ))}
                    <button className="doc-add" onClick={() => setDocs([...docs, { name: "New document.pdf", pages: 4, size: "180 KB" }])}>
                      <Icon name="plus" size={14}/> Add another
                    </button>
                  </div>
                  <div className="docs-zone-actions">
                    <div className="docs-zone-foot">
                      <Icon name="lock" size={12}/>
                      <span>Files encrypted · used only for this brief · no training use</span>
                    </div>
                    <button
                      className="btn btn-navy"
                      onClick={() => {
                        setBriefGenerating(true);
                        setBriefApproved(false);
                        setTimeout(() => setBriefGenerating(false), 1400);
                      }}
                      disabled={briefGenerating}
                    >
                      <Icon name="sparkle" size={14}/>
                      {briefGenerating ? "Generating…" : "Regenerate brief"}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Loading state */}
            {briefGenerating && (
              <div className="ai-loading">
                <div className="ai-loading-spinner"/>
                <div>
                  <div className="ai-loading-title">Reading {docs.length} documents…</div>
                  <div className="ai-loading-sub">Extracting parties, terms, clauses and risks</div>
                </div>
              </div>
            )}

            {!briefGenerating && docs.length > 0 && (
              <>
                <div className="ai-block">
                  <div className="ai-label">Parties</div>
                  <ul className="ai-list ai-list-tight">
                    <li><strong>Borrower:</strong> Mehta Holdings Ltd (co. no. 12345678)</li>
                    <li><strong>Lender:</strong> Shawbrook Bank plc</li>
                    <li><strong>Guarantors:</strong> Priya Mehta &amp; Rohan Mehta (joint &amp; several)</li>
                    <li><strong>Borrower's solicitor:</strong> Eversheds Sutherland LLP</li>
                  </ul>
                </div>

                <div className="ai-block">
                  <div className="ai-label">Loan terms at a glance</div>
                  <div className="terms-grid">
                    <div className="term"><span className="term-l">Facility</span><span className="term-v">£480,000</span></div>
                    <div className="term"><span className="term-l">Term</span><span className="term-v">36 months interest-only</span></div>
                    <div className="term"><span className="term-l">Rate</span><span className="term-v">SONIA + 4.25%</span></div>
                    <div className="term"><span className="term-l">Security</span><span className="term-v">2× BTL (Hackney, Camden)</span></div>
                    <div className="term"><span className="term-l">Guarantee cap</span><span className="term-v">£600,000 (loan + 6m interest)</span></div>
                    <div className="term"><span className="term-l">Completion</span><span className="term-v">By 4 Jun 2026</span></div>
                  </div>
                </div>

                <div className="ai-block">
                  <div className="ai-label">Property security · what's behind the loan</div>
                  <div className="security-grid">
                    <div className="security-card">
                      <div className="security-card-head">
                        <span className="pill pill-cream">Property 1</span>
                        <span className="security-card-tag">Buy-to-let</span>
                      </div>
                      <div className="security-addr">14 Mare Street, Hackney, London E8 4RP</div>
                      <div className="security-stats">
                        <div><span className="cell-sub">Value</span><strong>£820,000</strong></div>
                        <div><span className="cell-sub">Charge</span><strong>1st legal</strong></div>
                        <div><span className="cell-sub">Title</span><strong className="mono">NGL 488321</strong></div>
                      </div>
                      <div className="security-note"><Icon name="warning" size={12}/> Existing 1st charge to Lloyds — being redeemed at completion.</div>
                    </div>
                    <div className="security-card">
                      <div className="security-card-head">
                        <span className="pill pill-cream">Property 2</span>
                        <span className="security-card-tag">Buy-to-let</span>
                      </div>
                      <div className="security-addr">42 Camden Square, London NW1 9YE</div>
                      <div className="security-stats">
                        <div><span className="cell-sub">Value</span><strong>£640,000</strong></div>
                        <div><span className="cell-sub">Charge</span><strong>1st legal</strong></div>
                        <div><span className="cell-sub">Title</span><strong className="mono">NGL 612045</strong></div>
                      </div>
                      <div className="security-note">Unencumbered. Lender taking 1st charge on completion.</div>
                    </div>
                  </div>
                  <div className="security-foot">
                    <div className="security-summary"><strong>Combined value</strong> £1.46m · <strong>LTV</strong> 32.9% · <strong>Cross-collateralised</strong> across both titles</div>
                  </div>
                </div>

                <div className="ai-block">
                  <div className="ai-label">Key clauses to walk through</div>
                  <ul className="ai-list">
                    <li><strong>Clause 14.2 · Cross-default</strong> — any default on the underlying BTL mortgages enforces this guarantee.</li>
                    <li><strong>Clause 17 · Step-in rights</strong> — lender may manage properties on default; receivers appointable.</li>
                    <li><strong>Clause 22 · Waiver of subrogation</strong> — guarantors cannot claim against borrower until lender repaid in full.</li>
                    <li><strong>Schedule 3 · All monies clause</strong> — covers future advances, not just the named facility.</li>
                  </ul>
                </div>

                <div className="ai-block">
                  <div className="ai-label">Risks to flag during the call</div>
                  <ul className="ai-list">
                    <li className="risk"><Icon name="warning" size={14}/> Personal liability survives sale of secured property.</li>
                    <li className="risk"><Icon name="warning" size={14}/> Joint &amp; several — either spouse can be pursued for the full £600k.</li>
                    <li className="risk"><Icon name="warning" size={14}/> "All monies" clause extends to undisclosed future advances.</li>
                  </ul>
                </div>

                <div className="ai-block">
                  <div className="ai-label">ILA disclosure checklist (SRA)</div>
                  <div className="checklist">
                    <div className="check-item"><div className="check-box"/>Independent of borrower's solicitor — explain</div>
                    <div className="check-item"><div className="check-box"/>Plain-English explanation of nature &amp; effect</div>
                    <div className="check-item"><div className="check-box"/>Confirm no duress / free will</div>
                    <div className="check-item"><div className="check-box"/>Right to refuse and seek other advice</div>
                    <div className="check-item"><div className="check-box"/>Risks of enforcement &amp; bankruptcy</div>
                    <div className="check-item"><div className="check-box"/>Capacity to honour the guarantee</div>
                  </div>
                </div>
              </>
            )}
          </section>

          {/* Post-call actions */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="check-circle" size={16}/> After the call</h2>
              <span className="pill pill-muted">Mark complete to close the matter</span>
            </header>
            <div className="post-call">
              <div className="post-row">
                <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                <div className="flex-1">
                  <div className="post-title">Call held with both signatories</div>
                  <div className="post-meta">10:30–11:25 · 55 min · Google Meet · ID verified</div>
                </div>
                <span className="pill pill-success">Done</span>
              </div>
              <div className="post-row">
                <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                <div className="flex-1">
                  <div className="post-title">Advice given &amp; understanding confirmed</div>
                  <div className="post-meta">Both signatories confirmed independent, no duress</div>
                </div>
                <span className="pill pill-success">Done</span>
              </div>
              <div className="post-row post-row-pending">
                <div className="post-mark post-mark-pending"><Icon name="doc" size={14}/></div>
                <div className="flex-1">
                  <div className="post-title">Edit &amp; sign certificate, then send to client</div>
                  <div className="post-meta">Built-in e-sign · PD82-compliant audit trail · no DocuSign fee</div>
                </div>
                <button className="btn btn-navy"><Icon name="edit" size={14}/> Open editor</button>
              </div>
              <div className="post-row post-row-review">
                <div className="post-mark post-mark-review"><Icon name="star" size={14}/></div>
                <div className="flex-1">
                  <div className="post-title">Ask the client for a Google review</div>
                  <div className="post-meta">One-click email + SMS with our review link. Best sent within 24h of the call.</div>
                </div>
                <button className="btn btn-lime"><Icon name="send" size={14}/> Send review request</button>
              </div>
            </div>

            {/* Cert signing flow — flexible */}
            <CertSignWorkflow booking={booking} isWet={isWet}/>
          </section>

          {/* Client portal documents — admin uploads what the client sees */}
          {role === "admin" && (
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="package" size={16}/> Client portal documents</h2>
              <span className="pill pill-muted">What the client sees in their portal</span>
            </header>
            <div className="portal-docs-admin">
              <PortalDocAdminRow
                kind="ccl"
                title="Client care letter"
                desc="Personalised to the client &amp; matter — they read &amp; sign this"
                file={{ name: "CCL_Mehta.pdf", size: "182 KB" }}
                signed={true}
                signedMeta="Signed by Priya Mehta · 26 May 14:08 · IP recorded"
              />
              <PortalDocAdminRow
                kind="bank"
                title="Bank account details"
                desc="Our SRA-regulated client account · reference KAO/MEHTA"
                file={{ name: "Client_Account_Details.pdf", size: "94 KB" }}
                signed={false}
                signedMeta="Read-only · download tracked"
              />
              <PortalDocAdminRow
                kind="cert"
                title="ILA certificate (lender's template)"
                desc="Upload the lender's official form &amp; place signature fields"
                file={{ name: "Shawbrook_ILA_Cert_v3.2_Mehta.pdf", size: "240 KB" }}
                signed={false}
                signedMeta="Awaiting your signature placement"
                action="Set up signature envelope"
              />
            </div>
          </section>
          )}

          {/* Files the client has uploaded — for ID verification, case setup, conflict checks, billing */}
          <section className="panel">
            <header className="panel-head">
              <div>
                <h2 className="panel-title"><Icon name="package" size={16}/> Client uploads</h2>
                <p className="panel-sub">{role === "admin" ? "Verify ID, set up the file, run conflict checks and bill." : "Check the client's ID & proof of address before the call."}</p>
              </div>
              <button className="btn btn-navy btn-sm"><Icon name="download" size={12}/> Download all (ZIP)</button>
            </header>
            <div className="client-uploads">
              <div className="client-uploads-group">
                <div className="client-uploads-name">
                  <Avatar lawyer={{ initials: "PM", photoBg: "#1f7497" }} size={26}/>
                  <span><strong>Priya Mehta</strong> · primary signatory</span>
                </div>
                <ClientFileRow label="Photo ID" file="Mehta_Priya_Passport.jpg" size="1.8 MB" ts="26 May 09:12"/>
                <ClientFileRow label="Proof of address" file="Mehta_Priya_BankStatement_Apr26.pdf" size="220 KB" ts="26 May 09:13"/>
                <ClientFileRow label="Signed client care letter" file="CCL_Mehta_Priya_signed.pdf" size="184 KB" ts="26 May 14:08" signed/>
              </div>
              <div className="client-uploads-group">
                <div className="client-uploads-name">
                  <Avatar lawyer={{ initials: "RM", photoBg: "#0a4a67" }} size={26}/>
                  <span><strong>Rohan Mehta</strong> · co-signatory</span>
                </div>
                <ClientFileRow label="Photo ID" file="Mehta_Rohan_DrivingLicence.jpg" size="1.4 MB" ts="26 May 09:18"/>
                <ClientFileRow label="Proof of address" file="Mehta_Rohan_UtilityBill_May26.pdf" size="180 KB" ts="26 May 09:19"/>
                <ClientFileRow label="Signed client care letter" file="CCL_Mehta_Rohan_signed.pdf" size="184 KB" ts="26 May 14:14" signed/>
              </div>
              <div className="client-uploads-group">
                <div className="client-uploads-name">
                  <Icon name="check-circle" size={16}/>
                  <span><strong>Understanding declaration</strong> — client confirmed all questions before the call</span>
                </div>
                <ClientFileRow label="Signed declaration (PG matter)" file="Understanding_Declaration_Mehta.pdf" size="76 KB" ts="26 May 14:22" signed/>
              </div>
              <div className="client-uploads-group">
                <div className="client-uploads-name">
                  <Icon name="package" size={16}/>
                  <span><strong>Matter documents</strong></span>
                </div>
                <ClientFileRow label="Loan agreement" file="Shawbrook_Facility_Mehta.pdf" size="2.1 MB" ts="26 May 09:24"/>
                <ClientFileRow label="Personal guarantee" file="PG_and_Indemnity_Mehta.pdf" size="640 KB" ts="26 May 09:25"/>
              </div>
            </div>
          </section>

          {/* Wet-signature panel */}
          {isWet && (
            <section className="panel">
              <header className="panel-head">
                <h2 className="panel-title"><Icon name="stamp" size={16}/> Wet signature flow</h2>
                <StatusPill status={booking.dispatch || "not_started"}/>
              </header>
              <div className="dispatch-grid dispatch-grid-5">
                <DispatchStep state="awaiting" label="Awaiting docs" date="Sent on 24 May" sub="Client posts to us"/>
                <DispatchStep state="received" label="Docs received" date="26 May 09:42" sub="Logged into safe"/>
                <DispatchStep state="signed" label="Signed &amp; witnessed" date="26 May 14:20" sub="By Sofia Martín"/>
                <DispatchStep state="posted" label="Posted out" date={booking.dispatch === "posted" || booking.dispatch === "delivered" ? "26 May 17:42" : ""} sub="To recipient" current={booking.dispatch === "posted"}/>
                <DispatchStep state="delivered" label="Delivered" date={booking.dispatch === "delivered" ? "27 May 11:14" : ""} sub="Royal Mail confirmed"/>
              </div>
              {booking.trackingNumber ? (
                <div className="dispatch-track">
                  <div>
                    <div className="dispatch-track-label">Royal Mail · {booking.trackingService}</div>
                    <div className="dispatch-track-num mono">{booking.trackingNumber}</div>
                  </div>
                  <div className="row gap-2">
                    <button className="btn btn-ghost"><Icon name="external" size={14}/> Open in Royal Mail</button>
                    <button className="btn btn-ghost"><Icon name="send" size={14}/> Re-send to client</button>
                  </div>
                </div>
              ) : (
                <div className="dispatch-track dispatch-track-empty">
                  <div>
                    <div className="dispatch-track-label">Enter Royal Mail tracking number</div>
                    <input className="field-input" placeholder="e.g. QY 0918 2244 7 GB" style={{ maxWidth: 280, marginTop: 6 }}/>
                  </div>
                  <button className="btn btn-navy">Save &amp; notify client</button>
                </div>
              )}
            </section>
          )}

          {/* Notes */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="edit" size={16}/> Notes</h2>
              <span className="cell-sub">3 separate notebooks — pick where it goes</span>
            </header>
            <MatterNotes/>
          </section>
        </div>

        <aside className="detail-aside">
          {/* Client */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Client</h2>
              <span className="cell-sub"><Icon name="info" size={11}/> Click to edit</span>
            </header>
            <ClientDetailsPanel booking={booking}/>
          </section>

          {/* Payment / VAT — admin only */}
          {role === "admin" && (
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Payment &amp; VAT</h2>
              <StatusPill status={booking.payment}/>
            </header>
            <div className="aside-body">
              <div className="aside-row aside-row-amt">
                <span className="aside-label">Gross paid</span>
                <strong className="display">£{booking.amount.toFixed(2)}</strong>
              </div>
              <div className="aside-row">
                <span className="aside-label">Net (back-calc)</span>
                <span className="mono">£{(booking.amount / 1.2).toFixed(2)}</span>
              </div>
              <div className="aside-row">
                <span className="aside-label">VAT 20%</span>
                <span className="mono">£{(booking.amount - booking.amount / 1.2).toFixed(2)}</span>
              </div>
              <div className="divider" style={{ margin: "10px 0" }}/>
              <div className="aside-row">
                <span className="aside-label">Invoice issuer</span>
                <span><strong>Nexa Law Ltd</strong> · VAT GB 245 670 123</span>
              </div>
              <div className="aside-row">
                <span className="aside-label">VAT invoice (PDF)</span>
                <a href="#" onClick={(e) => e.preventDefault()}><Icon name="download" size={12}/> INV-2026-0480.pdf</a>
              </div>
              <div className="aside-row">
                <span className="aside-label">Uploaded by</span>
                <span className="cell-sub">Karim Osman · 24 May 11:02</span>
              </div>
              <div className="aside-actions">
                <button className="btn btn-ghost btn-sm"><Icon name="edit" size={12}/> Replace invoice</button>
                <button className="btn btn-ghost btn-sm"><Icon name="mail" size={12}/> Chase by email</button>
                <button className="btn btn-ghost btn-sm"><Icon name="phone" size={12}/> Chase by SMS</button>
              </div>
            </div>
          </section>
          )}

          {/* Lawyer */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Lawyer</h2>
            </header>
            <div className="aside-body">
              <div className="row gap-3 items-center">
                <Avatar lawyer={lawyer} size={42}/>
                <div>
                  <div className="cell-strong">{lawyer.name}</div>
                  <div className="cell-sub">{lawyer.sra}</div>
                </div>
              </div>
              <div className="aside-row" style={{ marginTop: 14 }}>
                <span className="aside-label">Languages</span>
                <span>{lawyer.languages.join(", ")}</span>
              </div>
            </div>
          </section>

          {/* Audit log */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Audit log</h2>
              <button className="btn btn-ghost btn-sm">Full log</button>
            </header>
            <div className="audit-list">
              <div className="audit-row">
                <span className="audit-time mono">11:33</span>
                <span>N8N sent witness statement to Rohan Mehta · <span className="audit-actor">webhook</span></span>
              </div>
              <div className="audit-row">
                <span className="audit-time mono">11:32</span>
                <span>Appointment marked completed · <span className="audit-actor">Amelia Hart</span></span>
              </div>
              <div className="audit-row">
                <span className="audit-time mono">10:30</span>
                <span>Meet recording + transcript captured · <span className="audit-actor">system</span></span>
              </div>
              <div className="audit-row">
                <span className="audit-time mono">Yesterday</span>
                <span>Booking created · paid £250 · <span className="audit-actor">fast-ila.co.uk</span></span>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

// Admin-side row for portal documents (uploads CCL / bank details / ILA cert)
// Cert signing workflow — flexible options + launches the E-Sign Studio
const CertSignWorkflow = ({ booking, isWet }) => {
  const [mode, setMode] = React.useState(isWet ? "wet" : "lawyer-only");
  const [studioOpen, setStudioOpen] = React.useState(false);
  const [envelopeOpen, setEnvelopeOpen] = React.useState(false);

  const options = [
    { id: "lawyer-only", label: "Lawyer signs only", desc: "Most common · I sign, then we email the PDF to client + lender", icon: "edit" },
    { id: "lawyer-client", label: "Lawyer + client e-sign", desc: "Some lenders require client signature too (built-in e-sign envelope)", icon: "send" },
    { id: "wet", label: "Wet signature", desc: "Print, sign in ink, post to recipient (Royal Mail tracked)", icon: "stamp" },
  ];

  if (studioOpen) {
    return (
      <div className="esign-overlay">
        <ESignStudio lawyerId={booking.lawyerId} onClose={() => setStudioOpen(false)}/>
      </div>
    );
  }

  return (
    <div className="esign-card">
      <div className="esign-card-head">
        <div className="row items-center gap-3">
          <div className="esign-icon"><Icon name="award" size={18}/></div>
          <div>
            <div className="esign-title">ILA Certificate</div>
            <div className="esign-sub">Lender: {booking.lender || "—"} · PD82-compliant audit pack auto-attached</div>
          </div>
        </div>
      </div>
      <div className="esign-card-body">
        <div className="cert-mode-label">How will this cert be signed?</div>
        <div className="cert-mode-grid">
          {options.map(opt => (
            <button
              key={opt.id}
              className={`cert-mode ${mode === opt.id ? "is-active" : ""}`}
              onClick={() => setMode(opt.id)}
            >
              <div className="cert-mode-icon"><Icon name={opt.icon} size={16}/></div>
              <div className="cert-mode-info">
                <div className="cert-mode-label-l">{opt.label}</div>
                <div className="cert-mode-desc">{opt.desc}</div>
              </div>
              <div className="cert-mode-check">
                {mode === opt.id && <Icon name="check" size={14} stroke={3}/>}
              </div>
            </button>
          ))}
        </div>
        <div className="esign-card-actions">
          <button className="btn btn-ghost"><Icon name="external" size={14}/> Preview cert</button>
          {mode === "lawyer-only" && (
            <button className="btn btn-lime" onClick={() => setStudioOpen(true)}>
              <Icon name="edit" size={14}/> Open in E-Sign Studio
            </button>
          )}
          {mode === "lawyer-client" && (
            <button className="btn btn-lime" onClick={() => setStudioOpen(true)}>
              <Icon name="send" size={14}/> Set up envelope &amp; send
            </button>
          )}
          {mode === "wet" && (
            <button className="btn btn-lime"><Icon name="package" size={14}/> Print &amp; post pack</button>
          )}
        </div>
      </div>

      <div className="esign-extras">
        <div className="esign-extras-head">
          <Icon name="package" size={14}/>
          <span><strong>Other matter documents</strong> — set up an envelope for the personal guarantee, witness statement, etc?</span>
        </div>
        <button className="btn btn-ghost" onClick={() => setStudioOpen(true)}>
          <Icon name="plus" size={13}/> New envelope
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// ClientDetailsPanel — editable name / email / phone / lender on the booking
// detail. Lawyer has full flexibility to correct mistakes.
// ============================================================================
const ClientDetailsPanel = ({ booking }) => {
  const [data, setData] = React.useState({
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    phone: booking.phone,
    lender: booking.lender || "",
    legal: booking.legal || "",
    postRecipient: booking.postRecipient || "client",
    postAddress: booking.postAddress || "",
    secondSignatory: booking.secondSignatory || "",
    secondEmail: booking.secondEmail || "",
  });
  const [savedFlash, setSavedFlash] = React.useState(null);

  const save = (key, value) => {
    setData(prev => ({ ...prev, [key]: value }));
    setSavedFlash(key);
    setTimeout(() => setSavedFlash(null), 1500);
  };

  const Row = ({ label, field, placeholder, mono }) => (
    <div className={`aside-row aside-row-edit ${savedFlash === field ? "is-saved" : ""}`}>
      <span className="aside-label">{label}</span>
      <div className="aside-row-value">
        <InlineText
          value={data[field]}
          onChange={(v) => save(field, v)}
          placeholder={placeholder}
          mono={mono}
        />
      </div>
    </div>
  );

  return (
    <div className="aside-body">
      <Row label="Name" field="clientName" placeholder="Full name"/>
      <Row label="Email" field="clientEmail" placeholder="email@…" mono/>
      <Row label="Phone" field="phone" placeholder="+44 7000 000000" mono/>
      <Row label="Lender" field="lender" placeholder="e.g. Shawbrook Bank"/>
      <div className={`aside-row aside-row-edit aside-row-stack`}>
        <span className="aside-label">Legal issue summary</span>
        <div className="aside-row-value">
          <InlineText
            value={data.legal}
            onChange={(v) => save("legal", v)}
            placeholder="What the client told us about their matter…"
            multiline
          />
        </div>
      </div>
      {(booking.secondSignatory || data.secondSignatory) && (
        <>
          <Row label="2nd signatory" field="secondSignatory" placeholder="Name"/>
          <Row label="Their email" field="secondEmail" placeholder="email@…" mono/>
        </>
      )}
      <div className="aside-row">
        <span className="aside-label">Source</span>
        <span className="mono">{booking.source}</span>
      </div>
    </div>
  );
};

// ============================================================================
// MatterNotes — three notebooks (client-facing / admin / lawyer-only)
// Each one shows clearly WHERE the note appears so lawyers don't get confused.
// ============================================================================
const NOTE_TABS = [
  {
    id: "client",
    label: "Client-facing",
    icon: "user",
    badge: "Visible to client",
    badgeCls: "pill-info",
    where: "Shows up on the client's portal in their 'Sign your declaration' step AND in their post-call email.",
    placeholder: "Hi Priya & Rohan — here's a recap of what we discussed and the next steps for you…",
  },
  {
    id: "admin",
    label: "Internal admin",
    icon: "shield",
    badge: "Admin only",
    badgeCls: "pill-warning",
    where: "Only Karim (admin) sees this. Useful for billing notes, refunds, complaints, ops issues.",
    placeholder: "e.g. client requested split payment; called reception to discuss…",
  },
  {
    id: "lawyer",
    label: "Lawyer-only",
    icon: "lock",
    badge: "Private to you",
    badgeCls: "pill-muted",
    where: "Only you see this. Your private working notes, never shared with the client, admin, or other lawyers.",
    placeholder: "My private notes — clauses to flag on re-read, things to remember for next time…",
  },
];

const MatterNotes = () => {
  const [activeTab, setActiveTab] = React.useState("client");
  const [notes, setNotes] = React.useState({
    client: "We discussed your personal guarantee for the Shawbrook facility. Key points: cross-default risk, all-monies clause, joint & several liability. You confirmed you understand and are signing voluntarily. Next: please sign your declaration in this portal so we can issue your ILA certificate. Best, Amelia.",
    admin: "",
    lawyer: "",
  });
  const [savedAt, setSavedAt] = React.useState("11:18");

  const updateNote = (val) => {
    setNotes(prev => ({ ...prev, [activeTab]: val }));
    setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
  };

  const active = NOTE_TABS.find(t => t.id === activeTab);

  return (
    <>
      <div className="notes-tabs-bar">
        {NOTE_TABS.map(t => (
          <button
            key={t.id}
            className={`notes-tab-card ${activeTab === t.id ? "is-active" : ""}`}
            onClick={() => setActiveTab(t.id)}
          >
            <div className="notes-tab-icon"><Icon name={t.icon} size={14}/></div>
            <div className="notes-tab-info">
              <div className="notes-tab-label">{t.label}</div>
              <span className={`pill ${t.badgeCls} notes-tab-badge`}>{t.badge}</span>
            </div>
            {notes[t.id] && <span className="notes-tab-dot" title="Has content"/>}
          </button>
        ))}
      </div>
      <div className="notes-body">
        <div className={`notes-where notes-where-${activeTab}`}>
          <Icon name={activeTab === "client" ? "send" : activeTab === "admin" ? "shield" : "lock"} size={13}/>
          <span>{active.where}</span>
        </div>
        <textarea
          className="field-textarea"
          rows={5}
          value={notes[activeTab]}
          onChange={(e) => updateNote(e.target.value)}
          placeholder={active.placeholder}
        />
        <div className="row justify-between" style={{ marginTop: 10 }}>
          <span className="cell-sub">Last edited by Amelia Hart at {savedAt}</span>
          <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Saved automatically</span>
        </div>
      </div>
    </>
  );
};

// File row inside admin "Client uploads" panel
const ClientFileRow = ({ label, file, size, ts, signed }) => (
  <div className="client-file-row">
    <div className="client-file-icon"><Icon name={signed ? "edit" : "doc"} size={14}/></div>
    <div className="client-file-info">
      <div className="client-file-label">{label}{signed && <span className="pill pill-success" style={{ marginLeft: 8 }}><Icon name="check" size={10} stroke={3}/> Signed</span>}</div>
      <div className="client-file-meta"><span className="mono">{file}</span> · {size} · {ts}</div>
    </div>
    <div className="row gap-2">
      <button className="btn btn-ghost btn-sm"><Icon name="external" size={12}/> Preview</button>
      <button className="btn btn-navy btn-sm"><Icon name="download" size={12}/> Download</button>
    </div>
  </div>
);

// Admin-side row for portal documents (uploads CCL / bank details / ILA cert)
const PortalDocAdminRow = ({ kind, title, desc, file, signed, signedMeta, action }) => (
  <div className="portal-doc-admin">
    <div className="portal-doc-admin-icon">
      <Icon name={kind === "cert" ? "award" : (kind === "bank" ? "pound" : "doc")} size={16}/>
    </div>
    <div className="portal-doc-admin-info">
      <div className="portal-doc-admin-title">{title}</div>
      <div className="portal-doc-admin-desc" dangerouslySetInnerHTML={{ __html: desc }}/>
      <div className="portal-doc-admin-file">
        <Icon name="doc" size={11}/> {file.name} <span className="cell-sub">· {file.size}</span>
      </div>
      <div className={`portal-doc-admin-status ${signed ? "is-signed" : "is-waiting"}`}>
        {signed ? <Icon name="check" size={11} stroke={3}/> : <Icon name="clock" size={11}/>}
        <span>{signedMeta}</span>
      </div>
    </div>
    <div className="portal-doc-admin-actions">
      <button className="btn btn-ghost btn-sm"><Icon name="download" size={12}/> View</button>
      <button className="btn btn-ghost btn-sm"><Icon name="edit" size={12}/> Replace</button>
      {action && <button className="btn btn-navy btn-sm"><Icon name="edit" size={12}/> {action}</button>}
    </div>
  </div>
);

const DispatchStep = ({ state, label, date, sub, current }) => (
  <div className={`dispatch-step ${date ? "is-done" : ""} ${current ? "is-current" : ""}`}>
    <div className="dispatch-step-mark">
      {date ? <Icon name="check" size={12} stroke={3}/> : <span/>}
    </div>
    <div>
      <div className="dispatch-step-lbl" dangerouslySetInnerHTML={{ __html: label }}/>
      <div className="dispatch-step-date">{date || "—"}</div>
      {sub && <div className="dispatch-step-sub">{sub}</div>}
    </div>
  </div>
);

// ============================================================================
// View — Royal Mail queue
// ============================================================================
const RoyalMailView = ({ onOpenDetail }) => {
  const wetBookings = BOOKINGS.filter(b => b.serviceId === "wet");
  const [search, setSearch] = React.useState("");
  const [lawyerFilter, setLawyerFilter] = React.useState("all");
  const [compact, setCompact] = React.useState(false);
  const [stageFilter, setStageFilter] = React.useState("all");

  const filtered = wetBookings.filter(b => {
    if (lawyerFilter !== "all" && b.lawyerId !== lawyerFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.clientName.toLowerCase().includes(q)
          && !(b.lender || "").toLowerCase().includes(q)
          && !(b.trackingNumber || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = {
    awaiting_signature: filtered.filter(b => b.dispatch === "awaiting_signature"),
    signed: filtered.filter(b => b.dispatch === "signed"),
    ready_to_post: filtered.filter(b => b.dispatch === "ready_to_post"),
    posted: filtered.filter(b => b.dispatch === "posted"),
    delivered: filtered.filter(b => b.dispatch === "delivered"),
  };

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        <KpiCard icon="package" label="Awaiting client’s docs" value={grouped.awaiting_signature.length} tone="warning" hint="Client to post in"/>
        <KpiCard icon="stamp" label="In our office" value={grouped.signed.length + grouped.ready_to_post.length} tone="info" hint="To sign or post out"/>
        <KpiCard icon="send" label="Posted out" value={grouped.posted.length} hint="With Royal Mail"/>
        <KpiCard icon="check-circle" label="Delivered this month" value={grouped.delivered.length + 11} hint="100% delivery rate"/>
      </div>

      {/* Filter / search bar */}
      <section className="panel rm-filter-bar-panel">
        <div className="rm-filter-bar">
          <div className="filter-search">
            <Icon name="search" size={15}/>
            <input
              className="filter-search-input"
              placeholder="Search by client name, lender or tracking number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="rm-filter-clear" onClick={() => setSearch("")}><Icon name="x" size={12}/></button>
            )}
          </div>
          <select className="filter-chip" value={lawyerFilter} onChange={(e) => setLawyerFilter(e.target.value)}>
            <option value="all">All lawyers</option>
            {LAWYERS.map(l => <option key={l.id} value={l.id}>{l.name.split(" ")[0]}</option>)}
          </select>
          <button
            className={`btn ${compact ? "btn-navy" : "btn-ghost"}`}
            onClick={() => setCompact(!compact)}
            title="Compact view"
          >
            <Icon name="menu" size={14}/> {compact ? "Compact" : "Spacious"}
          </button>
          <button className="btn btn-ghost"><Icon name="download" size={14}/> Export</button>
        </div>
        <div className="rm-help-strip">
          <Icon name="info" size={13}/>
          <span><strong>How this works:</strong> drag or click cards left → right as you receive docs, sign them, post out, and Royal Mail delivers. Use the green tick to enter a tracking number — the client gets it instantly by email + SMS.</span>
        </div>
      </section>

      <div className={`rm-kanban ${compact ? "is-compact" : ""}`}>
        <KanbanCol title="1 · Waiting for docs" subtitle="From the client" tone="warning" items={grouped.awaiting_signature} ctaLabel="Docs arrived" mode="receive" compact={compact} onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "awaiting_signature" ? "all" : "awaiting_signature")}/>
        <KanbanCol title="2 · Received · to sign" subtitle="In our office" tone="info" items={grouped.signed} ctaLabel="Mark signed" mode="sign" compact={compact} onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "signed" ? "all" : "signed")}/>
        <KanbanCol title="3 · Ready to post out" subtitle="Set address &amp; tracking" tone="info" items={grouped.ready_to_post} ctaLabel="Add tracking" mode="post" compact={compact} onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "ready_to_post" ? "all" : "ready_to_post")}/>
        <KanbanCol title="4 · Posted · in transit" subtitle="With Royal Mail" tone="muted" items={grouped.posted} ctaLabel="Mark delivered" mode="delivered" compact={compact} onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "posted" ? "all" : "posted")}/>
        <KanbanCol title="5 · Delivered" subtitle="Done" tone="success" items={grouped.delivered} ctaLabel="Close" mode="close" compact={compact} onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "delivered" ? "all" : "delivered")}/>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Dispatch log</h2>
          <div className="row gap-2">
            <span className="cell-sub">{filtered.length} matters · all time</span>
            <button className="btn btn-ghost"><Icon name="download" size={14}/> Export</button>
          </div>
        </header>
        <div className="table-wrap">
          <table className="dash-table dispatch-log-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Lawyer</th>
                <th>Recipient address</th>
                <th>Tracking #</th>
                <th>Service used</th>
                <th>Posted</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {wetBookings.map(b => (
                <DispatchLogRow key={b.ref} booking={b}/>
              ))}
            </tbody>
          </table>
        </div>
        <div className="dispatch-log-foot">
          <Icon name="info" size={12}/>
          <span><strong>Click any cell to edit.</strong> Changes save instantly · audit-logged · client is emailed + SMS-ed the moment a tracking number is added.</span>
        </div>
      </section>
    </div>
  );
};

// Editable dispatch log row — every cell is inline-editable so lawyers can
// correct mistakes without ever leaving the table view.
const DispatchLogRow = ({ booking }) => {
  const lawyer = LAWYERS.find(l => l.id === booking.lawyerId);
  const [data, setData] = React.useState({
    address: booking.recipientAddress || "",
    tracking: booking.trackingNumber || "",
    service: booking.trackingService || "",
    postedAt: (booking.dispatch === "posted" || booking.dispatch === "delivered") ? "26 May 17:42" : "",
    dispatch: booking.dispatch || "awaiting_signature",
  });
  const [editing, setEditing] = React.useState(null); // 'address' | 'tracking' | 'service' | 'postedAt' | 'dispatch'
  const [savedFlash, setSavedFlash] = React.useState(null);

  const startEdit = (field) => setEditing(field);
  const commit = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
    setEditing(null);
    setSavedFlash(field);
    setTimeout(() => setSavedFlash(null), 1200);
  };
  const cancel = () => setEditing(null);

  const cellCls = (field) => `dlog-cell ${savedFlash === field ? "is-saved" : ""}`;

  return (
    <tr className="dispatch-log-row">
      {/* Client name — not editable, identity */}
      <td>
        <div className="cell-strong">{booking.clientName}</div>
        <div className="cell-sub">{booking.lender || "—"}</div>
      </td>

      {/* Lawyer */}
      <td>
        <div className="row items-center gap-2">
          <Avatar lawyer={lawyer} size={22}/>
          <span>{lawyer.name.split(" ")[0]}</span>
        </div>
      </td>

      {/* Recipient address */}
      <td className={cellCls("address")}>
        {editing === "address" ? (
          <DlogInlineText
            initial={data.address}
            placeholder="Recipient, full UK address, postcode"
            multiline
            onSave={(v) => commit("address", v)}
            onCancel={cancel}
          />
        ) : (
          <button className="dlog-editable" onClick={() => startEdit("address")}>
            {data.address
              ? <span className="dlog-address">{data.address}</span>
              : <span className="dlog-empty"><Icon name="plus" size={12}/> Add address</span>}
            <Icon name="edit" size={11} className="dlog-edit-icon"/>
          </button>
        )}
      </td>

      {/* Tracking # */}
      <td className={cellCls("tracking")}>
        {editing === "tracking" ? (
          <DlogInlineText
            initial={data.tracking}
            placeholder="QY 0000 0000 0 GB"
            mono
            onSave={(v) => {
              commit("tracking", v);
              // Auto-advance to posted if was earlier stage
              if (v && (data.dispatch === "awaiting_signature" || data.dispatch === "signed" || data.dispatch === "ready_to_post")) {
                setData(d => ({ ...d, dispatch: "posted", postedAt: "today · just now" }));
              }
            }}
            onCancel={cancel}
          />
        ) : (
          <button className="dlog-editable" onClick={() => startEdit("tracking")}>
            {data.tracking
              ? <span className="mono dlog-tracking-pill">{data.tracking}</span>
              : <span className="dlog-empty"><Icon name="plus" size={12}/> Add tracking</span>}
            <Icon name="edit" size={11} className="dlog-edit-icon"/>
          </button>
        )}
      </td>

      {/* Service used — select */}
      <td className={cellCls("service")}>
        {editing === "service" ? (
          <DlogInlineSelect
            initial={data.service}
            options={["", "Special Delivery 1pm", "Special Delivery 9am", "Tracked 24", "Tracked 48", "Signed For 1st Class"]}
            blank="— select —"
            onSave={(v) => commit("service", v)}
            onCancel={cancel}
            autoFocus
          />
        ) : (
          <button className="dlog-editable" onClick={() => startEdit("service")}>
            {data.service || <span className="dlog-empty">—</span>}
            <Icon name="edit" size={11} className="dlog-edit-icon"/>
          </button>
        )}
      </td>

      {/* Posted date */}
      <td className={cellCls("postedAt")}>
        {editing === "postedAt" ? (
          <DlogInlineText
            initial={data.postedAt}
            placeholder="e.g. 27 May 16:00"
            onSave={(v) => commit("postedAt", v)}
            onCancel={cancel}
          />
        ) : (
          <button className="dlog-editable" onClick={() => startEdit("postedAt")}>
            {data.postedAt
              ? <span className="cell-mono">{data.postedAt}</span>
              : <span className="dlog-empty">—</span>}
            <Icon name="edit" size={11} className="dlog-edit-icon"/>
          </button>
        )}
      </td>

      {/* Status */}
      <td className={cellCls("dispatch")}>
        {editing === "dispatch" ? (
          <DlogInlineSelect
            initial={data.dispatch}
            options={["awaiting_signature", "signed", "ready_to_post", "posted", "delivered", "returned_undelivered"]}
            labels={{
              awaiting_signature: "Awaiting docs",
              signed: "Received · signed",
              ready_to_post: "Ready to post",
              posted: "Posted",
              delivered: "Delivered",
              returned_undelivered: "Returned",
            }}
            onSave={(v) => commit("dispatch", v)}
            onCancel={cancel}
            autoFocus
          />
        ) : (
          <button className="dlog-editable" onClick={() => startEdit("dispatch")}>
            <StatusPill status={data.dispatch}/>
            <Icon name="edit" size={11} className="dlog-edit-icon"/>
          </button>
        )}
      </td>
    </tr>
  );
};

// Inline text editor for log cells
const DlogInlineText = ({ initial, placeholder, mono, multiline, onSave, onCancel }) => {
  const [v, setV] = React.useState(initial || "");
  const inputRef = React.useRef(null);
  React.useEffect(() => { inputRef.current?.focus(); inputRef.current?.select?.(); }, []);

  const save = () => onSave(v.trim());
  const onKey = (e) => {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); save(); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  };

  return (
    <div className="dlog-inline">
      {multiline ? (
        <textarea
          ref={inputRef}
          className={`dlog-input ${mono ? "mono" : ""}`}
          value={v}
          placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={onKey}
          rows={2}
        />
      ) : (
        <input
          ref={inputRef}
          className={`dlog-input ${mono ? "mono" : ""}`}
          value={v}
          placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={onKey}
        />
      )}
      <button className="dlog-save" onClick={save} title="Save (Enter)"><Icon name="check" size={12} stroke={3}/></button>
      <button className="dlog-cancel" onClick={onCancel} title="Cancel (Esc)"><Icon name="x" size={12}/></button>
    </div>
  );
};

// Inline select editor for log cells
const DlogInlineSelect = ({ initial, options, labels, blank, onSave, onCancel }) => {
  const selectRef = React.useRef(null);
  React.useEffect(() => { selectRef.current?.focus(); }, []);

  return (
    <div className="dlog-inline">
      <select
        ref={selectRef}
        className="dlog-input"
        defaultValue={initial}
        onChange={(e) => onSave(e.target.value)}
        onBlur={onCancel}
        onKeyDown={(e) => e.key === "Escape" && onCancel()}
      >
        {options.map(o => (
          <option key={o} value={o}>
            {o === "" ? (blank || "—") : (labels?.[o] || o)}
          </option>
        ))}
      </select>
    </div>
  );
};

const KanbanCol = ({ title, subtitle, items, tone, ctaLabel, mode, compact, onOpenDetail, onHeaderClick }) => (
  <div className="kanban-col">
    <button
      className={`kanban-head kanban-head-${tone} ${onHeaderClick ? "is-clickable" : ""}`}
      onClick={onHeaderClick}
      type="button"
      title={onHeaderClick ? "Click to see all matters in this stage" : undefined}
    >
      <div>
        <div>{title}</div>
        {subtitle && <div className="kanban-head-sub">{subtitle}</div>}
      </div>
      <span className="kanban-count">{items.length}</span>
    </button>
    <div className="kanban-body">
      {items.length === 0 ? (
        <div className="kanban-empty">Nothing here</div>
      ) : items.map(b => (
        <KanbanCard key={b.ref} booking={b} mode={mode} ctaLabel={ctaLabel} onOpenDetail={onOpenDetail}/>
      ))}
    </div>
  </div>
);

const KanbanCard = ({ booking, mode, ctaLabel, onOpenDetail }) => {
  const [trackingMode, setTrackingMode] = React.useState(false);
  const [trackingValue, setTrackingValue] = React.useState("");
  const [saved, setSaved] = React.useState(false);

  const onCta = (e) => {
    e.stopPropagation();
    if (mode === "post") {
      setTrackingMode(true);
    } else if (mode === "delivered") {
      setSaved(true);
    } else {
      setSaved(true);
    }
  };

  const onSave = (e) => {
    if (e) e.stopPropagation();
    if (!trackingValue.trim()) return;
    setSaved(true);
    setTrackingMode(false);
  };

  const openDetail = () => onOpenDetail && onOpenDetail(booking.ref);

  return (
    <div className="kanban-card" onClick={openDetail} role="button" tabIndex={0}>
      <div className="kanban-card-head">
        <span className="kanban-lender">{booking.lender || "—"}</span>
      </div>
      <div className="kanban-name">{booking.clientName}</div>

      {/* Existing or newly-saved tracking */}
      {!trackingMode && (saved && trackingValue) && (
        <div className="kanban-track mono">{trackingValue}</div>
      )}
      {!trackingMode && booking.trackingNumber && !saved && (
        <div className="kanban-track mono">{booking.trackingNumber}</div>
      )}

      {trackingMode ? (
        <div className="kanban-track-entry">
          <input
            className="kanban-track-input mono"
            placeholder="QY 0000 0000 0 GB"
            value={trackingValue}
            onChange={(e) => setTrackingValue(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && onSave()}
          />
          <button className="kanban-track-save" onClick={onSave} disabled={!trackingValue.trim()}>
            <Icon name="check" size={12} stroke={3}/>
          </button>
          <button className="kanban-track-cancel" onClick={() => setTrackingMode(false)}>
            <Icon name="x" size={12}/>
          </button>
        </div>
      ) : saved && mode === "post" ? (
        <div className="kanban-saved">
          <Icon name="check" size={12} stroke={3}/> Saved &amp; client notified
        </div>
      ) : saved ? (
        <div className="kanban-saved">
          <Icon name="check" size={12} stroke={3}/> Moved on
        </div>
      ) : (
        <button className="kanban-cta" onClick={onCta}>{ctaLabel} <Icon name="arrow-right" size={12}/></button>
      )}
    </div>
  );
};

// ============================================================================
// View — Lawyers / availability mgmt
// ============================================================================
const LawyersView = () => {
  const [selected, setSelected] = React.useState(LAWYERS[0].id);
  const lawyer = LAWYERS.find(l => l.id === selected);

  // Block dates state — Set of yyyy-mm-dd strings the user has toggled off
  const [blockedSet, setBlockedSet] = React.useState(() => {
    const s = new Set();
    [5, 11].forEach(i => s.add(ymd(addDays(TODAY, i))));
    return s;
  });
  const toggleBlocked = (key) => {
    setBlockedSet(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  // Generate a simple 14-day availability strip
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(TODAY, i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const key = ymd(d);
    const bookings = 2 + ((i + selected.length) % 4); // pseudo
    days.push({
      date: d,
      key,
      bookings,
      capacity: 6,
      blocked: blockedSet.has(key),
      weekend: isWeekend,
    });
  }

  // Working hours grid (8am - 6pm)
  const workingHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        <KpiCard icon="users" label="Active lawyers" value={LAWYERS.length} hint="All SRA-regulated"/>
        <KpiCard icon="calendar" label="Slots open · next 7d" value="42" hint="Across all services"/>
        <KpiCard icon="star" label="Average client rating" value="4.93 / 5" hint={`${LAWYERS.reduce((s,l)=>s+l.reviews,0)} reviews`}/>
        <KpiCard icon="bolt" label="Avg turnaround" value="18h" delta="2h" deltaDir="up" hint="ILA certificate issued"/>
      </div>

      <div className="dash-grid-row two-col-narrow">
        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Team</h2>
            <button className="btn btn-navy"><Icon name="plus" size={14}/> Add lawyer</button>
          </header>
          <div className="lawyer-list">
            {LAWYERS.map(l => (
              <button
                key={l.id}
                className={`lawyer-list-row ${selected === l.id ? "is-active" : ""}`}
                onClick={() => setSelected(l.id)}
              >
                <Avatar lawyer={l} size={40}/>
                <div className="flex-1">
                  <div className="cell-strong">{l.name}</div>
                  <div className="cell-sub">{l.sra}</div>
                </div>
                <div className="lawyer-list-stats">
                  <div className="lawyer-list-stat">
                    <Icon name="calendar" size={11}/> {l.bookingsToday}
                  </div>
                  <div className="lawyer-list-stat">
                    <Icon name="star" size={11}/> {l.rating}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="panel lawyer-profile">
          <header className="panel-head">
            <div className="row items-center gap-3">
              <Avatar lawyer={lawyer} size={56}/>
              <div>
                <h2 className="panel-title">{lawyer.name}</h2>
                <p className="panel-sub">{lawyer.sra} · {lawyer.languages.join(" · ")}</p>
              </div>
            </div>
            <div className="row gap-2">
              <button className="btn btn-ghost"><Icon name="edit" size={14}/> Edit profile</button>
              <button className="btn btn-ghost"><Icon name="settings" size={14}/> Calendar sync</button>
            </div>
          </header>

          <div className="lawyer-profile-bio">{lawyer.bio}</div>

          <div className="lawyer-profile-grid">
            <div>
              <div className="aside-label">Services offered</div>
              <div className="row gap-2" style={{ marginTop: 6, flexWrap: "wrap" }}>
                {SERVICES.map(s => (
                  <span key={s.id} className={`pill ${lawyer.services.includes(s.id) ? "pill-info" : "pill-muted"}`}>
                    {lawyer.services.includes(s.id) ? <Icon name="check" size={11} stroke={3}/> : <Icon name="x" size={11} stroke={3}/>}
                    {s.short}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="aside-label">Calendar sync</div>
              <div className="row gap-3" style={{ marginTop: 6 }}>
                <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Google Calendar</span>
                <span className="pill pill-muted"><Icon name="x" size={11} stroke={3}/> Outlook</span>
              </div>
            </div>
            <div>
              <div className="aside-label">Daily booking cap</div>
              <div className="mono" style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--navy-900)" }}>6 per day</div>
            </div>
            <div>
              <div className="aside-label">Buffer before / after</div>
              <div className="mono" style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--navy-900)" }}>15 min · 15 min</div>
            </div>
          </div>

          <div className="lawyer-avail-head">
            <h3 className="panel-title-sm">Next 14 days · tap a day to block / unblock</h3>
            <div className="row gap-2">
              <span className="cell-sub">{blockedSet.size} day{blockedSet.size === 1 ? "" : "s"} blocked</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setBlockedSet(new Set())} disabled={blockedSet.size === 0}>
                <Icon name="x" size={12}/> Clear all
              </button>
            </div>
          </div>

          <div className="lawyer-avail-strip">
            {days.map((d, i) => {
              const pct = d.blocked ? 0 : d.bookings / d.capacity;
              return (
                <button
                  key={i}
                  className={`avail-day ${d.blocked ? "is-blocked" : ""} ${d.weekend ? "is-weekend" : ""}`}
                  onClick={() => toggleBlocked(d.key)}
                  title={d.blocked ? "Click to unblock" : "Click to block this day"}
                >
                  <div className="avail-dow">{["S","M","T","W","T","F","S"][d.date.getDay()]}</div>
                  <div className="avail-d">{d.date.getDate()}</div>
                  {d.blocked ? (
                    <div className="avail-bar-blocked">OFF</div>
                  ) : (
                    <div className="avail-bar">
                      <div className="avail-fill" style={{ height: `${pct * 100}%` }}/>
                    </div>
                  )}
                  <div className="avail-stat">{d.blocked ? "—" : `${d.bookings}/${d.capacity}`}</div>
                </button>
              );
            })}
          </div>

          <div className="lawyer-hours-head">
            <h3 className="panel-title-sm">Today · {fmtDateLong(TODAY)}</h3>
            <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Synced from Google Calendar</span>
          </div>
          <div className="lawyer-hours">
            {workingHours.map(h => {
              const bookings = BOOKINGS.filter(b => b.lawyerId === lawyer.id && b.date === ymd(TODAY) && parseInt(b.time) === h);
              const hasBooking = bookings.length > 0;
              return (
                <div key={h} className={`hour-cell ${hasBooking ? "is-busy" : ""}`}>
                  <div className="hour-lbl">{h.toString().padStart(2, "0")}:00</div>
                  {hasBooking && (
                    <div className="hour-event">
                      <div className="hour-event-name">{bookings[0].clientName}</div>
                      <div className="hour-event-svc">{SERVICES.find(s => s.id === bookings[0].serviceId).short}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

Object.assign(window, { DetailView, RoyalMailView, LawyersView });

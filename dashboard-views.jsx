/* global React, Icon, Avatar, StatusPill, ServiceBadge, SERVICES, LAWYERS, BOOKINGS, KPI, KpiCard, fmtDateLong, fmtDateShort, addDays, ymd, TODAY */

// ============================================================================
// View — Booking detail
// ============================================================================
const DetailView = ({ bookingRef, role = "admin", onBack }) => {
  // Re-render whenever the store changes (other tabs, portal updates, etc.)
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  const booking = BOOKINGS.find(b => b.ref === bookingRef) || BOOKINGS[0] || null;

  // Empty-state: no bookings exist OR the ref doesn't match
  if (!booking) {
    return (
      <div className="dash-grid">
        <div className="dash-grid-row">
          <button className="dash-breadcrumb" onClick={onBack}>
            <Icon name="arrow-left" size={14}/> Back
          </button>
        </div>
        <section className="panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ marginBottom: 12, color: "#5b6b76" }}><Icon name="doc" size={36}/></div>
          <h2 className="panel-title">No bookings yet</h2>
          <p className="panel-sub" style={{ maxWidth: 460, margin: "8px auto 16px" }}>
            Create your first booking via the public form, or use <strong>+ New booking</strong> in the top bar.
          </p>
          <button className="btn btn-navy" onClick={() => window.location.href = "?mode=booking"}>
            <Icon name="arrow-right" size={14}/> Open booking form
          </button>
        </section>
      </div>
    );
  }

  const svc = SERVICES.find(s => s.id === booking.serviceId) || { short: booking.serviceId || "—", duration: 45, name: booking.serviceId || "Service", icon: "doc", delivery: "digital" };
  const lawyer = LAWYERS.find(l => l.id === booking.lawyerId);
  const isWet = booking.serviceId === "wet";

  const [briefApproved, setBriefApproved] = React.useState(false);
  const [briefGenerating, setBriefGenerating] = React.useState(false);
  const [briefText, setBriefText] = React.useState(booking.aiBrief || "");
  const [briefError, setBriefError] = React.useState("");
  const [matterType, setMatterType] = React.useState(booking.matterType || "personal-guarantee");
  // Docs are sourced from the client's real portal uploads — no seeded demos.
  const [docs, setDocs] = React.useState([]);

  // Action menu + modal state
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [resOpen, setResOpen]   = React.useState(false);
  const [trkOpen, setTrkOpen]   = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [previewDoc, setPreviewDoc] = React.useState(null);
  const [changeServiceOpen, setChangeServiceOpen] = React.useState(false);
  const [closeOpen, setCloseOpen] = React.useState(false);

  // Real client-uploaded docs from store (KYC, matter)
  const uploadedDocs = FastILA.documents.list(booking.ref);
  const liveSignatures = FastILA.signatures.list(booking.ref);
  const internalNotes  = FastILA.bookings.notes(booking.ref);

  const currentMatter = MATTER_TYPES.find(m => m.id === matterType) || MATTER_TYPES[0];

  // Close action menu when clicking outside
  React.useEffect(() => {
    if (!moreOpen) return;
    const onDoc = () => setMoreOpen(false);
    setTimeout(() => document.addEventListener("click", onDoc), 0);
    return () => document.removeEventListener("click", onDoc);
  }, [moreOpen]);

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
            {booking.externallyClosedAt && (
              <span className="pill pill-success" title={`Closed by ${booking.externallyClosedBy || "admin"} on ${new Date(booking.externallyClosedAt).toLocaleDateString("en-GB")}`}>
                <Icon name="check" size={10} stroke={3}/> Closed
              </span>
            )}
            {booking.readyToCloseAt && !booking.externallyClosedAt && (
              <span className="pill pill-warning" title={`Marked ready to close by ${booking.readyToCloseBy || "lawyer"} on ${new Date(booking.readyToCloseAt).toLocaleString("en-GB", { day: "numeric", month: "short" })}`}>
                <Icon name="clock" size={10}/> Ready to close
              </span>
            )}
          </div>
          <h1 className="display detail-name">{booking.clientName}</h1>
          <div className="detail-meta">
            <span>{booking.date ? fmtDateLong(new Date(...booking.date.split("-").map((n, i) => i === 1 ? +n - 1 : +n))) : "—"}</span>
            <span className="dot-sep">·</span>
            <span>{booking.time} Europe/London</span>
            <span className="dot-sep">·</span>
            <span>{svc.duration} minutes</span>
          </div>
        </div>
        <div className="detail-head-actions" style={{ position: "relative" }}>
          <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setMoreOpen(o => !o); }} aria-label="More actions">
            <Icon name="more" size={16}/>
          </button>
          {moreOpen && (
            <div className="detail-more-menu" onClick={(e) => e.stopPropagation()} style={{
              position: "absolute", top: "100%", right: 0, marginTop: 6,
              background: "#fff", border: "1px solid #e4e8ec", borderRadius: 10,
              boxShadow: "0 18px 36px -16px rgba(6,57,82,0.25)", zIndex: 100,
              minWidth: 220, padding: 6,
            }}>
              {booking.status !== "completed" && (
                <button className="detail-more-item" onClick={() => { Actions.markComplete(booking.ref); setMoreOpen(false); }}>
                  <Icon name="check-circle" size={14}/> Mark complete
                </button>
              )}
              {booking.status === "completed" && (
                <button className="detail-more-item" onClick={() => { Actions.markScheduled(booking.ref); setMoreOpen(false); }}>
                  <Icon name="clock" size={14}/> Re-open booking
                </button>
              )}
              {booking.status !== "no-show" && (
                <button className="detail-more-item" onClick={() => { Actions.markNoShow(booking.ref); setMoreOpen(false); }}>
                  <Icon name="x-circle" size={14}/> Mark no-show
                </button>
              )}
              {booking.payment !== "paid" && (
                <button className="detail-more-item" onClick={() => { Actions.markPaid(booking.ref); setMoreOpen(false); }}>
                  <Icon name="pound" size={14}/> Mark payment received
                </button>
              )}
              <button className="detail-more-item" onClick={() => { setChangeServiceOpen(true); setMoreOpen(false); }}>
                <Icon name="edit" size={14}/> Change / upgrade service
              </button>
              {isWet && (booking.dispatch === "ready_to_post" || booking.dispatch === "signed" || !booking.trackingNumber) && (
                <button className="detail-more-item" onClick={() => { setTrkOpen(true); setMoreOpen(false); }}>
                  <Icon name="stamp" size={14}/> {booking.trackingNumber ? "Update tracking number" : "Add Royal Mail tracking"}
                </button>
              )}
              <button className="detail-more-item" onClick={() => { Actions.sendReminder(booking.ref); setMoreOpen(false); }}>
                <Icon name="mail" size={14}/> Send reminder (via n8n if connected)
              </button>
              <button className="detail-more-item" onClick={() => { setNoteOpen(true); setMoreOpen(false); }}>
                <Icon name="edit" size={14}/> Add internal note
              </button>
              <button className="detail-more-item" onClick={() => { Actions.copyToClipboard(booking.ref, `${booking.ref} copied`); setMoreOpen(false); }}>
                <Icon name="external" size={14}/> Copy reference
              </button>
              <div style={{ height: 1, background: "#eef0f3", margin: "6px 4px" }}/>
              {booking.status === "completed" && booking.status !== "closed" && !booking.readyToCloseAt && (
                <button className="detail-more-item" onClick={() => { setCloseOpen(true); setMoreOpen(false); }}>
                  <Icon name="check-circle" size={14}/> Mark ready to close
                </button>
              )}
              {booking.readyToCloseAt && !booking.externallyClosedAt && (
                <button className="detail-more-item" onClick={() => { Actions.unmarkReadyToClose(booking.ref); setMoreOpen(false); }}>
                  <Icon name="x" size={14}/> Un-mark for closure
                </button>
              )}
              {role === "admin" && booking.readyToCloseAt && !booking.externallyClosedAt && (
                <button className="detail-more-item" onClick={() => { Actions.markExternallyClosed(booking.ref, role); setMoreOpen(false); }}>
                  <Icon name="check" size={14}/> Confirm closed externally
                </button>
              )}
              {booking.status !== "cancelled" && (
                <button className="detail-more-item" onClick={() => { setCancelOpen(true); setMoreOpen(false); }} style={{ color: "#9a1c1c" }}>
                  <Icon name="trash" size={14}/> Cancel booking
                </button>
              )}
            </div>
          )}
          <button className="btn btn-ghost" onClick={() => setResOpen(true)}>
            <Icon name="edit" size={14}/> Reschedule
          </button>
          {booking.meetLink ? (
            <button className="btn btn-navy" onClick={() => {
              window.open(booking.meetLink, "_blank", "noopener");
              FastILA.bookings.addNote(booking.ref, "Opened Google Meet link");
            }}>
              <Icon name="video" size={14}/> Join Google Meet
            </button>
          ) : (
            <button className="btn btn-ghost" disabled title="A Meet link is created automatically when the assigned lawyer's Google Calendar is connected.">
              <Icon name="video" size={14}/> Meet link pending
            </button>
          )}
        </div>
      </div>

      {/* Audit pack — fast-access download bar for every signed PDF */}
      <AuditPackBar booking={booking} role={role}/>

      {/* Modals scoped to this booking */}
      <RescheduleModal open={resOpen} onClose={() => setResOpen(false)} booking={booking}
        onRescheduled={() => fiToast(`${booking.ref} rescheduled`)}/>
      <TrackingModal open={trkOpen} onClose={() => setTrkOpen(false)} booking={booking}/>
      <CancelConfirm open={cancelOpen} onClose={() => setCancelOpen(false)} booking={booking}/>
      <NoteModal open={noteOpen} onClose={() => setNoteOpen(false)} booking={booking}/>
      <DocPreviewModal open={!!previewDoc} onClose={() => setPreviewDoc(null)} doc={previewDoc}/>
      <ChangeServiceModal open={changeServiceOpen} onClose={() => setChangeServiceOpen(false)} booking={booking}/>
      <CloseMatterModal open={closeOpen} onClose={() => setCloseOpen(false)} booking={booking} role={role}/>

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
                  <span className="pill pill-muted">{docs.length} doc{docs.length === 1 ? "" : "s"} · brief not generated yet</span>
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
              {docs.length === 0 && uploadedDocs.filter(u => u.kind === "matter_doc").length === 0 ? (
                <button className="docs-empty" onClick={() => {
                  // Real file picker — uploads as matter docs
                  const inp = document.createElement("input");
                  inp.type = "file"; inp.multiple = true; inp.accept = ".pdf,.doc,.docx,image/*";
                  inp.onchange = async (e) => {
                    const files = Array.from(e.target.files || []);
                    for (const f of files) {
                      try { await FastILA.documents.upload(booking.ref, "matter_doc", f, role || "lawyer"); fiToast(`${f.name} uploaded`); }
                      catch (err) { fiToast("Upload failed: " + (err.message || err), "err"); }
                    }
                  };
                  inp.click();
                }}>
                  <div className="docs-empty-icon"><Icon name="package" size={28}/></div>
                  <div className="docs-empty-title">Upload the client's documents</div>
                  <div className="docs-empty-sub">PDF, DOCX, JPG/PNG · or wait for the client to upload via the portal</div>
                </button>
              ) : (
                <>
                  <div className="docs-list">
                    {docs.map((d, i) => (
                      <div key={i} className="doc-pill" onClick={() => setPreviewDoc(d)} style={{ cursor: "pointer" }}>
                        <div className="doc-pill-icon"><Icon name="doc" size={14}/></div>
                        <div className="doc-pill-info">
                          <div className="doc-pill-name">{d.name}</div>
                          <div className="doc-pill-meta">{d.pages} pages · {d.size}</div>
                        </div>
                        <button className="doc-pill-x" onClick={(e) => { e.stopPropagation(); setDocs(docs.filter((_, j) => j !== i)); }} aria-label="Remove"><Icon name="x" size={12}/></button>
                      </div>
                    ))}
                    {/* Live client uploads from the portal */}
                    {uploadedDocs.filter(u => u.kind === "matter_doc" || u.kind === "id_passport" || u.kind === "id_driving" || u.kind === "address_proof").map((u, i) => (
                      <div key={"live-" + i} className="doc-pill" style={{ borderColor: "#0a4a67", background: "#f0faff" }}>
                        <div className="doc-pill-icon" style={{ background: "#e6f7c8" }}><Icon name={u.kind.includes("id") ? "shield" : u.kind === "address_proof" ? "package" : "doc"} size={14}/></div>
                        <div className="doc-pill-info" style={{ cursor: "pointer" }} onClick={() => setPreviewDoc(u)}>
                          <div className="doc-pill-name">{u.filename}</div>
                          <div className="doc-pill-meta">
                            <span className="pill pill-info" style={{ marginRight: 6 }}>{u.kind.replace(/_/g, " ")}</span>
                            From client · {(u.size_bytes/1024).toFixed(0)} KB · {new Date(u.uploaded_at).toLocaleString("en-GB", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                          </div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); (window.fiPreviewDoc || FastILA.documents.openInTab)(u); }} title="Preview"><Icon name="external" size={12}/></button>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); FastILA.documents.downloadBlob(u); }} title="Download"><Icon name="download" size={12}/></button>
                      </div>
                    ))}
                    <button className="doc-add" onClick={() => {
                      // Open a real file picker — uploads as a matter doc into the booking
                      const inp = document.createElement("input");
                      inp.type = "file";
                      inp.multiple = true;
                      inp.accept = ".pdf,.doc,.docx,image/*";
                      inp.onchange = async (e) => {
                        const files = Array.from(e.target.files || []);
                        for (const f of files) {
                          try {
                            await FastILA.documents.upload(booking.ref, "matter_doc", f, role || "lawyer");
                            fiToast(`${f.name} uploaded`);
                          } catch (err) {
                            fiToast(`Upload failed: ${err.message || err}`, "err");
                          }
                        }
                      };
                      inp.click();
                    }}>
                      <Icon name="plus" size={14}/> Upload a real document
                    </button>
                  </div>
                  <div className="docs-zone-actions">
                    <div className="docs-zone-foot">
                      <Icon name="lock" size={12}/>
                      <span>Files encrypted · used only for this brief · no training use</span>
                    </div>
                    <button
                      className="btn btn-navy"
                      onClick={async () => {
                        setBriefGenerating(true);
                        setBriefApproved(false);
                        setBriefError("");
                        try {
                          const out = await window.fiGenerateBrief({
                            booking,
                            matterType,
                            docs: uploadedDocs.filter(u => u.kind === "matter_doc"),
                          });
                          if (out && out.text) {
                            setBriefText(out.text);
                            FastILA.bookings.update(booking.ref, { aiBrief: out.text, aiBriefAt: new Date().toISOString(), aiBriefProvider: out.provider });
                          } else if (out && out.error) {
                            setBriefError(out.error);
                          }
                        } catch (e) {
                          setBriefError(e.message || "Generation failed");
                        }
                        setBriefGenerating(false);
                      }}
                      disabled={briefGenerating}
                    >
                      <Icon name="sparkle" size={14}/>
                      {briefGenerating ? "Generating…" : (briefText ? "Regenerate brief" : "Generate brief")}
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

            {!briefGenerating && !briefText && (
              <div className="ai-block" style={{ padding: 20, textAlign: "center", color: "#5b6b76" }}>
                <Icon name="sparkle" size={26}/>
                <div style={{ marginTop: 8, fontWeight: 600, color: "#063952" }}>Brief not generated yet</div>
                <p style={{ fontSize: 13, maxWidth: 480, margin: "6px auto 0" }}>
                  Click <strong>Generate brief</strong> above to have the AI read the uploaded documents and produce a parties / loan terms / risks summary. Requires an Anthropic or OpenAI key in Integrations.
                </p>
                {briefError && <p style={{ fontSize: 12, marginTop: 8, color: "#9a1c1c" }}><Icon name="warning" size={11}/> {briefError}</p>}
              </div>
            )}
            {!briefGenerating && briefText && (
              <div className="ai-block" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, color: "#063952" }}>
                    <Icon name="sparkle" size={14}/> Pre-call brief
                    {booking.aiBriefProvider && <span className="pill pill-muted" style={{ marginLeft: 8 }}>{booking.aiBriefProvider}</span>}
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard?.writeText(briefText); fiToast("Brief copied"); }}>
                    <Icon name="external" size={12}/> Copy
                  </button>
                </div>
                <div className="ai-brief-body" style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.55, color: "#1f2933" }}>
                  {briefText}
                </div>
                {booking.aiBriefAt && (
                  <div style={{ fontSize: 11, color: "#8a99a4", marginTop: 10 }}>
                    Generated {new Date(booking.aiBriefAt).toLocaleString("en-GB")}
                  </div>
                )}
                {briefError && <p style={{ fontSize: 12, marginTop: 8, color: "#9a1c1c" }}><Icon name="warning" size={11}/> {briefError}</p>}
              </div>
            )}
          </section>

          {/* Post-call workflow — driven by real booking state */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="check-circle" size={16}/> After the call</h2>
              <span className="pill pill-muted">
                {booking.status === "completed" ? "Matter closed" : "Mark complete to close the matter"}
              </span>
            </header>
            <div className="post-call">
              {/* Call held — completed status */}
              <div className={`post-row ${booking.status !== "completed" ? "post-row-pending" : ""}`}>
                <div className={`post-mark ${booking.status !== "completed" ? "post-mark-pending" : ""}`}>
                  <Icon name={booking.status === "completed" ? "check" : "clock"} size={14} stroke={booking.status === "completed" ? 3 : 2}/>
                </div>
                <div className="flex-1">
                  <div className="post-title">Call held with the client</div>
                  <div className="post-meta">
                    {booking.time} · {svc?.duration || 45} min · Google Meet
                    {booking.status === "completed" && " · marked complete"}
                  </div>
                </div>
                {booking.status === "completed"
                  ? <span className="pill pill-success">Done</span>
                  : <button className="btn btn-navy btn-sm" onClick={() => Actions.markComplete(booking.ref)}>Mark complete</button>}
              </div>

              {/* Client care letter — show signed status + download button */}
              {(() => {
                const careSig = liveSignatures.find(s => s.kind === "care_letter");
                const mc = (booking.manualConfirms || {}).ccl_signed;
                if (!careSig && !mc) {
                  return (
                    <div className="post-row post-row-pending">
                      <div className="post-mark post-mark-pending"><Icon name="clock" size={14}/></div>
                      <div className="flex-1">
                        <div className="post-title">Client care letter signed</div>
                        <div className="post-meta">Client hasn't signed the CCL yet</div>
                      </div>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => Actions.confirmStep(booking.ref, "ccl_signed", role || "lawyer")} title="Manually mark this step as done">
                          <Icon name="check" size={11} stroke={3}/> Confirm
                        </button>
                        <span className="pill pill-muted">Awaiting</span>
                      </div>
                    </div>
                  );
                }
                if (!careSig && mc) {
                  return (
                    <div className="post-row">
                      <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                      <div className="flex-1">
                        <div className="post-title">Client care letter signed</div>
                        <div className="post-meta">
                          Manually confirmed{mc.by ? ` by ${mc.by}` : ""} · {new Date(mc.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => Actions.unconfirmStep(booking.ref, "ccl_signed")} title="Reverse this manual confirmation">
                        <Icon name="x" size={11}/> Un-confirm
                      </button>
                    </div>
                  );
                }
                const downloadCCL = async () => {
                  if (!window.fiBuildSignedCCL || !window.TemplateStore) { fiToast("PDF tools still loading"); return; }
                  const tpl = window.TemplateStore.bySubKind("ccl");
                  if (!tpl) { fiToast("Upload a CCL template first in Templates"); return; }
                  const bytes = await window.TemplateStore.getBytes(tpl);
                  const signatories = (booking.signatoriesSnapshot && booking.signatoriesSnapshot.length > 0)
                    ? booking.signatoriesSnapshot
                    : [{ name: careSig.signed_by, role: "Client", signature: careSig.signature_data, printName: careSig.signed_by, date: careSig.signed_at ? new Date(careSig.signed_at).toISOString().slice(0, 10) : null }];
                  await window.fiBuildSignedCCL({ templateBytes: bytes, signatories, bookingRef: booking.ref, clientName: booking.clientName });
                };
                return (
                  <div className="post-row">
                    <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                    <div className="flex-1">
                      <div className="post-title">Client care letter signed</div>
                      <div className="post-meta">Signed by {careSig.signed_by} · {new Date(careSig.signed_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <button className="btn btn-navy btn-sm" onClick={downloadCCL} title="Download the CCL with the client's signature stamped on it">
                      <Icon name="download" size={12}/> Signed CCL
                    </button>
                  </div>
                );
              })()}

              {/* Understanding declaration — show signed status + download button */}
              {(() => {
                const declSigsAll = liveSignatures.filter(s => s.kind === "declaration");
                const declSig = declSigsAll[0];
                const mcDecl = (booking.manualConfirms || {}).declaration_signed;
                if (!declSig && !mcDecl) {
                  return (
                    <div className="post-row post-row-pending">
                      <div className="post-mark post-mark-pending"><Icon name="clock" size={14}/></div>
                      <div className="flex-1">
                        <div className="post-title">Advice given &amp; understanding confirmed</div>
                        <div className="post-meta">Client hasn't signed the understanding declaration yet</div>
                      </div>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => Actions.confirmStep(booking.ref, "declaration_signed", role || "lawyer")} title="Manually mark this step as done">
                          <Icon name="check" size={11} stroke={3}/> Confirm
                        </button>
                        <span className="pill pill-muted">Awaiting</span>
                      </div>
                    </div>
                  );
                }
                if (!declSig && mcDecl) {
                  return (
                    <div className="post-row">
                      <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                      <div className="flex-1">
                        <div className="post-title">Advice given &amp; understanding confirmed</div>
                        <div className="post-meta">
                          Manually confirmed{mcDecl.by ? ` by ${mcDecl.by}` : ""} · {new Date(mcDecl.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => Actions.unconfirmStep(booking.ref, "declaration_signed")} title="Reverse this manual confirmation">
                        <Icon name="x" size={11}/> Un-confirm
                      </button>
                    </div>
                  );
                }
                const downloadDecl = () => {
                  if (!window.fiBuildDeclarationPDF) { fiToast("PDF library still loading"); return; }
                  const snap = booking.declarationSnapshot || {};
                  const bank = window.UNDERSTANDING_QUESTIONS || {};
                  const generic = window.GENERIC_QUESTIONS || { title: "Independent Legal Advice", items: [] };
                  const matterData = bank[snap.matterType] || generic;
                  // Prefer the multi-signatory snapshot — falls back to the single signature row.
                  const sigs = (snap.signatories && snap.signatories.length > 0)
                    ? snap.signatories
                    : [{ name: declSig.signed_by, role: "Client", signature: declSig.signature_data, printName: snap.printName || declSig.signed_by, date: snap.signedAt || (declSig.signed_at ? new Date(declSig.signed_at).toISOString().slice(0, 10) : null) }];
                  window.fiBuildDeclarationPDF({
                    bookingRef: booking.ref,
                    matterType: snap.matterType || "—",
                    matterTitle: matterData.title,
                    matterItems: matterData.items || [],
                    checks: snap.matterChecks || {},
                    declarations: snap.declarations || {},
                    signatories: sigs,
                    auditNote: `exported by ${role || "lawyer"} from booking detail`,
                  });
                };
                const names = declSigsAll.map(s => s.signed_by).filter(Boolean).join(", ");
                return (
                  <div className="post-row">
                    <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                    <div className="flex-1">
                      <div className="post-title">Advice given &amp; understanding confirmed{declSigsAll.length > 1 ? ` (${declSigsAll.length} signatories)` : ""}</div>
                      <div className="post-meta">Signed by {names || declSig.signed_by} · {new Date(declSig.signed_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <button className="btn btn-navy btn-sm" onClick={downloadDecl} title="Download the audit-grade signed declaration PDF">
                      <Icon name="download" size={12}/> Signed declaration
                    </button>
                  </div>
                );
              })()}

              {/* Issue certificate */}
              {(liveSignatures.some(s => s.kind === "certificate") || (booking.manualConfirms || {}).cert_issued) ? (
                <div className="post-row">
                  <div className="post-mark"><Icon name="check" size={14} stroke={3}/></div>
                  <div className="flex-1">
                    <div className="post-title">ILA certificate issued &amp; signed</div>
                    <div className="post-meta">
                      {(booking.manualConfirms || {}).cert_issued && !liveSignatures.some(s => s.kind === "certificate")
                        ? `Manually confirmed${booking.manualConfirms.cert_issued.by ? " by " + booking.manualConfirms.cert_issued.by : ""} · ${new Date(booking.manualConfirms.cert_issued.at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                        : "Sent to client & lender"}
                    </div>
                  </div>
                  {(booking.manualConfirms || {}).cert_issued && !liveSignatures.some(s => s.kind === "certificate") ? (
                    <button className="btn btn-ghost btn-sm" onClick={() => Actions.unconfirmStep(booking.ref, "cert_issued")} title="Reverse this manual confirmation">
                      <Icon name="x" size={11}/> Un-confirm
                    </button>
                  ) : (
                    <span className="pill pill-success">Done</span>
                  )}
                </div>
              ) : (
                <div className="post-row post-row-pending">
                  <div className="post-mark post-mark-pending"><Icon name="doc" size={14}/></div>
                  <div className="flex-1">
                    <div className="post-title">Issue the ILA certificate</div>
                    <div className="post-meta">{isWet ? "Wet signature — post via Royal Mail" : "Digital — email signed PDF to lender"}</div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => Actions.confirmStep(booking.ref, "cert_issued", role || "lawyer")}
                    title="Manually mark cert as issued (skip the workflow)"
                    style={{ marginRight: 6 }}
                  >
                    <Icon name="check" size={11} stroke={3}/> Confirm
                  </button>
                  {isWet
                    ? <button className="btn btn-navy btn-sm" onClick={() => setTrkOpen(true)}>
                        <Icon name="stamp" size={13}/> Add tracking
                      </button>
                    : <button className="btn btn-navy btn-sm" onClick={() => {
                        // Scroll the CertSignWorkflow into view + pulse it
                        let tries = 0;
                        const tick = () => {
                          const el = document.getElementById("cert-workflow-panel");
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                            el.style.boxShadow = "0 0 0 3px #e6f7c8";
                            setTimeout(() => { el.style.boxShadow = ""; }, 1600);
                            return;
                          }
                          if (++tries < 30) requestAnimationFrame(tick);
                          else fiToast("Cert workflow panel didn't open — scroll down");
                        };
                        requestAnimationFrame(tick);
                      }}>
                        <Icon name="arrow-down" size={13}/> Open cert workflow
                      </button>}
                </div>
              )}

              {/* Google review — only after complete */}
              {booking.status === "completed" && (
                <div className="post-row post-row-review">
                  <div className="post-mark post-mark-review"><Icon name="star" size={14}/></div>
                  <div className="flex-1">
                    <div className="post-title">Ask the client for a Google review</div>
                    <div className="post-meta">Sent via n8n + Resend if connected · best within 24h of the call</div>
                  </div>
                  <button className="btn btn-lime btn-sm" onClick={() => Actions.sendReminder(booking.ref, "review_request")}>
                    <Icon name="send" size={13}/> Send review request
                  </button>
                </div>
              )}

              {/* Custom lawyer to-do tasks — added per-booking */}
              <LawyerTasksSection booking={booking} role={role}/>
            </div>

            {/* Cert signing flow */}
            <CertSignWorkflow booking={booking} isWet={isWet} role={role}/>
          </section>

          {/* Client portal documents — derived from real Templates uploads + signatures */}
          {role === "admin" && (
          <section className="panel">
            <header className="panel-head">
              <div>
                <h2 className="panel-title"><Icon name="package" size={16}/> Client portal documents</h2>
                <p className="panel-sub">What the client sees in their portal — pulled from your Templates.</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => window.location.href = "?mode=dashboard&view=templates"}>
                <Icon name="external" size={12}/> Manage templates
              </button>
            </header>
            <div className="portal-docs-admin">
              {(() => {
                const tpls = (typeof window !== "undefined" && window.TemplateStore?.list?.()) || [];
                const ccl = tpls.find(t => t.subKind === "ccl");
                const bank = tpls.find(t => t.subKind === "bank");
                const careSig = liveSignatures.find(s => s.kind === "care_letter");
                const items = [
                  {
                    kind: "ccl",
                    title: "Client care letter",
                    desc: "Personalised to the client — they read &amp; sign this in the portal",
                    file: ccl ? { name: ccl.filename, size: `${Math.round((ccl.size||0)/1024)} KB` } : null,
                    signed: !!careSig,
                    signedMeta: careSig ? `Signed by ${careSig.signed_by} · ${new Date(careSig.signed_at).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}` : (ccl ? "Awaiting client signature" : "Upload the template first"),
                  },
                  {
                    kind: "bank",
                    title: "Bank account details",
                    desc: "The firm's client account — shown to the client on the Pay step",
                    file: bank ? { name: bank.filename, size: `${Math.round((bank.size||0)/1024)} KB` } : null,
                    signed: false,
                    signedMeta: bank ? "Read-only · download tracked" : "Upload the template first",
                  },
                ];
                return items.map(it => (
                  <PortalDocAdminRow
                    key={it.kind}
                    kind={it.kind}
                    title={it.title}
                    desc={it.desc}
                    file={it.file || { name: "Not uploaded", size: "—" }}
                    signed={it.signed}
                    signedMeta={it.signedMeta}
                  />
                ));
              })()}
            </div>
          </section>
          )}

          {/* Real client uploads — pulled from the booking's documents in the store */}
          <ClientUploadsPanel booking={booking} role={role} signatures={liveSignatures}/>

          {/* Call recording + auto transcript & AI file note (Phase 3) */}
          {typeof RecordingPanel === "function" && <RecordingPanel booking={booking} role={role}/>}

          {/* Returning client — previous matters + certificates (only if any) */}
          {typeof ClientHistoryList === "function" && booking.clientEmail && (() => {
            const prior = (window.FastILA?.clients?.historyByEmail ? FastILA.clients.historyByEmail(booking.clientEmail) : []).filter(b => b.ref !== booking.ref);
            if (!prior.length) return null;
            return (
              <section className="panel">
                <header className="panel-head">
                  <h2 className="panel-title"><Icon name="users" size={16}/> Returning client · {prior.length} previous {prior.length === 1 ? "matter" : "matters"}</h2>
                  <span className="cell-sub">Same email — full history &amp; certificates</span>
                </header>
                <div style={{ padding: "12px 18px" }}>
                  <ClientHistoryList email={booking.clientEmail} excludeRef={booking.ref}/>
                </div>
              </section>
            );
          })()}

          {/* Wet-signature panel — shows when the booking IS wet OR when the
              lawyer has explicitly picked "wet" mode from the cert workflow. */}
          {(isWet || booking.certMode === "wet") && <WetSignatureFlow booking={booking} role={role} onAddTracking={() => setTrkOpen(true)}/>}

          {/* Notes */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title"><Icon name="edit" size={16}/> Notes</h2>
              <span className="cell-sub">3 separate notebooks — pick where it goes</span>
            </header>
            <MatterNotes bookingRef={booking.ref}/>
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
              {(() => {
                const amt = Number(booking.amount) || 0;
                return (<>
                  <div className="aside-row aside-row-amt">
                    <span className="aside-label">{booking.payment === "paid" ? "Gross paid" : "Amount due"}</span>
                    <strong className="display">£{amt.toFixed(2)}</strong>
                  </div>
                  <div className="aside-row">
                    <span className="aside-label">Net (back-calc)</span>
                    <span className="mono">£{(amt / 1.2).toFixed(2)}</span>
                  </div>
                  <div className="aside-row">
                    <span className="aside-label">VAT 20%</span>
                    <span className="mono">£{(amt - amt / 1.2).toFixed(2)}</span>
                  </div>
                </>);
              })()}
              <PaymentReminder booking={booking} role={role}/>
            </div>
          </section>
          )}

          {/* Lawyer */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Lawyer</h2>
            </header>
            <div className="aside-body">
              {lawyer ? (
                <>
                  <div className="row gap-3 items-center">
                    <Avatar lawyer={lawyer} size={42}/>
                    <div>
                      <div className="cell-strong">{lawyer.name}</div>
                      <div className="cell-sub">{lawyer.sra}</div>
                    </div>
                  </div>
                  <div className="aside-row" style={{ marginTop: 14 }}>
                    <span className="aside-label">Languages</span>
                    <span>{(lawyer.languages || []).join(", ")}</span>
                  </div>
                </>
              ) : (
                <div className="cell-sub">No lawyer assigned yet — use Edit to assign.</div>
              )}
            </div>
          </section>

          {/* Audit log */}
          <section className="panel">
            <header className="panel-head">
              <h2 className="panel-title">Audit log</h2>
              <span className="cell-sub">Internal notes &amp; system events</span>
            </header>
            <div className="audit-list">
              {(internalNotes && internalNotes.length > 0) ? (
                [...internalNotes].reverse().map((n, i) => (
                  <div key={i} className="audit-row">
                    <span className="audit-time mono">
                      {new Date(n.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span>{n.text}</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: "16px 12px", textAlign: "center", color: "#5b6b76", fontSize: 13 }}>
                  No audit entries yet. Notes added via the ⋯ More menu show here.
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

// ============================================================================
// PostalInstructionsModal — lawyer composes the postal instructions message
// that's emailed + SMS'd to the client AND surfaces at the top of the
// client's portal wet-signature panel. AI draft button included.
// ============================================================================
const PostalInstructionsModal = ({ open, onClose, booking, onSend }) => {
  const firm = (window.FastILA && FastILA.firm && FastILA.firm.get && FastILA.firm.get()) || {};
  const lawyerName = ((window.LAWYERS || []).find(l => l.id === booking.lawyerId) || {}).name || "your solicitor";
  const firstName = ((booking && booking.clientName) || "").split(" ")[0] || "there";
  const firmName = firm.tradingAs || firm.firm || "Fast-ILA";
  const officeAddressDefault = firm.officeAddress || `${firmName}\n[Your office address — set in Settings → Firm profile]`;
  const defaultSubject = `Where to post your signed pack — ${booking.ref || ""}`;
  const defaultBody = `Hi ${firstName},\n\nOnce you've signed your lender documents in ink, please post the pack to us at:\n\n${officeAddressDefault}\n\nAddress the envelope FAO ${lawyerName} (ref ${booking.ref || "—"}).\n\nUse Royal Mail Signed For or Special Delivery so it's tracked. As soon as we receive it, we'll let you know — your solicitor will then sign + witness it and post it on to your lender, and you'll get the tracking number to follow it live.\n\nAny questions, just reply to this message.\n\nThanks,\n${firmName}`;

  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState(defaultBody);
  const [channels, setChannels] = React.useState({ email: true, sms: true });
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiError, setAiError] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject); setBody(defaultBody); setAiError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking && booking.ref]);

  const draftWithAI = async () => {
    if (!window.fiGenerateNote) { fiToast("AI helper not loaded"); return; }
    setAiBusy(true); setAiError("");
    try {
      const out = await window.fiGenerateNote({
        booking, tab: "reminder", currentText: body,
        extra: { intent: "Tell the client where to post their lender-signed pack to our office. Include the office address verbatim, lawyer name, ref, and a recommendation to use Royal Mail Signed For / Special Delivery." },
      });
      if (out && out.text) { setBody(out.text); fiToast(`Drafted with ${out.provider || "AI"}`); }
      else if (out && out.error) { setAiError(out.error); }
    } catch (e) { setAiError(e.message || "Generation failed"); }
    setAiBusy(false);
  };

  const send = async () => {
    setSending(true);
    const chosen = Object.keys(channels).filter(c => channels[c]);
    if (chosen.length === 0) { fiToast("Pick at least one channel"); setSending(false); return; }
    try { await onSend({ subject, body, channels: chosen }); } finally { setSending(false); }
  };

  if (!open) return null;
  const n8nConnected = window.fiIntegration?.isConnected?.("n8n");
  return (
    <div className="docpicker-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="docpicker" style={{ maxWidth: 620, width: "94%" }} onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>Send postal instructions to {booking.clientName || "the client"}</h3>
            <p className="cell-sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Saved on the client's portal under the wet-signature panel <strong>and</strong> sent via email + SMS through n8n.
            </p>
          </div>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>
        <div className="docpicker-body" style={{ display: "grid", gap: 12 }}>
          {(!firm.officeAddress) && (
            <div style={{ background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "#7a4f00" }}>
              <Icon name="warning" size={12}/> No firm office address set. Update it in <strong>Settings → Firm profile</strong> so the default text uses your real address.
            </div>
          )}
          <div>
            <label className="field-label">Subject</label>
            <input className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)}/>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label className="field-label" style={{ margin: 0 }}>Message</label>
              <button className="btn btn-lime btn-sm" onClick={draftWithAI} disabled={aiBusy}>
                <Icon name="sparkle" size={12}/> {aiBusy ? "Drafting…" : "Draft with AI"}
              </button>
            </div>
            <textarea
              className="field-input"
              rows={11}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: "inherit", resize: "vertical" }}
            />
            {aiError && (
              <div style={{ marginTop: 8, padding: 8, background: "#fbe9e7", border: "1px solid #f4c7c0", borderRadius: 6, fontSize: 12.5, color: "#8a2a18" }}>
                <Icon name="warning" size={11}/> {aiError}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="field-label" style={{ margin: 0 }}>Send via</span>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={channels.email} onChange={(e) => setChannels(c => ({ ...c, email: e.target.checked }))}/>
              <Icon name="mail" size={12}/> Email <span className="cell-sub">({booking.clientEmail || "—"})</span>
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, cursor: booking.phone ? "pointer" : "not-allowed", opacity: booking.phone ? 1 : 0.5 }}>
              <input type="checkbox" checked={channels.sms && !!booking.phone} disabled={!booking.phone} onChange={(e) => setChannels(c => ({ ...c, sms: e.target.checked }))}/>
              <Icon name="phone" size={12}/> SMS <span className="cell-sub">({booking.phone || "no phone"})</span>
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked disabled/>
              <Icon name="external" size={12}/> Show on portal <span className="cell-sub">(always)</span>
            </label>
          </div>
          {!n8nConnected && (
            <div style={{ background: "#fbe9e7", border: "1px solid #f4c7c0", borderRadius: 6, padding: 10, fontSize: 12.5, color: "#8a2a18" }}>
              <Icon name="info" size={12}/> <strong>n8n not connected</strong> — message will be saved + shown on the portal, but email/SMS won't be sent until n8n is connected.
            </div>
          )}
        </div>
        <footer className="docpicker-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-navy" onClick={send} disabled={sending || !body.trim()}>
            <Icon name="send" size={13}/> {sending ? "Sending…" : "Send instructions"}
          </button>
        </footer>
      </div>
    </div>
  );
};

// ============================================================================
// WetSignatureFlow — a numbered checklist with one ACTION BUTTON per step.
// Designed so a lawyer can land on a wet-sig matter and immediately see
// "the next thing I need to do". Each step writes to booking.dispatch so the
// status pill + kanban board update automatically.
//
// Stages: awaiting_signature → signed (docs received) → ready_to_post (lawyer
// signed) → posted → delivered. We also expose a "send cert pack to client"
// step which fires the n8n reminder webhook.
// ============================================================================
const WetSignatureFlow = ({ booking, role = "lawyer", onAddTracking }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const dispatch = booking.dispatch || "awaiting_signature";
  const tracking = booking.trackingNumber;

  // Editable post-to address (lender / conveyancer / back to client).
  const [postRecipient, setPostRecipient] = React.useState(booking.postRecipient || "lender");
  const [postName, setPostName] = React.useState(booking.postName || booking.lender || "");
  const [postAddress, setPostAddress] = React.useState(booking.postAddress || "");
  const [addrSaved, setAddrSaved] = React.useState(false);
  const saveAddress = async () => {
    await FastILA.bookings.update(booking.ref, { postRecipient, postName, postAddress });
    FastILA.bookings.addNote(booking.ref, `Post-to set: ${postName} (${postRecipient})`);
    setAddrSaved(true); setTimeout(() => setAddrSaved(false), 1600);
    fiToast("Postal address saved");
  };
  const addressReady = !!postName && !!postAddress;

  // Fire client-update via n8n if connected — keeps the client in the loop at
  // every stage change. Falls back to a toast-only log when n8n isn't set up.
  const notifyClient = (event, extra = {}) => {
    const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
    if (!n8n || !n8n.webhookUrl) return false;
    try {
      fetch(n8n.webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
        body: JSON.stringify({
          event, ref: booking.ref,
          clientName: booking.clientName, clientEmail: booking.clientEmail, phone: booking.phone,
          portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref),
          ...extra,
        }),
      }).catch(() => {});
    } catch (_e) {}
    return true;
  };

  // Stage helpers
  const isDone = (k) => {
    const order = ["pack_sent", "awaiting_signature", "signed", "ready_to_post", "posted", "delivered"];
    return order.indexOf(dispatch) > order.indexOf(k);
  };
  const isCurrent = (k) => {
    if (k === "pack_sent") return !booking.wetPackSentAt && dispatch === "awaiting_signature";
    if (k === "awaiting_signature") return dispatch === "awaiting_signature";
    if (k === "signed") return dispatch === "signed";
    if (k === "ready_to_post") return dispatch === "ready_to_post";
    if (k === "posted") return dispatch === "posted";
    if (k === "delivered") return dispatch === "delivered";
    return false;
  };

  // Action handlers — each writes to the booking, logs a note, and fires
  // an n8n event so the client gets an email/SMS automatically.
  const [postalModalOpen, setPostalModalOpen] = React.useState(false);
  const openPostalInstructions = () => setPostalModalOpen(true);
  const sendPackToClient = async ({ subject, body, channels }) => {
    // Persist instructions on the booking so the client portal can show them
    await FastILA.bookings.update(booking.ref, {
      wetPackSentAt: new Date().toISOString(),
      wetPostalInstructions: {
        subject: subject || "Postal instructions for your wet-signature pack",
        body,
        sentAt: new Date().toISOString(),
        sentBy: role || "lawyer",
        channels: channels || ["email", "sms"],
        firmAddress: postName && postAddress ? null : null, // placeholder for clarity
      },
    });
    FastILA.bookings.addNote(booking.ref, `Postal instructions sent to client (${(channels || ["email","sms"]).join(" + ")})`);
    notifyClient("booking.wet.pack_sent", { message: { subject, body, format: "text" }, channels: channels || ["email", "sms"] });
    fiToast("Instructions saved on client portal + sent via " + (channels || ["email","sms"]).join(" + "));
    setPostalModalOpen(false);
  };
  const markReceived = async () => {
    await FastILA.bookings.setDispatch(booking.ref, "signed");
    FastILA.bookings.addNote(booking.ref, "Signed pack received from client by post");
    notifyClient("booking.wet.client_pack_received");
    fiToast("Marked as received — client notified");
  };
  const markLawyerSigned = async () => {
    await FastILA.bookings.setDispatch(booking.ref, "ready_to_post");
    FastILA.bookings.addNote(booking.ref, "Solicitor signed & witnessed — ready to post to lender");
    notifyClient("booking.wet.solicitor_signed");
    fiToast("Marked as signed — ready to post");
  };
  const markPosted = async () => {
    if (!tracking) { onAddTracking && onAddTracking(); return; }
    if (!addressReady) { fiToast("Add a 'Post to' address first"); return; }
    await FastILA.bookings.setDispatch(booking.ref, "posted");
    FastILA.bookings.addNote(booking.ref, `Posted to ${postName} with ${booking.trackingService || "Royal Mail"} (${tracking})`);
    notifyClient("booking.wet.posted", { trackingNumber: tracking, trackingService: booking.trackingService, postedTo: postName });
    fiToast("Marked as posted — client notified with tracking");
  };
  const markDelivered = async () => {
    await FastILA.bookings.setDispatch(booking.ref, "delivered");
    FastILA.bookings.addNote(booking.ref, `Royal Mail confirmed delivery to ${postName || "recipient"}`);
    notifyClient("booking.wet.delivered", { postedTo: postName });
    fiToast("Marked as delivered — matter complete");
  };

  // Compute the headline "next action" so it's the first thing the lawyer sees
  let headline = null;
  if (!booking.wetPackSentAt) {
    headline = { text: "Email the client your office postal address so they can post their lender-signed pack to you.", action: "Send postal instructions", onClick: sendPackToClient, icon: "send" };
  } else if (dispatch === "awaiting_signature") {
    headline = { text: "Client should be posting the signed pack to your office. Mark received when it arrives.", action: "Mark received", onClick: markReceived, icon: "package" };
  } else if (dispatch === "signed") {
    headline = { text: "Pack received. Solicitor must now sign & witness in ink.", action: "Mark signed & witnessed", onClick: markLawyerSigned, icon: "edit" };
  } else if (dispatch === "ready_to_post") {
    if (!addressReady) {
      headline = { text: "Add the postal address (lender / conveyancer / client) before posting — see the Post-to block below.", action: null };
    } else if (!tracking) {
      headline = { text: `Address ready: ${postName}. Now add a Royal Mail tracking number before posting.`, action: "Add Royal Mail tracking", onClick: onAddTracking || (() => {}), icon: "plus" };
    } else {
      headline = { text: `Ready to post to ${postName} with tracking ${tracking}. Confirm once you've dropped it at the Post Office.`, action: "Mark posted", onClick: markPosted, icon: "stamp" };
    }
  } else if (dispatch === "posted") {
    headline = { text: "In transit with Royal Mail. Mark delivered once the lender confirms receipt.", action: "Mark delivered", onClick: markDelivered, icon: "check-circle" };
  } else if (dispatch === "delivered") {
    headline = { text: "Delivered to the lender. This wet-signature matter is complete.", action: null };
  }

  const Step = ({ n, k, title, sub, button }) => {
    const done = isDone(k);
    const cur  = isCurrent(k);
    return (
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12, padding: 12,
        background: done ? "#e8f5e9" : cur ? "#fff7e6" : "#f5f7f9",
        border: "1px solid " + (done ? "#b8e0bb" : cur ? "#f4d99a" : "#e4e8ec"),
        borderRadius: 8, marginBottom: 8,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
          background: done ? "#1e5128" : cur ? "#063952" : "#cfd8de",
          color: "white", display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 700, fontSize: 13,
        }}>
          {done ? <Icon name="check" size={13} stroke={3}/> : n}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: done ? "#1e5128" : "#063952", fontSize: 14 }}>{title}</div>
          {sub && <div style={{ fontSize: 12.5, color: "#5b6b76", marginTop: 2 }}>{sub}</div>}
        </div>
        {button && !done && cur && (
          <button className="btn btn-navy btn-sm" onClick={button.onClick} style={{ flexShrink: 0 }}>
            <Icon name={button.icon} size={12}/> {button.label}
          </button>
        )}
        {done && <span className="pill pill-success" style={{ flexShrink: 0 }}><Icon name="check" size={10} stroke={3}/> Done</span>}
      </div>
    );
  };

  return (
    <section className="panel" id="wet-flow-panel" style={{ transition: "box-shadow 200ms ease", scrollMarginTop: 80 }}>
      <header className="panel-head">
        <h2 className="panel-title"><Icon name="stamp" size={16}/> Wet signature flow — {booking.clientName}</h2>
        <StatusPill status={dispatch}/>
      </header>

      {/* Headline next-action card — the ONE thing the lawyer needs to do now */}
      {headline && (
        <div style={{
          margin: "12px 16px 8px",
          padding: 14,
          background: "#063952", color: "#e6f7c8", borderRadius: 8,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.7, textTransform: "uppercase" }}>Next action</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>{headline.text}</div>
          </div>
          {headline.action && (
            <button className="btn btn-lime btn-sm" onClick={headline.onClick}>
              <Icon name={headline.icon} size={13}/> {headline.action}
            </button>
          )}
        </div>
      )}

      <div style={{ padding: "8px 16px 16px" }}>
        <Step
          n={1}
          k="pack_sent"
          title="Send postal instructions to the client"
          sub={booking.wetPackSentAt
            ? `Sent ${new Date(booking.wetPackSentAt).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} · also visible on the client's portal`
            : "Compose a message with your office address. Sent via email + SMS via n8n, and shown at the top of the client's wet-signature portal panel."}
          button={{ icon: "send", label: booking.wetPackSentAt ? "Resend" : "Compose & send", onClick: openPostalInstructions }}
        />

        <PostalInstructionsModal
          open={postalModalOpen}
          onClose={() => setPostalModalOpen(false)}
          booking={booking}
          onSend={sendPackToClient}
        />
        <Step
          n={2}
          k="awaiting_signature"
          title="Client signs in ink & posts the pack back"
          sub="Mark received as soon as the envelope arrives at your office"
          button={{ icon: "package", label: "Mark received", onClick: markReceived }}
        />
        <Step
          n={3}
          k="signed"
          title="Solicitor signs & witnesses in ink"
          sub="Sign the certificate (and witness the client's signature where applicable) in black pen"
          button={{ icon: "edit", label: "Mark signed", onClick: markLawyerSigned }}
        />
        {/* Post-to address — sits between steps 3 and 4 so it's filled before posting */}
        <div style={{
          marginBottom: 8, padding: 12,
          background: addressReady ? "#f7fbf2" : "#fff7e6",
          border: "1px solid " + (addressReady ? "#cfe2b2" : "#f4d99a"),
          borderRadius: 8,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="package" size={14}/>
            <strong style={{ color: "#063952", fontSize: 13 }}>Post to</strong>
            {addressReady
              ? <span className="pill pill-success" style={{ marginLeft: "auto" }}><Icon name="check" size={10} stroke={3}/> Address set</span>
              : <span className="pill pill-warning" style={{ marginLeft: "auto" }}>Required before posting</span>}
            {addrSaved && <span className="pill pill-success" style={{ marginLeft: 6 }}>Saved</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 8, alignItems: "start" }}>
            <select className="field-input" value={postRecipient} onChange={(e) => setPostRecipient(e.target.value)}>
              <option value="lender">Lender</option>
              <option value="conveyancer">Conveyancer</option>
              <option value="client">Back to client</option>
              <option value="broker">Broker</option>
              <option value="other">Other</option>
            </select>
            <input
              className="field-input"
              placeholder={postRecipient === "lender" ? "e.g. Shawbrook Bank plc" : postRecipient === "client" ? "e.g. Priya Mehta" : "Recipient name"}
              value={postName}
              onChange={(e) => setPostName(e.target.value)}
            />
            <span style={{ fontSize: 11, color: "#5b6b76", paddingTop: 6 }}>Postal address</span>
            <textarea
              className="field-input"
              rows={3}
              placeholder={"1 Example Street\nLondon\nEC1A 1AA"}
              value={postAddress}
              onChange={(e) => setPostAddress(e.target.value)}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "#5b6b76" }}>This is the address the cert will be posted to. Royal Mail Special Delivery 1pm recommended for lenders.</span>
            <button className="btn btn-navy btn-sm" onClick={saveAddress} disabled={!postName || !postAddress}>
              <Icon name="check" size={12} stroke={3}/> Save address
            </button>
          </div>
        </div>

        <Step
          n={4}
          k="ready_to_post"
          title="Post to the recipient with Royal Mail tracking"
          sub={tracking ? `Tracking: ${booking.trackingService || "Royal Mail"} · ${tracking}` : "Use Royal Mail Special Delivery 1pm so you have a guaranteed receipt time"}
          button={{ icon: tracking ? "stamp" : "plus", label: tracking ? "Mark posted" : "Add tracking", onClick: tracking ? markPosted : (onAddTracking || (() => {})) }}
        />
        <Step
          n={5}
          k="posted"
          title="Royal Mail delivers to the lender"
          sub={tracking ? "Track delivery online; mark delivered once the lender confirms receipt" : "Add a tracking number first"}
          button={{ icon: "check-circle", label: "Mark delivered", onClick: markDelivered }}
        />

        {/* Tracking number block — always visible so it can be edited at any stage */}
        {tracking ? (
          <div style={{
            marginTop: 8, padding: 12,
            background: "#eaf5fb", border: "1px solid #b8d7e6", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap",
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#0a3a55", textTransform: "uppercase" }}>{booking.trackingService || "Royal Mail"}</div>
              <div style={{ fontFamily: "monospace", fontSize: 14, color: "#063952", marginTop: 2 }}>{tracking}</div>
            </div>
            <div className="row gap-2">
              <a className="btn btn-ghost btn-sm" href={`https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(tracking.replace(/\s/g, ""))}`} target="_blank" rel="noopener noreferrer">
                <Icon name="external" size={12}/> Track on Royal Mail
              </a>
              <button className="btn btn-ghost btn-sm" onClick={onAddTracking}>
                <Icon name="edit" size={12}/> Update
              </button>
            </div>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={onAddTracking} style={{ marginTop: 8 }}>
            <Icon name="plus" size={12}/> Add Royal Mail tracking now
          </button>
        )}
      </div>
    </section>
  );
};

// Cert signing workflow — lawyer uploads the signed ILA certificate here.
// Most lenders only need the solicitor's signature; for those that require the
// client to sign too, switch to "Lawyer + client" and the client will be asked
// to add their signature in the portal. Final executed PDF is downloadable
// by everyone (lawyer, admin, client).
const CertSignWorkflow = ({ booking, isWet, role = "lawyer" }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [mode, setMode] = React.useState(booking.certMode || (isWet ? "wet" : "lawyer-only"));
  const [uploading, setUploading] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const fileRef = React.useRef(null);

  const allDocs = FastILA.documents.list(booking.ref);
  const certLawyer = allDocs.find(d => d.kind === "cert_lawyer_signed");
  const certExecuted = allDocs.find(d => d.kind === "cert_executed");
  const sigs = FastILA.signatures.list(booking.ref);
  const clientCertSig = sigs.find(s => s.kind === "certificate");

  const switchMode = async (next) => {
    setMode(next);
    try { await FastILA.bookings.update(booking.ref, { certMode: next }); } catch (_e) {}
    fiToast(`Cert mode set to ${next.replace("-", " + ")}`);
  };

  const onPickCert = () => fileRef.current && fileRef.current.click();
  const onCertChosen = async (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setUploading(true);
    try {
      // Remove any prior lawyer-signed cert so we always have ONE current one
      const prior = allDocs.find(d => d.kind === "cert_lawyer_signed");
      if (prior && FastILA.documents.remove) {
        try { await FastILA.documents.remove(prior); } catch (_e) {}
      }
      await FastILA.documents.upload(booking.ref, "cert_lawyer_signed", f, role || "lawyer");
      await FastILA.bookings.update(booking.ref, { certUploadedAt: new Date().toISOString() });
      if (typeof window.fiNotify === "function") {
        window.fiNotify("Cert uploaded", `${f.name} — ${mode === "lawyer-only" ? "client can now download" : "awaiting client signature"}`, booking.ref, "success");
      }
      fiToast(`${f.name} uploaded`);
    } catch (err) {
      fiToast(`Upload failed: ${err.message || err}`, "err");
    }
    setUploading(false);
  };

  const downloadExecuted = async () => {
    // 1) Prefer a previously-stored executed cert document
    if (certExecuted) return FastILA.documents.downloadBlob(certExecuted);
    // 2) Otherwise build it on the fly from lawyer-signed + client signature
    if (!certLawyer || !clientCertSig || !clientCertSig.signature_data) {
      fiToast("Client hasn't signed yet"); return;
    }
    setDownloading(true);
    try {
      const blob = await FastILA.documents.getBlob ? FastILA.documents.getBlob(certLawyer) : null;
      const bytes = blob ? new Uint8Array(await blob.arrayBuffer()) : null;
      if (!bytes) { fiToast("Could not read lawyer-signed cert"); setDownloading(false); return; }
      await window.fiBuildExecutedCert({
        templateBytes: bytes,
        signature: clientCertSig.signature_data,
        printName: clientCertSig.signed_by,
        bookingRef: booking.ref,
        clientName: booking.clientName,
        signedAt: clientCertSig.signed_at ? new Date(clientCertSig.signed_at).toISOString().slice(0, 10) : null,
      });
    } finally { setDownloading(false); }
  };

  // Ensure the cert delivery email template exists. Auto-seeded so the firm
  // can start sending without having to author one from scratch.
  React.useEffect(() => {
    try {
      if (!FastILA.emailTemplates) return;
      const existing = FastILA.emailTemplates.list().find(t => t.systemId === "cert_delivery");
      if (!existing) {
        FastILA.emailTemplates.save({
          systemId: "cert_delivery",
          name: "Cert delivery (signed ILA)",
          subject: "Your signed ILA certificate — {{ref}}",
          body: `<!doctype html>
<html><body style="font-family: -apple-system, Inter, Helvetica, Arial, sans-serif; color: #1f2933; background: #f5f7f9; margin: 0; padding: 24px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden;">
    <tr><td style="padding: 28px 32px;">
      <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #5b6b76; text-transform: uppercase;">{{firmName}} · ILA Certificate</div>
      <h1 style="font-size: 24px; margin: 8px 0 4px; color: #063952;">Hi {{firstName}},</h1>
      <p style="font-size: 15px; line-height: 1.5; color: #3d4a52; margin: 12px 0;">Your signed ILA certificate is ready. The signed PDF is attached to this email — please forward it to your lender (or your conveyancer if they're handling it for you).</p>
      <p style="font-size: 15px; line-height: 1.5; color: #3d4a52; margin: 12px 0;">You can also download a fresh copy any time from your portal:</p>
      <p style="margin: 16px 0;"><a href="{{portalUrl}}" style="background: #063952; color: #e6f7c8; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 14px;">Open my portal</a></p>
      <h2 style="font-size: 15px; color: #063952; margin: 22px 0 6px;">What's next</h2>
      <ul style="font-size: 14px; line-height: 1.7; color: #3d4a52; padding-left: 18px;">
        <li>Forward the attached PDF to your lender (or to {{lender}} if you booked through us).</li>
        <li>Keep a copy for your records.</li>
        <li>If your lender raises any queries, reply to this email and we'll handle them.</li>
      </ul>
    </td></tr>
    <tr><td style="padding: 14px 32px 22px; border-top: 1px solid #eef0f3; font-size: 11px; color: #5b6b76;">
      Booking ref: {{ref}} · Issued by {{firmName}}<br/>
      This certificate has been signed by your solicitor and is provided as evidence of independent legal advice.
    </td></tr>
  </table>
</body></html>`,
        });
      }
    } catch (_e) {}
  }, []);

  const [emailing, setEmailing] = React.useState(false);

  const emailCertToClient = async () => {
    if (!certLawyer) { fiToast("Upload the signed cert first"); return; }
    setEmailing(true);
    try {
      // Resolve a download URL for the cert so n8n can fetch + attach it.
      // Live mode: Supabase signed URL via documents.openInTab logic.
      // Mock mode: there's no public URL — n8n won't have access to local IDB,
      // so we include the storage_key as a signal that the live integration
      // should pick this up once Supabase is connected.
      let certUrl = null;
      if (FastILA.documents.getBlob) {
        // (live mode) — would require fetching the signed URL here; for now
        // we pass storage_path which is what live mode populates.
        if (certLawyer.storage_path) {
          certUrl = certLawyer.storage_path;
        }
      }

      const tpl = FastILA.emailTemplates && FastILA.emailTemplates.list().find(t => t.systemId === "cert_delivery");
      const firm = (FastILA.firm && FastILA.firm.get && FastILA.firm.get()) || {};
      const firstName = (booking.clientName || "").split(" ")[0] || "there";
      const portalUrl = window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref);
      const substitute = (s) => String(s || "")
        .replace(/\{\{firstName\}\}/g, firstName)
        .replace(/\{\{fullName\}\}/g, booking.clientName || "")
        .replace(/\{\{ref\}\}/g, booking.ref || "")
        .replace(/\{\{firmName\}\}/g, firm.tradingAs || firm.firm || "Fast-ILA")
        .replace(/\{\{lender\}\}/g, booking.lender || "your lender")
        .replace(/\{\{portalUrl\}\}/g, portalUrl);

      const subject = substitute(tpl ? tpl.subject : `Your signed ILA certificate — ${booking.ref}`);
      const body    = substitute(tpl ? tpl.body : `Your signed cert is ready. Open your portal to download: ${portalUrl}`);

      // Fire the cert_delivered event with the cert reference so n8n can fetch + attach
      const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
      if (n8n && n8n.webhookUrl) {
        try {
          await fetch(n8n.webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
            body: JSON.stringify({
              event: "booking.cert_delivered",
              ref: booking.ref,
              clientName: booking.clientName,
              clientEmail: booking.clientEmail,
              phone: booking.phone,
              lender: booking.lender || null,
              portalUrl,
              certificate: {
                filename: certLawyer.filename,
                size_bytes: certLawyer.size_bytes,
                mime_type: certLawyer.mime_type,
                storage_path: certLawyer.storage_path || null,
                storage_key: certLawyer.storage_key || null,
                downloadUrl: certUrl,
              },
              message: { subject, body, format: "html" },
              templateName: tpl ? tpl.name : null,
              firm: { name: firm.tradingAs || firm.firm, supportEmail: firm.supportEmail },
              // Email credentials passed through if configured in Integrations.
              smtp: (() => {
                const s = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("smtp");
                if (!s || !s.password) return null;
                return {
                  provider: s.provider || "smtp",
                  host: s.host || null,
                  port: s.port ? Number(s.port) : null,
                  secure: s.secure === "true" || s.secure === true,
                  username: s.username || null,
                  password: s.password,
                  fromName: s.fromName || null,
                  fromEmail: s.fromEmail || null,
                  replyTo: s.replyTo || null,
                };
              })(),
            }),
          });
        } catch (_e) {}
      }

      await FastILA.bookings.update(booking.ref, {
        certDeliveredAt: new Date().toISOString(),
        certDeliveredBy: role || "lawyer",
      });
      FastILA.bookings.addNote(booking.ref, `Signed cert emailed to ${booking.clientEmail}`);
      if (typeof window.fiNotify === "function") {
        window.fiNotify("Cert delivered", `Signed ILA cert emailed to ${booking.clientName}`, booking.ref, "success");
      }
      fiToast(n8n && n8n.webhookUrl ? "Cert email fired via n8n + saved to client portal" : "Cert email saved (connect n8n to actually send by email)");
    } catch (e) {
      fiToast("Failed: " + (e.message || e), "err");
    }
    setEmailing(false);
  };

  // Jump the admin to the Broadcasts view focused on the cert delivery template
  const editCertEmailTemplate = () => {
    try { localStorage.setItem("fastila_broadcasts_focus_template", "cert_delivery"); } catch (_e) {}
    if (typeof window.fiSetDashView === "function") {
      window.fiSetDashView("broadcasts");
    } else {
      fiToast("Go to Broadcasts → Templates → 'Cert delivery (signed ILA)'");
    }
  };

  const options = [
    { id: "lawyer-only",   label: "Lawyer signs only",     desc: "Most common — the solicitor's signature is enough for the lender. Client downloads from their portal.", icon: "edit" },
    { id: "lawyer-client", label: "Lawyer + client signs", desc: "Some lenders require the signatory to sign too. Client signs in the portal; both sides get the executed PDF.", icon: "send" },
    { id: "wet",           label: "Wet signature",         desc: "Print, sign in ink, post via Royal Mail (tracked).", icon: "stamp" },
  ];

  const statusBase = {
    padding: "12px 14px",
    borderRadius: 8,
    marginTop: 12,
    fontSize: 13,
    lineHeight: 1.5,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  };
  const statusVariant = {
    warn:    { background: "#fff7e6", border: "1px solid #f4d99a", color: "#7a4f00" },
    info:    { background: "#eaf5fb", border: "1px solid #b8d7e6", color: "#0a3a55" },
    success: { background: "#e8f5e9", border: "1px solid #b8e0bb", color: "#1e5128" },
  };
  const jumpToWetFlow = () => {
    // The panel may have only just been added to the DOM (if the lawyer
    // toggled to wet mode this turn). Retry over a few frames until it's there.
    let tries = 0;
    const tick = () => {
      const el = document.getElementById("wet-flow-panel");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.style.boxShadow = "0 0 0 3px #e6f7c8";
        setTimeout(() => { el.style.boxShadow = ""; }, 1600);
        return;
      }
      if (++tries < 30) requestAnimationFrame(tick);
      else fiToast("Wet flow panel didn't open — try scrolling down to find it");
    };
    requestAnimationFrame(tick);
  };
  const renderStatus = () => {
    if (mode === "wet") {
      return (
        <div className="cert-status" style={{ ...statusBase, ...statusVariant.warn, alignItems: "center", flexWrap: "wrap" }}>
          <Icon name="stamp" size={14}/>
          <span style={{ flex: 1, minWidth: 220 }}><strong>Wet signature flow active.</strong> Manage the full process — receive from client, post-to address, Royal Mail tracking, client updates — in the dedicated wet panel.</span>
          <button className="btn btn-navy btn-sm" onClick={jumpToWetFlow} style={{ flexShrink: 0 }}>
            <Icon name="arrow-right" size={12}/> Open wet flow for this client
          </button>
        </div>
      );
    }
    if (!certLawyer) {
      return (
        <div className="cert-status" style={{ ...statusBase, ...statusVariant.info }}>
          <Icon name="info" size={14}/>
          <span>Upload the certificate after you've signed it. The client's portal will show <em>"Your lawyer is preparing your certificate"</em> until you do.</span>
        </div>
      );
    }
    if (mode === "lawyer-only") {
      return (
        <div className="cert-status" style={{ ...statusBase, ...statusVariant.success }}>
          <Icon name="check" size={14} stroke={3}/>
          <span><strong>Cert uploaded.</strong> The client can download it from their portal — no further signature needed.</span>
        </div>
      );
    }
    if (clientCertSig) {
      return (
        <div className="cert-status" style={{ ...statusBase, ...statusVariant.success }}>
          <Icon name="check" size={14} stroke={3}/>
          <span><strong>Fully executed.</strong> Both signatures captured. Download the executed PDF and forward to the lender.</span>
        </div>
      );
    }
    return (
      <div className="cert-status" style={{ ...statusBase, ...statusVariant.warn }}>
        <Icon name="clock" size={14}/>
        <span>Cert uploaded — awaiting the client's signature in the portal.</span>
      </div>
    );
  };

  return (
    <div className="esign-card" id="cert-workflow-panel" style={{ transition: "box-shadow 200ms ease", scrollMarginTop: 80 }}>
      <div className="esign-card-head">
        <div className="row items-center gap-3">
          <div className="esign-icon"><Icon name="award" size={18}/></div>
          <div>
            <div className="esign-title">ILA Certificate</div>
            <div className="esign-sub">Lender: {booking.lender || "—"}</div>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={onCertChosen}/>
      </div>
      <div className="esign-card-body">
        <div className="cert-mode-label">How is this cert being signed?</div>
        <div className="cert-mode-grid">
          {options.map(opt => (
            <button
              key={opt.id}
              className={`cert-mode ${mode === opt.id ? "is-active" : ""}`}
              onClick={() => switchMode(opt.id)}
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

        {renderStatus()}

        {mode !== "wet" && (
          <div className="esign-card-actions" style={{ marginTop: 14, flexWrap: "wrap", gap: 8 }}>
            <button className="btn btn-navy" onClick={onPickCert} disabled={uploading}>
              <Icon name="plus" size={14}/> {uploading ? "Uploading…" : (certLawyer ? "Replace signed certificate" : "Upload signed certificate (PDF)")}
            </button>
            {certLawyer && (
              <button className="btn btn-ghost" onClick={() => FastILA.documents.downloadBlob(certLawyer)}>
                <Icon name="download" size={13}/> Lawyer-signed PDF
              </button>
            )}
            {certLawyer && mode === "lawyer-only" && (
              <>
                <button className="btn btn-navy" onClick={emailCertToClient} disabled={emailing} title="Email the signed certificate to the client using the saved template. Cert is attached, and also visible in their portal.">
                  <Icon name="send" size={13}/> {emailing ? "Sending…" : (booking.certDeliveredAt ? "Re-send cert email" : "Email signed cert to client")}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={editCertEmailTemplate} title="Edit the cert delivery email template in Broadcasts">
                  <Icon name="edit" size={11}/> Edit template
                </button>
              </>
            )}
            {booking.certDeliveredAt && (
              <span className="pill pill-success" style={{ marginLeft: 4 }}>
                <Icon name="check" size={10} stroke={3}/> Emailed {new Date(booking.certDeliveredAt).toLocaleString("en-GB", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
              </span>
            )}
            {mode === "lawyer-client" && clientCertSig && (
              <button className="btn btn-lime" onClick={downloadExecuted} disabled={downloading}>
                <Icon name="download" size={13}/> {downloading ? "Building…" : "Executed PDF (client-signed)"}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="esign-extras">
        <div className="esign-extras-head">
          <Icon name="package" size={14}/>
          <span><strong>Audit trail.</strong> Every cert action is logged. The executed PDF carries a tamper-evident stamp page with timestamp + user-agent.</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CloseMatterModal — lawyer marks a completed booking as "ready to close".
// Captures an optional note (e.g. "client paid + lender confirmed", "cert
// received by lender"). Surfaces in admin's monthly closure report so the
// admin team can formally close the matter on the external platform.
// ============================================================================
const CloseMatterModal = ({ open, onClose, booking, role = "lawyer" }) => {
  const [note, setNote] = React.useState("");
  React.useEffect(() => { if (open) setNote(""); }, [open]);
  if (!open || !booking) return null;
  const submit = () => {
    Actions.markReadyToClose(booking.ref, role || "lawyer", note);
    onClose();
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Mark matter ready to close"
      subtitle={`${booking.ref} — ${booking.clientName}`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-navy" onClick={submit}>
            <Icon name="check" size={13}/> Mark ready to close
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13.5, color: "#3d4a52", lineHeight: 1.5, margin: "0 0 12px" }}>
        This adds the matter to the admin team's <strong>monthly closure report</strong>. They'll formally close it on the external system. You can un-mark it at any time before admin confirms closure.
      </p>
      <label className="field-label">Closure note (optional)</label>
      <textarea
        className="field-input"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. cert delivered to Shawbrook + payment matched + no outstanding queries"
        style={{ resize: "vertical" }}
      />
      <p style={{ fontSize: 11.5, color: "#5b6b76", marginTop: 8 }}>
        This note is shown to admin in the closure report.
      </p>
    </Modal>
  );
};

// ============================================================================
// LawyerTasksSection — lawyer-owned to-do list per booking. Anything that
// isn't already covered by the standard checklist (wet signature requested,
// lender hasn't received cert, client wants to re-schedule, etc.) lives here
// so the lawyer doesn't forget. Tasks can be re-opened after completion.
// ============================================================================
const LawyerTasksSection = ({ booking, role = "lawyer" }) => {
  const tasks = booking.lawyerTasks || [];
  const [draft, setDraft] = React.useState("");
  const [adding, setAdding] = React.useState(false);
  const open = tasks.filter(t => t.status !== "done");
  const done = tasks.filter(t => t.status === "done");

  const add = () => {
    const v = (draft || "").trim();
    if (!v) return;
    Actions.addLawyerTask(booking.ref, v, role || "lawyer");
    setDraft("");
    setAdding(false);
  };

  return (
    <div style={{ padding: "12px 16px 4px", borderTop: "1px solid #eef0f3", marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#063952" }}>
          <Icon name="check-circle" size={13}/>
          <strong style={{ fontSize: 13 }}>My tasks for this matter</strong>
          {open.length > 0 && <span className="pill pill-warning" style={{ fontSize: 10 }}>{open.length} open</span>}
          {done.length > 0 && <span className="pill pill-muted" style={{ fontSize: 10 }}>{done.length} done</span>}
        </div>
        {!adding && (
          <button className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>
            <Icon name="plus" size={11}/> Add task
          </button>
        )}
      </div>

      {adding && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          <input
            className="field-input"
            autoFocus
            placeholder="e.g. Client wants wet signature instead of digital"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") { setAdding(false); setDraft(""); } }}
            style={{ flex: 1, fontSize: 13, padding: "6px 10px" }}
          />
          <button className="btn btn-navy btn-sm" onClick={add} disabled={!draft.trim()}>
            <Icon name="check" size={11} stroke={3}/> Add
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => { setAdding(false); setDraft(""); }}>
            Cancel
          </button>
        </div>
      )}

      {tasks.length === 0 ? (
        <div style={{ padding: "8px 0", fontSize: 12.5, color: "#5b6b76" }}>
          No tasks yet. Add anything you need to remember for this matter — wet-sig requests, follow-ups, lender chases, etc.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 4 }}>
          {open.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 6 }}>
              <button
                onClick={() => Actions.completeLawyerTask(booking.ref, t.id, role || "lawyer")}
                title="Mark done"
                style={{ background: "white", border: "1.5px solid #cfd8de", borderRadius: 4, width: 18, height: 18, cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#063952", lineHeight: 1.4 }}>{t.title}</div>
                <div style={{ fontSize: 11, color: "#7a4f00", marginTop: 2 }}>
                  Added{t.createdBy ? ` by ${t.createdBy}` : ""} · {new Date(t.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button
                onClick={() => Actions.removeLawyerTask(booking.ref, t.id)}
                title="Delete task"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9a1c1c", padding: 2, flexShrink: 0 }}
              >
                <Icon name="trash" size={11}/>
              </button>
            </div>
          ))}
          {done.map(t => (
            <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 10px", opacity: 0.7 }}>
              <button
                onClick={() => Actions.uncompleteLawyerTask(booking.ref, t.id)}
                title="Re-open task"
                style={{ background: "#1e5128", border: "none", borderRadius: 4, width: 18, height: 18, cursor: "pointer", padding: 0, marginTop: 1, flexShrink: 0, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
              >
                <Icon name="check" size={11} stroke={3}/>
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: "#5b6b76", textDecoration: "line-through" }}>{t.title}</div>
                <div style={{ fontSize: 11, color: "#9aa6ad", marginTop: 2 }}>
                  Done{t.completedBy ? ` by ${t.completedBy}` : ""} · {new Date(t.completedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button
                onClick={() => Actions.removeLawyerTask(booking.ref, t.id)}
                title="Delete"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "#9aa6ad", padding: 2, flexShrink: 0 }}
              >
                <Icon name="trash" size={11}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// PaymentReminder — appears on the Payment & VAT panel when the client hasn't
// paid yet. Shows the payment reference + amount, lets the lawyer fire a
// reminder (email + SMS via n8n) with one click, and also marks the payment
// as received once it lands. Adapts copy to the current payment status.
// ============================================================================
const PaymentReminder = ({ booking, role = "admin" }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [busy, setBusy] = React.useState(false);
  const isPaid = booking.payment === "paid";
  const lastSent = booking.lastPaymentReminderAt;
  if (isPaid) {
    return (
      <div style={{ marginTop: 12, padding: 12, background: "#e8f5e9", border: "1px solid #b8e0bb", borderRadius: 8, fontSize: 12.5, color: "#1e5128", display: "flex", alignItems: "center", gap: 8 }}>
        <Icon name="check" size={13} stroke={3}/>
        <span><strong>Payment received.</strong></span>
      </div>
    );
  }
  const paymentRef = (window.fiPaymentReference ? window.fiPaymentReference(booking) : `KAO/${(booking.clientName || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || "CLIENTNAME"}`);
  const firm = (window.FastILA && FastILA.firm && FastILA.firm.get && FastILA.firm.get()) || {};
  const portalUrl = window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref);
  const firstName = ((booking.clientName || "").split(" ")[0] || "there");

  const sendReminder = async () => {
    setBusy(true);
    const amt = Number(booking.amount) || 0;
    const subject = `Payment reminder for your ILA call`;
    const body = `Hi ${firstName},\n\nA quick reminder that your ILA fee of £${amt.toFixed(2)} hasn't reached us yet. Please transfer to:\n\n${firm.clientAccount && firm.clientAccount.bank ? `Bank: ${firm.clientAccount.bank}\n` : ""}${firm.clientAccount && firm.clientAccount.sortCode ? `Sort code: ${firm.clientAccount.sortCode}\n` : ""}${firm.clientAccount && firm.clientAccount.account ? `Account no: ${firm.clientAccount.account}\n` : ""}Reference: ${paymentRef}\nAmount: £${amt.toFixed(2)}\n\nUse the reference exactly as shown so we can match your payment quickly.\n\nYou can also manage your booking here:\n${portalUrl}\n\nThanks,\nYour ILA solicitor`;
    const channels = booking.phone ? ["email", "sms"] : ["email"];
    const n8n = window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n");
    if (n8n && n8n.webhookUrl) {
      try {
        await fetch(n8n.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
          body: JSON.stringify({
            event: "booking.reminder.payment",
            ref: booking.ref, clientName: booking.clientName, clientEmail: booking.clientEmail, phone: booking.phone,
            amount: booking.amount, reference: paymentRef, portalUrl,
            message: { subject, body }, channels,
          }),
        });
      } catch (_e) {}
    }
    try {
      await FastILA.bookings.update(booking.ref, {
        lastPaymentReminderAt: new Date().toISOString(),
        lastPaymentReminderBy: role,
      });
    } catch (_e) {}
    FastILA.bookings.addNote(booking.ref, `Payment reminder sent (${channels.join(" + ")}) — ref ${paymentRef}`);
    if (typeof window.fiNotify === "function") {
      window.fiNotify("Payment reminder sent", `${booking.clientName} — £${amt.toFixed(2)} due`, booking.ref, "info");
    }
    fiToast(n8n && n8n.webhookUrl ? "Payment reminder fired via n8n (email + SMS)" : "Reminder logged (connect n8n to send email/SMS)");
    setBusy(false);
  };

  const markPaid = async () => {
    try { await Actions.markPaid(booking.ref); } catch (_e) {}
  };

  return (
    <div style={{ marginTop: 12, padding: 12, background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icon name="clock" size={14}/>
        <strong style={{ color: "#7a4f00", fontSize: 13 }}>Payment not received yet</strong>
      </div>
      <div style={{ fontSize: 12.5, color: "#5b3d00", lineHeight: 1.5 }}>
        Client should transfer <strong>£{(Number(booking.amount) || 0).toFixed(2)}</strong> to the firm's client account with reference <strong style={{ fontFamily: "monospace" }}>{paymentRef}</strong>.
      </div>
      {lastSent && (
        <div style={{ fontSize: 11, color: "#8a6b1a", marginTop: 6 }}>
          Last reminder sent {new Date(lastSent).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
        <button className="btn btn-navy btn-sm" onClick={sendReminder} disabled={busy}>
          <Icon name="mail" size={12}/> {busy ? "Sending…" : (lastSent ? "Resend reminder" : "Send payment reminder")}
        </button>
        <button className="btn btn-ghost btn-sm" onClick={markPaid}>
          <Icon name="check" size={12} stroke={3}/> Mark received
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

const MatterNotes = ({ bookingRef }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [activeTab, setActiveTab] = React.useState("client");
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiError, setAiError] = React.useState("");

  // Resolve current signed-in user for the "Last edited by" line
  const me = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("fastila_session_v1");
      const email = raw ? JSON.parse(raw).email : null;
      return email ? FastILA.users.findByEmail(email) : null;
    } catch (_e) { return null; }
  }, []);
  const myName = me?.fullName || me?.email || "You";

  // Notes are stored per-booking + per-tab so they persist
  const NOTES_KEY = `fastila_notes_${bookingRef || "no-ref"}`;
  const loadStored = () => {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      return raw ? JSON.parse(raw) : { client: "", admin: "", lawyer: "", savedAt: null, savedBy: null };
    } catch (_e) { return { client: "", admin: "", lawyer: "", savedAt: null, savedBy: null }; }
  };
  const [stored, setStored] = React.useState(loadStored);

  const updateNote = (val) => {
    const next = { ...stored, [activeTab]: val, savedAt: new Date().toISOString(), savedBy: myName };
    setStored(next);
    try { localStorage.setItem(NOTES_KEY, JSON.stringify(next)); } catch (_e) {}
  };

  // AI draft — generates a note tailored to the active tab (client / admin / lawyer).
  // Inserts straight into the textarea, replacing whatever's there (the lawyer
  // can undo with Ctrl+Z or edit). Existing text is passed in as context so a
  // partial draft gets refined rather than discarded.
  const draftWithAI = async () => {
    if (!window.fiGenerateNote) { fiToast("AI helper not loaded — refresh the page"); return; }
    setAiBusy(true);
    setAiError("");
    try {
      const booking = bookingRef ? FastILA.bookings.get(bookingRef) : null;
      const out = await window.fiGenerateNote({ booking, tab: activeTab, currentText: stored[activeTab] || "" });
      if (out && out.text) {
        updateNote(out.text);
        fiToast(`Drafted with ${out.provider || "AI"} — edit before saving`);
      } else if (out && out.error) {
        setAiError(out.error);
      }
    } catch (e) {
      setAiError(e.message || "Generation failed");
    }
    setAiBusy(false);
  };

  const active = NOTE_TABS.find(t => t.id === activeTab);
  const tabContent = stored[activeTab] || "";
  const lastEdited = stored.savedAt
    ? `Last edited by ${stored.savedBy || "You"} at ${new Date(stored.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
    : "No edits yet";

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
            {stored[t.id] && <span className="notes-tab-dot" title="Has content"/>}
          </button>
        ))}
      </div>
      <div className="notes-body">
        <div className={`notes-where notes-where-${activeTab}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }}>
            <Icon name={activeTab === "client" ? "send" : activeTab === "admin" ? "shield" : "lock"} size={13}/>
            <span>{active.where}</span>
          </span>
          <button
            className="btn btn-lime btn-sm"
            onClick={draftWithAI}
            disabled={aiBusy}
            title={tabContent ? "Refine what's already typed using AI" : `Draft a ${active.label.toLowerCase()} note with AI`}
            style={{ flexShrink: 0 }}
          >
            <Icon name="sparkle" size={12}/> {aiBusy ? "Drafting…" : (tabContent ? "Refine with AI" : "Draft with AI")}
          </button>
        </div>
        <textarea
          className="field-textarea"
          rows={5}
          value={tabContent}
          onChange={(e) => updateNote(e.target.value)}
          placeholder={active.placeholder}
        />
        {aiError && (
          <div style={{ marginTop: 8, padding: 10, background: "#fbe9e7", border: "1px solid #f4c7c0", borderRadius: 6, fontSize: 12.5, color: "#8a2a18" }}>
            <Icon name="warning" size={12}/> {aiError}
          </div>
        )}
        <div className="row justify-between" style={{ marginTop: 10 }}>
          <span className="cell-sub">{lastEdited}</span>
          {tabContent && <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Saved automatically</span>}
        </div>
      </div>
    </>
  );
};

// File row inside admin "Client uploads" panel
const ClientFileRow = ({ label, file, size, ts, signed, doc }) => {
  const [confirming, setConfirming] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const preview = () => {
    if (!doc) return;
    if (typeof window.fiPreviewDoc === "function") window.fiPreviewDoc(doc);
    else FastILA.documents.openInTab(doc);
  };
  const download = () => doc && FastILA.documents.downloadBlob(doc);
  // Lawyer/admin can ONLY delete files they (or another staff member) uploaded.
  // Client-uploaded documents are read-only on the firm side — protects the
  // audit trail. To remove their own files, the client uses the portal.
  const uploader = (doc && doc.uploaded_by) || "client";
  const canDelete = uploader !== "client";
  const doDelete = async () => {
    if (!doc) return;
    setDeleting(true);
    try {
      await FastILA.documents.remove(doc);
      fiToast(`${doc.filename} deleted`);
    } catch (e) {
      fiToast("Delete failed: " + (e.message || e), "err");
    }
    setDeleting(false);
    setConfirming(false);
  };
  return (
    <div className="client-file-row">
      <div className="client-file-icon"><Icon name={signed ? "edit" : "doc"} size={14}/></div>
      <div className="client-file-info">
        <div className="client-file-label">
          {label}
          {signed && <span className="pill pill-success" style={{ marginLeft: 8 }}><Icon name="check" size={10} stroke={3}/> Signed</span>}
          {!canDelete && doc && <span className="pill pill-muted" style={{ marginLeft: 8 }} title="Uploaded by the client — only they can remove it from the portal"><Icon name="lock" size={9}/> Client-owned</span>}
        </div>
        <div className="client-file-meta"><span className="mono">{file}</span> · {size} · {ts}</div>
      </div>
      <div className="row gap-2">
        <button className="btn btn-ghost btn-sm" onClick={preview} disabled={!doc}><Icon name="external" size={12}/> Preview</button>
        <button className="btn btn-navy btn-sm" onClick={download} disabled={!doc}><Icon name="download" size={12}/> Download</button>
        {canDelete && (
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(true)} disabled={!doc || deleting} title="Delete this file (you uploaded it)" style={{ color: "#9a1c1c" }}>
            <Icon name="trash" size={12}/>
          </button>
        )}
      </div>
      {confirming && (
        <div className="docpicker-overlay" onClick={() => setConfirming(false)} style={{ zIndex: 200 }}>
          <div className="docpicker" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="docpicker-head">
              <div>
                <h3 style={{ margin: 0 }}>Delete this document?</h3>
                <p className="cell-sub" style={{ margin: "4px 0 0", fontSize: 12, color: "#5b6b76" }}>
                  This permanently removes <strong>{doc && doc.filename}</strong> from this matter. This action cannot be undone.
                </p>
              </div>
            </header>
            <footer className="docpicker-foot" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={deleting}>Cancel</button>
              <button onClick={doDelete} disabled={deleting} style={{ background: "#9a1c1c", color: "white", border: "none", padding: "8px 14px", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}>
                <Icon name="trash" size={13}/> {deleting ? "Deleting…" : "Permanently delete"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// AuditPackBar — fast-access bar at the top of the booking detail page that
// surfaces every signed PDF the firm holds for this matter, so the lawyer or
// admin can grab the audit pack in one click (no scrolling needed).
// ----------------------------------------------------------------------------
const AuditPackBar = ({ booking, role }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const sigs = FastILA.signatures.list(booking.ref);
  const docs = FastILA.documents.list(booking.ref);
  const careSig = sigs.find(s => s.kind === "care_letter");
  const declSig = sigs.find(s => s.kind === "declaration");
  const certDoc = docs.find(d => d.kind === "cert_executed") || docs.find(d => d.kind === "cert_lawyer_signed");

  const downloadCCL = async () => {
    if (!window.fiBuildSignedCCL || !window.TemplateStore) return;
    const tpl = window.TemplateStore.bySubKind("ccl");
    if (!tpl) { fiToast("Upload a CCL template first in Templates"); return; }
    const bytes = await window.TemplateStore.getBytes(tpl);
    const signatories = (booking.signatoriesSnapshot && booking.signatoriesSnapshot.length > 0)
      ? booking.signatoriesSnapshot
      : [{ name: careSig.signed_by, role: "Client", signature: careSig.signature_data, printName: careSig.signed_by, date: careSig.signed_at ? new Date(careSig.signed_at).toISOString().slice(0, 10) : null }];
    await window.fiBuildSignedCCL({ templateBytes: bytes, signatories, bookingRef: booking.ref, clientName: booking.clientName });
  };
  const downloadDecl = () => {
    if (!window.fiBuildDeclarationPDF) return;
    const snap = booking.declarationSnapshot || {};
    const bank = window.UNDERSTANDING_QUESTIONS || {};
    const generic = window.GENERIC_QUESTIONS || { title: "Independent Legal Advice", items: [] };
    const matterData = bank[snap.matterType] || generic;
    const sigs = (snap.signatories && snap.signatories.length > 0)
      ? snap.signatories
      : [{ name: declSig.signed_by, role: "Client", signature: declSig.signature_data, printName: snap.printName || declSig.signed_by, date: snap.signedAt || (declSig.signed_at ? new Date(declSig.signed_at).toISOString().slice(0, 10) : null) }];
    window.fiBuildDeclarationPDF({
      bookingRef: booking.ref,
      matterType: snap.matterType || "—",
      matterTitle: matterData.title,
      matterItems: matterData.items || [],
      checks: snap.matterChecks || {},
      declarations: snap.declarations || {},
      signatories: sigs,
      auditNote: `exported by ${role || "lawyer"} from audit pack`,
    });
  };
  const downloadCert = () => certDoc && FastILA.documents.downloadBlob(certDoc);
  const downloadAll = async () => {
    if (careSig) { await downloadCCL(); await new Promise(r => setTimeout(r, 300)); }
    if (declSig) { downloadDecl(); await new Promise(r => setTimeout(r, 300)); }
    if (certDoc) { await downloadCert(); }
    fiToast("Audit pack downloads triggered — check your downloads folder");
  };

  const have = [careSig && "CCL", declSig && "Declaration", certDoc && (certDoc.kind === "cert_executed" ? "Executed cert" : "Lawyer-signed cert")].filter(Boolean);

  return (
    <div className="audit-pack-bar" style={{
      display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
      padding: "10px 14px", margin: "0 0 12px",
      background: "#063952", color: "#e6f7c8", borderRadius: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: "auto" }}>
        <Icon name="shield" size={14}/>
        <strong style={{ fontWeight: 700, letterSpacing: "0.02em" }}>Audit pack</strong>
        <span style={{ fontSize: 12, opacity: 0.75 }}>
          {have.length === 0 ? "No signed documents yet — they'll appear here as the client signs" : `${have.length} signed PDF${have.length === 1 ? "" : "s"} ready: ${have.join(" · ")}`}
        </span>
      </div>
      {careSig && (
        <button className="btn btn-ghost btn-sm" style={{ background: "rgba(230,247,200,0.12)", color: "#e6f7c8", borderColor: "transparent" }} onClick={downloadCCL}>
          <Icon name="download" size={12}/> Signed CCL
        </button>
      )}
      {declSig && (
        <button className="btn btn-ghost btn-sm" style={{ background: "rgba(230,247,200,0.12)", color: "#e6f7c8", borderColor: "transparent" }} onClick={downloadDecl}>
          <Icon name="download" size={12}/> Signed declaration
        </button>
      )}
      {certDoc && (
        <button className="btn btn-ghost btn-sm" style={{ background: "rgba(230,247,200,0.12)", color: "#e6f7c8", borderColor: "transparent" }} onClick={downloadCert}>
          <Icon name="download" size={12}/> {certDoc.kind === "cert_executed" ? "Executed certificate" : "Lawyer-signed cert"}
        </button>
      )}
      {have.length > 1 && (
        <button className="btn btn-lime btn-sm" onClick={downloadAll} title="Download every signed PDF sequentially">
          <Icon name="download" size={12}/> Download all
        </button>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// ClientUploadsPanel — shows REAL uploads from the client portal.
// Empty state guides the lawyer to send a reminder, reschedule, or cancel.
// ----------------------------------------------------------------------------
const ClientUploadsPanel = ({ booking, role, signatures }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const uploads = FastILA.documents.list(booking.ref);
  const [uploadInflight, setUploadInflight] = React.useState(0);
  const [reminderOpen, setReminderOpen] = React.useState(false);
  const fileRef = React.useRef(null);

  const idDocs        = uploads.filter(u => u.kind === "id_passport" || u.kind === "id_driving");
  const addressDocs   = uploads.filter(u => u.kind === "address_proof");
  const matterDocs    = uploads.filter(u => u.kind === "matter_doc");
  const careSigs      = signatures.filter(s => s.kind === "care_letter");
  const declSigs      = signatures.filter(s => s.kind === "declaration");

  const totalCount = uploads.length + signatures.length;
  const totalBytes = uploads.reduce((s, u) => s + (u.size_bytes || 0), 0);
  const fmtSize = (n) => n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n/1024).toFixed(0)} KB` : `${(n/(1024*1024)).toFixed(1)} MB`;
  const ts = (iso) => iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  // Lawyer-side upload — accepts MANY files at once (offer letter pack, schedules, etc.)
  const onPickFile = () => fileRef.current?.click();
  const onFileChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadInflight(files.length);
    let ok = 0;
    for (const f of files) {
      try {
        await FastILA.documents.upload(booking.ref, "matter_doc", f, role || "lawyer");
        ok++;
      } catch (err) {
        fiToast(`${f.name}: ${err.message || err}`, "err");
      }
      setUploadInflight(n => n - 1);
    }
    fiToast(`${ok} of ${files.length} file${files.length === 1 ? "" : "s"} uploaded to ${booking.ref}`);
    e.target.value = "";
  };

  const sendComposedReminder = async ({ subject, body, channels }) => {
    const n8n = window.fiIntegration?.get?.("n8n");
    if (n8n?.webhookUrl) {
      try {
        await fetch(n8n.webhookUrl, {
          method: "POST",
          headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
          body: JSON.stringify({
            event: "booking.reminder.upload_documents",
            ref: booking.ref,
            clientName: booking.clientName,
            clientEmail: booking.clientEmail,
            phone: booking.phone,
            appointmentDate: booking.date,
            appointmentTime: booking.time,
            portalUrl: window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref),
            message: { subject, body },
            channels: channels || ["email", "sms"],
          }),
        });
      } catch (_e) {}
    }
    // Persist on the booking so the client portal shows the message in their docs step.
    try {
      await FastILA.bookings.update(booking.ref, {
        pendingClientMessage: {
          subject: subject || "Documents needed",
          body,
          sentAt: new Date().toISOString(),
          sentBy: role || "lawyer",
          channels: channels || ["email", "sms"],
        },
      });
    } catch (_e) {}
    FastILA.bookings.addNote(booking.ref, `Reminder sent to client (${(channels || ["email","sms"]).join(" + ")}): ${subject || body.slice(0, 60)}…`);
    if (typeof window.fiNotify === "function") {
      window.fiNotify("Reminder sent", `Asked ${booking.clientName} to upload documents`, booking.ref, "info");
    }
    fiToast(n8n?.webhookUrl ? "Reminder fired via n8n (email + SMS)" : "Reminder saved + shown on client portal (connect n8n to also email/SMS)");
    setReminderOpen(false);
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2 className="panel-title"><Icon name="package" size={16}/> Client uploads</h2>
          <p className="panel-sub">
            {role === "admin" ? "Real-time view of what the client has submitted via the portal." : "Check the client's ID & proof of address before the call."}
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost btn-sm" onClick={onPickFile} disabled={uploadInflight > 0}>
            <Icon name="plus" size={12}/> {uploadInflight > 0 ? `Uploading ${uploadInflight}…` : "Upload on behalf of client"}
          </button>
          {matterDocs.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={async () => {
              for (const u of matterDocs) { await FastILA.documents.downloadBlob(u); await new Promise(r => setTimeout(r, 200)); }
              fiToast(`Downloaded ${matterDocs.length} matter file${matterDocs.length === 1 ? "" : "s"}`);
            }}>
              <Icon name="download" size={12}/> Download all matter docs
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx,image/*" hidden onChange={onFileChosen}/>
      </header>
      {matterDocs.length > 0 && (
        <div style={{ padding: "10px 16px 0", display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#063952" }}>
          <Icon name="package" size={14}/>
          <span><strong>{matterDocs.length}</strong> matter doc{matterDocs.length === 1 ? "" : "s"} {totalBytes > 0 && <span style={{ color: "#5b6b76" }}>· {fmtSize(totalBytes)} total</span>}</span>
          {uploadInflight > 0 && <span style={{ color: "#b06b00", fontWeight: 600 }}>· {uploadInflight} uploading…</span>}
          <span style={{ marginLeft: "auto", color: "#5b6b76", fontSize: 12 }}>Use these for the AI brief generated in the panel above.</span>
        </div>
      )}

      {totalCount === 0 ? (
        // Empty state — guide the lawyer to send a reminder / reschedule / cancel
        <div style={{ padding: 24 }}>
          <div style={{ textAlign: "center", color: "#5b6b76", marginBottom: 16 }}>
            <Icon name="package" size={32}/>
            <div style={{ marginTop: 10, fontWeight: 600, color: "#063952" }}>The client hasn't uploaded anything yet</div>
            <p style={{ fontSize: 13, marginTop: 6, maxWidth: 480, marginInline: "auto" }}>
              They need to complete the portal steps: sign the client care letter, upload ID + proof of address, and upload the documents you'll be advising on.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-navy btn-sm" onClick={() => setReminderOpen(true)}>
              <Icon name="mail" size={13}/> Send reminder
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const portalUrl = window.location.origin + window.location.pathname + "?mode=portal&ref=" + encodeURIComponent(booking.ref);
              if (navigator.clipboard) navigator.clipboard.writeText(portalUrl);
              fiToast("Portal link copied — paste into an email");
            }}>
              <Icon name="external" size={13}/> Copy portal link
            </button>
          </div>
        </div>
      ) : (
        <div className="client-uploads" style={{ padding: 16 }}>
          {/* Client signatures */}
          {careSigs.length > 0 && (
            <div className="client-uploads-group">
              <div className="client-uploads-name">
                <Icon name="edit" size={16}/>
                <span><strong>Client care letter</strong> · signed by client</span>
              </div>
              {careSigs.map((s, i) => {
                const downloadSignedCCL = async () => {
                  if (!window.fiBuildSignedCCL || !window.TemplateStore) { fiToast("PDF tools still loading"); return; }
                  const tpl = window.TemplateStore.bySubKind("ccl");
                  if (!tpl) { fiToast("Upload a CCL template first in Templates"); return; }
                  const bytes = await window.TemplateStore.getBytes(tpl);
                  // Prefer the persisted signatories snapshot (covers multi-signatory matters);
                  // fall back to the single signature row from the SIGNATURES store.
                  const signatories = (booking.signatoriesSnapshot && booking.signatoriesSnapshot.length > 0)
                    ? booking.signatoriesSnapshot
                    : [{
                        name: s.signed_by,
                        role: "Client",
                        signature: s.signature_data,
                        printName: s.signed_by,
                        date: s.signed_at ? new Date(s.signed_at).toISOString().slice(0, 10) : null,
                      }];
                  await window.fiBuildSignedCCL({
                    templateBytes: bytes,
                    signatories,
                    bookingRef: booking.ref,
                    clientName: booking.clientName,
                  });
                };
                return (
                  <div key={i} className="client-file-row">
                    <div className="client-file-icon"><Icon name="edit" size={14}/></div>
                    <div className="client-file-info">
                      <div className="client-file-label">Signed by {s.signed_by}<span className="pill pill-success" style={{ marginLeft: 8 }}><Icon name="check" size={10} stroke={3}/> Signed</span></div>
                      <div className="client-file-meta">{ts(s.signed_at)}{s.user_agent ? " · " + (s.user_agent.includes("Mobile") ? "Mobile" : "Desktop") : ""}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={downloadSignedCCL} title="Download the CCL with the client's signature stamped on it (audit-grade)">
                      <Icon name="download" size={12}/> Signed CCL
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {(idDocs.length > 0 || addressDocs.length > 0) && (
            <div className="client-uploads-group">
              <div className="client-uploads-name">
                <Icon name="shield" size={16}/>
                <span><strong>ID &amp; proof of address</strong></span>
              </div>
              {idDocs.map(d => (
                <ClientFileRow key={d.id || d.storage_key} label={d.kind === "id_passport" ? "Photo ID (passport)" : "Photo ID (driving licence)"} file={d.filename} size={`${(d.size_bytes/1024).toFixed(0)} KB`} ts={ts(d.uploaded_at)} doc={d}/>
              ))}
              {addressDocs.map(d => (
                <ClientFileRow key={d.id || d.storage_key} label="Proof of address" file={d.filename} size={`${(d.size_bytes/1024).toFixed(0)} KB`} ts={ts(d.uploaded_at)} doc={d}/>
              ))}
            </div>
          )}

          {declSigs.length > 0 && (
            <div className="client-uploads-group">
              <div className="client-uploads-name">
                <Icon name="check-circle" size={16}/>
                <span><strong>Understanding declaration</strong> — client confirmed they understood the key risks</span>
              </div>
              {declSigs.map((s, i) => {
                const snap = booking.declarationSnapshot || {};
                const onDownload = () => {
                  if (!window.fiBuildDeclarationPDF) return;
                  const bank = window.UNDERSTANDING_QUESTIONS || {};
                  const generic = window.GENERIC_QUESTIONS || { title: "Independent Legal Advice", items: [] };
                  const matterData = bank[snap.matterType] || generic;
                  // Use the full multi-signatory snapshot when present so all
                  // signatures appear on the PDF — fall back to single sig.
                  const sigs = (snap.signatories && snap.signatories.length > 0)
                    ? snap.signatories
                    : declSigs.map(d => ({ name: d.signed_by, role: "Client", signature: d.signature_data, printName: d.signed_by, date: d.signed_at ? new Date(d.signed_at).toISOString().slice(0, 10) : null }));
                  window.fiBuildDeclarationPDF({
                    bookingRef: booking.ref,
                    matterType: snap.matterType || "—",
                    matterTitle: matterData.title,
                    matterItems: matterData.items || [],
                    checks: snap.matterChecks || {},
                    declarations: snap.declarations || {},
                    signatories: sigs,
                    auditNote: `exported by ${role || "lawyer"} from admin console`,
                  });
                };
                return (
                  <div key={i} className="client-file-row">
                    <div className="client-file-icon"><Icon name="edit" size={14}/></div>
                    <div className="client-file-info">
                      <div className="client-file-label">Signed by {s.signed_by}<span className="pill pill-success" style={{ marginLeft: 8 }}><Icon name="check" size={10} stroke={3}/> Confirmed</span></div>
                      <div className="client-file-meta">{ts(s.signed_at)}</div>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onDownload} title="Download the audit-grade signed declaration PDF">
                      <Icon name="download" size={12}/> Signed PDF
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {matterDocs.length > 0 && (
            <div className="client-uploads-group">
              <div className="client-uploads-name">
                <Icon name="package" size={16}/>
                <span><strong>Matter documents</strong> — {matterDocs.length} file{matterDocs.length === 1 ? "" : "s"} for this ILA call</span>
              </div>
              {matterDocs.map(d => (
                <ClientFileRow key={d.id || d.storage_key} label={d.filename} file={d.filename} size={fmtSize(d.size_bytes || 0)} ts={ts(d.uploaded_at)} doc={d}/>
              ))}
            </div>
          )}

          <div style={{ padding: "12px 4px", display: "flex", gap: 8, flexWrap: "wrap", borderTop: "1px solid #eef0f3", marginTop: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setReminderOpen(true)}>
              <Icon name="mail" size={12}/> Send reminder to upload more
            </button>
          </div>
        </div>
      )}

      <ReminderComposeModal
        open={reminderOpen}
        onClose={() => setReminderOpen(false)}
        booking={booking}
        uploads={uploads}
        onSend={sendComposedReminder}
      />
    </section>
  );
};

// ============================================================================
// ReminderComposeModal — lawyer composes the document-upload reminder message
// the client receives via email + SMS, and which also appears at the top of
// their portal Documents step. Includes an AI draft button that pulls the
// matter context (missing docs, appointment, lender, etc.) and produces a
// warm, plain-English ask.
// ============================================================================
const ReminderComposeModal = ({ open, onClose, booking, uploads = [], onSend }) => {
  const firstName = ((booking && booking.clientName) || "").split(" ")[0] || "there";
  const matterCount = uploads.filter(u => u.kind === "matter_doc").length;
  const hasId = uploads.some(u => u.kind === "id_passport" || u.kind === "id_driving");
  const hasAddr = uploads.some(u => u.kind === "address_proof");
  const missing = [
    !hasId && "photo ID (passport or driving licence)",
    !hasAddr && "recent proof of address (utility / bank statement)",
    matterCount === 0 && "the lender documents you're being asked to sign",
  ].filter(Boolean);

  const defaultSubject = `Documents needed for your ILA call`;
  const defaultBody = `Hi ${firstName},\n\nWe're getting ready for your ILA call${booking.date ? ` on ${booking.date}` : ""}. To go ahead, please upload the following to your portal:\n${missing.length ? missing.map(m => `  • ${m}`).join("\n") : "  • Any remaining matter documents"}\n\nYou can do this in a few minutes from your phone — open your portal here:\n{{portalUrl}}\n\nAny problems, just reply to this message and we'll help.\n\nThanks,\nYour ILA solicitor`;

  const [subject, setSubject] = React.useState(defaultSubject);
  const [body, setBody] = React.useState(defaultBody);
  const [channels, setChannels] = React.useState({ email: true, sms: true });
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiError, setAiError] = React.useState("");
  const [sending, setSending] = React.useState(false);

  // Reset to defaults each time the modal opens (with fresh context)
  React.useEffect(() => {
    if (!open) return;
    setSubject(defaultSubject);
    setBody(defaultBody);
    setAiError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?.ref]);

  const draftWithAI = async () => {
    if (!window.fiGenerateNote) { fiToast("AI helper not loaded"); return; }
    setAiBusy(true); setAiError("");
    try {
      const out = await window.fiGenerateNote({
        booking, tab: "reminder", currentText: body,
        extra: { missingDocs: missing, channels: Object.keys(channels).filter(c => channels[c]) },
      });
      if (out && out.text) { setBody(out.text); fiToast(`Drafted with ${out.provider || "AI"}`); }
      else if (out && out.error) { setAiError(out.error); }
    } catch (e) { setAiError(e.message || "Generation failed"); }
    setAiBusy(false);
  };

  const send = async () => {
    setSending(true);
    const chosen = Object.keys(channels).filter(c => channels[c]);
    if (chosen.length === 0) { fiToast("Pick at least one channel (email or SMS)"); setSending(false); return; }
    try { await onSend({ subject, body, channels: chosen }); } finally { setSending(false); }
  };

  if (!open) return null;
  const n8nConnected = window.fiIntegration?.isConnected?.("n8n");

  return (
    <div className="docpicker-overlay" onClick={onClose} style={{ zIndex: 200 }}>
      <div className="docpicker" style={{ maxWidth: 620, width: "94%" }} onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>Send a reminder to {booking.clientName || "the client"}</h3>
            <p className="cell-sub" style={{ margin: "4px 0 0", fontSize: 12 }}>
              Goes via email + SMS (when n8n is connected) and also appears at the top of their portal Documents step.
            </p>
          </div>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>

        <div className="docpicker-body" style={{ display: "grid", gap: 12 }}>
          {missing.length > 0 && (
            <div style={{ background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 6, padding: "8px 12px", fontSize: 12.5, color: "#7a4f00" }}>
              <Icon name="info" size={12}/> Still missing: <strong>{missing.join(" · ")}</strong>
            </div>
          )}

          <div>
            <label className="field-label">Subject</label>
            <input className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)}/>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label className="field-label" style={{ margin: 0 }}>Message</label>
              <button className="btn btn-lime btn-sm" onClick={draftWithAI} disabled={aiBusy}>
                <Icon name="sparkle" size={12}/> {aiBusy ? "Drafting…" : "Draft with AI"}
              </button>
            </div>
            <textarea
              className="field-input"
              rows={9}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ fontSize: 11, color: "#5b6b76", marginTop: 4 }}>
              <code>{`{{portalUrl}}`}</code> is replaced with the client's portal link automatically.
            </div>
            {aiError && (
              <div style={{ marginTop: 8, padding: 8, background: "#fbe9e7", border: "1px solid #f4c7c0", borderRadius: 6, fontSize: 12.5, color: "#8a2a18" }}>
                <Icon name="warning" size={11}/> {aiError}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <span className="field-label" style={{ margin: 0 }}>Send via</span>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={channels.email} onChange={(e) => setChannels(c => ({ ...c, email: e.target.checked }))}/>
              <Icon name="mail" size={12}/> Email <span className="cell-sub">({booking.clientEmail || "—"})</span>
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13, cursor: booking.phone ? "pointer" : "not-allowed", opacity: booking.phone ? 1 : 0.5 }}>
              <input type="checkbox" checked={channels.sms && !!booking.phone} disabled={!booking.phone} onChange={(e) => setChannels(c => ({ ...c, sms: e.target.checked }))}/>
              <Icon name="phone" size={12}/> SMS <span className="cell-sub">({booking.phone || "no phone on file"})</span>
            </label>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked disabled/>
              <Icon name="external" size={12}/> Show on portal <span className="cell-sub">(always)</span>
            </label>
          </div>

          {!n8nConnected && (
            <div style={{ background: "#fbe9e7", border: "1px solid #f4c7c0", borderRadius: 6, padding: 10, fontSize: 12.5, color: "#8a2a18" }}>
              <Icon name="info" size={12}/> <strong>n8n not connected</strong> — message will be saved + shown on the client's portal, but email/SMS won't be sent until you connect n8n in <strong>Integrations</strong>.
            </div>
          )}
        </div>

        <footer className="docpicker-foot" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={sending}>Cancel</button>
          <button className="btn btn-navy" onClick={send} disabled={sending || !body.trim()}>
            <Icon name="send" size={13}/> {sending ? "Sending…" : "Send reminder"}
          </button>
        </footer>
      </div>
    </div>
  );
};

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
  // Re-render whenever dispatch state changes anywhere
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  const wetBookings = BOOKINGS.filter(b => b.serviceId === "wet");
  const [search, setSearch] = React.useState("");
  const [lawyerFilter, setLawyerFilter] = React.useState("all");
  const [stageFilter, setStageFilter] = React.useState("all");
  // Build a CSV of the visible wet queue so 'Export' is a real action.
  const exportCsv = () => {
    const header = "ref,client,lender,stage,tracking,service,date,time\n";
    const rows = wetBookings.map(b => [
      b.ref, JSON.stringify(b.clientName || ""), JSON.stringify(b.lender || ""),
      (b.dispatch || ""), JSON.stringify(b.trackingNumber || ""),
      JSON.stringify(b.trackingService || ""), b.date || "", b.time || "",
    ].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `wet-queue-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    fiToast(`Exported ${wetBookings.length} wet bookings`);
  };

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
          <button className="btn btn-ghost" onClick={exportCsv} disabled={wetBookings.length === 0}>
            <Icon name="download" size={14}/> Export CSV
          </button>
        </div>
        <div className="rm-help-strip">
          <Icon name="info" size={13}/>
          <span><strong>How this works:</strong> drag or click cards left → right as you receive docs, sign them, post out, and Royal Mail delivers. Use the green tick to enter a tracking number — the client gets it instantly by email + SMS.</span>
        </div>
      </section>

      <div className="rm-kanban">
        <KanbanCol title="1 · Waiting for docs" subtitle="From the client" tone="warning" items={grouped.awaiting_signature} ctaLabel="Docs arrived" mode="receive" onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "awaiting_signature" ? "all" : "awaiting_signature")}/>
        <KanbanCol title="2 · Received · to sign" subtitle="In our office" tone="info" items={grouped.signed} ctaLabel="Mark signed" mode="sign" onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "signed" ? "all" : "signed")}/>
        <KanbanCol title="3 · Ready to post out" subtitle="Set address &amp; tracking" tone="info" items={grouped.ready_to_post} ctaLabel="Add tracking" mode="post" onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "ready_to_post" ? "all" : "ready_to_post")}/>
        <KanbanCol title="4 · Posted · in transit" subtitle="With Royal Mail" tone="muted" items={grouped.posted} ctaLabel="Mark delivered" mode="delivered" onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "posted" ? "all" : "posted")}/>
        <KanbanCol title="5 · Delivered" subtitle="Done" tone="success" items={grouped.delivered} ctaLabel="Close" mode="close" onOpenDetail={onOpenDetail} onHeaderClick={() => setStageFilter(stageFilter === "delivered" ? "all" : "delivered")}/>
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
        {lawyer ? (
          <div className="row items-center gap-2">
            <Avatar lawyer={lawyer} size={22}/>
            <span>{lawyer.name.split(" ")[0]}</span>
          </div>
        ) : (
          <span className="cell-sub">—</span>
        )}
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
  const [trackingValue, setTrackingValue] = React.useState(booking.trackingNumber || "");

  // mode → next dispatch state mapping
  const NEXT = {
    receive: "signed",
    sign: "ready_to_post",
    post: "posted",
    delivered: "delivered",
    close: "delivered",
  };

  const onCta = (e) => {
    e.stopPropagation();
    if (mode === "post") {
      setTrackingMode(true);
      return;
    }
    const next = NEXT[mode];
    if (next) {
      FastILA.bookings.setDispatch(booking.ref, next);
      FastILA.bookings.addNote(booking.ref, `Dispatch → ${next.replace(/_/g, " ")}`);
      if (next === "delivered") {
        FastILA.bookings.setStatus(booking.ref, "completed");
      }
      fiToast(`${booking.ref} → ${next.replace(/_/g, " ")}`);
    }
  };

  const onSave = (e) => {
    if (e) e.stopPropagation();
    if (!trackingValue.trim()) return;
    FastILA.bookings.setTracking(booking.ref, trackingValue.trim());
    FastILA.bookings.setDispatch(booking.ref, "posted");
    FastILA.bookings.addNote(booking.ref, `Tracking added: ${trackingValue.trim()}`);
    fiToast(`${booking.ref} posted`);
    setTrackingMode(false);
  };
  const saved = !!booking.trackingNumber;

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
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [selected, setSelected] = React.useState(() => LAWYERS[0]?.id || null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLawyer, setEditLawyer] = React.useState(null);
  const [calOpen, setCalOpen] = React.useState(false);
  // Block dates state — Set of yyyy-mm-dd strings the user has toggled off.
  // Declared up front so hook order stays consistent across empty/full renders.
  const [blockedSet, setBlockedSet] = React.useState(() => {
    const s = new Set();
    [5, 11].forEach(i => s.add(ymd(addDays(TODAY, i))));
    return s;
  });
  // Keep selected valid if LAWYERS changes (e.g. after clear demo)
  React.useEffect(() => {
    if (LAWYERS.length === 0) { setSelected(null); return; }
    if (!LAWYERS.find(l => l.id === selected)) setSelected(LAWYERS[0].id);
  }, [LAWYERS.length, selected]);
  const lawyer = LAWYERS.find(l => l.id === selected);
  // Live dashboard-access status (2-step approval) for a lawyer.
  const badgeFor = (l) => {
    if (!l || !window.FastILA || FastILA.mode !== "live" || !FastILA.team) return null;
    const t = FastILA.team.byLawyerId(l.id) || (l.email ? FastILA.team.byEmail(l.email) : null);
    const st = t && t.status;
    if (st === "approved") return { label: "Verified",    fg: "#3f6212", bg: "#eaf7d8", dot: "#65a30d" };
    if (st === "pending")  return { label: "In progress", fg: "#92660a", bg: "#fff3d6", dot: "#e0a106" };
    if (st === "rejected") return { label: "Declined",    fg: "#9a1c1c", bg: "#fde4e4", dot: "#dc2626" };
    return null;
  };
  const StatusPill = ({ b }) => b ? (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: b.fg, background: b.bg, borderRadius: 20, padding: "2px 9px" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: b.dot }}/> {b.label}
    </span>
  ) : null;
  const openEdit = (l) => { setEditLawyer(l); setEditOpen(true); };
  const openAdd = () => {
    // Default new lawyers to cover all 4 services + English. Admin can untick in the modal.
    const allServiceIds = (SERVICES || []).map(s => s.id);
    setEditLawyer({
      id: `lawyer-${Date.now()}`,
      name: "", initials: "", sra: "", bio: "",
      languages: ["English"],
      services: allServiceIds,
      photoBg: "#0a4a67", rating: 5.0, reviews: 0, isNew: true,
    });
    setEditOpen(true);
  };

  // Empty state: no lawyers yet
  if (LAWYERS.length === 0 || !lawyer) {
    return (
      <div className="dash-grid">
        <section className="panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ marginBottom: 12, color: "#5b6b76" }}><Icon name="users" size={36}/></div>
          <h2 className="panel-title">No lawyers yet</h2>
          <p className="panel-sub" style={{ maxWidth: 460, margin: "8px auto 16px" }}>
            Add your first solicitor below. You can invite them by email later via Settings → Team & access.
          </p>
          <button className="btn btn-navy" onClick={openAdd}>
            <Icon name="plus" size={14}/> Add lawyer
          </button>
        </section>
        <LawyerEditModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          lawyer={editLawyer}
          onSaved={() => { fiToast("Lawyer added"); }}
        />
      </div>
    );
  }
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
        <KpiCard icon="users" label="Active lawyers" value={LAWYERS.length} hint={LAWYERS.length ? "All SRA-regulated" : "Add lawyers below"}/>
        <KpiCard icon="calendar" label="Today's bookings"
          value={(window.BOOKINGS || []).filter(b => b.date === ymd(new Date())).length}
          hint={`Across ${LAWYERS.length || 0} lawyer${LAWYERS.length === 1 ? "" : "s"}`}/>
        <KpiCard icon="star" label="Average client rating"
          value={LAWYERS.length && LAWYERS.some(l => l.reviews) ? `${(LAWYERS.reduce((s,l) => s + (l.rating || 0) * (l.reviews || 0), 0) / Math.max(1, LAWYERS.reduce((s,l) => s + (l.reviews || 0), 0))).toFixed(2)} / 5` : "—"}
          hint={LAWYERS.length ? `${LAWYERS.reduce((s,l)=>s + (l.reviews || 0), 0)} reviews` : "No reviews yet"}/>
        <KpiCard icon="bolt" label="Total bookings ever" value={(window.BOOKINGS || []).length} hint="All time"/>
      </div>

      <div className="dash-grid-row two-col-narrow">
        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Team</h2>
            <button className="btn btn-navy" onClick={openAdd}>
              <Icon name="plus" size={14}/> Add lawyer
            </button>
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
                  <div className="cell-sub" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>{l.sra}</span>
                    <StatusPill b={badgeFor(l)}/>
                  </div>
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
                <p className="panel-sub" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span>{lawyer.sra} · {lawyer.languages.join(" · ")}</span>
                  <StatusPill b={badgeFor(lawyer)}/>
                </p>
              </div>
            </div>
            <div className="row gap-2">
              <button className="btn btn-ghost" onClick={() => openEdit(lawyer)}>
                <Icon name="edit" size={14}/> Edit profile
              </button>
              <button className="btn btn-ghost" onClick={() => setCalOpen(true)}>
                <Icon name="settings" size={14}/> Calendar sync
              </button>
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
                <button className="btn btn-ghost btn-sm" onClick={() => setCalOpen(true)}>
                  <Icon name="calendar" size={13}/> Connect / manage
                </button>
              </div>
            </div>
            <div>
              <div className="aside-label">Working hours</div>
              <div className="mono" style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "var(--navy-900)" }}>
                {(() => {
                  const dn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                  const wd = (lawyer.work_days || [1, 2, 3, 4, 5]).slice().sort((a, b) => a - b).map(d => dn[d]).join(", ");
                  const ws = String(lawyer.work_start || "09:00").slice(0, 5), we = String(lawyer.work_end || "17:00").slice(0, 5);
                  return `${wd} · ${ws}–${we}`;
                })()}
              </div>
            </div>
            <div>
              <div className="aside-label">Slot · buffer</div>
              <div className="mono" style={{ marginTop: 6, fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--navy-900)" }}>{lawyer.slot_minutes || 45} min · {lawyer.buffer_minutes || 0} min</div>
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

      <LawyerEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        lawyer={editLawyer}
        onSaved={() => { fiToast(editLawyer?.isNew ? "Lawyer added" : "Lawyer updated"); }}
      />

      {typeof Modal === "function" && typeof CalendarConnectPanel === "function" && (
        <Modal
          open={calOpen}
          onClose={() => setCalOpen(false)}
          title={`Calendar sync · ${lawyer.name}`}
          subtitle="Connect this lawyer's Google calendar — bookings then create a real Meet link on their diary, and their busy times block the booking form."
        >
          <CalendarConnectPanel lawyerId={lawyer.id} lawyerName={lawyer.name}/>
        </Modal>
      )}
    </div>
  );
};

Object.assign(window, { DetailView, RoyalMailView, LawyersView });

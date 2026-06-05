/* global React, Icon, LAWYERS */

// ============================================================================
// E-Sign Studio — DocuSign replacement
// Flexible: any number of documents (matter docs / uploads / lender templates),
// any number of signers (lawyer + clients + extras), each field assigned to a
// specific signer (colour-coded). Each lawyer has their own saved signature.
// ============================================================================

const LAWYER_SIG_KEY = "fastila_lawyer_sig_v1";
const FIRM_STAMP_KEY = "fastila_firm_stamp_v1";

// Stores
const getLawyerSignatures = () => { try { return JSON.parse(localStorage.getItem(LAWYER_SIG_KEY) || "{}"); } catch (e) { return {}; } };
const setLawyerSignature = (lawyerId, dataUrl) => {
  const all = getLawyerSignatures();
  if (dataUrl) all[lawyerId] = dataUrl; else delete all[lawyerId];
  try { localStorage.setItem(LAWYER_SIG_KEY, JSON.stringify(all)); } catch (e) {}
};
const getFirmStamp = () => { try { return localStorage.getItem(FIRM_STAMP_KEY) || null; } catch (e) { return null; } };
const setFirmStamp = (dataUrl) => { try { dataUrl ? localStorage.setItem(FIRM_STAMP_KEY, dataUrl) : localStorage.removeItem(FIRM_STAMP_KEY); } catch (e) {} };

// ---------------------------------------------------------------------------
// SignaturePad
// ---------------------------------------------------------------------------
const ESignPad = ({ onSave, onCancel }) => {
  const canvasRef = React.useRef(null);
  const drawing = React.useRef(false);
  const last = React.useRef({ x: 0, y: 0 });
  const [empty, setEmpty] = React.useState(true);

  React.useEffect(() => {
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#042b3d";
  }, []);

  const pt = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
    return { x: x * (c.width / r.width), y: y * (c.height / r.height) };
  };

  const start = (e) => { e.preventDefault(); drawing.current = true; last.current = pt(e); };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const p = pt(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    setEmpty(false);
  };
  const end = () => { drawing.current = false; };
  const clear = () => { canvasRef.current.getContext("2d").clearRect(0, 0, canvasRef.current.width, canvasRef.current.height); setEmpty(true); };
  const save = () => { if (!empty) onSave(canvasRef.current.toDataURL("image/png")); };

  return (
    <div className="esign-pad-wrap">
      <div className="esign-pad-canvas-wrap">
        <canvas ref={canvasRef} width={640} height={200} className="esign-pad-canvas"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}/>
        {empty && <div className="esign-pad-placeholder">Sign here with your mouse or finger</div>}
        <div className="esign-pad-baseline"/>
      </div>
      <div className="esign-pad-actions">
        <button className="btn btn-ghost" onClick={clear} disabled={empty}><Icon name="x" size={13}/> Clear</button>
        {onCancel && <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
        <button className="btn btn-navy" onClick={save} disabled={empty}><Icon name="check" size={13}/> Save signature</button>
      </div>
    </div>
  );
};

// ===========================================================================
// Lawyer profile — saved signature (draw OR upload)
// ===========================================================================
const LawyerSignatureCard = ({ lawyerId, lawyerName }) => {
  const [sig, setSig] = React.useState(() => getLawyerSignatures()[lawyerId] || null);
  const [mode, setMode] = React.useState(null);
  const fileInput = React.useRef(null);

  const save = (dataUrl) => { setLawyerSignature(lawyerId, dataUrl); setSig(dataUrl); setMode(null); };
  const clear = () => { setLawyerSignature(lawyerId, null); setSig(null); };
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => save(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2 className="panel-title"><Icon name="edit" size={15}/> Your saved signature</h2>
          <p className="panel-sub">Sign once. We apply it to every cert and document you sign on Fast-ILA — like saved signatures in DocuSign.</p>
        </div>
        {sig && <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Saved</span>}
      </header>
      <div className="lawyer-sig-body">
        {mode === "draw" ? (
          <ESignPad onSave={save} onCancel={() => setMode(null)}/>
        ) : sig ? (
          <div className="lawyer-sig-saved">
            <div className="lawyer-sig-saved-img"><img src={sig} alt={`${lawyerName} signature`}/></div>
            <div className="lawyer-sig-saved-meta">
              <div><strong>{lawyerName}</strong></div>
              <div className="cell-sub">Used on every ILA cert &amp; document you sign · stored encrypted</div>
            </div>
            <div className="row gap-2">
              <button className="btn btn-ghost" onClick={() => setMode("draw")}><Icon name="edit" size={13}/> Re-draw</button>
              <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}><Icon name="package" size={13}/> Replace with upload</button>
              <button className="btn btn-ghost btn-danger-text" onClick={clear}><Icon name="trash" size={13}/> Remove</button>
            </div>
          </div>
        ) : (
          <div className="lawyer-sig-choices">
            <button className="lawyer-sig-empty" onClick={() => setMode("draw")}>
              <div className="lawyer-sig-empty-icon"><Icon name="edit" size={22}/></div>
              <div>
                <div className="lawyer-sig-empty-title">Draw your signature</div>
                <div className="lawyer-sig-empty-sub">Sign with mouse, trackpad or touchscreen</div>
              </div>
            </button>
            <button className="lawyer-sig-empty" onClick={() => fileInput.current?.click()}>
              <div className="lawyer-sig-empty-icon"><Icon name="package" size={22}/></div>
              <div>
                <div className="lawyer-sig-empty-title">Upload a signature image</div>
                <div className="lawyer-sig-empty-sub">PNG / JPG · transparent background works best</div>
              </div>
            </button>
          </div>
        )}
        <input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden onChange={onFile}/>
      </div>
    </section>
  );
};

// ===========================================================================
// Firm stamp upload (admin)
// ===========================================================================
const FirmStampCard = () => {
  const [stamp, setStamp] = React.useState(() => getFirmStamp());
  const fileInput = React.useRef(null);

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setFirmStamp(ev.target.result); setStamp(ev.target.result); };
    reader.readAsDataURL(f);
  };
  const remove = () => { setFirmStamp(null); setStamp(null); };

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2 className="panel-title"><Icon name="shield" size={15}/> Firm stamp</h2>
          <p className="panel-sub">Upload once. All lawyers can drop this stamp on any cert when needed (some lenders require it alongside the signature).</p>
        </div>
        {stamp && <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Active</span>}
      </header>
      <div className="lawyer-sig-body">
        {stamp ? (
          <div className="lawyer-sig-saved">
            <div className="lawyer-sig-saved-img firm-stamp-img"><img src={stamp} alt="Firm stamp"/></div>
            <div className="lawyer-sig-saved-meta">
              <div><strong>Nexa Law Ltd · firm stamp</strong></div>
              <div className="cell-sub">Available to every lawyer in the E-Sign Studio</div>
            </div>
            <div className="row gap-2">
              <button className="btn btn-ghost" onClick={() => fileInput.current?.click()}><Icon name="edit" size={13}/> Replace</button>
              <button className="btn btn-ghost btn-danger-text" onClick={remove}><Icon name="trash" size={13}/> Remove</button>
            </div>
          </div>
        ) : (
          <button className="lawyer-sig-empty" onClick={() => fileInput.current?.click()}>
            <div className="lawyer-sig-empty-icon"><Icon name="shield" size={22}/></div>
            <div>
              <div className="lawyer-sig-empty-title">Upload your firm stamp</div>
              <div className="lawyer-sig-empty-sub">PNG with transparent background works best · click to choose</div>
            </div>
          </button>
        )}
        <input ref={fileInput} type="file" accept="image/png,image/jpeg" hidden onChange={onFile}/>
      </div>
    </section>
  );
};

// ===========================================================================
// E-Sign Studio — flexible envelope
// ===========================================================================
const SIGNER_COLORS = ["#1f7497", "#c47a17", "#2f8b5b", "#7b3aa6", "#c0402d", "#0a4a67"];

// Mock library: matter docs the client already uploaded + lender templates
const MATTER_DOC_LIBRARY = [
  { id: "ccl", name: "Signed Client Care Letter (Mehta).pdf", size: "184 KB", source: "Matter file" },
  { id: "pg", name: "Personal Guarantee & Indemnity (Mehta).pdf", size: "640 KB", source: "Matter file" },
  { id: "loan", name: "Shawbrook Facility Agreement.pdf", size: "2.1 MB", source: "Matter file" },
  { id: "witness", name: "Witness Statement Template.pdf", size: "120 KB", source: "Matter file" },
];

const LENDER_TEMPLATES = [
  { id: "shawbrook-ila", name: "Shawbrook_ILA_Cert_v3.2.pdf", size: "240 KB", source: "Lender template" },
  { id: "shawbrook-oc", name: "Shawbrook_OC_v2.pdf", size: "140 KB", source: "Lender template" },
  { id: "together-ila", name: "Together_ILA_Cert_v2.1.pdf", size: "180 KB", source: "Lender template" },
  { id: "aldermore-pg", name: "Aldermore_PG_Cert.pdf", size: "220 KB", source: "Lender template" },
];

const ESignStudio = ({ lawyerId = "amelia", onClose }) => {
  const lawyer = LAWYERS.find(l => l.id === lawyerId) || LAWYERS[0];
  const lawyerSig = getLawyerSignatures()[lawyerId];
  const firmStamp = getFirmStamp();

  // Documents in this envelope — start with the ILA cert pre-loaded
  const [docs, setDocs] = React.useState([
    { id: "d1", name: "Shawbrook_ILA_Cert_v3.2.pdf", size: "240 KB", source: "Lender template" },
  ]);
  const [activeDocId, setActiveDocId] = React.useState("d1");
  const [docPickerOpen, setDocPickerOpen] = React.useState(false);

  // Signers — lawyer is always first, "me"
  const [signers, setSigners] = React.useState([
    { id: "me", label: lawyer.name, role: "Solicitor", email: lawyer.id + "@nexalaw.com", color: SIGNER_COLORS[0], isMe: true },
    { id: "s1", label: "Priya Mehta", role: "Signatory 1", email: "priya.mehta@yahoo.co.uk", color: SIGNER_COLORS[1] },
    { id: "s2", label: "Rohan Mehta", role: "Signatory 2", email: "rohan.mehta@yahoo.co.uk", color: SIGNER_COLORS[2] },
  ]);
  const [activeSignerId, setActiveSignerId] = React.useState("me");
  const [editingSignerId, setEditingSignerId] = React.useState(null);
  const [signerDraft, setSignerDraft] = React.useState({ label: "", email: "" });

  // Fields placed on the doc — each tagged with docId + signerId
  const [fields, setFields] = React.useState([]);
  const [activeId, setActiveId] = React.useState(null);
  const [sent, setSent] = React.useState(false);
  const docRef = React.useRef(null);
  const fileInput = React.useRef(null);

  const activeSigner = signers.find(s => s.id === activeSignerId) || signers[0];
  const activeDocFields = fields.filter(f => f.docId === activeDocId);

  // ---------- Document management ----------
  const addDocFromLibrary = (lib) => {
    const id = `d-${Date.now()}`;
    setDocs([...docs, { id, name: lib.name, size: lib.size, source: lib.source }]);
    setActiveDocId(id);
    setDocPickerOpen(false);
  };
  const onUploadDoc = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const id = `d-${Date.now()}`;
    const sizeKB = Math.round(f.size / 1024);
    setDocs([...docs, { id, name: f.name, size: sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`, source: "Uploaded" }]);
    setActiveDocId(id);
    setDocPickerOpen(false);
    e.target.value = "";
  };
  const removeDoc = (id) => {
    const next = docs.filter(d => d.id !== id);
    setDocs(next);
    setFields(fields.filter(f => f.docId !== id));
    if (activeDocId === id && next.length > 0) setActiveDocId(next[0].id);
  };

  // ---------- Signer management ----------
  const addSigner = () => {
    const id = `s-${Date.now()}`;
    setSigners([...signers, {
      id, label: "", email: "", role: "Signatory",
      color: SIGNER_COLORS[signers.length % SIGNER_COLORS.length],
    }]);
    setEditingSignerId(id);
    setSignerDraft({ label: "", email: "" });
  };
  const startEditSigner = (s) => {
    setEditingSignerId(s.id);
    setSignerDraft({ label: s.label, email: s.email });
  };
  const saveSigner = () => {
    setSigners(signers.map(s => s.id === editingSignerId
      ? { ...s, label: signerDraft.label, email: signerDraft.email }
      : s));
    setEditingSignerId(null);
  };
  const removeSigner = (id) => {
    if (id === "me") return;
    setSigners(signers.filter(s => s.id !== id));
    setFields(fields.filter(f => f.signerId !== id));
    if (activeSignerId === id) setActiveSignerId("me");
  };

  // ---------- Field management ----------
  const addField = (type) => {
    if (type === "signature" && activeSigner.isMe && !lawyerSig) {
      alert("Save your signature in your profile first.");
      return;
    }
    if (type === "stamp" && !firmStamp) { alert("Admin needs to upload the firm stamp first."); return; }
    const id = `f-${Date.now()}`;
    const value = type === "name" ? activeSigner.label
      : type === "date" ? new Date().toLocaleDateString("en-GB")
      : type === "text" ? "" : undefined;
    setFields([...fields, {
      id, type, docId: activeDocId, signerId: activeSignerId,
      page: 1, x: 30, y: 50,
      w: type === "stamp" ? 18 : type === "signature" ? 32 : 28,
      h: type === "stamp" ? 18 : type === "signature" ? 7 : 5,
      value, filled: type !== "text" && (type !== "signature" || (activeSigner.isMe && !!lawyerSig)),
    }]);
    setActiveId(id);
  };
  const updateField = (id, patch) => setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  const removeField = (id) => { setFields(prev => prev.filter(f => f.id !== id)); if (activeId === id) setActiveId(null); };

  // Drag handler
  const dragInfo = React.useRef(null);
  const onFieldMouseDown = (e, f) => {
    e.stopPropagation();
    setActiveId(f.id);
    const rect = docRef.current.getBoundingClientRect();
    dragInfo.current = { id: f.id, startX: e.clientX, startY: e.clientY, fx: f.x, fy: f.y, rect };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };
  const onMove = (e) => {
    const d = dragInfo.current; if (!d) return;
    const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
    updateField(d.id, { x: Math.max(0, Math.min(95, d.fx + dx)), y: Math.max(0, Math.min(95, d.fy + dy)) });
  };
  const onUp = () => { dragInfo.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };

  const myFields = fields.filter(f => f.signerId === "me");
  const myFilled = myFields.every(f => f.filled);
  const otherSigners = signers.filter(s => !s.isMe && fields.some(f => f.signerId === s.id));
  const totalSignersToEmail = otherSigners.length;

  const sendEnvelope = () => {
    if (totalSignersToEmail === 0) return;
    setSent(true);
    setTimeout(() => onClose && onClose(), 2600);
  };

  if (sent) {
    return (
      <div className="esign-studio">
        <div className="esign-sent">
          <div className="esign-sent-mark"><Icon name="check" size={36} stroke={3}/></div>
          <h2 className="display">Envelope sent</h2>
          <p>
            {docs.length} document{docs.length === 1 ? "" : "s"} sent to {totalSignersToEmail} {totalSignersToEmail === 1 ? "signer" : "signers"}.<br/>
            Each gets an email with a secure link — no account needed. You'll get notified as each one signs.
          </p>
          <div className="esign-sent-list">
            {otherSigners.map(s => (
              <div key={s.id} className="esign-sent-row">
                <span className="signer-dot" style={{ background: s.color }}/>
                <strong>{s.label || "Signer"}</strong>
                <span className="cell-sub mono">{s.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const activeDoc = docs.find(d => d.id === activeDocId);

  return (
    <div className="esign-studio">
      {/* Toolbar */}
      <div className="esign-toolbar">
        <div className="esign-toolbar-l">
          <button className="btn btn-ghost" onClick={onClose}><Icon name="arrow-left" size={13}/> Back</button>
          <div>
            <div className="esign-doc-name">{docs.length} document{docs.length === 1 ? "" : "s"} · {signers.length} signer{signers.length === 1 ? "" : "s"}</div>
            <div className="esign-doc-meta">{fields.length} field{fields.length === 1 ? "" : "s"} placed</div>
          </div>
        </div>
        <div className="esign-toolbar-r">
          <button className="btn btn-ghost"><Icon name="download" size={13}/> Save draft</button>
          <button
            className="btn btn-lime"
            disabled={totalSignersToEmail === 0 || !myFilled}
            onClick={sendEnvelope}
          >
            <Icon name="send" size={13}/> Send envelope · {totalSignersToEmail} {totalSignersToEmail === 1 ? "signer" : "signers"}
          </button>
        </div>
      </div>

      {/* Document tabs */}
      <div className="esign-doctabs">
        {docs.map(d => (
          <button
            key={d.id}
            className={`esign-doctab ${activeDocId === d.id ? "is-active" : ""}`}
            onClick={() => setActiveDocId(d.id)}
            title={d.name}
          >
            <Icon name="doc" size={12}/>
            <span className="esign-doctab-name">{d.name}</span>
            <span className="esign-doctab-count">{fields.filter(f => f.docId === d.id).length}</span>
            {docs.length > 1 && (
              <span className="esign-doctab-x" onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }}><Icon name="x" size={10}/></span>
            )}
          </button>
        ))}
        <button className="esign-doctab esign-doctab-add" onClick={() => setDocPickerOpen(true)}>
          <Icon name="plus" size={12}/> Add document
        </button>
      </div>

      {docPickerOpen && (
        <DocPicker
          onPick={addDocFromLibrary}
          onUpload={() => fileInput.current?.click()}
          onClose={() => setDocPickerOpen(false)}
          existingIds={docs.map(d => d.name)}
        />
      )}
      <input ref={fileInput} type="file" accept="application/pdf,image/*" hidden onChange={onUploadDoc}/>

      <div className="esign-workspace">
        {/* Palette */}
        <aside className="esign-palette">
          {/* Signers */}
          <div className="esign-palette-section">
            <div className="esign-palette-label">
              <span>Signers · {signers.length}</span>
              <button className="esign-palette-add" onClick={addSigner}><Icon name="plus" size={11}/></button>
            </div>
            {signers.map(s => (
              <div key={s.id} className="signer-wrap">
                {editingSignerId === s.id ? (
                  <div className="signer-edit">
                    <span className="signer-dot" style={{ background: s.color }}/>
                    <input
                      className="signer-input"
                      placeholder="Name"
                      value={signerDraft.label}
                      onChange={(e) => setSignerDraft({ ...signerDraft, label: e.target.value })}
                      autoFocus
                    />
                    <input
                      className="signer-input"
                      placeholder="email@…"
                      type="email"
                      value={signerDraft.email}
                      onChange={(e) => setSignerDraft({ ...signerDraft, email: e.target.value })}
                    />
                    <button className="esign-palette-add" onClick={saveSigner}><Icon name="check" size={11} stroke={3}/></button>
                  </div>
                ) : (
                  <button
                    className={`signer-row ${activeSignerId === s.id ? "is-active" : ""}`}
                    onClick={() => setActiveSignerId(s.id)}
                    style={{ borderColor: activeSignerId === s.id ? s.color : undefined }}
                  >
                    <span className="signer-dot" style={{ background: s.color }}/>
                    <div className="signer-info">
                      <div className="signer-label">{s.label || <em>Unnamed</em>}{s.isMe && <span className="signer-me-tag">YOU</span>}</div>
                      <div className="signer-meta">{s.role} {s.email && `· ${s.email}`}</div>
                    </div>
                    {!s.isMe && (
                      <span className="signer-actions">
                        <span className="signer-action" onClick={(e) => { e.stopPropagation(); startEditSigner(s); }}><Icon name="edit" size={11}/></span>
                        <span className="signer-action" onClick={(e) => { e.stopPropagation(); removeSigner(s.id); }}><Icon name="trash" size={11}/></span>
                      </span>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Tools */}
          <div className="esign-palette-section">
            <div className="esign-palette-label">
              <span>Drop field for <strong style={{ color: activeSigner.color }}>{activeSigner.label || "this signer"}</strong></span>
            </div>
            <button
              className={`esign-tool ${activeSigner.isMe && !lawyerSig ? "is-unavail" : ""}`}
              onClick={() => addField("signature")}
              disabled={activeSigner.isMe && !lawyerSig}
            >
              <Icon name="edit" size={14}/>
              <div>
                <div className="esign-tool-label">Signature</div>
                <div className="esign-tool-sub">{activeSigner.isMe ? (lawyerSig ? "Your saved sig" : "Save in profile first") : "Where they'll sign"}</div>
              </div>
            </button>
            <button className="esign-tool" onClick={() => addField("name")}>
              <Icon name="user" size={14}/>
              <div>
                <div className="esign-tool-label">Name</div>
                <div className="esign-tool-sub">Printed name</div>
              </div>
            </button>
            <button className="esign-tool" onClick={() => addField("date")}>
              <Icon name="calendar" size={14}/>
              <div>
                <div className="esign-tool-label">Date</div>
                <div className="esign-tool-sub">Auto-fills on sign</div>
              </div>
            </button>
            {activeSigner.isMe && (
              <button
                className={`esign-tool ${!firmStamp ? "is-unavail" : ""}`}
                onClick={() => addField("stamp")}
                disabled={!firmStamp}
              >
                <Icon name="shield" size={14}/>
                <div>
                  <div className="esign-tool-label">Firm stamp</div>
                  <div className="esign-tool-sub">{firmStamp ? "Click to place" : "Admin to upload"}</div>
                </div>
              </button>
            )}
            <button className="esign-tool" onClick={() => addField("text")}>
              <Icon name="doc" size={14}/>
              <div>
                <div className="esign-tool-label">Text field</div>
                <div className="esign-tool-sub">Free text</div>
              </div>
            </button>
          </div>
        </aside>

        {/* Document canvas */}
        <div className="esign-doc-wrap">
          {activeDoc && (
            <>
              <div className="esign-doc-name-bar">
                <Icon name="doc" size={13}/>
                <span><strong>{activeDoc.name}</strong></span>
                <span className="cell-sub">· {activeDoc.size} · {activeDoc.source}</span>
              </div>
              <div className="esign-page" ref={docRef} onClick={() => setActiveId(null)}>
                <div className="esign-doc-header">{activeDoc.name.replace(".pdf", "").toUpperCase()}</div>
                <p className="esign-doc-p">This is a preview of the document. Drop fields anywhere — each field goes to the signer you have selected on the left.</p>
                <p className="esign-doc-p">When you click <strong>Send envelope</strong>, each signer gets an email with a secure link to sign their assigned fields.</p>
                <ol className="esign-doc-list">
                  <li>You signed in the bottom-left as the solicitor.</li>
                  <li>Each other signer gets only the fields you assigned to their colour.</li>
                  <li>All signing is PD82-compliant with full audit trail.</li>
                </ol>
                <p className="esign-doc-p">Signed:</p>
                <div className="esign-doc-sigblocks">
                  <div className="esign-doc-sigblock-placeholder"/>
                  <div className="esign-doc-sigblock-placeholder"/>
                </div>

                {activeDocFields.map(f => {
                  const signer = signers.find(s => s.id === f.signerId) || signers[0];
                  return (
                    <ESignField
                      key={f.id}
                      field={f}
                      isActive={activeId === f.id}
                      lawyerSig={lawyerSig}
                      firmStamp={firmStamp}
                      signer={signer}
                      onMouseDown={(e) => onFieldMouseDown(e, f)}
                      onChange={(patch) => updateField(f.id, patch)}
                      onRemove={() => removeField(f.id)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// Document picker modal
const DocPicker = ({ onPick, onUpload, onClose, existingIds }) => {
  return (
    <div className="docpicker-overlay" onClick={onClose}>
      <div className="docpicker" onClick={(e) => e.stopPropagation()}>
        <header className="docpicker-head">
          <h3>Add document to envelope</h3>
          <button className="dash-icon-btn" onClick={onClose}><Icon name="x" size={14}/></button>
        </header>
        <div className="docpicker-body">
          <button className="docpicker-upload" onClick={onUpload}>
            <Icon name="package" size={22}/>
            <div>
              <div className="docpicker-upload-title">Upload from your computer</div>
              <div className="docpicker-upload-sub">PDF or image · drag-and-drop or click</div>
            </div>
            <Icon name="arrow-right" size={14}/>
          </button>

          <div className="docpicker-section">
            <div className="docpicker-section-label">Matter documents</div>
            {MATTER_DOC_LIBRARY.map(d => (
              <button key={d.id} className="docpicker-item" onClick={() => onPick(d)} disabled={existingIds.includes(d.name)}>
                <Icon name="doc" size={13}/>
                <div className="docpicker-item-info">
                  <div className="docpicker-item-name">{d.name}</div>
                  <div className="docpicker-item-meta">{d.size} · {d.source}</div>
                </div>
                {existingIds.includes(d.name) ? <span className="pill pill-success">Added</span> : <Icon name="plus" size={12}/>}
              </button>
            ))}
          </div>

          <div className="docpicker-section">
            <div className="docpicker-section-label">Lender certificate templates</div>
            {LENDER_TEMPLATES.map(d => (
              <button key={d.id} className="docpicker-item" onClick={() => onPick(d)} disabled={existingIds.includes(d.name)}>
                <Icon name="award" size={13}/>
                <div className="docpicker-item-info">
                  <div className="docpicker-item-name">{d.name}</div>
                  <div className="docpicker-item-meta">{d.size} · {d.source}</div>
                </div>
                {existingIds.includes(d.name) ? <span className="pill pill-success">Added</span> : <Icon name="plus" size={12}/>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ESignField = ({ field, isActive, lawyerSig, firmStamp, signer, onMouseDown, onChange, onRemove }) => {
  const style = {
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.w}%`,
    height: field.type === "stamp" || field.type === "signature" ? `${field.h}%` : undefined,
    borderColor: signer?.color || "var(--lime-deep)",
    background: isActive ? "rgba(255,255,255,0.95)" : `${signer?.color || "#d7ed3f"}1a`,
  };

  const isMe = signer?.isMe;

  const content = (() => {
    if (field.type === "signature") {
      if (isMe && lawyerSig) return <img src={lawyerSig} alt="Signature" className="esign-field-img"/>;
      return <span className="esign-field-text esign-field-placeholder"><Icon name="edit" size={10}/> {signer?.label || "Signer"} signs here</span>;
    }
    if (field.type === "stamp") {
      return firmStamp ? <img src={firmStamp} alt="Stamp" className="esign-field-img"/> : null;
    }
    if (field.type === "name") {
      return <span className="esign-field-text">{field.value || signer?.label}</span>;
    }
    if (field.type === "date") {
      return <span className="esign-field-text esign-field-date">{field.value || (isMe ? new Date().toLocaleDateString("en-GB") : "auto")}</span>;
    }
    if (field.type === "text") {
      return isActive ? (
        <input autoFocus className="esign-field-input"
          value={field.value || ""}
          onChange={(e) => onChange({ value: e.target.value, filled: !!e.target.value })}
          onClick={(e) => e.stopPropagation()}
          placeholder="Type here"/>
      ) : <span className="esign-field-text">{field.value || <em>Type here</em>}</span>;
    }
  })();

  return (
    <div
      className={`esign-field esign-field-${field.type} ${isActive ? "is-active" : ""} ${!isMe ? "is-other" : ""}`}
      style={style}
      onMouseDown={onMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {content}
      {isActive && (
        <button className="esign-field-x" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
          <Icon name="x" size={10}/>
        </button>
      )}
    </div>
  );
};

Object.assign(window, { ESignStudio, LawyerSignatureCard, FirmStampCard, getLawyerSignatures, getFirmStamp });

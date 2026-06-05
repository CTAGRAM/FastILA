/* global React, Icon, Avatar, SERVICES, LAWYERS, MATTER_TYPES, fmtDateLong */

// ============================================================================
// Client Portal — what the client sees after booking.
// Linear, step-by-step. No clever guardrails.
//
// Steps:
//   1. Sign client care letter (built-in e-signature)
//   2. Upload KYC (passport + proof of address)
//   3. Pay by bank transfer (we show our account; client confirms paid)
//   4. Upload matter documents (so the lawyer has them before the call)
//   5. Join Google Meet at appointment time
//   6. Sign & receive the ILA certificate (after the call)
// ============================================================================

const PORTAL_STEPS = [
  { id: "letter", label: "Sign client care letter", icon: "doc" },
  { id: "kyc", label: "Upload ID & address", icon: "shield" },
  { id: "pay", label: "Pay by bank transfer", icon: "pound" },
  { id: "docs", label: "Upload your matter documents", icon: "package" },
  { id: "meet", label: "Attend your Google Meet", icon: "video" },
  { id: "understand", label: "Sign your declaration", icon: "check-circle" },
  { id: "cert", label: "Sign & receive your ILA certificate", icon: "award" },
  { id: "feedback", label: "Quick feedback", icon: "star" },
];

// Matter-specific understanding questions. In production these come from a
// settings store the admin curates. Each list is broad — designed to prove
// the client understood the key risks before the call, reduce call time,
// and provide an audit-grade record in any future negligence dispute.
const UNDERSTANDING_QUESTIONS = {
  "personal-guarantee": {
    title: "Personal Guarantee · what you're confirming",
    items: [
      { id: "pg1", q: "I understand a personal guarantee makes me personally liable for the borrower's debt.", example: "If the company defaults, the lender can pursue you, your savings — and ultimately your home." },
      { id: "pg2", q: "I understand 'all monies' clauses may extend my liability beyond the named facility.", example: "Future advances or new facilities could fall under the same guarantee without me signing again." },
      { id: "pg3", q: "I understand my obligation continues even if the company is wound up.", example: "Insolvency of the company does not release me — I remain liable to the lender." },
      { id: "pg4", q: "I understand cross-default — a default elsewhere can trigger enforcement against me.", example: "Defaulting on a separate BTL mortgage may give the lender the right to call in this guarantee." },
      { id: "pg5", q: "I understand I can refuse to sign and seek different legal advice.", example: "The lender may pause the loan, but it is my right to walk away at any time before signing." },
      { id: "pg6", q: "I am signing of my own free will, with no pressure from the borrower or anyone else.", example: "If you feel pressured, tell us during the call — we will pause the matter." },
    ],
  },
  "occupiers-consent": {
    title: "Occupier's Consent · what you're confirming",
    items: [
      { id: "oc1", q: "I understand I am postponing my rights as an occupier behind the lender's charge.", example: "If the borrower defaults, the lender can repossess and sell the property — I can be required to leave." },
      { id: "oc2", q: "I understand I gain no ownership rights from signing.", example: "Signing the consent does not put my name on the title or give me a share." },
      { id: "oc3", q: "I understand the consent applies to future re-mortgages too if the wording says so.", example: "If the borrower remortgages with the same lender, my consent may continue to apply." },
      { id: "oc4", q: "I understand I can refuse to sign — the lender may then refuse the loan.", example: "Refusal is my right; the lender may then withdraw the offer." },
      { id: "oc5", q: "I am signing of my own free will and no-one is forcing me.", example: "If you feel forced, tell us during the call — we will pause and explore options." },
    ],
  },
  "jbsp-mortgage": {
    title: "Joint Borrower Sole Proprietor · what you're confirming",
    items: [
      { id: "j1", q: "I understand I am jointly liable for the entire mortgage debt even though I have no share of the property.", example: "If your child stops paying, the lender will come to you for the full balance — not just half." },
      { id: "j2", q: "I understand I gain no ownership rights in the property.", example: "Despite being on the mortgage, you cannot live there as of right and cannot claim sale proceeds." },
      { id: "j3", q: "I understand this affects my own future mortgage applications.", example: "Future lenders will count this debt against your affordability when you try to buy or remortgage." },
      { id: "j4", q: "I understand the tax implications (stamp duty surcharge etc.).", example: "If you already own a property, the additional rate of SDLT may apply." },
      { id: "j5", q: "I understand I can refuse and seek further advice.", example: "Walking away is your right." },
    ],
  },
  "bridging-loan": {
    title: "Bridging Loan · what you're confirming",
    items: [
      { id: "b1", q: "I understand bridging loans carry higher interest and short terms (often 3-24 months).", example: "Rates of 0.7%-1.2% per month are typical — if you don't refinance or exit by the deadline, costs balloon." },
      { id: "b2", q: "I understand the personal guarantee makes me personally liable beyond the secured property.", example: "If the property sale doesn't repay everything, the lender will pursue me personally." },
      { id: "b3", q: "I understand 'exit strategy' risk — if the planned sale or refinance falls through, default follows quickly.", example: "A delayed planning permission or buyer falling through can trigger default." },
      { id: "b4", q: "I understand cross-collateralisation if more than one property secures the loan.", example: "Default on the bridging can put more than one of my properties at risk." },
      { id: "b5", q: "I am signing of my own free will and have considered the alternatives.", example: "Other finance routes may be slower but cheaper." },
    ],
  },
  "deed-of-subordination": {
    title: "Deed of Subordination · what you're confirming",
    items: [
      { id: "ds1", q: "I understand I am agreeing that the senior lender is paid in full before my loan or charge is repaid.", example: "If you have lent the company £200k and they default, you only see your money back after the bank is paid." },
      { id: "ds2", q: "I understand I cannot enforce my charge or demand repayment without the senior lender's consent.", example: "Even if you are not being paid back, you cannot start recovery on your own." },
      { id: "ds3", q: "I understand subordination may apply for as long as the senior debt exists.", example: "This can be many years — your money is effectively locked behind the bank." },
      { id: "ds4", q: "I understand the risk of losing my loan entirely if the borrower fails.", example: "If the property sale doesn't cover the senior debt, there may be nothing left for you." },
      { id: "ds5", q: "I am signing of my own free will, not under pressure from the borrower.", example: "Walking away from the deed is your right." },
    ],
  },
  "gifted-deposit": {
    title: "Gifted Deposit · what you're confirming",
    items: [
      { id: "gd1", q: "I confirm the money is a true gift — not a loan and not repayable.", example: "Once gifted, you have no legal right to ask for it back, even if the relationship breaks down." },
      { id: "gd2", q: "I understand I will have no interest or claim in the property being purchased.", example: "You are not on the title and cannot claim a share if it is sold." },
      { id: "gd3", q: "I understand the lender may rely on this declaration when granting the mortgage.", example: "If you misrepresent that it's a gift when it isn't, the mortgage offer can be void." },
      { id: "gd4", q: "I understand the source-of-funds and AML checks the firm will run on the gift.", example: "You may be asked to evidence where the money came from (savings, sale of an asset, etc)." },
      { id: "gd5", q: "I am giving the gift voluntarily, free of pressure.", example: "No-one is forcing you to gift the money." },
    ],
  },
  "statutory-declaration": {
    title: "Statutory Declaration · what you're confirming",
    items: [
      { id: "sd1", q: "I understand a statutory declaration is a sworn statement and it is a criminal offence to make a false declaration.", example: "Knowingly making a false statement in a stat dec can lead to prosecution under the Perjury Act 1911." },
      { id: "sd2", q: "I understand the contents of the declaration and confirm everything in it is true to the best of my knowledge.", example: "Read each sentence carefully — you are personally swearing it." },
      { id: "sd3", q: "I understand the purpose for which the declaration is being used.", example: "Often used to evidence identity, residence, property ownership, or change of name." },
      { id: "sd4", q: "I understand the declaration must be witnessed by a solicitor or commissioner for oaths.", example: "On the ILA call, the solicitor will witness you signing it on camera." },
      { id: "sd5", q: "I am making this declaration voluntarily, free of pressure.", example: "No-one can compel you to swear something untrue." },
    ],
  },
  "transfer-of-equity": {
    title: "Transfer of Equity · what you're confirming",
    items: [
      { id: "te1", q: "I understand I may be giving up my legal interest in the property.", example: "Once transferred, you lose ownership rights and any share of future sale proceeds." },
      { id: "te2", q: "I understand I may remain liable under the existing mortgage even after transfer.", example: "If the new owner stops paying, the lender can still pursue you unless formally released." },
      { id: "te3", q: "I understand the tax implications including potential stamp duty and CGT.", example: "Transfers between non-spouses may trigger SDLT and capital gains tax." },
      { id: "te4", q: "I understand a transfer is usually legally binding once completed.", example: "Reversing a transfer of equity is difficult and costly." },
      { id: "te5", q: "I am signing of my own free will, not under pressure from the other party.", example: "If you feel pressured, particularly post-separation, tell us — we will pause the matter." },
    ],
  },
};

// Generic fallback for matter types we haven't curated yet
const GENERIC_QUESTIONS = {
  title: "Independent Legal Advice · what you're confirming",
  items: [
    { id: "g1", q: "I understand the nature and effect of the documents I am being asked to sign.", example: "In broad terms — we'll go through specifics on the call." },
    { id: "g2", q: "I understand the key risks of the transaction including loss of property and personal liability.", example: "If things go wrong, I could lose what is at stake." },
    { id: "g3", q: "I understand I can refuse to sign and seek different legal advice.", example: "I am not obliged to proceed." },
    { id: "g4", q: "I am signing of my own free will without pressure.", example: "If you feel pressured, tell us during the call." },
  ],
};

// Expose so the dashboard / admin side can rebuild the signed-declaration PDF
// (audit-grade evidence pack) without re-implementing the question catalog.
if (typeof window !== "undefined") {
  window.UNDERSTANDING_QUESTIONS = UNDERSTANDING_QUESTIONS;
  window.GENERIC_QUESTIONS = GENERIC_QUESTIONS;
}

// ----------------------------------------------------------------------------
// E-signature pad — canvas drawing, very basic
// ----------------------------------------------------------------------------
const SignaturePad = ({ onSave, savedDataUrl }) => {
  const canvasRef = React.useRef(null);
  const [drawing, setDrawing] = React.useState(false);
  const [empty, setEmpty] = React.useState(!savedDataUrl);

  React.useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#063952";

    if (savedDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight);
      img.src = savedDataUrl;
    }
  }, [savedDataUrl]);

  const getXY = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [t.clientX - r.left, t.clientY - r.top];
  };

  const start = (e) => {
    e.preventDefault();
    const [x, y] = getXY(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(x, y);
    setDrawing(true);
    setEmpty(false);
  };
  const move = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const [x, y] = getXY(e);
    const ctx = canvasRef.current.getContext("2d");
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const end = () => setDrawing(false);

  const clear = () => {
    const c = canvasRef.current;
    c.getContext("2d").clearRect(0, 0, c.width, c.height);
    setEmpty(true);
  };

  const save = () => {
    if (empty) return;
    onSave(canvasRef.current.toDataURL("image/png"));
  };

  return (
    <div className="sig-pad-wrap">
      <div className="sig-pad-box">
        <canvas
          ref={canvasRef}
          className="sig-pad-canvas"
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {empty && !savedDataUrl && <div className="sig-pad-hint">Sign here with your mouse or finger</div>}
      </div>
      <div className="sig-pad-actions">
        <button className="btn btn-ghost" onClick={clear} disabled={empty}><Icon name="x" size={14}/> Clear</button>
        <button className="btn btn-navy" onClick={save} disabled={empty}>
          <Icon name="check" size={14}/> Apply signature
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// VideoLibrary — explainer videos embedded from YouTube, filterable
// ----------------------------------------------------------------------------
const VIDEOS = [
  { id: "UU8kGF58gLY", title: "Transfer of Equity Explained", category: "Transfer of Equity", recommended: true },
  { id: "1uJEGZV50sk", title: "Gifted Deposit Explained UK", category: "Gifted Deposit" },
  { id: "zTwmBaeCzkk", title: "Bridging Loans & Development Finance", category: "Bridging Loan" },
  { id: "Zql2jq7OkkI", title: "Settlement Agreements Explained", category: "Settlement Agreement" },
  { id: "ac6XVPtLees", title: "Deed of Subordination Explained", category: "Deed of Subordination" },
  { id: "RdRugg1VybY", title: "Occupier's Consent — Waiver of Rights", category: "Occupier's Consent" },
  { id: "ZvgvzbTD1sg", title: "Personal & Director Guarantees Explained", category: "Personal Guarantee" },
  { id: "bbepufGjcGY", title: "What is a JBSP Mortgage?", category: "JBSP" },
];

const VIDEO_CATEGORIES = ["All", "Transfer of Equity", "Gifted Deposit", "Personal Guarantee", "Occupier's Consent", "JBSP", "Bridging Loan", "Settlement Agreement", "Deed of Subordination"];

const WATCHED_KEY = "fastila_videos_watched_v1";

const VideoLibrary = () => {
  const [filter, setFilter] = React.useState("All");
  const [activeId, setActiveId] = React.useState(VIDEOS.find(v => v.recommended)?.id || VIDEOS[0].id);
  const [playing, setPlaying] = React.useState(false); // click-to-load iframe
  const [watched, setWatched] = React.useState(() => {
    try {
      const raw = localStorage.getItem(WATCHED_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) { return new Set(); }
  });

  React.useEffect(() => {
    try { localStorage.setItem(WATCHED_KEY, JSON.stringify([...watched])); } catch (e) {}
  }, [watched]);

  // When user clicks play, mark this video as watched
  const startPlaying = () => {
    setPlaying(true);
    setWatched(prev => {
      const next = new Set(prev);
      next.add(activeId);
      return next;
    });
  };

  const filtered = filter === "All" ? VIDEOS : VIDEOS.filter(v => v.category === filter);
  const active = VIDEOS.find(v => v.id === activeId);
  const isActiveWatched = watched.has(activeId);

  const selectVideo = (id) => {
    setActiveId(id);
    setPlaying(false); // reset to thumbnail when switching
  };

  const toggleWatched = (id) => {
    setWatched(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className="video-lib">
      <div className="video-lib-filter">
        {VIDEO_CATEGORIES.map(c => (
          <button
            key={c}
            className={`video-chip ${filter === c ? "is-active" : ""}`}
            onClick={() => setFilter(c)}
          >{c}</button>
        ))}
      </div>

      {active && (
        <div className="video-player">
          <div className="video-player-frame">
            {playing ? (
              <iframe
                key={active.id}
                src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&rel=0`}
                title={active.title.replace(/&amp;/g, "&")}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button className="video-player-poster" onClick={startPlaying} aria-label="Play video">
                <img src={`https://i.ytimg.com/vi/${active.id}/maxresdefault.jpg`} alt="" onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${active.id}/hqdefault.jpg`; }}/>
                <div className="video-player-play-btn">
                  <svg width="68" height="48" viewBox="0 0 68 48">
                    <path d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" fill="#f00"/>
                    <path d="M45 24 27 14v20" fill="#fff"/>
                  </svg>
                </div>
              </button>
            )}
          </div>
          <div className="video-player-info">
            <div className="video-player-cat">{active.category}</div>
            <div className="video-player-title" dangerouslySetInnerHTML={{ __html: active.title }}/>
            <div className="video-player-meta">YouTube · plays in this window</div>
            <div className="video-player-actions">
              <button
                className={`btn ${isActiveWatched ? "btn-ghost" : "btn-lime"}`}
                onClick={() => toggleWatched(active.id)}
              >
                <Icon name={isActiveWatched ? "check" : "thumbs-up"} size={14}/>
                {isActiveWatched ? "Marked as watched" : "Mark as watched"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="video-grid">
        {filtered.map(v => (
          <button
            key={v.id}
            className={`video-card ${activeId === v.id ? "is-playing" : ""} ${watched.has(v.id) ? "is-watched" : ""}`}
            onClick={() => selectVideo(v.id)}
          >
            <div className="video-thumb">
              <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" loading="lazy"/>
              <div className="video-thumb-overlay">
                <Icon name="video" size={20}/>
              </div>
              {watched.has(v.id) && (
                <div className="video-thumb-watched"><Icon name="check" size={11} stroke={3}/></div>
              )}
            </div>
            <div className="video-card-info">
              <div className="video-card-cat">{v.category}</div>
              <div className="video-card-title" dangerouslySetInnerHTML={{ __html: v.title }}/>
            </div>
          </button>
        ))}
      </div>
      <div className="video-lib-foot">
        <Icon name="info" size={12}/>
        <span>More videos coming soon · 4 in production · YouTube embedded, you don't leave the portal · we save your "watched" progress</span>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Signature block — pad + print name + date
// ----------------------------------------------------------------------------
const SignatureBlock = ({ label, sub, defaultName, signature, printName, date, onSave, onClear, disabled }) => {
  const today = new Date().toISOString().slice(0, 10);
  const [name, setName] = React.useState(printName || defaultName || "");
  const [dt, setDt] = React.useState(date || today);

  const onSig = (dataUrl) => {
    if (onSave) onSave(dataUrl, name, dt);
  };

  return (
    <div className={`ccl-sigblock ${disabled ? "is-disabled" : ""}`}>
      <div className="ccl-sigblock-head">
        <strong>{label}</strong>
        {sub && <span className="cell-sub">· {sub}</span>}
      </div>
      {signature ? (
        <div className="ccl-sigblock-saved">
          <div className="ccl-sigblock-saved-img">
            <img src={signature} alt="Signature" className="ccl-sign-img"/>
          </div>
          <div className="ccl-sigblock-saved-meta">
            <div><strong>Print name:</strong> {printName || name}</div>
            <div><strong>Date:</strong> {date || dt}</div>
            <div className="ccl-sign-saved-sync"><Icon name="check" size={12} stroke={3}/> Your lawyer can see this · IP captured</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClear}>
            <Icon name="edit" size={12}/> Re-sign
          </button>
        </div>
      ) : disabled ? (
        <div className="ccl-sigblock-locked">
          <Icon name="lock" size={18}/>
          <span>Complete the points above to unlock signing.</span>
        </div>
      ) : (
        <>
          <SignaturePad onSave={onSig}/>
          <div className="ccl-sigblock-fields">
            <div>
              <label className="field-label">Print full name</label>
              <input
                className="field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full legal name"
              />
            </div>
            <div>
              <label className="field-label">Date</label>
              <input
                className="field-input"
                type="date"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// File drop — accepts files via state (mocked)
// ----------------------------------------------------------------------------
const FileDrop = ({ label, hint, file, onChange, accept, kind }) => {
  const fileInput = React.useRef(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const ctx = (typeof window !== "undefined") ? window.FastILA_currentBooking : null;
  const api = (typeof window !== "undefined") ? window.FastILA : null;

  const handlePick = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setError(null);
    // Always cache a blob URL so the client can preview immediately even if
    // they aren't logged into a real booking (demo / test access).
    const blobUrl = URL.createObjectURL(f);
    const fileState = {
      name: f.name,
      size: `${(f.size / 1024).toFixed(0)} KB`,
      bytes: f.size,
      mime_type: f.type || "application/octet-stream",
      blobUrl,
    };
    if (api && ctx && ctx.bookingId && kind) {
      try {
        setUploading(true);
        const row = await api.documents.upload(ctx.bookingId, kind, f);
        fileState.path = row.storage_path;
        fileState.storage_key = row.storage_key;
        if (typeof window.fiNotify === "function") {
          window.fiNotify("Document uploaded", `${f.name} (${kind.replace(/_/g, " ")})`, ctx.bookingRef || ctx.bookingId);
        }
      } catch (err) {
        console.warn("[FileDrop] upload failed", err);
        setError(err.message || "Upload failed");
      } finally {
        setUploading(false);
      }
    }
    onChange(fileState);
  };

  return (
    <div className="filedrop-row">
      <div className="filedrop-label">{label}</div>
      {file ? (
        <div className="filedrop-filled">
          <div className="filedrop-icon"><Icon name="check" size={14} stroke={3}/></div>
          <div className="flex-1" style={{ minWidth: 0 }}>
            <div
              className="filedrop-name"
              title={file.name}
              style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
            >
              {file.name}
            </div>
            <div className="filedrop-meta">{file.size} · uploaded</div>
          </div>
          <div style={{ display: "inline-flex", gap: 2, flexShrink: 0 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const previewDoc = {
                  filename: file.name,
                  name: file.name,
                  storage_key: file.storage_key,
                  storage_path: file.path,
                  blobUrl: file.blobUrl,
                  size_bytes: typeof file.bytes === "number" ? file.bytes : undefined,
                  mime_type: file.mime_type,
                };
                if (typeof window.fiPreviewDoc === "function") window.fiPreviewDoc(previewDoc);
                else if (typeof window.fiToast === "function") window.fiToast("Preview not available yet");
              }}
              title="Preview this file"
              aria-label="Preview"
              style={{ padding: "4px 8px" }}
            >
              <Icon name="external" size={13}/>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => fileInput.current && fileInput.current.click()}
              title="Replace this file"
              aria-label="Replace"
              style={{ padding: "4px 8px" }}
            >
              <Icon name="edit" size={13}/>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => {
                if (window.confirm(`Remove ${file.name}? You can upload a new file in its place.`)) {
                  if (file.blobUrl) { try { URL.revokeObjectURL(file.blobUrl); } catch (_e) {} }
                  onChange(null);
                }
              }}
              title="Delete this upload"
              aria-label="Delete"
              style={{ color: "#9a1c1c", padding: "4px 8px" }}
            >
              <Icon name="trash" size={13}/>
            </button>
          </div>
        </div>
      ) : (
        <button className="filedrop-empty" onClick={() => fileInput.current.click()} disabled={uploading}>
          <Icon name="package" size={22}/>
          <div className="filedrop-empty-text">
            <div className="filedrop-empty-title">{uploading ? "Uploading…" : "Tap to upload"}</div>
            <div className="filedrop-empty-sub">{hint}</div>
          </div>
        </button>
      )}
      {error && (
        <div style={{ color: "#9a1c1c", fontSize: 12, marginTop: 4 }}>
          <Icon name="x-circle" size={12}/> {error}
        </div>
      )}
      <input ref={fileInput} type="file" accept={accept} hidden onChange={handlePick}/>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 1 — Client care letter (PDF preview + download + sync)
// ----------------------------------------------------------------------------
const StepLetter = ({ state, setState, onNext, bookingRef }) => {
  const firm = (typeof window !== "undefined" && window.FastILA?.firm?.get?.()) || {};
  const firmName = firm.firm || "your law firm";
  const tpl = (typeof window !== "undefined" && window.TemplateStore?.bySubKind("ccl")) || null;
  const [pdfUrl, setPdfUrl] = React.useState(null);
  const [downloading, setDownloading] = React.useState(false);

  React.useEffect(() => {
    let url = null; let cancelled = false;
    async function load() {
      if (!tpl || !window.TemplateStore) return;
      const u = await window.TemplateStore.asObjectUrl(tpl);
      if (cancelled) { if (u) URL.revokeObjectURL(u); return; }
      url = u; setPdfUrl(u);
    }
    load();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [tpl?.storage_key]);

  const anySigned = (state.signatories || []).some(s => s && s.signature) || !!state.signature;
  const downloadSigned = async () => {
    if (!tpl || !window.fiBuildSignedCCL || !window.TemplateStore) return;
    setDownloading(true);
    try {
      const bytes = await window.TemplateStore.getBytes(tpl);
      // Compose signatories array — falls back to legacy single-signature state.
      const signatories = (state.signatories && state.signatories.length > 0)
        ? state.signatories
        : (state.signature ? [{
            name: state.clientName,
            role: "Client",
            signature: state.signature,
            printName: state.signaturePrintName || state.clientName,
            date: state.signatureDate || new Date().toISOString().slice(0, 10),
          }] : []);
      await window.fiBuildSignedCCL({
        templateBytes: bytes,
        signatories,
        bookingRef: bookingRef || (window.FastILA_currentBooking && window.FastILA_currentBooking.bookingRef) || null,
        clientName: state.clientName,
      });
    } finally { setDownloading(false); }
  };

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Sign your client care letter</h2>
      <p className="portal-step-sub">This is the formal agreement between you and <strong>{firmName}</strong> — the law firm providing your ILA. Read it, download a copy for your records, and sign at the bottom.</p>

      <div className="ccl-doc-frame">
        <div className="ccl-doc-toolbar">
          <div className="ccl-doc-toolbar-l">
            <Icon name="doc" size={14}/>
            <span>{tpl ? tpl.filename : "Client care letter"}</span>
            {tpl && <span className="pill pill-muted">{tpl.size ? Math.round(tpl.size/1024) + " KB" : ""}</span>}
          </div>
          <div className="ccl-doc-toolbar-r">
            {state.signature && (
              <span className="ccl-sync-pill" title="Your signed copy is on your lawyer's screen in real time">
                <span className="ccl-sync-dot"/> Synced
              </span>
            )}
            {pdfUrl && anySigned && (
              <button className="btn btn-navy btn-sm" onClick={downloadSigned} disabled={downloading} title="Download the PDF with your signature stamped on it">
                <Icon name="download" size={13}/> {downloading ? "Building…" : "Download signed PDF"}
              </button>
            )}
            {pdfUrl && (
              <a className="btn btn-ghost btn-sm" href={pdfUrl} download={tpl?.filename || "client-care-letter.pdf"} title="Download a blank copy for your records">
                <Icon name="download" size={13}/> {anySigned ? "Original" : "Download PDF"}
              </a>
            )}
          </div>
        </div>

        {tpl && pdfUrl ? (
          // Render the actual uploaded PDF
          <div className="ccl-doc-page" style={{ padding: 0 }}>
            <iframe
              src={pdfUrl}
              title={tpl.filename}
              style={{ width: "100%", height: 560, border: 0, display: "block" }}
            />
          </div>
        ) : (
          // No CCL uploaded by admin yet — friendly empty state
          <div className="ccl-doc-page" style={{ minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 40 }}>
            <div>
              <Icon name="doc" size={36}/>
              <h3 style={{ marginTop: 12 }}>Your client care letter isn't available yet</h3>
              <p style={{ color: "#5b6b76", maxWidth: 420, margin: "8px auto 0" }}>
                {firmName} hasn't uploaded the client care letter template yet. We'll email you as soon as it's ready, or contact us at <strong>{firm.supportEmail || "info@fast-ila.co.uk"}</strong>.
              </p>
            </div>
          </div>
        )}

        <div className="ccl-doc-signzone">
          <div className="ccl-sign-label">
            <Icon name="edit" size={13}/>
            Sign below to confirm you've read &amp; accept the client care letter
          </div>
          <MultiSignatoryBlock state={state} setState={setState}/>
        </div>
      </div>

      <div className="portal-info portal-info-soft">
        <Icon name="bell" size={15}/>
        <span>If you haven't signed and paid 24 hours before your appointment, we'll send you a friendly reminder.</span>
      </div>

      <div className="portal-step-foot">
        <span className="portal-foot-note"><Icon name="lock" size={13}/> Timestamp &amp; IP recorded for compliance</span>
        <button className="btn btn-navy btn-lg" disabled={!allSignatoriesSigned(state)} onClick={onNext}>
          Continue <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// MultiSignatoryBlock — supports 1–N signatories on the CCL.
// Each director / signatory adds their signature + printed name + date.
// ----------------------------------------------------------------------------
const seedSignatories = (state) => {
  if (state.signatories) return state.signatories;
  // Migrate legacy state.signature / state.signature2 if present
  const base = [];
  base.push({
    id: "sig-1",
    name: state.clientName || "",
    role: "Director 1",
    signature: state.signature || null,
    printName: state.signaturePrintName || state.clientName || "",
    date: state.signatureDate || null,
  });
  // Add a co-signatory slot if the booking had one (from the booking form's
  // "Second signatory" fields). Only added when there's a real second name.
  const secondName = state.secondSignatoryName || state.sigName || "";
  if (secondName) {
    base.push({
      id: "sig-2",
      name: secondName,
      role: "Co-signatory",
      signature: state.signature2 || null,
      printName: state.signature2PrintName || secondName,
      date: state.signature2Date || null,
    });
  }
  return base;
};

const allSignatoriesSigned = (state) => {
  const list = state.signatories || seedSignatories(state);
  return list.length > 0 && list.every(s => !!s.signature);
};

const MultiSignatoryBlock = ({ state, setState }) => {
  const [list, setList] = React.useState(() => seedSignatories(state));

  // Mirror the seeded list onto the parent's state — after mount, never during render.
  React.useEffect(() => {
    if (!state.signatories) {
      setState({ ...state, signatories: list, signature: list[0]?.signature || null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = (next) => {
    setList(next);
    // Mirror first signatory back to legacy state.signature for portal step-gate logic
    setState({ ...state, signatories: next, signature: next[0]?.signature || null });
  };

  const update = (id, patch) => {
    sync(list.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const add = () => {
    if (list.length >= 6) return;
    const num = list.length + 1;
    sync([...list, {
      id: `sig-${Date.now()}`,
      name: "",
      role: `Director ${num}`,
      signature: null, printName: "", date: null,
    }]);
  };

  const remove = (id) => {
    if (list.length <= 1) return;
    sync(list.filter(s => s.id !== id));
  };

  const signed = list.filter(s => s.signature).length;

  return (
    <>
      <div className="multi-sig-bar">
        <span className="multi-sig-count">
          <Icon name="users" size={13}/>
          <strong>{signed} of {list.length}</strong> signatories signed
        </span>
        <span className="cell-sub">Every signatory needs to sign below before we can hold the ILA.</span>
      </div>

      {list.map((s, idx) => (
        <div key={s.id} className="multi-sig-row">
          <div className="multi-sig-row-head">
            <div className="multi-sig-row-num">{idx + 1}</div>
            <input
              className="field-input multi-sig-name-input"
              placeholder={`Director ${idx + 1} — full legal name`}
              value={s.name}
              onChange={(e) => update(s.id, { name: e.target.value, printName: s.printName || e.target.value })}
            />
            {list.length > 1 && (
              <button className="multi-sig-remove" onClick={() => remove(s.id)} title="Remove this signatory">
                <Icon name="trash" size={13}/>
              </button>
            )}
          </div>
          <SignatureBlock
            label={s.name ? `${s.name}'s signature` : `Signatory ${idx + 1}`}
            sub={idx === 0 ? null : "Joint signatory — also required"}
            defaultName={s.name}
            signature={s.signature}
            printName={s.printName}
            date={s.date}
            onSave={(sig, name, date) => update(s.id, { signature: sig, printName: name, date })}
            onClear={() => update(s.id, { signature: null, printName: s.name, date: null })}
          />
        </div>
      ))}

      <button className="multi-sig-add" onClick={add} disabled={list.length >= 6}>
        <Icon name="plus" size={14}/>
        {list.length >= 6
          ? "Maximum 6 signatories"
          : `Add another signatory${list.length === 1 ? " (joint signing)" : ""}`}
      </button>
      <p className="multi-sig-help">
        <Icon name="info" size={12}/>
        <span>Some matters need 3, 4 or more directors to sign the client care letter. Add a row for every person who will sign — they'll each need to give ILA at the call.</span>
      </p>
    </>
  );
};

// ----------------------------------------------------------------------------
// Step 2 — KYC
// ----------------------------------------------------------------------------
const StepKYC = ({ state, setState, onNext, onBack }) => {
  // Pull the real signatory names from state — set by MultiSignatoryBlock when
  // the client signs the care letter (step 1).
  const signatories = state.signatories || [];
  const primaryName = (signatories[0]?.name) || state.clientName || "You";
  const secondName  = signatories[1]?.name || state.secondSignatoryName || "";
  const isJoint = !!secondName;

  // Extra signatories beyond 2 — for matters with 3 or 4 directors etc.
  const [extras, setExtras] = React.useState(state.extraSignatories || []);
  const addExtra = () => {
    if (extras.length >= 2) return; // up to 4 total (2 base + 2 extras)
    setExtras([...extras, { name: "", kycId: null, kycAddress: null }]);
  };
  const updateExtra = (i, patch) => {
    const next = extras.map((e, idx) => idx === i ? { ...e, ...patch } : e);
    setExtras(next);
    setState({ ...state, extraSignatories: next });
  };
  const removeExtra = (i) => {
    const next = extras.filter((_, idx) => idx !== i);
    setExtras(next);
    setState({ ...state, extraSignatories: next });
  };

  const extrasOK = extras.every(e => e.name && e.kycId && e.kycAddress);
  const canContinue = state.kycId && state.kycAddress
    && (!isJoint || (state.kycId2 && state.kycAddress2))
    && extrasOK;

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Verify your identity</h2>
      <p className="portal-step-sub">
        {isJoint
          ? <>We need a photo ID and recent proof of address for <strong>all signatories</strong>. Required by anti-money-laundering rules. Photos from your phone are fine.</>
          : <>We need a photo ID and a recent proof of address. Required by anti-money-laundering rules. Photos from your phone are fine.</>
        }
      </p>

      <div className="kyc-section">
        <div className="kyc-section-head">
          <Icon name="user" size={14}/>
          <span>You — <strong>{primaryName}</strong></span>
        </div>
        <div className="kyc-grid">
          <FileDrop kind="id_passport"   label="Photo ID" hint="Passport or UK driving licence" file={state.kycId} onChange={(f) => setState({ ...state, kycId: f })} accept="image/*,.pdf,.doc,.docx"/>
          <FileDrop kind="address_proof" label="Proof of address" hint="Bank statement, utility bill or council tax letter — last 3 months" file={state.kycAddress} onChange={(f) => setState({ ...state, kycAddress: f })} accept="image/*,.pdf,.doc,.docx"/>
        </div>
      </div>

      {isJoint && (
        <div className="kyc-section">
          <div className="kyc-section-head">
            <Icon name="users" size={14}/>
            <span>Co-signatory — <strong>{secondName}</strong></span>
          </div>
          <div className="kyc-grid">
            <FileDrop kind="id_passport"   label="Their photo ID" hint="Passport or UK driving licence" file={state.kycId2} onChange={(f) => setState({ ...state, kycId2: f })} accept="image/*,.pdf,.doc,.docx"/>
            <FileDrop kind="address_proof" label="Their proof of address" hint="Bank statement, utility bill or council tax letter — last 3 months" file={state.kycAddress2} onChange={(f) => setState({ ...state, kycAddress2: f })} accept="image/*,.pdf,.doc,.docx"/>
          </div>
        </div>
      )}

      {extras.map((ex, i) => (
        <div className="kyc-section" key={i}>
          <div className="kyc-section-head">
            <Icon name="users" size={14}/>
            <span>Additional signatory {i + 3}</span>
            <button className="kyc-remove" onClick={() => removeExtra(i)} title="Remove">
              <Icon name="x" size={12}/>
            </button>
          </div>
          <div className="kyc-extra-name">
            <label className="field-label">Their full name</label>
            <input className="field-input" value={ex.name} onChange={(e) => updateExtra(i, { name: e.target.value })} placeholder="e.g. third director's name"/>
          </div>
          <div className="kyc-grid" style={{ marginTop: 10 }}>
            <FileDrop kind="id_passport"   label="Their photo ID" hint="Passport or UK driving licence" file={ex.kycId} onChange={(f) => updateExtra(i, { kycId: f })} accept="image/*,.pdf,.doc,.docx"/>
            <FileDrop kind="address_proof" label="Their proof of address" hint="Bank statement, utility bill or council tax letter — last 3 months" file={ex.kycAddress} onChange={(f) => updateExtra(i, { kycAddress: f })} accept="image/*,.pdf,.doc,.docx"/>
          </div>
        </div>
      ))}

      {extras.length < 2 && (
        <button className="kyc-add-more" onClick={addExtra}>
          <Icon name="plus" size={14}/>
          Add another signatory{isJoint ? " (3rd or 4th director)" : ""}
        </button>
      )}

      <div className="portal-info">
        <Icon name="info" size={16}/>
        <span>Names on each person's two documents must match. If they don't, upload a marriage certificate or deed poll as a third document.</span>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={!canContinue} onClick={onNext}>
          Continue <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 3 — Bank transfer
// ----------------------------------------------------------------------------
const StepPay = ({ state, setState, onNext, onBack }) => {
  const [paid, setPaid] = React.useState(state.paid || false);
  const [reference, setReference] = React.useState(state.paymentRef || "");
  const [date, setDate] = React.useState(state.paymentDate || "");
  const [fromOwn, setFromOwn] = React.useState(false);
  // Pull firm + bank details + the uploaded client-account PDF from admin's templates
  const firm = (typeof window !== "undefined" && window.FastILA?.firm?.get?.()) || {};
  const firmName = firm.firm || "your law firm";
  const bankCfg = firm.clientAccount || {};
  const bankTpl = (typeof window !== "undefined" && window.TemplateStore?.bySubKind("bank")) || null;
  const [bankPdfUrl, setBankPdfUrl] = React.useState(null);

  React.useEffect(() => {
    let url = null; let cancelled = false;
    async function load() {
      if (!bankTpl || !window.TemplateStore) return;
      const u = await window.TemplateStore.asObjectUrl(bankTpl);
      if (cancelled) { if (u) URL.revokeObjectURL(u); return; }
      url = u; setBankPdfUrl(u);
    }
    load();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [bankTpl?.storage_key]);

  // Always KAO/{CLIENT NAME} — driven by shared helper so the dashboard,
  // change-service flow and n8n payloads all show the same string.
  const suggestedRef = (typeof window.fiPaymentReference === "function")
    ? window.fiPaymentReference(state.clientName || "")
    : "KAO/CLIENTNAME";
  const canConfirm = (paid || (reference && date)) && fromOwn;
  const fee = state.amount || state.fee || "—";

  const confirm = () => {
    setState({ ...state, paid: true, paymentRef: reference || suggestedRef, paymentDate: date || "today" });
    onNext();
  };

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Pay by bank transfer</h2>
      <p className="portal-step-sub">Transfer the fee from <strong>your own personal UK bank account</strong> into the firm's client account, then confirm below. We cannot accept card payments.</p>

      {bankTpl && bankPdfUrl ? (
        // Admin uploaded a real client-account PDF — show it inline
        <div className="bank-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="bank-card-head" style={{ padding: 14 }}>
            <div>
              <div className="bank-card-eyebrow">Pay to</div>
              <div className="bank-card-name">{firmName} — Client Account</div>
            </div>
            <a className="btn-ghost-light bank-pdf-btn" href={bankPdfUrl} download={bankTpl.filename || "client-account.pdf"}>
              <Icon name="download" size={13}/> PDF copy
            </a>
          </div>
          <iframe src={bankPdfUrl} title={bankTpl.filename} style={{ width: "100%", height: 480, border: 0, display: "block" }}/>
        </div>
      ) : (bankCfg.bank || bankCfg.account || bankCfg.sortCode) ? (
        // No PDF but firm has set bank details in Settings → Firm profile
        <div className="bank-card">
          <div className="bank-card-head">
            <div>
              <div className="bank-card-eyebrow">Pay to</div>
              <div className="bank-card-name">{firmName} — Client Account</div>
            </div>
          </div>
          <div className="bank-rows">
            {bankCfg.bank && <BankRow label="Bank" value={bankCfg.bank}/>}
            {bankCfg.sortCode && <BankRow label="Sort code" value={bankCfg.sortCode} mono/>}
            {bankCfg.account && <BankRow label="Account number" value={bankCfg.account} mono/>}
            <BankRow label="Account name" value={`${firmName} Client Account`}/>
            <BankRow label="Reference" value={suggestedRef} mono highlight/>
            <BankRow label="Amount" value={`£${fee}`} mono highlight/>
          </div>
          <div className="bank-card-note">
            <Icon name="warning" size={14}/>
            <span>Use the reference exactly as shown so we can match your payment to your booking. Without it we may not see the payment for 24+ hours.</span>
          </div>
        </div>
      ) : (
        // Neither uploaded — empty state for admin to fix
        <div className="bank-card" style={{ padding: 40, textAlign: "center", color: "#5b6b76" }}>
          <Icon name="info" size={36}/>
          <h3 style={{ marginTop: 12 }}>Bank details not yet published</h3>
          <p style={{ maxWidth: 460, margin: "8px auto 0" }}>
            {firmName} hasn't uploaded the client account details yet. We'll email you the transfer details — or get in touch at <strong>{firm.supportEmail || "info@fast-ila.co.uk"}</strong>.
          </p>
        </div>
      )}

      <div className="bank-warn">
        <div className="bank-warn-icon"><Icon name="shield" size={18}/></div>
        <div>
          <div className="bank-warn-title">Pay from your own personal bank account</div>
          <div className="bank-warn-sub">
            We act for you personally, not the company being financed. The fee must come from <strong>your own UK bank account</strong> — not the borrower's account, the lender's, or any company account. If it does, we may have to return the money and start over.
          </div>
        </div>
      </div>

      <div className="bank-confirm">
        <h3 className="bank-confirm-title">Once you've sent it, confirm here</h3>
        <div className="bank-confirm-grid">
          <div>
            <label className="field-label">Date of transfer</label>
            <input className="field-input" type="date" value={date} onChange={(e) => setDate(e.target.value)}/>
          </div>
          <div>
            <label className="field-label">Reference you used <span className="bk-optional">(if different)</span></label>
            <input className="field-input mono" placeholder={suggestedRef} value={reference} onChange={(e) => setReference(e.target.value)}/>
          </div>
        </div>
        <label className="bank-confirm-check">
          <input type="checkbox" checked={fromOwn} onChange={(e) => setFromOwn(e.target.checked)}/>
          <span>I confirm I sent £250 from <strong>my own personal UK bank account</strong>, not a company account.</span>
        </label>
        <label className="bank-confirm-check">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)}/>
          <span>I confirm I've made the transfer.</span>
        </label>
      </div>

      <div className="portal-info portal-info-soft">
        <Icon name="bell" size={15}/>
        <span>We'll email a payment confirmation once we see it land — usually within an hour. You can move on to the next step now.</span>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={!canConfirm} onClick={confirm}>
          I've paid — continue <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

const BankRow = ({ label, value, mono, highlight }) => (
  <div className={`bank-row ${highlight ? "is-highlight" : ""}`}>
    <span className="bank-row-l">{label}</span>
    <span className={`bank-row-v ${mono ? "mono" : ""}`}>
      {value}
      <button className="bank-copy" onClick={() => navigator.clipboard?.writeText(String(value))} title="Copy">
        <Icon name="external" size={11}/>
      </button>
    </span>
  </div>
);

// ----------------------------------------------------------------------------
// Step 4 — Upload matter documents
// ----------------------------------------------------------------------------
const formatBytes = (n) => {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

const StepDocs = ({ state, setState, onNext, onBack }) => {
  const docs = state.matterDocs || [];
  const fileInput = React.useRef(null);
  const moreInput = React.useRef(null);
  // Per-file in-flight upload rows: { key, name, size, status, error }
  const [pending, setPending] = React.useState([]);
  const [dragOver, setDragOver] = React.useState(false);

  const totalBytes = docs.reduce((sum, d) => sum + (typeof d.bytes === "number" ? d.bytes : 0), 0);

  const ingest = async (filesIn) => {
    const files = Array.from(filesIn || []);
    if (files.length === 0) return;
    const ctx = (typeof window !== "undefined") ? window.FastILA_currentBooking : null;
    const api = (typeof window !== "undefined") ? window.FastILA : null;

    // Seed pending rows for live feedback
    const pendingRows = files.map(f => ({
      key: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: f.name,
      bytes: f.size,
      status: "uploading",
    }));
    setPending(prev => [...prev, ...pendingRows]);

    const finalDocs = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const p = pendingRows[i];
      try {
        // Always cache a blob URL so the client can preview immediately even
        // when there's no booking context (demo mode).
        const blobUrl = URL.createObjectURL(f);
        if (api && ctx && ctx.bookingId) {
          const row = await api.documents.upload(ctx.bookingId, "matter_doc", f);
          finalDocs.push({
            name: row.filename || f.name,
            size: formatBytes(f.size),
            bytes: f.size,
            mime_type: f.type || "application/octet-stream",
            path: row.storage_path,
            storage_key: row.storage_key,
            blobUrl,
            uploaded_at: new Date().toISOString(),
          });
          if (typeof window.fiNotify === "function") {
            window.fiNotify("Matter doc uploaded", f.name, ctx.bookingRef || ctx.bookingId);
          }
        } else {
          finalDocs.push({ name: f.name, size: formatBytes(f.size), bytes: f.size, mime_type: f.type || "application/octet-stream", blobUrl });
        }
        setPending(prev => prev.map(r => r.key === p.key ? { ...r, status: "done" } : r));
      } catch (err) {
        console.warn("[StepDocs] upload failed", err);
        setPending(prev => prev.map(r => r.key === p.key ? { ...r, status: "error", error: err.message || "Upload failed" } : r));
      }
    }

    setState({ ...state, matterDocs: [...docs, ...finalDocs] });
    // Sweep finished pending rows after a beat so the user sees the checkmark
    setTimeout(() => {
      setPending(prev => prev.filter(r => r.status !== "done"));
    }, 1200);
  };

  const handlePick = (e) => {
    ingest(e.target.files);
    e.target.value = "";
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer && e.dataTransfer.files) ingest(e.dataTransfer.files);
  };

  const [confirmRemove, setConfirmRemove] = React.useState(null);
  const askRemove = (i) => setConfirmRemove({ index: i, doc: docs[i] });
  const doRemove = async () => {
    if (!confirmRemove) return;
    const i = confirmRemove.index;
    const doc = confirmRemove.doc;
    // Find the underlying store row by storage_key (set when upload succeeded)
    const api = (typeof window !== "undefined") ? window.FastILA : null;
    const ctx = (typeof window !== "undefined") ? window.FastILA_currentBooking : null;
    if (api && ctx && ctx.bookingId && doc && doc.storage_key) {
      try {
        const all = api.documents.list(ctx.bookingRef || ctx.bookingId);
        const row = all.find(d => d.storage_key === doc.storage_key);
        if (row) await api.documents.remove(row);
      } catch (e) { console.warn("[StepDocs] remove failed", e); }
    }
    setState({ ...state, matterDocs: docs.filter((_, j) => j !== i) });
    setConfirmRemove(null);
  };

  const inflight = pending.filter(r => r.status === "uploading").length;

  // Lawyer's pending message — written from the dashboard's "Send reminder" flow.
  const ctx = (typeof window !== "undefined") ? window.FastILA_currentBooking : null;
  const liveBooking = ctx && window.FastILA && window.FastILA.bookings && window.FastILA.bookings.get
    ? window.FastILA.bookings.get(ctx.bookingRef || ctx.bookingId)
    : null;
  const pendingMsg = liveBooking && liveBooking.pendingClientMessage;

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Upload your matter documents</h2>
      <p className="portal-step-sub">Please share <strong>every document</strong> you're being asked to sign, plus the loan offer if you have it. Most matters have 10+ files — upload them all so your lawyer can read them ahead of the call and so we can run them through our AI to prepare your detailed brief. <strong>No cap on how many you upload.</strong></p>

      {pendingMsg && pendingMsg.body && (
        <div style={{
          background: "#063952", color: "#e6f7c8", borderRadius: 10, padding: "14px 16px",
          marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e6f7c8", color: "#063952", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="mail" size={15}/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.7, textTransform: "uppercase", marginBottom: 4 }}>Message from your solicitor</div>
            {pendingMsg.subject && <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{pendingMsg.subject}</div>}
            <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#f7fbf2" }}>{pendingMsg.body.replace(/\{\{portalUrl\}\}/g, window.location.href)}</div>
            {pendingMsg.sentAt && (
              <div style={{ fontSize: 11, opacity: 0.65, marginTop: 8 }}>Sent {new Date(pendingMsg.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{pendingMsg.channels ? ` · via ${pendingMsg.channels.join(" + ")}` : ""}</div>
            )}
          </div>
        </div>
      )}

      <button
        className={`docs-empty ${dragOver ? "is-drag" : ""}`}
        onClick={() => fileInput.current && fileInput.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <div className="docs-empty-icon"><Icon name="package" size={28}/></div>
        <div className="docs-empty-title">Drop files here, or tap to select</div>
        <div className="docs-empty-sub">PDF, DOCX, or photos · up to 25 MB each · select as many as you need</div>
      </button>
      <input ref={fileInput} type="file" accept=".pdf,.docx,.doc,image/*" hidden multiple onChange={handlePick}/>
      <input ref={moreInput} type="file" accept=".pdf,.docx,.doc,image/*" hidden multiple onChange={handlePick}/>

      {(docs.length > 0 || pending.length > 0) && (
        <div className="portal-docs-summary">
          <div>
            <strong>{docs.length}</strong> file{docs.length === 1 ? "" : "s"} uploaded
            {totalBytes > 0 && <span className="portal-docs-summary-meta"> · {formatBytes(totalBytes)} total</span>}
            {inflight > 0 && <span className="portal-docs-summary-busy"> · {inflight} uploading…</span>}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => moreInput.current && moreInput.current.click()}>
            <Icon name="plus" size={12}/> Add more
          </button>
        </div>
      )}

      {(docs.length > 0 || pending.length > 0) && (
        <div className="portal-docs-list">
          {docs.map((d, i) => {
            const previewDoc = {
              filename: d.name, name: d.name,
              storage_key: d.storage_key, storage_path: d.path,
              blobUrl: d.blobUrl,
              size_bytes: typeof d.bytes === "number" ? d.bytes : undefined,
              mime_type: d.mime_type,
            };
            const onPreview = () => {
              if (typeof window.fiPreviewDoc === "function") window.fiPreviewDoc(previewDoc);
              else if (typeof window.fiToast === "function") window.fiToast("Preview not available yet");
            };
            return (
              <div key={`d-${i}`} className="portal-doc">
                <div className="portal-doc-icon"><Icon name="doc" size={16}/></div>
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <button
                    onClick={onPreview}
                    style={{ background: "transparent", border: "none", padding: 0, textAlign: "left", cursor: "pointer", display: "block", width: "100%" }}
                    title="Preview this document"
                  >
                    <div className="portal-doc-name" style={{ textDecoration: "underline", textDecorationColor: "#cfd8de", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{d.name}</div>
                  </button>
                  <div className="portal-doc-meta">{d.size || formatBytes(d.bytes)} · <span className="portal-doc-ok">uploaded</span></div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={onPreview} title="Preview this document">
                  <Icon name="external" size={12}/>
                </button>
                <button className="portal-doc-x" onClick={() => askRemove(i)} title="Remove this file"><Icon name="x" size={14}/></button>
              </div>
            );
          })}
          {pending.map((p) => (
            <div key={p.key} className={`portal-doc portal-doc-pending portal-doc-${p.status}`}>
              <div className="portal-doc-icon">
                {p.status === "error" ? <Icon name="warning" size={16}/> :
                 p.status === "done"  ? <Icon name="check" size={16} stroke={3}/> :
                                        <span className="portal-doc-spinner" aria-hidden="true"/>}
              </div>
              <div className="flex-1">
                <div className="portal-doc-name">{p.name}</div>
                <div className="portal-doc-meta">
                  {formatBytes(p.bytes)}
                  {p.status === "uploading" && <> · <span className="portal-doc-busy">uploading…</span></>}
                  {p.status === "error" && <> · <span className="portal-doc-err">failed — try again</span></>}
                </div>
                {p.status === "uploading" && <div className="portal-doc-bar"><div className="portal-doc-bar-fill"/></div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="portal-checklist">
        <div className="portal-checklist-title">What we need to see</div>
        <ul>
          <li>Loan offer / facility agreement</li>
          <li>Personal guarantee, occupier's consent, or whatever you've been asked to sign</li>
          <li>Mortgage offer (if applicable)</li>
          <li>Any side letters, schedules, or appendices</li>
          <li>Company accounts, business plans, or trust deeds if your lender asked for them</li>
        </ul>
      </div>

      <div className="portal-info portal-info-warn">
        <Icon name="warning" size={15}/>
        <span><strong>Documents are required before we can hold your call.</strong> Without them your lawyer can't give the advice and we may have to reschedule. If anything's missing, just call us on 0207 459 4037.</span>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={docs.length === 0 || inflight > 0} onClick={onNext}>
          {inflight > 0 ? `Uploading ${inflight}…` : "Continue"} <Icon name="arrow-right" size={14}/>
        </button>
      </div>

      {/* Confirm-then-delete dialog */}
      {confirmRemove && (
        <div className="docpicker-overlay" onClick={() => setConfirmRemove(null)} style={{ zIndex: 200 }}>
          <div className="docpicker" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <header className="docpicker-head">
              <div>
                <h3 style={{ margin: 0 }}>Remove this document?</h3>
                <p className="cell-sub" style={{ margin: "4px 0 0", fontSize: 12, color: "#5b6b76" }}>
                  This permanently deletes <strong>{confirmRemove.doc && confirmRemove.doc.name}</strong> from your matter. Your lawyer will no longer be able to see it. You can re-upload at any time.
                </p>
              </div>
            </header>
            <footer className="docpicker-foot" style={{ justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmRemove(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={doRemove} style={{ background: "#9a1c1c", color: "white", border: "none" }}>
                <Icon name="trash" size={13}/> Permanently delete
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

// ----------------------------------------------------------------------------
// LawyerNoteCard — shows the client-facing note the lawyer left on the matter.
// Pulled live from the lawyer's "Notes · Client-facing" tab on the admin side.
// ----------------------------------------------------------------------------
const PRE_CALL_NOTE = "Hi Priya & Rohan — looking forward to our call tomorrow. Please have your passport / driving licence and a recent utility bill ready to show on camera. I've reviewed your Shawbrook facility documents and made notes on the key clauses we'll discuss. — Amelia";
const POST_CALL_NOTE = "Hi Priya & Rohan — thanks for the call earlier. We covered your personal guarantee for the Shawbrook facility — the key points were the cross-default clause, the all-monies wording, and joint & several liability. You both confirmed you understand and are proceeding voluntarily. Next: please sign your declaration in this portal so I can issue your ILA certificate to Shawbrook. Any questions, just reply to this. — Amelia";

const LawyerNoteCard = ({ preCall }) => {
  const lawyer = (typeof LAWYERS !== "undefined" && LAWYERS[0]) || { name: "Amelia Hart", initials: "AH", photoBg: "#1f7497" };
  const ts = preCall ? "Today at 16:42" : "Today at 11:18";
  return (
    <div className="lawyer-note-card">
      <div className="lawyer-note-avatar">
        <Avatar lawyer={lawyer} size={40}/>
      </div>
      <div>
        <div className="lawyer-note-head">
          <span className="lawyer-note-from">Note from {lawyer.name}</span>
          <span className="lawyer-note-meta">{preCall ? "Before the call" : "After the call"} · {ts}</span>
        </div>
        <div className="lawyer-note-body">{preCall ? PRE_CALL_NOTE : POST_CALL_NOTE}</div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 5 — Understanding check (questionnaire + signed declaration)
// ----------------------------------------------------------------------------
const StepUnderstanding = ({ state, setState, onNext, onBack }) => {
  // Matter type selector — in production this comes from the booking.
  const [matterType, setMatterType] = React.useState(state.understandMatterType || "personal-guarantee");
  const data = UNDERSTANDING_QUESTIONS[matterType] || GENERIC_QUESTIONS;

  const [checked, setChecked] = React.useState(state.understandChecks || {});

  // Pull watched-videos from localStorage — populated by VideoLibrary in Step Meet
  const watchedVideoCount = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("fastila_videos_watched_v1");
      return raw ? JSON.parse(raw).length : 0;
    } catch (e) { return 0; }
  }, []);

  // Declaration confirmations — separate from the matter Qs
  const [declarations, setDeclarations] = React.useState(state.declarations || {
    attended: false,
    voluntary: false,
    noDuress: false,
    watchedVideos: watchedVideoCount > 0, // pre-tick if they actually watched videos
    documentsTrue: false,
  });

  // Seed declaration signatories from the CCL step's signatories so the same
  // people who agreed to be advised also sign the declaration. Fall back to a
  // single-signatory list keyed off clientName.
  const seedDeclSigs = () => {
    if (state.declarationSignatories && state.declarationSignatories.length > 0) return state.declarationSignatories;
    const src = (state.signatories && state.signatories.length > 0)
      ? state.signatories
      : [{ name: state.clientName || "", role: "Client" }];
    return src.map((s, i) => ({
      id: `dec-${i + 1}`,
      name: s.name || state.clientName || "",
      role: s.role || (i === 0 ? "Client" : `Co-signatory ${i}`),
      signature: i === 0 ? (state.declarationSignature || null) : null,
      printName: i === 0 ? (state.declarationPrintName || s.name || state.clientName || "") : (s.name || ""),
      date: i === 0 ? (state.declarationDate || null) : null,
    }));
  };
  const [decSigs, setDecSigs] = React.useState(seedDeclSigs);

  // Mirror initial seed to parent state once
  React.useEffect(() => {
    if (!state.declarationSignatories) {
      setState({ ...state, declarationSignatories: decSigs });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDecSig = (id, patch) => {
    const next = decSigs.map(s => s.id === id ? { ...s, ...patch } : s);
    setDecSigs(next);
    const anySigned = next.some(s => s.signature);
    const allSigned = next.every(s => s.signature);
    setState({
      ...state,
      declarationSignatories: next,
      // Keep legacy fields populated from the FIRST signatory so existing
      // surfaces (PDF, step gate, dashboard) keep working.
      declarationSigned: allSigned,
      declarationSignature: next[0]?.signature || null,
      declarationPrintName: next[0]?.printName || null,
      declarationDate: next[0]?.date || null,
    });
  };
  const addDecSig = () => {
    if (decSigs.length >= 6) return;
    const next = [...decSigs, {
      id: `dec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: "", role: `Co-signatory ${decSigs.length}`,
      signature: null, printName: "", date: null,
    }];
    setDecSigs(next);
    setState({ ...state, declarationSignatories: next });
  };
  const removeDecSig = (id) => {
    if (decSigs.length <= 1) return;
    const next = decSigs.filter(s => s.id !== id);
    setDecSigs(next);
    setState({ ...state, declarationSignatories: next });
  };

  const signedCount = decSigs.filter(s => s.signature).length;
  const allSigned = decSigs.length > 0 && decSigs.every(s => s.signature);
  const signed = allSigned; // alias for backwards compat in JSX below

  const toggle = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    setState({ ...state, understandChecks: next, understandMatterType: matterType });
  };

  const toggleDeclaration = (id) => {
    const next = { ...declarations, [id]: !declarations[id] };
    setDeclarations(next);
    setState({ ...state, declarations: next });
  };

  const allChecked = data.items.every(it => checked[it.id]);
  const allDeclarations = Object.values(declarations).every(Boolean);
  const checkedCount = data.items.filter(it => checked[it.id]).length;
  const canSign = allChecked && allDeclarations;

  // One-click bulk confirm — ticks every box in Parts 1 and 2 in a single
  // action so the client doesn't have to tap each one. They can still untick
  // individual items if they need to.
  const confirmAll = () => {
    if (signed) return;
    const nextChecks = {};
    data.items.forEach(it => { nextChecks[it.id] = true; });
    setChecked(nextChecks);
    const nextDecs = {};
    Object.keys(declarations).forEach(k => { nextDecs[k] = true; });
    setDeclarations(nextDecs);
    setState({ ...state, understandChecks: nextChecks, declarations: nextDecs, understandMatterType: matterType });
  };
  const resetAll = () => {
    if (signed) return;
    setChecked({});
    const nextDecs = {};
    Object.keys(declarations).forEach(k => { nextDecs[k] = false; });
    setDeclarations(nextDecs);
    setState({ ...state, understandChecks: {}, declarations: nextDecs });
  };

  const downloadSignedDeclarationPDF = () => {
    if (!window.fiBuildDeclarationPDF) {
      if (window.fiToast) window.fiToast("PDF library still loading — try again in a moment");
      return;
    }
    window.fiBuildDeclarationPDF({
      bookingRef: (window.FastILA_currentBooking && window.FastILA_currentBooking.bookingRef) || null,
      matterType,
      matterTitle: data.title,
      matterItems: data.items,
      checks: checked,
      declarations,
      signatories: decSigs,                      // NEW: every signatory
      // legacy single-sig fields kept for older PDF callers:
      signature: state.declarationSignature,
      printName: state.declarationPrintName || state.clientName,
      signedAt: state.declarationDate,
      auditNote: "Signed in client portal",
    });
  };

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Sign your declaration</h2>
      <p className="portal-step-sub">
        Now that we've had the call, please confirm — in broad terms — that you understood each point we discussed, and that you're proceeding voluntarily. This is your record of advice. We keep an identical copy, so if there's ever any dispute with the lender or anyone else, we have audit-grade proof you understood what you were signing. <strong>Read each point carefully.</strong>
      </p>

      <LawyerNoteCard/>

      <div className="understand-matter-bar">
        <label className="field-label" style={{ marginBottom: 0 }}>Matter type</label>
        <select
          className="matter-select"
          value={matterType}
          onChange={(e) => { setMatterType(e.target.value); setChecked({}); }}
          disabled={signed}
        >
          <option value="personal-guarantee">Personal Guarantee</option>
          <option value="occupiers-consent">Occupier's Consent</option>
          <option value="jbsp-mortgage">Joint Borrower Sole Proprietor (JBSP)</option>
          <option value="bridging-loan">Bridging Loan</option>
          <option value="deed-of-subordination">Deed of Subordination</option>
          <option value="gifted-deposit">Gifted Deposit</option>
          <option value="statutory-declaration">Statutory Declaration</option>
          <option value="transfer-of-equity">Transfer of Equity</option>
        </select>
        <span className="understand-progress">{checkedCount} / {data.items.length} confirmed</span>
      </div>

      {/* One-click bulk confirm — speeds up clients who've already discussed
          every point with the solicitor on the call. */}
      {!signed && (
        <div style={{
          marginTop: 12, marginBottom: 12,
          padding: "12px 14px",
          background: canSign ? "#e8f5e9" : "#063952",
          color: canSign ? "#1e5128" : "#e6f7c8",
          border: "1px solid " + (canSign ? "#b8e0bb" : "#063952"),
          borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <Icon name={canSign ? "check" : "bolt"} size={15} stroke={canSign ? 3 : 2}/>
          <div style={{ flex: 1, minWidth: 200, fontSize: 13.5 }}>
            {canSign
              ? <><strong>All confirmed.</strong> Scroll down to sign your name.</>
              : <><strong>Done it all on the call?</strong> Tap to confirm every point in one go, then review and sign below. You can untick anything you want to query.</>}
          </div>
          {canSign ? (
            <button
              type="button"
              onClick={resetAll}
              className="btn btn-ghost btn-sm"
              style={{ background: "rgba(30,81,40,0.08)", color: "#1e5128", borderColor: "transparent", flexShrink: 0 }}
            >
              <Icon name="x" size={12}/> Reset all
            </button>
          ) : (
            <button
              type="button"
              onClick={confirmAll}
              className="btn btn-lime"
              style={{ flexShrink: 0 }}
            >
              <Icon name="check" size={14} stroke={3}/> Confirm all points
            </button>
          )}
        </div>
      )}

      <h3 className="understand-section-title">Part 1 · {data.title}</h3>
      <p className="understand-section-sub">Confirm in broad terms — your lawyer walked you through each of these on the call.</p>
      <div className="understand-list">
        {data.items.map((it, idx) => (
          <button
            key={it.id}
            type="button"
            className={`understand-item understand-item-btn ${checked[it.id] ? "is-checked" : ""}`}
            onClick={() => !signed && toggle(it.id)}
            disabled={signed}
            aria-pressed={!!checked[it.id]}
          >
            <span className={`understand-tick ${checked[it.id] ? "is-on" : ""}`} aria-hidden="true">
              {checked[it.id] && <Icon name="check" size={14} stroke={3}/>}
            </span>
            <span className="understand-item-body">
              <span className="understand-q"><strong>{idx + 1}.</strong> {it.q}</span>
              <span className="understand-example">
                <Icon name="info" size={12}/>
                <span><strong>For example:</strong> {it.example}</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <h3 className="understand-section-title" style={{ marginTop: 24 }}>Part 2 · Your declaration</h3>
      <p className="understand-section-sub">These statements are required for the certificate. Please tick each one.</p>
      <div className="understand-list">
        <DecItem
          id="attended"
          checked={declarations.attended}
          onToggle={toggleDeclaration}
          disabled={signed}
          title="I attended the Independent Legal Advice call with Nexa Law Ltd."
          sub="Held by video conference. My identity was verified by my solicitor."
        />
        <DecItem
          id="watchedVideos"
          checked={declarations.watchedVideos}
          onToggle={toggleDeclaration}
          disabled={signed}
          title="I watched the explainer video(s) provided in my portal."
          sub={watchedVideoCount > 0
            ? `${watchedVideoCount} video${watchedVideoCount === 1 ? "" : "s"} watched and marked complete in your portal.`
            : "If you haven't watched the relevant video(s) yet, please return to the previous step and do so before signing."}
          warn={watchedVideoCount === 0}
        />
        <DecItem
          id="voluntary"
          checked={declarations.voluntary}
          onToggle={toggleDeclaration}
          disabled={signed}
          title="I am entering into this transaction voluntarily and of my own free will."
          sub="Nobody has forced or persuaded me to proceed against my own judgment."
        />
        <DecItem
          id="noDuress"
          checked={declarations.noDuress}
          onToggle={toggleDeclaration}
          disabled={signed}
          title="I am signing this declaration free from duress, undue influence or pressure."
          sub="No relative, partner, employer, lender or other person has pressured me into signing."
        />
        <DecItem
          id="documentsTrue"
          checked={declarations.documentsTrue}
          onToggle={toggleDeclaration}
          disabled={signed}
          title="The documents I uploaded are the documents I will be signing for the lender."
          sub="My lawyer advised me on the same set of documents I am being asked to execute."
        />
      </div>

      <h3 className="understand-section-title" style={{ marginTop: 24 }}>Part 3 · Sign &amp; date</h3>
      <p className="understand-section-sub">
        By signing below, I confirm that everything above is true and I authorise Nexa Law Ltd to issue my ILA certificate to the lender.
      </p>

      {!canSign && (
        <div className="portal-info portal-info-warn">
          <Icon name="warning" size={15}/>
          <span>Tick every box in Parts 1 and 2 before signing. {data.items.length - checkedCount > 0 ? `${data.items.length - checkedCount} matter point${data.items.length - checkedCount === 1 ? "" : "s"} left. ` : ""}{Object.values(declarations).filter(v => !v).length > 0 ? `${Object.values(declarations).filter(v => !v).length} declaration${Object.values(declarations).filter(v => !v).length === 1 ? "" : "s"} left.` : ""}</span>
        </div>
      )}
      {canSign && !allSigned && decSigs.length > 1 && (
        <div className="portal-info portal-info-warn">
          <Icon name="users" size={15}/>
          <span><strong>{decSigs.length - signedCount} of {decSigs.length} signatories still need to sign.</strong> Each person must sign individually — we capture a separate timestamp and IP for every signatory.</span>
        </div>
      )}

      <div className="multi-sig-bar" style={{ marginBottom: 8 }}>
        <span className="multi-sig-count">
          <Icon name="users" size={13}/>
          <strong>{signedCount} of {decSigs.length}</strong> {decSigs.length === 1 ? "signatory" : "signatories"} signed
        </span>
        <span className="cell-sub">Each signatory must sign individually so we have audit-grade proof each of them understood.</span>
      </div>

      {decSigs.length === 1 && (
        <div className="portal-info portal-info-soft" style={{ marginBottom: 10, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Icon name="users" size={15}/>
          <span><strong>More than one person on the call?</strong> Use <em>Add another signatory</em> below so each person can confirm and sign individually. This is essential where multiple directors or co-borrowers received the advice.</span>
        </div>
      )}

      {decSigs.map((s, idx) => (
        <div key={s.id} className="multi-sig-row" style={{ marginBottom: 10 }}>
          <div className="multi-sig-row-head">
            <div className="multi-sig-row-num">{idx + 1}</div>
            <input
              className="field-input multi-sig-name-input"
              placeholder={`Signatory ${idx + 1} — full legal name`}
              value={s.name}
              onChange={(e) => updateDecSig(s.id, { name: e.target.value, printName: s.printName || e.target.value })}
              disabled={!!s.signature}
            />
            {decSigs.length > 1 && !s.signature && (
              <button className="multi-sig-remove" onClick={() => removeDecSig(s.id)} title="Remove this signatory">
                <Icon name="trash" size={13}/>
              </button>
            )}
          </div>
          <SignatureBlock
            label={s.name ? `${s.name}'s signature` : `Signatory ${idx + 1} signature`}
            sub={idx === 0 ? null : "Each signatory must confirm individually"}
            defaultName={s.name}
            signature={s.signature}
            printName={s.printName}
            date={s.date}
            onSave={canSign ? ((sig, name, date) => updateDecSig(s.id, { signature: sig, printName: name, date })) : null}
            onClear={() => updateDecSig(s.id, { signature: null, printName: s.name, date: null })}
            disabled={!canSign}
          />
        </div>
      ))}

      <button className="multi-sig-add" onClick={addDecSig} disabled={decSigs.length >= 6} style={{ marginBottom: 8 }}>
        <Icon name="plus" size={14}/>
        {decSigs.length >= 6 ? "Maximum 6 signatories" : "Add another signatory"}
      </button>

      <div className="portal-info portal-info-soft" style={{ marginTop: 6 }}>
        <Icon name="lock" size={15}/>
        <span>
          Your signed declaration is timestamped and IP-stamped. A copy is emailed to you immediately. We hold an identical copy on our side under our retention policy as evidence of your understanding.
        </span>
      </div>

      <div className="understand-actions">
        <button className="btn btn-ghost" disabled={!signed} onClick={downloadSignedDeclarationPDF}>
          <Icon name="download" size={13}/> Download signed declaration (PDF)
        </button>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={!allSigned} onClick={onNext}>
          {allSigned ? "Continue to certificate" : (decSigs.length > 1 ? `${decSigs.length - signedCount} signatures left` : "Sign declaration to continue")} <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

// Single declaration item — entire row is clickable
const DecItem = ({ id, checked, onToggle, disabled, title, sub, warn }) => (
  <button
    type="button"
    className={`understand-item understand-item-btn ${checked ? "is-checked" : ""} ${warn ? "is-warn" : ""}`}
    onClick={() => !disabled && onToggle(id)}
    disabled={disabled}
    aria-pressed={!!checked}
  >
    <span className={`understand-tick ${checked ? "is-on" : ""}`} aria-hidden="true">
      {checked && <Icon name="check" size={14} stroke={3}/>}
    </span>
    <span className="understand-item-body">
      <span className="understand-q">{title}</span>
      <span className={`understand-example ${warn ? "is-warn" : ""}`}>
        {warn && <Icon name="warning" size={12}/>}
        <span>{sub}</span>
      </span>
    </span>
  </button>
);

// ----------------------------------------------------------------------------
// Step 5 — Meet
// ----------------------------------------------------------------------------
const StepMeet = ({ state, onNext, onBack }) => {
  const svc = (SERVICES || []).find(s => s.id === state.serviceId);
  const lawyer = (LAWYERS || []).find(l => l.id === state.lawyerId);
  const meetLink = state.meetLink || null;
  const pad = (n) => String(n).padStart(2, "0");
  const mons = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  let startDt = null, endDt = null, whenLabel = "Date to be confirmed";
  if (state.apptDate && state.apptTime) {
    const [yy, mm, dd] = String(state.apptDate).split("-").map(Number);
    const [hh, mi] = String(state.apptTime).split(":").map(Number);
    startDt = new Date(yy, mm - 1, dd, hh || 9, mi || 0);
    endDt = new Date(startDt.getTime() + ((svc?.duration) || 45) * 60000);
    whenLabel = `${days[startDt.getDay()]} ${dd} ${mons[mm - 1]} ${yy} · ${pad(startDt.getHours())}:${pad(startDt.getMinutes())} — ${pad(endDt.getHours())}:${pad(endDt.getMinutes())} · Europe/London`;
  }
  const calFmt = (x) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const addGoogle = () => {
    if (!startDt) return;
    const details = "Google Meet with your ILA solicitor. Have photo ID to hand." + (meetLink ? `\nJoin: ${meetLink}` : "");
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Fast-ILA appointment")}` +
      `&dates=${calFmt(startDt)}/${calFmt(endDt)}&ctz=Europe/London&details=${encodeURIComponent(details)}` +
      (meetLink ? `&location=${encodeURIComponent(meetLink)}` : "");
    window.open(url, "_blank", "noopener");
  };
  const downloadIcs = () => {
    if (!startDt) return;
    const ics = ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Fast-ILA//EN","BEGIN:VEVENT",
      "UID:fastila-" + Date.now() + "@fast-ila.co.uk",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]|\.\d{3}/g, ""),
      "DTSTART;TZID=Europe/London:" + calFmt(startDt),
      "DTEND;TZID=Europe/London:" + calFmt(endDt),
      "SUMMARY:Fast-ILA appointment",
      "DESCRIPTION:Google Meet with your ILA solicitor." + (meetLink ? " Join: " + meetLink : ""),
      "LOCATION:" + (meetLink || "Google Meet"), "END:VEVENT","END:VCALENDAR"].join("\r\n");
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "fastila-appointment.ics"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Your Google Meet</h2>
      <p className="portal-step-sub">Your appointment is locked in. Click the link below at the time of your call — please have your photo ID to hand for face-match verification.</p>

      <LawyerNoteCard preCall/>

      <div className="meet-card">
        <div className="meet-card-head">
          <div className="meet-icon"><Icon name="video" size={22}/></div>
          <div className="flex-1">
            <div className="meet-svc">{(svc?.short || svc?.name || "ILA")} · with {lawyer?.name || "your assigned solicitor"}</div>
            <div className="meet-when">{whenLabel}</div>
          </div>
        </div>
        {meetLink ? (
          <a className="btn btn-lime btn-lg btn-block meet-cta" href={meetLink} target="_blank" rel="noopener" onClick={() => { if (window.fiToast) window.fiToast("Opening Google Meet"); }}>
            <Icon name="video" size={16}/> {meetLink.replace(/^https?:\/\//, "")}
          </a>
        ) : (
          <div className="btn btn-lg btn-block meet-cta" style={{ background: "#eef1f3", color: "#5b6b76", cursor: "default" }}>
            <Icon name="video" size={16}/> Your Google Meet link will appear here & in your confirmation email
          </div>
        )}
        <div className="meet-card-foot">
          <div className="meet-foot-item">
            <Icon name="calendar" size={14}/> <a href="#" onClick={(e) => { e.preventDefault(); addGoogle(); }}>Add to Google Calendar</a>
          </div>
          <div className="meet-foot-item">
            <Icon name="calendar" size={14}/> <a href="#" onClick={(e) => { e.preventDefault(); downloadIcs(); }}>Download .ics</a>
          </div>
        </div>
      </div>

      <div className="meet-prep">
        <div className="meet-prep-title">Before you join</div>
        <ol className="meet-prep-list">
          <li><strong>Quiet room.</strong> 45–60 minutes uninterrupted (most calls finish in 20–30 minutes if all your documents are uploaded).</li>
          <li><strong>Original photo ID</strong> in your hand to show on camera (passport or driving licence).</li>
          <li><strong>Original proof of address</strong> in your hand to show on camera (last 3 months).</li>
          <li><strong>A witness present with you</strong> (for joint signings, postal/wet documents, or where required). The witness should not be a relative or involved in the transaction. <strong>For joint signings, both signatories can share the same witness</strong> as long as they meet those requirements.</li>
          <li><strong>Be the only client on the call.</strong> No-one else in the room or on camera unless they're a named co-signatory — SRA requirement.</li>
          <li><strong>Use a web browser, not the app.</strong> Easier to share screen if needed.</li>
        </ol>
      </div>

      <div className="videos-section">
        <div className="videos-section-head">
          <h3 className="videos-section-title"><Icon name="video" size={16}/> Watch our explainer first</h3>
          <p className="videos-section-sub">Pick the video that matches your matter. Worth 5 minutes — you'll get more out of the call.</p>
        </div>
        <VideoLibrary/>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" onClick={onNext}>I'm ready <Icon name="arrow-right" size={14}/></button>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// WetTrackingPanel — client-portal view of the wet-signature flow. Shows the
// client where their matter is in the post-back-to-firm → firm posts to lender
// journey, and surfaces the Royal Mail tracking number with a one-click link
// pre-populated for tracking.
// ----------------------------------------------------------------------------
const WetTrackingPanel = ({ booking }) => {
  const dispatch = booking.dispatch || "awaiting_signature";
  const tracking = booking.trackingNumber;
  const trackingService = booking.trackingService || "Royal Mail";
  const cleanTracking = (tracking || "").replace(/\s/g, "");
  const rmUrl = cleanTracking ? `https://www.royalmail.com/track-your-item#/tracking-results/${encodeURIComponent(cleanTracking)}` : null;

  // What the client should be doing right now
  let stageTitle, stageBody, stagePill;
  if (dispatch === "delivered") {
    stagePill = { tone: "success", label: "Delivered" };
    stageTitle = "Delivered to your lender";
    stageBody = "Royal Mail has confirmed delivery to the lender. Your matter is complete.";
  } else if (dispatch === "posted") {
    stagePill = { tone: "info", label: "In transit" };
    stageTitle = "On its way to the lender";
    stageBody = "Your solicitor has posted the pack to the lender by Royal Mail. Use the tracking number below to follow it live.";
  } else if (dispatch === "ready_to_post") {
    stagePill = { tone: "info", label: "Ready to post" };
    stageTitle = "Your solicitor has signed";
    stageBody = "Your solicitor has signed and witnessed the pack. They'll post it to the lender by Royal Mail Special Delivery shortly.";
  } else if (dispatch === "signed") {
    stagePill = { tone: "info", label: "Received" };
    stageTitle = "We've received your pack";
    stageBody = "Thanks — we have your signed pack at the office. Your solicitor will sign and witness it next.";
  } else {
    stagePill = { tone: "warn", label: "Awaiting your pack" };
    stageTitle = "We're waiting for your signed pack";
    stageBody = "Please sign the lender's documents in ink and post them back to your solicitor's office. Use Royal Mail Signed For or Special Delivery so it's tracked.";
  }
  const pillBg = stagePill.tone === "success" ? "#e8f5e9" : stagePill.tone === "warn" ? "#fff7e6" : "#eaf5fb";
  const pillFg = stagePill.tone === "success" ? "#1e5128" : stagePill.tone === "warn" ? "#7a4f00" : "#0a3a55";

  const steps = [
    { k: "awaiting_signature", label: "You sign in ink & post to your solicitor" },
    { k: "signed",              label: "Solicitor receives your pack" },
    { k: "ready_to_post",       label: "Solicitor signs & witnesses" },
    { k: "posted",              label: "Posted to the lender (Royal Mail)" },
    { k: "delivered",           label: "Lender confirms receipt" },
  ];
  const order = steps.map(s => s.k);
  const currentIdx = order.indexOf(dispatch);

  return (
    <div style={{
      background: "var(--cream-tint)", border: "1px solid var(--cream)",
      borderRadius: 12, padding: 18, marginTop: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
        <Icon name="package" size={16}/>
        <strong style={{ color: "#063952", fontSize: 14 }}>Wet signature matter</strong>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 999, background: pillBg, color: pillFg, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          {stagePill.label}
        </span>
      </div>
      <div style={{ fontWeight: 700, color: "#063952", fontSize: 15 }}>{stageTitle}</div>
      <p style={{ fontSize: 13.5, color: "#3d4a52", marginTop: 4, lineHeight: 1.5 }}>{stageBody}</p>

      {/* Postal instructions from the firm — shown verbatim with the office address */}
      {booking.wetPostalInstructions && booking.wetPostalInstructions.body && (
        <div style={{
          marginTop: 14, padding: 14,
          background: "white", border: "1.5px solid #063952", borderRadius: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Icon name="mail" size={14}/>
            <strong style={{ color: "#063952", fontSize: 13 }}>Postal instructions from your solicitor</strong>
            {booking.wetPostalInstructions.sentAt && (
              <span style={{ fontSize: 11, color: "#5b6b76", marginLeft: "auto" }}>
                Sent {new Date(booking.wetPostalInstructions.sentAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                {booking.wetPostalInstructions.channels && ` · via ${booking.wetPostalInstructions.channels.join(" + ")}`}
              </span>
            )}
          </div>
          {booking.wetPostalInstructions.subject && (
            <div style={{ fontWeight: 700, color: "#063952", fontSize: 14, marginBottom: 6 }}>{booking.wetPostalInstructions.subject}</div>
          )}
          <div style={{ whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.55, color: "#1f2933" }}>
            {booking.wetPostalInstructions.body}
          </div>
          <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button
              className="btn btn-navy btn-sm"
              onClick={() => {
                navigator.clipboard?.writeText(booking.wetPostalInstructions.body);
                if (window.fiToast) window.fiToast("Instructions copied");
              }}
            >
              <Icon name="copy" size={12}/> Copy instructions
            </button>
            <a
              href={`mailto:?subject=${encodeURIComponent(booking.wetPostalInstructions.subject || "Postal instructions for my ILA pack")}&body=${encodeURIComponent(booking.wetPostalInstructions.body)}`}
              className="btn btn-ghost btn-sm"
            >
              <Icon name="mail" size={12}/> Email myself a copy
            </a>
          </div>
        </div>
      )}

      {/* Royal Mail tracking — only when we're posting (or have posted) */}
      {tracking ? (
        <div style={{
          marginTop: 14, padding: 14,
          background: "#0a3a55", color: "#e6f7c8", borderRadius: 10,
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", opacity: 0.7, textTransform: "uppercase" }}>{trackingService}</div>
            <div style={{ fontFamily: "monospace", fontSize: 16, marginTop: 4, letterSpacing: "0.04em" }}>{tracking}</div>
          </div>
          <a
            className="btn btn-lime"
            href={rmUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ flexShrink: 0 }}
          >
            <Icon name="external" size={13}/> Track on Royal Mail
          </a>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { navigator.clipboard?.writeText(tracking); if (window.fiToast) window.fiToast("Tracking number copied"); }}
            style={{ background: "rgba(230,247,200,0.12)", color: "#e6f7c8", borderColor: "transparent", flexShrink: 0 }}
          >
            <Icon name="copy" size={12}/> Copy
          </button>
        </div>
      ) : (
        dispatch === "ready_to_post" && (
          <div style={{ marginTop: 14, padding: 12, background: "#eaf5fb", border: "1px solid #b8d7e6", borderRadius: 8, fontSize: 13, color: "#0a3a55" }}>
            <Icon name="info" size={13}/> Your solicitor will add a Royal Mail tracking number here once the pack is posted — you'll be able to follow it live.
          </div>
        )
      )}

      {/* Visual stepper so the client sees the whole journey */}
      <div style={{ marginTop: 16, display: "flex", gap: 6, flexWrap: "wrap" }}>
        {steps.map((s, i) => {
          const done = currentIdx > i;
          const cur  = currentIdx === i;
          return (
            <div key={s.k} style={{
              flex: "1 1 140px",
              minWidth: 0,
              padding: "8px 10px",
              background: done ? "#e8f5e9" : cur ? "#fff" : "#f5f7f9",
              border: "1px solid " + (done ? "#b8e0bb" : cur ? "#063952" : "#e4e8ec"),
              borderRadius: 6,
              fontSize: 12,
              color: done ? "#1e5128" : cur ? "#063952" : "#5b6b76",
              fontWeight: cur ? 700 : 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <div style={{
                width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                background: done ? "#1e5128" : cur ? "#063952" : "#cfd8de",
                color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700,
              }}>{done ? "✓" : i + 1}</div>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 6 — ILA Certificate.
// The lawyer uploads the cert from the dashboard (most lenders only need the
// solicitor's signature). This step adapts to whichever flow the lawyer chose:
//   • lawyer-only:    client just downloads — no signature required
//   • lawyer-client:  client signs in this step, then downloads executed PDF
//   • wet:            print-and-post flow (no portal action needed)
// ----------------------------------------------------------------------------
const StepCert = ({ state, setState, onNext, onBack, bookingRef }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const api = (typeof window !== "undefined") ? window.FastILA : null;
  const ctx = (typeof window !== "undefined") ? window.FastILA_currentBooking : null;
  const ref = bookingRef || (ctx && ctx.bookingRef);

  const allDocs = ref ? FastILA.documents.list(ref) : [];
  const certLawyer = allDocs.find(d => d.kind === "cert_lawyer_signed");
  const certExecuted = allDocs.find(d => d.kind === "cert_executed");

  // Booking gives us the mode the lawyer picked
  const booking = ref ? FastILA.bookings.get(ref) : null;
  const certMode = (booking && booking.certMode) || "lawyer-only";

  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [pdfBytes, setPdfBytes] = React.useState(null);
  const [signing, setSigning] = React.useState(false);

  React.useEffect(() => {
    let url = null; let cancelled = false;
    async function load() {
      if (!certLawyer) return;
      const blob = await FastILA.documents.getBlob(certLawyer);
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPdfBytes(new Uint8Array(await blob.arrayBuffer()));
    }
    load();
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [certLawyer?.id, certLawyer?.storage_key]);

  const downloadLawyerSigned = async () => certLawyer && FastILA.documents.downloadBlob(certLawyer);
  const downloadExecuted = async () => {
    if (certExecuted) return FastILA.documents.downloadBlob(certExecuted);
    if (!state.certSignature || !pdfBytes) return;
    await window.fiBuildExecutedCert({
      templateBytes: pdfBytes,
      signature: state.certSignature,
      printName: state.certPrintName || state.clientName,
      signedAt: state.certSignedAt,
      bookingRef: ref,
      clientName: state.clientName,
    });
  };

  const handleSign = async (sigDataUrl, printName, sigDate) => {
    setSigning(true);
    try {
      // Persist the signature locally and through the portal state machine
      const next = { ...state, certSigned: true, certSignature: sigDataUrl, certPrintName: printName, certSignedAt: sigDate };
      setState(next);
      // Also build and store the executed cert as a document so audit pack / dashboard see it
      if (pdfBytes && window.fiBuildExecutedCert) {
        const blob = await window.fiBuildExecutedCert({
          templateBytes: pdfBytes,
          signature: sigDataUrl,
          printName,
          signedAt: sigDate,
          bookingRef: ref,
          clientName: state.clientName,
          download: false,
        });
        if (blob && api && ref) {
          try {
            const file = new File([blob], `executed-cert-${ref}.pdf`, { type: "application/pdf" });
            await api.documents.upload(ref, "cert_executed", file);
          } catch (_e) {}
        }
      }
    } finally { setSigning(false); }
  };

  // --- Render --------------------------------------------------------------
  const headerSub = certMode === "wet"
    ? "Wet signature matter — sign your lender's documents in ink and post them to your solicitor's office."
    : certMode === "lawyer-client"
      ? "Your lawyer has signed the certificate. Add your signature below to complete it."
      : "Your lawyer is the only required signatory. Download your copy below.";

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Your ILA certificate</h2>
      <p className="portal-step-sub">{headerSub}</p>

      {/* Wet flow — show the live wet-signature status from the client's POV */}
      {certMode === "wet" && booking && (
        <WetTrackingPanel booking={booking}/>
      )}

      {/* Not uploaded yet */}
      {certMode !== "wet" && !certLawyer && (
        <div className="cert-empty" style={{ background: "var(--cream-tint)", border: "1px solid var(--cream)", borderRadius: 12, padding: 24, textAlign: "center" }}>
          <Icon name="clock" size={28}/>
          <h3 style={{ marginTop: 10 }}>Your lawyer is preparing your certificate</h3>
          <p style={{ color: "#5b6b76", maxWidth: 460, margin: "8px auto 0" }}>
            Once your solicitor uploads the signed ILA certificate, it'll appear here. {certMode === "lawyer-client" ? "You'll then be asked to add your signature." : "You'll be able to download your copy straight away."} We'll email you the moment it's ready.
          </p>
        </div>
      )}

      {/* Uploaded — preview + download (lawyer-only) */}
      {certMode === "lawyer-only" && certLawyer && previewUrl && (
        <div className="ccl-doc-frame">
          <div className="ccl-doc-toolbar">
            <div className="ccl-doc-toolbar-l">
              <Icon name="doc" size={14}/> <span>{certLawyer.filename}</span>
              <span className="pill pill-success"><Icon name="check" size={11}/> Lawyer-signed</span>
            </div>
            <div className="ccl-doc-toolbar-r">
              <button className="btn btn-navy btn-sm" onClick={downloadLawyerSigned}>
                <Icon name="download" size={13}/> Download
              </button>
            </div>
          </div>
          <div className="ccl-doc-page" style={{ padding: 0 }}>
            <iframe src={previewUrl} title={certLawyer.filename} style={{ width: "100%", height: 560, border: 0, display: "block" }}/>
          </div>
        </div>
      )}

      {/* Uploaded — preview + signature pad (lawyer + client) */}
      {certMode === "lawyer-client" && certLawyer && previewUrl && (
        <>
          <div className="ccl-doc-frame">
            <div className="ccl-doc-toolbar">
              <div className="ccl-doc-toolbar-l">
                <Icon name="doc" size={14}/> <span>{certLawyer.filename}</span>
                <span className="pill pill-success"><Icon name="check" size={11}/> Lawyer-signed</span>
              </div>
              <div className="ccl-doc-toolbar-r">
                <button className="btn btn-ghost btn-sm" onClick={downloadLawyerSigned}>
                  <Icon name="download" size={13}/> Lawyer-signed copy
                </button>
              </div>
            </div>
            <div className="ccl-doc-page" style={{ padding: 0 }}>
              <iframe src={previewUrl} title={certLawyer.filename} style={{ width: "100%", height: 480, border: 0, display: "block" }}/>
            </div>
          </div>

          <h3 className="understand-section-title" style={{ marginTop: 16 }}>Add your signature</h3>
          <p className="understand-section-sub">Your signature will be stamped on the final page of the certificate. We'll save the fully-executed PDF here for you and for your lawyer.</p>
          <SignatureBlock
            label="Your signature on the certificate"
            defaultName={state.clientName}
            signature={state.certSigned ? state.certSignature : null}
            printName={state.certPrintName}
            date={state.certSignedAt}
            onSave={handleSign}
            onClear={() => setState({ ...state, certSigned: false, certSignature: null, certPrintName: null, certSignedAt: null })}
          />

          {state.certSigned && (
            <div className="cert-done" style={{ background: "var(--success-bg)", border: "1px solid var(--success)", borderRadius: 12, padding: 20, marginTop: 16, textAlign: "center" }}>
              <div className="cert-done-mark"><Icon name="check" size={32} stroke={3}/></div>
              <div className="cert-done-title display">Certificate fully executed</div>
              <p className="cert-done-sub" style={{ margin: "8px 0 14px" }}>Both your lawyer and you have signed. Your lawyer will forward the executed PDF to the lender.</p>
              <div className="cert-done-actions" style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn-navy" onClick={downloadExecuted}>
                  <Icon name="download" size={14}/> Download executed PDF
                </button>
                <button className="btn btn-ghost" onClick={downloadLawyerSigned}>
                  <Icon name="download" size={14}/> Lawyer-signed (original)
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button
          className="btn btn-navy btn-lg"
          disabled={
            certMode === "wet" ? false
            : certMode === "lawyer-client" ? !state.certSigned
            : !certLawyer
          }
          onClick={() => { setState({ ...state, certStepDone: true }); onNext && onNext(); }}
        >
          {certMode === "wet" ? "Continue" : (state.certSigned || certMode === "lawyer-only" && certLawyer) ? "Continue" : "Waiting for cert"} <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Step 8 — Quick feedback (3 questions · feeds Google review flywheel)
// ============================================================================
const StepFeedback = ({ state, setState, onBack }) => {
  const [nps, setNps] = React.useState(state.feedbackNps ?? null);
  const [clarity, setClarity] = React.useState(state.feedbackClarity ?? null);
  const [comment, setComment] = React.useState(state.feedbackComment || "");
  const [submitted, setSubmitted] = React.useState(!!state.feedbackSubmitted);

  const submit = () => {
    setSubmitted(true);
    setState({
      ...state,
      feedbackSubmitted: true,
      feedbackNps: nps,
      feedbackClarity: clarity,
      feedbackComment: comment,
    });
  };

  const isPromoter = nps !== null && nps >= 9;
  const canSubmit = nps !== null && clarity !== null;

  if (submitted) {
    return (
      <div className="portal-step">
        <div className="feedback-thanks">
          <div className="feedback-thanks-mark">
            <Icon name={isPromoter ? "star" : "check"} size={36} stroke={3}/>
          </div>
          <h2 className="portal-step-title display">Thank you</h2>
          <p className="portal-step-sub" style={{ marginBottom: 12 }}>
            Your feedback goes straight to the team. It genuinely helps us improve.
          </p>

          {isPromoter ? (
            <div className="feedback-review-card">
              <Icon name="star" size={20}/>
              <div className="feedback-review-text">
                <div className="feedback-review-title">Would you mind leaving us a Google review?</div>
                <div className="feedback-review-sub">
                  Reviews from clients like you are the single biggest thing that helps other people find us. It takes 30 seconds.
                </div>
              </div>
              <a
                className="btn btn-lime btn-lg"
                href="https://g.page/r/CUXJGCWw_w-jEBM/review"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="external" size={14}/> Leave a Google review
              </a>
            </div>
          ) : (
            <div className="feedback-review-card feedback-review-card-amber">
              <Icon name="info" size={20}/>
              <div className="feedback-review-text">
                <div className="feedback-review-title">We'd love to hear more</div>
                <div className="feedback-review-sub">
                  Karim, our managing partner, will personally reach out to you within 24 hours to understand what we could have done better.
                </div>
              </div>
            </div>
          )}

          <div className="portal-step-foot" style={{ marginTop: 24 }}>
            <span/>
            <button className="btn btn-ghost" onClick={() => { setSubmitted(false); }}>
              <Icon name="edit" size={13}/> Edit response
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Quick feedback</h2>
      <p className="portal-step-sub">
        Three short questions to help us improve. Takes 30 seconds.
      </p>

      <LawyerNoteCard/>

      {/* Q1 — clarity */}
      <div className="feedback-q">
        <div className="feedback-q-label">
          <strong>1. Did your lawyer explain things clearly?</strong>
        </div>
        <div className="feedback-q-scale-2">
          {[
            { v: 1, l: "Not really" },
            { v: 2, l: "Mostly" },
            { v: 3, l: "Very clearly" },
            { v: 4, l: "Excellently" },
          ].map(opt => (
            <button
              key={opt.v}
              className={`feedback-pill ${clarity === opt.v ? "is-active" : ""}`}
              onClick={() => setClarity(opt.v)}
            >{opt.l}</button>
          ))}
        </div>
      </div>

      {/* Q2 — NPS */}
      <div className="feedback-q">
        <div className="feedback-q-label">
          <strong>2. How likely are you to recommend Nexa Law / Fast-ILA to a friend or colleague?</strong>
          <span className="feedback-q-sub">0 = not at all · 10 = extremely likely</span>
        </div>
        <div className="feedback-nps">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
            <button
              key={n}
              className={`feedback-nps-btn ${nps === n ? "is-active" : ""} ${n >= 9 ? "is-promoter" : n >= 7 ? "is-passive" : "is-detractor"}`}
              onClick={() => setNps(n)}
            >{n}</button>
          ))}
        </div>
        <div className="feedback-nps-legend">
          <span>Detractors</span>
          <span>Passives</span>
          <span>Promoters</span>
        </div>
      </div>

      {/* Q3 — optional comment */}
      <div className="feedback-q">
        <div className="feedback-q-label">
          <strong>3. Anything you'd like us to know?</strong>
          <span className="feedback-q-sub">Optional · what went well, what could be better</span>
        </div>
        <textarea
          className="field-textarea"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Your thoughts…"
        />
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={!canSubmit} onClick={submit}>
          {canSubmit ? "Submit feedback" : "Answer both ratings to submit"} <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// Portal login — Google / email, no codes, no booking ref
// ============================================================================
const PortalLogin = ({ onLogin }) => {
  // Prefill from the booking submission if the visitor just came from the booking form.
  let prefillEmail = "";
  try { prefillEmail = localStorage.getItem("fastila_last_email") || ""; } catch (_e) { /* ignore */ }
  const [email, setEmail] = React.useState(prefillEmail);
  const [status, setStatus] = React.useState("idle"); // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = React.useState(null);

  const api = (typeof window !== "undefined") ? window.FastILA : null;
  const live = api && api.mode === "live" && api.config.features.enforceAuth;

  // The client portal is for booked clients only. The email must match the
  // clientEmail on at least one booking — anyone else is rejected.
  const hasBooking = (addr) => {
    const e = (addr || "").trim().toLowerCase();
    if (!e) return false;
    return (window.BOOKINGS || []).some(b => (b.clientEmail || "").toLowerCase() === e
      || (b.secondSignatoryEmail || b.second_signatory_email || "").toLowerCase() === e);
  };

  const NO_BOOKING_MSG = "We don't have a booking under this email. Book first at fast-ila.co.uk, or contact us if you've already booked.";
  const handleEmailSignIn = async () => {
    setErrorMsg(null);
    const addr = (email || "").trim().toLowerCase();
    if (!addr) { setErrorMsg("Please enter the email you used to book."); return; }
    if (!/.+@.+\..+/.test(addr)) { setErrorMsg("That doesn't look like a valid email."); return; }
    // Mock mode: the local store has the bookings, so check directly.
    if (!live) {
      if (!hasBooking(addr)) { setErrorMsg(NO_BOOKING_MSG); return; }
      onLogin(addr);
      return;
    }
    // Live mode: an anon visitor can't read bookings (RLS), so verify the email
    // owns a booking SERVER-SIDE via the anon-safe client-lookup edge function
    // before issuing a magic link. RLS still confines the session afterwards.
    try {
      setStatus("sending");
      let ok = false;
      try { const r = await api.clients.lookupPublic(addr); ok = !!(r && r.returning); } catch (_e) { ok = false; }
      if (!ok) { setStatus("idle"); setErrorMsg(NO_BOOKING_MSG); return; }
      await api.auth.signInWithEmail(addr);
      setStatus("sent");
    } catch (e) {
      setStatus("error");
      setErrorMsg(e.message || "Could not send sign-in link");
    }
  };

  const [oauthBusy, setOauthBusy] = React.useState(false);
  const handleProvider = async (provider) => {
    setErrorMsg(null);
    if (!api || api.mode !== "live") {
      setErrorMsg("OAuth requires the Supabase backend. Use the email field below in mock mode.");
      return;
    }
    setOauthBusy(true);
    try {
      await api.auth.signInWithGoogle("portal");
      // Supabase will redirect the browser to Google then back here — onLogin
      // is called after the redirect by the auth state listener in ClientPortal.
    } catch (e) {
      setErrorMsg(e.message || "Google sign-in failed");
      setOauthBusy(false);
    }
  };

  // One-click test access — only available in mock mode. Auto-creates a sample
  // booking under client@demo.local if one doesn't exist, then signs in.
  const quickTestAccess = async () => {
    setErrorMsg(null);
    const demoEmail = "client@demo.local";
    const existing = (window.BOOKINGS || []).find(b => (b.clientEmail || "").toLowerCase() === demoEmail);
    if (!existing) {
      try {
        const svc = (window.SERVICES || []).find(s => s.id === "standard") || (window.SERVICES || [])[0];
        const lawyer = (window.LAWYERS || [])[0];
        const today = new Date();
        const tomorrow = new Date(today.getTime() + 86400000);
        const ymd = tomorrow.toISOString().slice(0, 10);
        await api.bookings.create({
          service_id: svc?.id || "standard",
          lawyer_id: lawyer?.id || null,
          appointment_date: ymd,
          appointment_time: "10:00",
          client_name: "Demo Client",
          client_email: demoEmail,
          client_phone: "+44 7700 900000",
          lender: "(test lender)",
          legal_summary: "Test booking created for portal demo",
          amount: svc?.price || 145,
          source: "demo-access",
        });
        try { localStorage.setItem("fastila_last_email", demoEmail); } catch (_e) {}
      } catch (err) {
        setErrorMsg("Couldn't create demo booking: " + (err.message || err));
        return;
      }
    } else {
      try { localStorage.setItem("fastila_last_email", demoEmail); } catch (_e) {}
    }
    onLogin(demoEmail);
  };

  // Show test access when in mock mode (no Supabase) — hidden in production
  const isMock = !api || api.mode !== "live";

  return (
    <div className="portal-login">
      <div className="portal-login-card">
        <a className="brand-wordmark on-light" href="?mode=booking" onClick={(e) => { e.preventDefault(); window.location.href = "?mode=booking"; }} title="Go to booking form">
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <h1 className="display portal-login-title">Sign in to your client portal</h1>
        <p className="portal-login-sub">Track your booking, sign your client care letter, upload ID and documents, and receive your ILA certificate.</p>

        <div className="portal-login-providers">
          <button className="portal-provider" onClick={() => handleProvider("google")} disabled={oauthBusy}>
            <span className="portal-provider-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            </span>
            <span>{oauthBusy ? "Redirecting to Google…" : "Continue with Google"}</span>
          </button>
        </div>

        <div className="portal-login-divider"><span>or sign in with magic link</span></div>

        {status === "sent" ? (
          <div className="portal-login-sent" style={{
            background: "#f0faff", border: "1px solid #c1e3f1", borderRadius: 10,
            padding: "14px 16px", fontSize: 13, color: "#063952",
          }}>
            <strong><Icon name="check" size={14} stroke={3}/> Check your inbox</strong>
            <p style={{ margin: "6px 0 0" }}>We sent a one-click sign-in link to <strong>{email}</strong>. It will open your portal in this browser.</p>
          </div>
        ) : (
          <>
            <div className="portal-login-field">
              <label className="field-label">Email used to book</label>
              <input
                className="field-input"
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && email && handleEmailSignIn()}
              />
              {errorMsg && (
                <div style={{ color: "#9a1c1c", fontSize: 12, marginTop: 6 }}>
                  <Icon name="x-circle" size={12}/> {errorMsg}
                </div>
              )}
            </div>
            <button
              className="btn btn-navy btn-lg btn-block"
              onClick={handleEmailSignIn}
              disabled={!email || status === "sending"}
            >
              {status === "sending"
                ? "Sending magic link…"
                : live
                  ? <>Email me a sign-in link <Icon name="arrow-right" size={16}/></>
                  : <>Sign in <Icon name="arrow-right" size={16}/></>}
            </button>
          </>
        )}

        {/* Test access — only shown in mock mode (no Supabase) */}
        {isMock && status !== "sent" && (
          <div style={{
            marginTop: 14, padding: 12, borderRadius: 10,
            background: "#f7f5ee", border: "1px dashed #c8d4dc",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#063952", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              <Icon name="bolt" size={11}/> Test access
            </div>
            <div style={{ fontSize: 12, color: "#5b6b76", marginBottom: 8 }}>
              No real booking? Try the portal with a demo client booking.
            </div>
            <button className="btn btn-navy btn-sm btn-block" onClick={quickTestAccess}>
              <Icon name="arrow-right" size={13}/> Enter as demo client
            </button>
          </div>
        )}

        <div className="portal-login-foot">
          <span><Icon name="lock" size={11}/> One-click sign-in · no passwords</span>
          <a href="#" onClick={(e) => { e.preventDefault(); const support = (window.FastILA?.firm?.get?.()?.supportEmail) || "info@fast-ila.co.uk"; if (window.fiToast) window.fiToast(`Opening email to ${support}`); window.location.href = `mailto:${support}?subject=Portal%20sign-in%20help`; }}>Need help?</a>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Portal shell
// ============================================================================
// ============================================================================
// PortalWalkthrough — a friendly 3-step overlay shown ONCE on first login.
// Tells the client what they need to do before the ILA call so nothing's
// confusing. Skip / Back / Next controls. Can be re-shown via the floating
// "Tour" button if they want to see it again.
// ============================================================================
// Walkthrough memory: dismiss is in-memory only (per page view). Every
// page load — including refreshes — shows the tour again so the client
// always sees their pre-call checklist when they come back. If they want
// to hide it permanently within a session, the floating Tour button still
// lets them re-open it.
const WALKTHROUGH_KEY = "fastila_portal_walkthrough_seen_v1";
const PORTAL_WALKTHROUGH_STEPS = [
  {
    icon: "sparkle",
    title: "Welcome to your client portal",
    body: "Everything you need to do before your ILA call is in one place. It takes about 10–15 minutes to complete, and you can leave and come back anytime.",
  },
  {
    icon: "check-circle",
    title: "Four things to complete before the call",
    body: null,
    list: [
      "Sign your client care letter",
      "Upload photo ID and proof of address (AML rules)",
      "Upload the documents you're being asked to sign",
      "Pay the fee by bank transfer",
    ],
  },
  {
    icon: "video",
    title: "After your video call",
    body: "We'll send your signed ILA certificate to your lender. You can also tick the understanding declaration and download your signed copies — all from this same portal.",
  },
];

const PortalWalkthrough = () => {
  // Always start open on every page render — clearing any stale flags from
  // previous builds (localStorage + sessionStorage) so nothing keeps it hidden.
  React.useEffect(() => {
    try { localStorage.removeItem(WALKTHROUGH_KEY); } catch (_e) {}
    try { sessionStorage.removeItem(WALKTHROUGH_KEY); } catch (_e) {}
  }, []);

  const [open, setOpen] = React.useState(true);
  const [stepIdx, setStepIdx] = React.useState(0);

  // Listen for the floating "Tour" button to re-open
  React.useEffect(() => {
    const reopen = () => { setStepIdx(0); setOpen(true); };
    window.addEventListener("fastila:show-portal-walkthrough", reopen);
    return () => window.removeEventListener("fastila:show-portal-walkthrough", reopen);
  }, []);

  // Dismiss is in-memory only — no storage. Next page load = tour shows again.
  const dismiss = () => setOpen(false);

  if (!open) {
    return (
      <button
        onClick={() => { setStepIdx(0); setOpen(true); }}
        title="Re-show the welcome tour"
        style={{
          position: "fixed", bottom: 20, right: 20, zIndex: 50,
          background: "#063952", color: "#e6f7c8",
          border: "none", borderRadius: 999,
          padding: "8px 14px", fontSize: 12.5, fontWeight: 700,
          boxShadow: "0 6px 20px rgba(6,57,82,0.25)", cursor: "pointer",
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <Icon name="sparkle" size={12}/> Tour
      </button>
    );
  }

  const step = PORTAL_WALKTHROUGH_STEPS[stepIdx];
  const isFirst = stepIdx === 0;
  const isLast  = stepIdx === PORTAL_WALKTHROUGH_STEPS.length - 1;

  return (
    <div
      onClick={() => dismiss()}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(6,57,82,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white", borderRadius: 16,
          width: "100%", maxWidth: 460,
          padding: "32px 28px 24px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)",
          position: "relative",
        }}
      >
        <button
          onClick={() => dismiss()}
          aria-label="Skip walkthrough"
          style={{ position: "absolute", top: 10, right: 10, background: "transparent", border: "none", cursor: "pointer", color: "#5b6b76", padding: 6 }}
        >
          <Icon name="x" size={16}/>
        </button>

        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "#e6f7c8", color: "#063952",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          marginBottom: 14,
        }}>
          <Icon name={step.icon} size={26}/>
        </div>
        <h2 className="display" style={{ fontSize: 22, color: "#063952", margin: "0 0 10px" }}>{step.title}</h2>
        {step.body && <p style={{ fontSize: 14.5, color: "#3d4a52", lineHeight: 1.55, margin: 0 }}>{step.body}</p>}
        {step.list && (
          <ul style={{ margin: "8px 0 0", paddingLeft: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {step.list.map((item, i) => (
              <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, color: "#1f2933", lineHeight: 1.5 }}>
                <span style={{
                  width: 22, height: 22, flexShrink: 0,
                  background: "#063952", color: "#e6f7c8", borderRadius: "50%",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700,
                }}>{i + 1}</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Step dots */}
        <div style={{ display: "flex", gap: 6, marginTop: 22, justifyContent: "center" }}>
          {PORTAL_WALKTHROUGH_STEPS.map((_, i) => (
            <span key={i} style={{
              width: i === stepIdx ? 24 : 8, height: 8, borderRadius: 4,
              background: i === stepIdx ? "#063952" : "#cfd8de",
              transition: "all 200ms ease",
            }}/>
          ))}
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, marginTop: 18, alignItems: "center" }}>
          <button
            onClick={() => dismiss()}
            className="btn btn-ghost btn-sm"
            style={{ marginRight: "auto" }}
          >
            Skip
          </button>
          {!isFirst && (
            <button onClick={() => setStepIdx(stepIdx - 1)} className="btn btn-ghost">
              <Icon name="arrow-left" size={13}/> Back
            </button>
          )}
          {!isLast ? (
            <button onClick={() => setStepIdx(stepIdx + 1)} className="btn btn-navy">
              Next <Icon name="arrow-right" size={13}/>
            </button>
          ) : (
            <button onClick={() => dismiss()} className="btn btn-lime">
              <Icon name="check" size={13} stroke={3}/> Got it — start
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ClientPortal = () => {
  const api = (typeof window !== "undefined") ? window.FastILA : null;
  const live = api && api.mode === "live";

  // Resolve which booking the portal is showing: URL ?ref=… > localStorage > demo seed
  const initialRef = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("ref") || localStorage.getItem("fastila_last_ref") || null;
    } catch (_e) { return null; }
  })();

  // Always start signed-out — the user clicks a provider or magic-link button to enter.
  // (When enforceAuth is on, the magic-link round-trip is required; otherwise it's a one-click demo.)
  const [loggedIn, setLoggedIn] = React.useState(false);

  // Detect existing Supabase auth session on mount + listen for sign-in events.
  // After a Google OAuth redirect, the session is in Supabase already — we
  // just log the user in + look up their booking by email.
  React.useEffect(() => {
    if (!api || api.mode !== "live" || !api.auth) return;
    let stop = () => {};
    (async () => {
      try {
        const sess = await api.auth.session();
        if (sess && sess.user && sess.user.email) {
          try { localStorage.setItem("fastila_last_email", sess.user.email); } catch (_e) {}
          setLoggedIn(true);
        }
      } catch (_e) {}
      try {
        stop = api.auth.onAuthChange((sess) => {
          if (sess && sess.user && sess.user.email) {
            try { localStorage.setItem("fastila_last_email", sess.user.email); } catch (_e) {}
            setLoggedIn(true);
          } else {
            setLoggedIn(false);
          }
        });
      } catch (_e) {}
    })();
    return () => { try { stop(); } catch (_e) {} };
  }, []);

  const [bookingRef, setBookingRef] = React.useState(initialRef);
  const [bookingId, setBookingId] = React.useState(null);
  const [state, setState] = React.useState({
    clientName: "",
    signature: null,
    kycId: null,
    kycAddress: null,
    paid: false,
    matterDocs: [],
    certSigned: false,
  });
  const [stepIdx, setStepIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // Hydrate booking from API when available
  React.useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!loggedIn || !bookingRef || !api) return;
      try {
        const b = await api.bookings.get(bookingRef);
        if (cancelled || !b) return;
        // In mock mode the booking has no separate id — use the ref as the key.
        // Also note mock bookings use camelCase (clientName etc) — handle both shapes.
        const bid = b.id || b.ref;
        setBookingId(bid);
        try { window.FastILA_currentBooking = { bookingId: bid, bookingRef: b.ref }; } catch (_e) {}
        setState(s => ({
          ...s,
          clientName: b.client_name || b.clientName || s.clientName,
          serviceId: b.service_id || b.serviceId || s.serviceId,
          lawyerId: b.lawyer_id || b.lawyerId || s.lawyerId,
          apptDate: b.appointment_date || b.date || s.apptDate,
          apptTime: b.appointment_time || b.time || s.apptTime,
          meetLink: b.meet_link || b.meetLink || s.meetLink,
        }));
        // Pull existing signatures/docs so the user resumes where they left off (live + mock)
        {
          const sigs = api.signatures.list(bid) || [];
          const docs = api.documents.list(bid) || [];
          if (cancelled) return;
          const careSig = sigs.find(s => s.kind === "care_letter");
          const declSig = sigs.find(s => s.kind === "declaration");
          const certSig = sigs.find(s => s.kind === "certificate");
          const idDoc = docs.find(d => d.kind === "id_passport" || d.kind === "id_driving");
          const addrDoc = docs.find(d => d.kind === "address_proof");
          const matterDocs = docs.filter(d => d.kind === "matter_doc")
            .map(d => ({ name: d.filename, size: `${Math.round(d.size_bytes/1024)} KB` }));
          setState(s => ({
            ...s,
            signature: careSig?.signature_data || s.signature,
            declarationSigned: !!declSig,
            certSigned: !!certSig,
            kycId: idDoc ? { name: idDoc.filename, size: `${Math.round(idDoc.size_bytes/1024)} KB` } : s.kycId,
            kycAddress: addrDoc ? { name: addrDoc.filename, size: `${Math.round(addrDoc.size_bytes/1024)} KB` } : s.kycAddress,
            matterDocs: matterDocs.length ? matterDocs : s.matterDocs,
          }));
        }
      } catch (e) { console.warn("[portal] hydrate failed", e); }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [loggedIn, bookingRef]);

  // Wrap setState so file uploads & signatures persist to Supabase when live.
  const persistState = React.useCallback(async (updater) => {
    setState(prev => {
      const next = typeof updater === "function" ? updater(prev) : { ...prev, ...updater };
      if (!api || !bookingId) return next;
      // Detect what changed and persist (both live and mock modes now)
      (async () => {
        try {
          setBusy(true);
          if (next.signature && next.signature !== prev.signature) {
            await api.signatures.record(bookingId, "care_letter", next.clientName, next.signature, "client");
            if (typeof window.fiNotify === "function") window.fiNotify("Care letter signed", `${next.clientName} signed the client care letter`, bookingId, "success");
          }
          // Persist the full signatories array onto the booking — the dashboard
          // uses this snapshot to regenerate the same signed PDF for the audit
          // pack, even though the live SIGNATURES table only stores the first.
          if (next.signatories && next.signatories !== prev.signatories) {
            try {
              if (api.bookings && api.bookings.update) {
                await api.bookings.update(bookingId, {
                  signatoriesSnapshot: next.signatories.map(s => ({
                    name: s.name || null,
                    role: s.role || "Signatory",
                    signature: s.signature || null,
                    printName: s.printName || s.name || null,
                    date: s.date || null,
                  })),
                  ccSignatoryCount: next.signatories.length,
                  ccSignedAt: new Date().toISOString(),
                });
              }
            } catch (_e) {}
          }
          if (next.declarationSigned && !prev.declarationSigned) {
            const sigList = (next.declarationSignatories && next.declarationSignatories.length > 0)
              ? next.declarationSignatories
              : [{ name: next.declarationPrintName || next.clientName, signature: next.declarationSignature, printName: next.declarationPrintName || next.clientName, date: next.declarationDate }];
            // Record each signatory as its own signatures row — audit-grade evidence per person.
            for (const s of sigList) {
              try { await api.signatures.record(bookingId, "declaration", s.printName || s.name || next.clientName, s.signature || null, "client"); } catch (_e) {}
            }
            // Persist the Q&A + signatories snapshot onto the booking so the lawyer/admin side
            // can regenerate the signed-declaration PDF as audit-grade evidence.
            try {
              if (api.bookings && api.bookings.update) {
                await api.bookings.update(bookingId, {
                  declarationSnapshot: {
                    matterType: next.understandMatterType || null,
                    matterChecks: next.understandChecks || {},
                    declarations: next.declarations || {},
                    signatories: sigList.map(s => ({
                      name: s.name || null,
                      role: s.role || "Signatory",
                      signature: s.signature || null,
                      printName: s.printName || s.name || null,
                      date: s.date || null,
                    })),
                    signedAt: next.declarationDate || new Date().toISOString().slice(0, 10),
                    printName: next.declarationPrintName || next.clientName || null,
                  },
                });
              }
            } catch (_e) {}
            if (typeof window.fiNotify === "function") window.fiNotify("Declaration signed", `${sigList.length} signator${sigList.length === 1 ? "y" : "ies"} signed the understanding declaration`, bookingId, "success");
          }
          if (next.certSigned && !prev.certSigned) {
            await api.signatures.record(bookingId, "certificate", next.certPrintName || next.clientName, next.certSignature || null, "client");
            if (typeof window.fiNotify === "function") window.fiNotify("Certificate signed", `${next.certPrintName || next.clientName} signed the ILA certificate`, bookingId, "success");
          }
          if (next.paid && !prev.paid) {
            await api.payments.declarePaid(bookingId, next.paymentReference || "client-declared");
            if (typeof window.fiNotify === "function") window.fiNotify("Payment declared", `${next.clientName} declared payment sent`, bookingId);
          }
        } catch (e) { console.warn("[portal] persist failed", e); }
        setBusy(false);
      })();
      return next;
    });
  }, [bookingId, api]);

  if (!loggedIn) return <PortalLogin onLogin={(email) => { if (email) { try { localStorage.setItem("fastila_last_email", email); } catch (_e) {} } setLoggedIn(true); }}/>;

  // Cert step completion adapts to the lawyer-chosen mode:
  //   wet           → always considered done (handled outside the portal)
  //   lawyer-only   → done as soon as the lawyer uploads the signed cert
  //   lawyer-client → done once the client adds their signature too
  const certBooking = bookingRef ? (FastILA.bookings.get && FastILA.bookings.get(bookingRef)) : null;
  const certMode    = (certBooking && certBooking.certMode) || "lawyer-only";
  const certDocs    = bookingRef ? FastILA.documents.list(bookingRef) : [];
  const lawyerSignedExists = certDocs.some(d => d.kind === "cert_lawyer_signed");
  const certStepDone =
    certMode === "wet" ? true
    : certMode === "lawyer-only" ? (lawyerSignedExists || !!state.certStepDone)
    : (!!state.certSigned || !!state.certStepDone);

  // Compute step completion
  const completed = {
    letter: !!state.signature,
    kyc: !!(state.kycId && state.kycAddress),
    pay: !!state.paid,
    docs: state.matterDocs.length > 0,
    meet: stepIdx > 4,
    understand: !!state.declarationSigned,
    cert: certStepDone,
    feedback: !!state.feedbackSubmitted,
  };

  // Strict step lock: a step is unlocked only if every previous step is complete.
  // The user can revisit done steps and the single current "open" step, but
  // cannot skip ahead — protects the firm's compliance evidence and stops
  // the client jumping straight to "Sign certificate" without uploading ID,
  // paying, or confirming understanding.
  const isUnlocked = (idx) => {
    if (idx === 0) return true;
    for (let i = 0; i < idx; i++) {
      if (!completed[PORTAL_STEPS[i].id]) return false;
    }
    return true;
  };

  const goTo = (idx) => {
    if (!isUnlocked(idx)) return; // hard block — can't jump ahead
    setStepIdx(idx);
  };
  const next = () => setStepIdx(Math.min(stepIdx + 1, PORTAL_STEPS.length - 1));
  const back = () => setStepIdx(Math.max(stepIdx - 1, 0));

  const stepProps = { state, setState: persistState, onNext: next, onBack: back, bookingId, bookingRef };

  return (
    <div className="portal-shell">
      <PortalWalkthrough/>
      <header className="portal-top">
        <a className="brand-wordmark on-light" href="?mode=booking" onClick={(e) => { e.preventDefault(); window.location.href = "?mode=booking"; }} title="Booking form">
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div className="portal-top-r">
          <div className="portal-top-ref">
            <Icon name="user" size={13}/>
            <span>{state.clientName}</span>
          </div>
          <button className="dash-icon-btn" aria-label="Sign out" title="Sign out" onClick={() => {
            try {
              localStorage.removeItem("fastila_last_ref");
              localStorage.removeItem("fastila_last_email");
            } catch (_e) {}
            window.location.href = "?mode=booking";
          }}><Icon name="logout" size={14}/></button>
        </div>
      </header>

      <div className="portal-main">
        <aside className="portal-side">
          <div className="portal-side-eyebrow">Your booking</div>
          <div className="portal-side-name display">Your steps</div>
          <p className="portal-side-sub">Work through each step in order. The next step unlocks as soon as you complete the one before — protects you and us, and keeps everything ready for your lawyer.</p>

          <ol className="portal-stepper">
            {PORTAL_STEPS.map((s, i) => {
              const isDone = completed[s.id];
              const isActive = i === stepIdx;
              const isLocked = !isUnlocked(i);
              return (
                <li key={s.id} className={`portal-step-li ${isActive ? "is-active" : ""} ${isDone ? "is-done" : ""} ${isLocked ? "is-locked" : ""}`}>
                  <button onClick={() => goTo(i)} disabled={isLocked} title={isLocked ? "Complete the previous steps first" : undefined}>
                    <span className="portal-step-num">
                      {isDone
                        ? <Icon name="check" size={14} stroke={3}/>
                        : isLocked
                          ? <Icon name="lock" size={12}/>
                          : i + 1}
                    </span>
                    <span dangerouslySetInnerHTML={{ __html: s.label }}/>
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="portal-help">
            <Icon name="phone" size={14}/>
            <div>
              <div className="portal-help-title">Need a hand?</div>
              <div className="portal-help-sub">Call 0207 459 4037 — 7 days a week, 9am – 6pm</div>
            </div>
          </div>
        </aside>

        <main className="portal-body">
          {typeof PortalHistoryCard === "function" && <PortalHistoryCard/>}
          {stepIdx === 0 && <StepLetter {...stepProps}/>}
          {stepIdx === 1 && <StepKYC {...stepProps}/>}
          {stepIdx === 2 && <StepPay {...stepProps}/>}
          {stepIdx === 3 && <StepDocs {...stepProps}/>}
          {stepIdx === 4 && <StepMeet {...stepProps}/>}
          {stepIdx === 5 && <StepUnderstanding {...stepProps}/>}
          {stepIdx === 6 && <StepCert {...stepProps}/>}
          {stepIdx === 7 && <StepFeedback {...stepProps}/>}
        </main>
      </div>

      <footer className="portal-legal-foot">
        <div className="portal-legal-foot-inner">
          <Icon name="shield" size={12}/>
          <span>
            <strong>Fast-ILA</strong> is the booking and document platform, owned and operated by Go Legal Services Limited (all IP, software and content). Independent Legal Advice is provided by our panel solicitors at <strong>Nexa Law Limited</strong> — an SRA-regulated law firm (SRA No. 524963).
          </span>
        </div>
      </footer>
    </div>
  );
};

Object.assign(window, { ClientPortal });

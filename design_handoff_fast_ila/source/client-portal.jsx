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
  { id: "cert", label: "Sign &amp; receive your ILA certificate", icon: "award" },
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
  { id: "zTwmBaeCzkk", title: "Bridging Loans &amp; Development Finance", category: "Bridging Loan" },
  { id: "Zql2jq7OkkI", title: "Settlement Agreements Explained", category: "Settlement Agreement" },
  { id: "ac6XVPtLees", title: "Deed of Subordination Explained", category: "Deed of Subordination" },
  { id: "RdRugg1VybY", title: "Occupier's Consent — Waiver of Rights", category: "Occupier's Consent" },
  { id: "ZvgvzbTD1sg", title: "Personal &amp; Director Guarantees Explained", category: "Personal Guarantee" },
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
const FileDrop = ({ label, hint, file, onChange, accept }) => {
  const fileInput = React.useRef(null);
  const handlePick = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    onChange({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` });
  };
  return (
    <div className="filedrop-row">
      <div className="filedrop-label">{label}</div>
      {file ? (
        <div className="filedrop-filled">
          <div className="filedrop-icon"><Icon name="check" size={14} stroke={3}/></div>
          <div className="flex-1">
            <div className="filedrop-name">{file.name}</div>
            <div className="filedrop-meta">{file.size} · uploaded</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>Replace</button>
        </div>
      ) : (
        <button className="filedrop-empty" onClick={() => fileInput.current.click()}>
          <Icon name="package" size={22}/>
          <div className="filedrop-empty-text">
            <div className="filedrop-empty-title">Tap to upload</div>
            <div className="filedrop-empty-sub">{hint}</div>
          </div>
        </button>
      )}
      <input ref={fileInput} type="file" accept={accept} hidden onChange={handlePick}/>
    </div>
  );
};

// ----------------------------------------------------------------------------
// Step 1 — Client care letter (PDF preview + download + sync)
// ----------------------------------------------------------------------------
const StepLetter = ({ state, setState, onNext }) => {
  const lawyer = LAWYERS[0];
  const svc = SERVICES.find(s => s.id === "couples");

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Sign your client care letter</h2>
      <p className="portal-step-sub">This is the formal agreement between you and <strong>Nexa Law Ltd</strong> — the SRA-regulated law firm providing your ILA. Read it, download a copy for your records, and sign at the bottom.</p>

      <div className="ccl-doc-frame">
        <div className="ccl-doc-toolbar">
          <div className="ccl-doc-toolbar-l">
            <Icon name="doc" size={14}/>
            <span>Client_Care_Letter_Mehta.pdf</span>
            <span className="pill pill-muted">1 of 4 pages</span>
          </div>
          <div className="ccl-doc-toolbar-r">
            {state.signature && (
              <span className="ccl-sync-pill" title="Your signed copy is on your lawyer's screen in real time">
                <span className="ccl-sync-dot"/> Synced with Fast-ILA
              </span>
            )}
            <button className="btn btn-ghost btn-sm"><Icon name="download" size={13}/> Download PDF</button>
          </div>
        </div>
        <div className="ccl-doc-page">
          <div className="ccl-head">
            <div>
              <div className="ccl-lbl">Nexa Law Ltd · powered by Fast-ILA</div>
              <div className="ccl-meta">Authorised &amp; regulated by the SRA No. 524963 · Company no. 09876543 · VAT GB 245 670 123</div>
            </div>
            <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()} style={{ fontSize: 22 }}>
              <span className="b-fast">fast</span>
              <span className="b-ila">ila<span className="b-mark"/></span>
            </a>
          </div>

          <h3>Client Care Letter</h3>
          <p><strong>To:</strong> {state.clientName || "[your name]"}<br/>
            <strong>Re:</strong> Independent Legal Advice — {svc.name}<br/>
            <strong>Lawyer:</strong> {lawyer.name} ({lawyer.sra})</p>

          <h4>Scope of our work</h4>
          <p>We will provide you with Independent Legal Advice on the documents you are being asked to sign. We will explain the nature and effect of those documents, the risks involved, and your right to seek further advice or refuse to proceed.</p>
          <p>We do <strong>not</strong> act for the borrower (typically the company), the lender, or any other party. We act exclusively for you, the guarantor / signatory.</p>

          <h4>Our fee</h4>
          <p>A fixed, inclusive fee of <strong>£250</strong>. Payable by UK bank transfer from your personal bank account before the appointment — details on the next step.</p>

          <h4>Your rights</h4>
          <ul>
            <li>You may refuse our advice and seek another solicitor.</li>
            <li>You may cancel up to 24 hours before the appointment for a full refund.</li>
            <li>You may complain to us, then to the Legal Ombudsman, then to the SRA.</li>
          </ul>

          <h4>Confidentiality &amp; data</h4>
          <p>All information you share is confidential. We process personal data as Data Controller under the UK GDPR. Documents are stored encrypted for 6 years to align with SRA record-keeping.</p>

          <div className="ccl-doc-pagebreak">— Page 1 of 4 — continued overleaf —</div>
        </div>

        <div className="ccl-doc-signzone">
          <div className="ccl-sign-label">
            <Icon name="edit" size={13}/>
            Sign below — this signs all 4 pages
          </div>
          <MultiSignatoryBlock state={state} setState={setState}/>
        </div>
      </div>

      <div className="portal-info portal-info-soft">
        <Icon name="bell" size={15}/>
        <span>If you haven't signed and paid 24 hours before your appointment, we'll send you a friendly reminder.</span>
      </div>

      <div className="portal-step-foot">
        <span className="portal-foot-note"><Icon name="lock" size={13}/> PD82-compliant audit trail · timestamp &amp; IP recorded</span>
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
    name: state.clientName || "Priya Mehta",
    role: "Director 1",
    signature: state.signature || null,
    printName: state.signaturePrintName || state.clientName || "",
    date: state.signatureDate || null,
  });
  // Demo defaults: Couples matter → add Rohan as second signatory
  base.push({
    id: "sig-2",
    name: "Rohan Mehta",
    role: "Director 2",
    signature: state.signature2 || null,
    printName: state.signature2PrintName || "Rohan Mehta",
    date: state.signature2Date || null,
  });
  return base;
};

const allSignatoriesSigned = (state) => {
  const list = state.signatories || seedSignatories(state);
  return list.length > 0 && list.every(s => !!s.signature);
};

const MultiSignatoryBlock = ({ state, setState }) => {
  const [list, setList] = React.useState(() => {
    const s = seedSignatories(state);
    if (!state.signatories) setState({ ...state, signatories: s, signature: s[0]?.signature || null });
    return s;
  });

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
  // Hardcoded as joint-signatory matter for the demo (Mehta couples).
  // In production: read state.serviceId === "couples" and pull second signatory name.
  const isJoint = true;
  const secondName = "Rohan Mehta";

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
          <span>You — <strong>{state.clientName}</strong></span>
        </div>
        <div className="kyc-grid">
          <FileDrop label="Photo ID" hint="Passport or UK driving licence" file={state.kycId} onChange={(f) => setState({ ...state, kycId: f })} accept="image/*,.pdf"/>
          <FileDrop label="Proof of address" hint="Bank statement, utility bill or council tax letter — last 3 months" file={state.kycAddress} onChange={(f) => setState({ ...state, kycAddress: f })} accept="image/*,.pdf"/>
        </div>
      </div>

      {isJoint && (
        <div className="kyc-section">
          <div className="kyc-section-head">
            <Icon name="users" size={14}/>
            <span>Co-signatory — <strong>{secondName}</strong></span>
          </div>
          <div className="kyc-grid">
            <FileDrop label="Their photo ID" hint="Passport or UK driving licence" file={state.kycId2} onChange={(f) => setState({ ...state, kycId2: f })} accept="image/*,.pdf"/>
            <FileDrop label="Their proof of address" hint="Bank statement, utility bill or council tax letter — last 3 months" file={state.kycAddress2} onChange={(f) => setState({ ...state, kycAddress2: f })} accept="image/*,.pdf"/>
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
            <FileDrop label="Their photo ID" hint="Passport or UK driving licence" file={ex.kycId} onChange={(f) => updateExtra(i, { kycId: f })} accept="image/*,.pdf"/>
            <FileDrop label="Their proof of address" hint="Bank statement, utility bill or council tax letter — last 3 months" file={ex.kycAddress} onChange={(f) => updateExtra(i, { kycAddress: f })} accept="image/*,.pdf"/>
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

  const lastName = (state.clientName || "").split(" ").slice(-1)[0] || "Client";
  const suggestedRef = `KAO/${lastName.toUpperCase()}`;
  const canConfirm = (paid || (reference && date)) && fromOwn;

  const confirm = () => {
    setState({ ...state, paid: true, paymentRef: reference || suggestedRef, paymentDate: date || "today" });
    onNext();
  };

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Pay by bank transfer</h2>
      <p className="portal-step-sub">Transfer the fee from <strong>your own personal UK bank account</strong> into our SRA-regulated client account, then confirm below. We cannot accept card payments.</p>

      <div className="bank-card">
        <div className="bank-card-head">
          <div>
            <div className="bank-card-eyebrow">Pay to</div>
            <div className="bank-card-name">Nexa Law Ltd — SRA-regulated Client Account</div>
          </div>
          <button className="btn-ghost-light bank-pdf-btn">
            <Icon name="download" size={13}/> PDF copy
          </button>
        </div>

        <div className="bank-rows">
          <BankRow label="Sort code" value="04-00-04" mono/>
          <BankRow label="Account number" value="51 234 567" mono/>
          <BankRow label="Account name" value="Nexa Law Ltd Client Account"/>
          <BankRow label="Reference" value={suggestedRef} mono highlight/>
          <BankRow label="Amount" value="£250.00" mono highlight/>
        </div>

        <div className="bank-card-note">
          <Icon name="warning" size={14}/>
          <span>Use the reference exactly as shown — it starts with <strong>KAO/</strong> then your surname. Without it we may not see the payment for 24+ hours.</span>
        </div>
      </div>

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
const StepDocs = ({ state, setState, onNext, onBack }) => {
  const docs = state.matterDocs || [];
  const fileInput = React.useRef(null);

  const handlePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setState({
      ...state,
      matterDocs: [...docs, ...files.map(f => ({ name: f.name, size: `${(f.size / 1024).toFixed(0)} KB` }))],
    });
  };

  const remove = (i) => {
    setState({ ...state, matterDocs: docs.filter((_, j) => j !== i) });
  };

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Upload your matter documents</h2>
      <p className="portal-step-sub">Please share everything you're being asked to sign, plus the loan offer if you have it. Your lawyer reads these before the call so we can go straight to the advice — no time wasted on the phone reading.</p>

      <button className="docs-empty" onClick={() => fileInput.current.click()}>
        <div className="docs-empty-icon"><Icon name="package" size={28}/></div>
        <div className="docs-empty-title">Tap to upload documents</div>
        <div className="docs-empty-sub">PDF, DOCX or photos · up to 25 MB each</div>
      </button>
      <input ref={fileInput} type="file" accept=".pdf,.docx,.doc,image/*" hidden multiple onChange={handlePick}/>

      {docs.length > 0 && (
        <div className="portal-docs-list">
          {docs.map((d, i) => (
            <div key={i} className="portal-doc">
              <div className="portal-doc-icon"><Icon name="doc" size={16}/></div>
              <div className="flex-1">
                <div className="portal-doc-name">{d.name}</div>
                <div className="portal-doc-meta">{d.size}</div>
              </div>
              <button className="portal-doc-x" onClick={() => remove(i)}><Icon name="x" size={14}/></button>
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
          <li>Any side letters or schedules</li>
        </ul>
      </div>

      <div className="portal-info portal-info-warn">
        <Icon name="warning" size={15}/>
        <span><strong>Documents are required before we can hold your call.</strong> Without them your lawyer can't give the advice and we may have to reschedule. If anything's missing, just call us on 0207 459 4037.</span>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={docs.length === 0} onClick={onNext}>
          Continue <Icon name="arrow-right" size={14}/>
        </button>
      </div>
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

  const [signed, setSigned] = React.useState(state.declarationSigned || false);

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

  const onSign = (sigDataUrl, printName, sigDate) => {
    setSigned(true);
    setState({
      ...state,
      declarationSigned: true,
      declarationSignature: sigDataUrl,
      declarationPrintName: printName,
      declarationDate: sigDate,
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

      <h3 className="understand-section-title">Part 1 · {data.title}</h3>
      <p className="understand-section-sub">Confirm in broad terms — your lawyer walked you through each of these on the call.</p>
      <div className="understand-list">
        {data.items.map((it, idx) => (
          <div key={it.id} className={`understand-item ${checked[it.id] ? "is-checked" : ""}`}>
            <button
              className={`understand-tick ${checked[it.id] ? "is-on" : ""}`}
              onClick={() => toggle(it.id)}
              disabled={signed}
              aria-pressed={!!checked[it.id]}
            >
              {checked[it.id] && <Icon name="check" size={14} stroke={3}/>}
            </button>
            <div className="understand-item-body">
              <div className="understand-q"><strong>{idx + 1}.</strong> {it.q}</div>
              <div className="understand-example">
                <Icon name="info" size={12}/>
                <span><strong>For example:</strong> {it.example}</span>
              </div>
            </div>
          </div>
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

      <SignatureBlock
        label="Your signature"
        defaultName={state.clientName}
        signature={signed ? state.declarationSignature : null}
        printName={state.declarationPrintName}
        date={state.declarationDate}
        onSave={canSign ? onSign : null}
        onClear={() => { setSigned(false); setState({ ...state, declarationSigned: false, declarationSignature: null, declarationPrintName: null, declarationDate: null }); }}
        disabled={!canSign}
      />

      <div className="portal-info portal-info-soft" style={{ marginTop: 6 }}>
        <Icon name="lock" size={15}/>
        <span>
          Your signed declaration is timestamped and IP-stamped. A copy is emailed to you immediately. We hold an identical copy on our side under our retention policy as evidence of your understanding.
        </span>
      </div>

      <div className="understand-actions">
        <button className="btn btn-ghost" disabled={!signed}>
          <Icon name="download" size={13}/> Download signed declaration (PDF)
        </button>
      </div>

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <button className="btn btn-navy btn-lg" disabled={!signed} onClick={onNext}>
          {signed ? "Continue to certificate" : "Sign declaration to continue"} <Icon name="arrow-right" size={14}/>
        </button>
      </div>
    </div>
  );
};

// Single declaration item with a tick + title + supporting line
const DecItem = ({ id, checked, onToggle, disabled, title, sub, warn }) => (
  <div className={`understand-item ${checked ? "is-checked" : ""} ${warn ? "is-warn" : ""}`}>
    <button
      className={`understand-tick ${checked ? "is-on" : ""}`}
      onClick={() => onToggle(id)}
      disabled={disabled}
      aria-pressed={checked}
    >
      {checked && <Icon name="check" size={14} stroke={3}/>}
    </button>
    <div className="understand-item-body">
      <div className="understand-q">{title}</div>
      <div className={`understand-example ${warn ? "is-warn" : ""}`}>
        {warn && <Icon name="warning" size={12}/>}
        <span>{sub}</span>
      </div>
    </div>
  </div>
);

// ----------------------------------------------------------------------------
// Step 5 — Meet
// ----------------------------------------------------------------------------
const StepMeet = ({ state, onNext, onBack }) => {
  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Your Google Meet</h2>
      <p className="portal-step-sub">Your appointment is locked in. Click the link below at the time of your call — please have your photo ID to hand for face-match verification.</p>

      <LawyerNoteCard preCall/>

      <div className="meet-card">
        <div className="meet-card-head">
          <div className="meet-icon"><Icon name="video" size={22}/></div>
          <div className="flex-1">
            <div className="meet-svc">{SERVICES.find(s => s.id === "couples").short} · with {LAWYERS[0].name}</div>
            <div className="meet-when">Fri 29 May 2026 · 09:00 — 10:00 · Europe/London</div>
          </div>
        </div>
        <a className="btn btn-lime btn-lg btn-block meet-cta" href="#" onClick={(e) => e.preventDefault()}>
          <Icon name="video" size={16}/> meet.google.com / fil-jrnv-yxz
        </a>
        <div className="meet-card-foot">
          <div className="meet-foot-item">
            <Icon name="calendar" size={14}/> <a href="#" onClick={(e) => e.preventDefault()}>Add to Google Calendar</a>
          </div>
          <div className="meet-foot-item">
            <Icon name="calendar" size={14}/> <a href="#" onClick={(e) => e.preventDefault()}>Download .ics</a>
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
// Step 6 — Certificate (lender's template PDF, signature envelope set up by lawyer)
// ----------------------------------------------------------------------------
const StepCert = ({ state, setState, onBack }) => {
  const [certSigned, setCertSigned] = React.useState(false);

  return (
    <div className="portal-step">
      <h2 className="portal-step-title display">Sign your ILA certificate</h2>
      <p className="portal-step-sub">Your lawyer has uploaded your lender's official certificate template and marked the fields you need to sign. Sign once below — we'll apply your signature to every marked field and email the signed PDF to your lender or conveyancer.</p>

      <div className="cert-doc">
        <div className="cert-doc-head">
          <Icon name="award" size={22}/>
          <div className="flex-1">
            <div className="cert-doc-title">Shawbrook Bank ILA Certificate (template v3.2)</div>
            <div className="cert-doc-meta">Uploaded by {LAWYERS[0].name} · lender's official form · 2 pages</div>
          </div>
          <span className="pill pill-success"><Icon name="check" size={12}/> Lawyer-signed</span>
        </div>

        <div className="cert-pdf-wrap">
          <div className="cert-pdf-toolbar">
            <span><Icon name="doc" size={13}/> Shawbrook_ILA_Cert_Mehta.pdf</span>
            <div className="row gap-2">
              <button className="btn-ghost-light bank-pdf-btn"><Icon name="download" size={13}/> Download draft</button>
            </div>
          </div>
          <div className="cert-pdf-body">
            <div className="cert-pdf-page">
              <div className="cert-pdf-header">SHAWBROOK BANK PLC · ILA CERTIFICATE</div>
              <p>I, <strong>{LAWYERS[0].name}</strong>, solicitor, certify that on <strong>29 May 2026</strong> I gave Independent Legal Advice to the below-named signatory(ies) in connection with the documents disclosed to me, including a Personal Guarantee and Indemnity in favour of Shawbrook Bank plc.</p>
              <div className="cert-pdf-fieldgrid">
                <div>
                  <div className="cert-field-lbl">Signatory name</div>
                  <div className="cert-field-val">{state.clientName || "[name]"}</div>
                </div>
                <div>
                  <div className="cert-field-lbl">Solicitor SRA No.</div>
                  <div className="cert-field-val mono">{LAWYERS[0].sra.replace("SRA ", "")}</div>
                </div>
              </div>
              <p className="cert-pdf-fade">… clauses 1–6 abridged for preview …</p>

              <div className="cert-pdf-sig-row">
                <div className="cert-pdf-sig-block">
                  <div className="cert-field-lbl">Solicitor's signature</div>
                  <div className="cert-pdf-sig-area is-signed">
                    <span className="cert-sig-lawyer-name">{LAWYERS[0].name}</span>
                  </div>
                  <div className="cert-pdf-sig-meta">29 May 2026 · 11:14</div>
                </div>
                <div className="cert-pdf-sig-block">
                  <div className="cert-field-lbl">Signatory's signature</div>
                  <div className={`cert-pdf-sig-area ${certSigned ? "is-signed" : "is-awaiting"}`}>
                    {certSigned
                      ? <img src={state.signature} alt="Signature" className="cert-sig-img"/>
                      : <div className="cert-sig-tag"><Icon name="edit" size={11}/> SIGN HERE</div>
                    }
                  </div>
                  <div className="cert-pdf-sig-meta">{certSigned ? "Signed today" : "Awaiting your signature"}</div>
                </div>
              </div>
              <p className="cert-pdf-fade">… page 2 continues …</p>
            </div>
          </div>
        </div>
      </div>

      {!certSigned ? (
        <div className="cert-action-card">
          <div className="cert-action-info">
            <div className="cert-action-title">One click to sign and send</div>
            <div className="cert-action-sub">We'll apply the signature you gave at step 1 to every field your lawyer marked. The signed PDF and audit certificate are emailed to you and to Shawbrook Bank plc immediately.</div>
          </div>
          <button className="btn btn-lime btn-lg" onClick={() => { setCertSigned(true); setState({ ...state, certSigned: true }); }}>
            <Icon name="check" size={16}/> Sign certificate
          </button>
        </div>
      ) : (
        <div className="cert-done">
          <div className="cert-done-mark"><Icon name="check" size={32} stroke={3}/></div>
          <div className="cert-done-title display">Signed and on its way</div>
          <p className="cert-done-sub">Signed PDF and PD82-compliant audit certificate sent to you and to Shawbrook Bank plc at 11:14.</p>
          <div className="cert-done-actions">
            <button className="btn btn-ghost"><Icon name="download" size={14}/> Download signed PDF</button>
            <button className="btn btn-ghost"><Icon name="download" size={14}/> Download audit trail</button>
          </div>
        </div>
      )}

      <div className="portal-step-foot">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="arrow-left" size={14}/> Back</button>
        <span/>
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
  const [email, setEmail] = React.useState("");

  return (
    <div className="portal-login">
      <div className="portal-login-card">
        <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <h1 className="display portal-login-title">Sign in to your client portal</h1>
        <p className="portal-login-sub">Track your booking, sign your client care letter, upload ID and documents, and receive your ILA certificate.</p>

        <div className="portal-login-providers">
          <button className="portal-provider" onClick={onLogin}>
            <span className="portal-provider-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
            </span>
            <span>Continue with Google</span>
          </button>
          <button className="portal-provider" onClick={onLogin}>
            <span className="portal-provider-icon">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path fill="#1877F2" d="M18 9a9 9 0 1 0-10.41 8.89v-6.29H5.31V9h2.28V7.02c0-2.25 1.34-3.5 3.39-3.5.98 0 2.01.18 2.01.18v2.21h-1.13c-1.12 0-1.47.69-1.47 1.4V9h2.5l-.4 2.6h-2.1v6.29A9 9 0 0 0 18 9z"/>
              </svg>
            </span>
            <span>Continue with Facebook</span>
          </button>
        </div>

        <div className="portal-login-divider"><span>or</span></div>

        <div className="portal-login-field">
          <label className="field-label">Email used to book</label>
          <input
            className="field-input"
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && email && onLogin()}
          />
        </div>
        <button className="btn btn-navy btn-lg btn-block" onClick={onLogin} disabled={!email}>
          Sign in <Icon name="arrow-right" size={16}/>
        </button>

        <div className="portal-login-foot">
          <span><Icon name="lock" size={11}/> One-click sign-in · no passwords</span>
          <a href="#" onClick={(e) => e.preventDefault()}>Need help?</a>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Portal shell
// ============================================================================
const ClientPortal = () => {
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [state, setState] = React.useState({
    clientName: "Priya Mehta",
    signature: null,
    kycId: null,
    kycAddress: null,
    paid: false,
    matterDocs: [],
    certSigned: false,
  });
  const [stepIdx, setStepIdx] = React.useState(0);

  if (!loggedIn) return <PortalLogin onLogin={() => setLoggedIn(true)}/>;

  // Compute step completion
  const completed = {
    letter: !!state.signature,
    kyc: !!(state.kycId && state.kycAddress),
    pay: !!state.paid,
    docs: state.matterDocs.length > 0,
    meet: stepIdx > 4,
    understand: !!state.declarationSigned,
    cert: !!state.certSigned,
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

  const stepProps = { state, setState, onNext: next, onBack: back };

  return (
    <div className="portal-shell">
      <header className="portal-top">
        <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div className="portal-top-r">
          <div className="portal-top-ref">
            <Icon name="user" size={13}/>
            <span>{state.clientName}</span>
          </div>
          <button className="dash-icon-btn"><Icon name="logout" size={14}/></button>
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

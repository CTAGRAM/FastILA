/* global React, ReactDOM, Icon, BookingFlow,
   SiteHeader, SiteGuaranteeStrip, SiteFooterStrip, TrustpilotMini, SiteChromeStyles,
   DashSidebar, DashTopbar, TodayView, BookingsView, DetailView, RoyalMailView, LawyersView,
   TweaksPanel, TweakSection, TweakRadio, TweakToggle, TweakSelect, useTweaks */

// ============================================================================
// Top-level mode switcher (Booking client vs Dashboard internal)
// ============================================================================

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "serviceLayout": "stacked",
  "embedded": true,
  "theme": "light",
  "mode": "booking",
  "dashView": "today",
  "dashRole": "admin",
  "portalStep": 0,
  "compact": false
}/*EDITMODE-END*/;

const ModeSwitcher = ({ mode, setMode }) => (
  <div className="mode-switch">
    <button
      className={`mode-tab ${mode === "booking" ? "is-active" : ""}`}
      onClick={() => setMode("booking")}
    >
      <Icon name="calendar" size={15}/>
      <div>
        <div className="mode-tab-l">Client booking</div>
        <div className="mode-tab-s">Public 3-step flow</div>
      </div>
    </button>
    <button
      className={`mode-tab ${mode === "portal" ? "is-active" : ""}`}
      onClick={() => setMode("portal")}
    >
      <Icon name="user" size={15}/>
      <div>
        <div className="mode-tab-l">Client portal</div>
        <div className="mode-tab-s">Sign, pay, ID, certificate</div>
      </div>
    </button>
    <button
      className={`mode-tab ${mode === "dashboard" ? "is-active" : ""}`}
      onClick={() => setMode("dashboard")}
    >
      <Icon name="shield" size={15}/>
      <div>
        <div className="mode-tab-l">Internal dashboard</div>
        <div className="mode-tab-s">Lawyer &amp; admin console</div>
      </div>
    </button>
  </div>
);

// Booking view wrapper — handles embedded vs standalone presentation
const BookingView = ({ tweaks }) => {
  const widget = (
    <BookingFlow
      layout={tweaks.serviceLayout}
      theme={tweaks.theme}
    />
  );

  if (tweaks.embedded) {
    return (
      <div className="bk-embed">
        <SiteHeader/>
        <section className="bk-embed-hero">
          <div className="bk-embed-hero-inner">
            <div className="bk-embed-hero-l">
              <span className="pill pill-lime">SRA-Regulated Independent Legal Advice</span>
              <h1 className="display bk-embed-h1">
                Fast, fixed-fee Independent Legal Advice.
              </h1>
              <p className="bk-embed-lede">
                From £145 inclusive. Same-day certificates. Lender-approved. Trusted by over 1,400 clients.
              </p>
              <ul className="bk-embed-ticks">
                <li><Icon name="check" size={16} stroke={3}/> Same-day ILA certificate available</li>
                <li><Icon name="check" size={16} stroke={3}/> Fully remote &amp; lender-approved</li>
                <li><Icon name="check" size={16} stroke={3}/> SRA-regulated solicitors</li>
                <li><Icon name="check" size={16} stroke={3}/> Rated Excellent on Trustpilot &amp; Google</li>
              </ul>
              <TrustpilotMini/>
            </div>
            <div className="bk-embed-hero-r">
              {widget}
            </div>
          </div>
        </section>
        <SiteGuaranteeStrip/>
        <SiteFooterStrip/>
      </div>
    );
  }

  // Standalone
  return (
    <div className="bk-standalone">
      <div className="bk-standalone-inner">
        <div className="bk-standalone-head">
          <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
            <span className="b-fast">fast</span>
            <span className="b-ila">ila<span className="b-mark"/></span>
          </a>
          <div className="bk-standalone-tag">
            <Icon name="lock" size={14}/>
            Secure booking
          </div>
        </div>
        {widget}
        <div className="bk-standalone-foot">
          <span><Icon name="shield" size={14}/> SRA-regulated by Nexa Law Ltd · powered by Fast-ILA</span>
          <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
          <a href="#" onClick={(e) => e.preventDefault()}>Contact</a>
        </div>
      </div>
    </div>
  );
};

// Dashboard login gate — separates admin (one specific user) from lawyers (each their own)
const DashboardLogin = ({ onSignIn, setRole }) => {
  const [stage, setStage] = React.useState("choose"); // choose | admin | lawyer
  const [email, setEmail] = React.useState("");

  const adminEmail = "karim@nexalaw.com";
  const isAdminEmailValid = email.trim().toLowerCase() === adminEmail;

  return (
    <div className="dash-login">
      <div className="dash-login-card">
        <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div className="dash-login-eyebrow">Fast-ILA console · Nexa Law Ltd</div>
        <h1 className="display dash-login-title">Sign in</h1>

        {stage === "choose" && (
          <>
            <p className="dash-login-sub">Pick how you want to sign in. Lawyers each have their own account and see only their bookings. Admin access is restricted to one named partner.</p>
            <div className="dash-login-options">
              <button className="dash-login-option" onClick={() => setStage("lawyer")}>
                <div className="dash-login-option-icon"><Icon name="user" size={20}/></div>
                <div>
                  <div className="dash-login-option-title">Lawyer sign-in</div>
                  <div className="dash-login-option-sub">Continue with Google · for solicitors on the team</div>
                </div>
                <Icon name="chevron-right" size={16}/>
              </button>
              <button className="dash-login-option dash-login-option-admin" onClick={() => setStage("admin")}>
                <div className="dash-login-option-icon"><Icon name="shield" size={20}/></div>
                <div>
                  <div className="dash-login-option-title">Admin sign-in</div>
                  <div className="dash-login-option-sub">Karim only · full access to revenue, templates, settings</div>
                </div>
                <Icon name="chevron-right" size={16}/>
              </button>
            </div>
          </>
        )}

        {stage === "lawyer" && (
          <>
            <p className="dash-login-sub">Sign in with the Google account linked to your Fast-ILA lawyer profile.</p>
            <button className="portal-provider" onClick={() => { setRole("lawyer"); onSignIn(); }}>
              <span className="portal-provider-icon">
                <svg width="18" height="18" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/></svg>
              </span>
              <span>Continue with Google</span>
            </button>
            <button className="portal-provider" onClick={() => { setRole("lawyer"); onSignIn(); }}>
              <span className="portal-provider-icon">
                <svg width="18" height="18" viewBox="0 0 23 23"><path fill="#F35325" d="M1 1h10v10H1z"/><path fill="#81BC06" d="M12 1h10v10H12z"/><path fill="#05A6F0" d="M1 12h10v10H1z"/><path fill="#FFBA08" d="M12 12h10v10H12z"/></svg>
              </span>
              <span>Continue with Microsoft</span>
            </button>
            <button className="dash-login-link" onClick={() => setStage("choose")}>
              <Icon name="arrow-left" size={12}/> Back
            </button>
          </>
        )}

        {stage === "admin" && (
          <>
            <p className="dash-login-sub">Admin access is restricted to one named partner. Enter the admin email to continue.</p>
            <div className="portal-login-field">
              <label className="field-label">Admin email</label>
              <input
                className="field-input"
                type="email"
                placeholder={adminEmail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
              {email && !isAdminEmailValid && (
                <div className="dash-login-error">
                  <Icon name="x-circle" size={12}/> Only {adminEmail} can sign in as admin.
                </div>
              )}
            </div>
            <button className="btn btn-navy btn-lg btn-block" onClick={() => { setRole("admin"); onSignIn(); }} disabled={!isAdminEmailValid}>
              <Icon name="lock" size={14}/> Sign in as admin
            </button>
            <button className="dash-login-link" onClick={() => setStage("choose")}>
              <Icon name="arrow-left" size={12}/> Back
            </button>
            <button className="portal-login-demo" onClick={() => { setEmail(adminEmail); }}>
              <Icon name="bolt" size={12}/> Demo: prefill admin email
            </button>
          </>
        )}

        <div className="portal-login-foot">
          <span><Icon name="lock" size={11}/> One-click sign-in · no passwords</span>
          <a href="#" onClick={(e) => e.preventDefault()}>Need help?</a>
        </div>
      </div>
    </div>
  );
};

// Dashboard view wrapper
const DashboardView = ({ tweaks, setTweaks }) => {
  const [signedIn, setSignedIn] = React.useState(false);
  const [view, setView] = [tweaks.dashView, (v) => setTweaks("dashView", v)];
  const [role, setRole] = [tweaks.dashRole, (r) => setTweaks("dashRole", r)];
  const [detailRef, setDetailRef] = React.useState("FI-2026-00480");
  const search = useGlobalSearch();

  if (!signedIn) {
    return <DashboardLogin onSignIn={() => setSignedIn(true)} setRole={setRole}/>;
  }

  const openDetail = (ref) => {
    setDetailRef(ref);
    setView("detail");
  };

  const detailBooking = (typeof BOOKINGS !== "undefined") ? BOOKINGS.find(b => b.ref === detailRef) : null;
  const titles = {
    today: { title: role === "admin" ? "Today across the team" : "Your day", sub: "Tue 27 May 2026 · Europe/London" },
    upcoming: { title: "Upcoming bookings", sub: "Next 14 days" },
    bookings: { title: "All bookings", sub: "Search, filter, export" },
    detail: { title: "Booking detail", sub: detailBooking ? detailBooking.clientName : "" },
    royalmail: { title: "Wet-signature & Royal Mail", sub: "Tracking, dispatch and delivery" },
    signatures: { title: "My signatures", sub: "Digital and wet — manage every cert in one place" },
    lawyers: { title: "Lawyers & availability", sub: "Profiles, working hours, calendar sync" },
    reports: { title: "Reports & revenue", sub: "Monthly breakdown, per-lawyer performance, client list" },
    templates: { title: "Templates & documents", sub: "Firm-wide PDFs the system pushes to every client portal" },
    prompts: { title: "AI prompts (Claude)", sub: "System prompts for the pre-call brief and the AI assistant" },
    lenders: { title: "Lender knowledge base", sub: "Which lenders take digital ILA certs vs wet signatures" },
    profile: { title: "My profile", sub: "Your saved signature, contact details, calendar sync" },
    integrations: { title: "Integrations & automation", sub: "N8N, calendars, AI, email & SMS" },
    brokers: { title: "Broker panel", sub: "Referral partners — grow the panel, send mailings" },
  };
  const t = titles[view] || titles.today;

  return (
    <div className="dash-shell">
      <DashSidebar role={role} view={view} setView={setView} setRole={setRole}/>
      <div className="dash-main">
        <DashTopbar
          title={t.title}
          subtitle={t.sub}
          onSearchClick={() => search.setOpen(true)}
          actions={
            <>
              <button className="btn btn-ghost"><Icon name="download" size={14}/> Export</button>
              <button className="btn btn-navy"><Icon name="plus" size={14}/> New booking</button>
            </>
          }
        />
        <div className="dash-content">
          {(view === "today" || view === "upcoming") && <TodayView role={role} onOpenDetail={openDetail}/>}
          {view === "bookings" && <BookingsView onOpenDetail={openDetail} role={role} lawyerId={role === "lawyer" ? "amelia" : null}/>}
          {view === "detail" && <DetailView bookingRef={detailRef} role={role} onBack={() => setView(role === "admin" ? "bookings" : "today")}/>}
          {view === "royalmail" && <RoyalMailView onOpenDetail={openDetail}/>}
          {view === "signatures" && <SignaturesView role={role} onOpenDetail={openDetail}/>}
          {view === "lawyers" && <LawyersView/>}
          {view === "reports" && <ReportsView/>}
          {view === "templates" && <TemplatesView/>}
          {view === "lenders" && <LendersView role={role}/>}
          {view === "prompts" && <PromptsView/>}
          {view === "integrations" && <IntegrationsView/>}
          {view === "brokers" && <BrokersView/>}
          {view === "profile" && <LawyerProfileView lawyerId={role === "lawyer" ? "amelia" : null}/>}
        </div>
      </div>
      <AiChat role={role}/>
      <GlobalSearch
        open={search.open}
        onClose={() => search.setOpen(false)}
        role={role}
        onNavigate={(v) => setView(v)}
        onOpenDetail={openDetail}
      />
    </div>
  );
};

// ============================================================================
// Tweaks panel
// ============================================================================
const FastILATweaks = ({ tweaks, setTweak }) => (
    <TweaksPanel title="Tweaks · Fast-ILA">
    <TweakSection title="Top-level">
      <TweakSelect
        label="View"
        value={tweaks.mode}
        onChange={(v) => setTweak("mode", v)}
        options={[
          { value: "booking", label: "Booking form (public)" },
          { value: "portal", label: "Client portal" },
          { value: "dashboard", label: "Internal dashboard" },
        ]}
      />
    </TweakSection>

    {tweaks.mode === "booking" && (
      <>
        <TweakSection title="Booking presentation">
          <TweakRadio
            label="Embed"
            value={tweaks.embedded ? "yes" : "no"}
            onChange={(v) => setTweak("embedded", v === "yes")}
            options={[
              { value: "yes", label: "In site" },
              { value: "no", label: "Standalone" },
            ]}
          />
          <TweakRadio
            label="Theme"
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </TweakSection>
        <TweakSection title="Service select layout">
          <TweakRadio
            label="Cards"
            value={tweaks.serviceLayout}
            onChange={(v) => setTweak("serviceLayout", v)}
            options={[
              { value: "stacked", label: "Stacked" },
              { value: "grid", label: "Grid (2×2)" },
            ]}
          />
        </TweakSection>
      </>
    )}

    {tweaks.mode === "dashboard" && (
      <TweakSection title="Dashboard">
        <TweakRadio
          label="Role"
          value={tweaks.dashRole}
          onChange={(v) => setTweak("dashRole", v)}
          options={[
            { value: "lawyer", label: "Lawyer" },
            { value: "admin", label: "Admin" },
          ]}
        />
        <TweakSelect
          label="View"
          value={tweaks.dashView}
          onChange={(v) => setTweak("dashView", v)}
          options={[
            { value: "today", label: "Today" },
            { value: "bookings", label: "All bookings" },
            { value: "detail", label: "Booking detail" },
            { value: "royalmail", label: "Royal Mail queue" },
            { value: "lawyers", label: "Lawyers & availability" },
            { value: "reports", label: "Reports & revenue" },
            { value: "templates", label: "Templates & documents" },
          ]}
        />
      </TweakSection>
    )}
  </TweaksPanel>
);

// ============================================================================
// App
// ============================================================================
const App = () => {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  return (
    <>
      <SiteChromeStyles/>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header-l">
            <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
              <span className="b-fast">fast</span>
              <span className="b-ila">ila<span className="b-mark"/></span>
            </a>
            <span className="app-tag">Booking system prototype · v6</span>
          </div>
          <ModeSwitcher mode={tweaks.mode} setMode={(v) => setTweak("mode", v)}/>
          <div className="app-header-r">
            <span className="app-meta-pill"><Icon name="globe" size={13}/> fast-ila.co.uk</span>
            <span className="app-meta-pill app-meta-pill-warn"><Icon name="info" size={13}/> Mock data</span>
          </div>
        </header>
        <main className="app-main">
          {tweaks.mode === "booking" && <BookingView tweaks={tweaks}/>}
          {tweaks.mode === "portal" && <ClientPortal/>}
          {tweaks.mode === "dashboard" && <DashboardView tweaks={tweaks} setTweaks={setTweak}/>}
        </main>
      </div>
      <FastILATweaks tweaks={tweaks} setTweak={setTweak}/>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);

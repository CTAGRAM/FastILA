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

// Resolve initial mode from URL — supports embeds and magic-link redirects.
//   ?mode=booking     show only the public booking form (used by the WordPress plugin)
//   ?mode=portal      show only the client portal (used by magic-link emails)
//   ?mode=dashboard   internal console
//   ?chrome=off       hide the top mode-switcher (used by WordPress embed)
function readInitialModeFromURL() {
  if (typeof window === "undefined") return {};
  try {
    const p = new URLSearchParams(window.location.search);
    const out = {};
    const m = p.get("mode");
    if (m && ["booking", "portal", "dashboard"].includes(m)) out.mode = m;
    if (p.get("chrome") === "off") out.hideChrome = true;
    return out;
  } catch (_e) { return {}; }
}

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
          <a className="brand-wordmark on-light" href="?mode=booking" onClick={(e) => { e.preventDefault(); window.location.href = "?mode=booking"; }} title="Start over">
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
          <a href="#" onClick={(e) => { e.preventDefault(); const f = window.FastILA?.firm?.get?.() || {}; const url = `https://${f.domain || "fast-ila.co.uk"}/privacy`; window.open(url, "_blank", "noopener"); }}>Privacy</a>
          <a href="#" onClick={(e) => { e.preventDefault(); const f = window.FastILA?.firm?.get?.() || {}; const url = `https://${f.domain || "fast-ila.co.uk"}/terms`;   window.open(url, "_blank", "noopener"); }}>Terms</a>
          <a href="#" onClick={(e) => { e.preventDefault(); const support = window.FastILA?.firm?.get?.()?.supportEmail || "info@fast-ila.co.uk"; window.location.href = `mailto:${support}`; }}>Contact</a>
        </div>
      </div>
    </div>
  );
};

// Dashboard login gate — validates against FastILA.users (mock) or magic-link / Google OAuth (live)
// Shown when a signed-in email is NOT authorised for the dashboard (random
// account, pending approval, or rejected). The session is already signed out by
// the time we render this — this is just the explanation + a way back.
const AccessDenied = ({ info, onBack }) => {
  const reason = (info && info.reason) || "not_invited";
  const map = {
    pending:     { icon: "clock",    title: "Awaiting approval",   tone: "#d7ed3f" },
    rejected:    { icon: "x-circle", title: "Access declined",     tone: "#ff6b6b" },
    not_invited: { icon: "lock",     title: "Not authorised",      tone: "#9fb3bd" },
    error:       { icon: "warning",  title: "Couldn’t verify access", tone: "#ff6b6b" },
    no_session:  { icon: "lock",     title: "Session expired",     tone: "#9fb3bd" },
  };
  const m = map[reason] || map.not_invited;
  return (
    <div className="dash-login">
      <div className="dash-login-card">
        <a className="brand-wordmark on-light" href="?mode=booking" onClick={(e) => { e.preventDefault(); window.location.href = "?mode=booking"; }} title="Go to booking form">
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div style={{ textAlign: "center", margin: "22px 0 6px" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: "#063952", display: "inline-flex", alignItems: "center", justifyContent: "center", color: m.tone }}>
            <Icon name={m.icon} size={26} />
          </div>
        </div>
        <h2 style={{ textAlign: "center", margin: "8px 0 6px", color: "#063952" }}>{m.title}</h2>
        <p style={{ textAlign: "center", color: "#5b7480", lineHeight: 1.55, margin: "0 0 8px" }}>{info && info.message}</p>
        {info && info.email && (
          <p style={{ textAlign: "center", color: "#9fb3bd", fontSize: 13, margin: "0 0 18px" }}>Signed in as <strong style={{ color: "#33525f" }}>{info.email}</strong></p>
        )}
        <button className="btn btn-navy btn-lg btn-block" onClick={onBack}>
          <Icon name="arrow-right" size={14} /> Use a different account
        </button>
      </div>
    </div>
  );
};

const DashboardLogin = ({ onSignIn, setRole }) => {
  const [stage, setStage] = React.useState("choose"); // choose | admin | lawyer
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState(null);
  const [notice, setNotice] = React.useState(null);
  const [oauthBusy, setOauthBusy] = React.useState(false);

  // Mock mode = no Supabase connected = we can offer one-click test access
  const isMock = !window.FastILA || window.FastILA.mode !== "live";

  // Live mode: email + password (resolves role from the Supabase session via
  // DashboardView's onAuthChange) or a magic link.
  const passwordSignIn = async () => {
    setError(null); setNotice(null);
    if (!email || !password) { setError("Enter your email and password."); return; }
    setOauthBusy(true);
    try {
      await FastILA.auth.signInWithPassword(email, password);
      // onAuthChange in DashboardView picks up the session, resolves the role
      // from app_metadata, and renders the dashboard.
    } catch (e) {
      setError(e.message || "Sign-in failed — check your email and password."); setOauthBusy(false);
    }
  };
  const magicLink = async () => {
    setError(null); setNotice(null);
    if (!email) { setError("Enter your email first."); return; }
    try { await FastILA.auth.signInWithEmail(email, "dashboard"); setNotice("Magic link sent — check " + email.trim() + "."); }
    catch (e) { setError(e.message || "Couldn't send the magic link."); }
  };

  const signInWithGoogle = async () => {
    setError(null);
    if (isMock) { setError("Google sign-in requires Supabase. Use 'Sign in as admin' or 'Sign in as lawyer' below in mock mode."); return; }
    setOauthBusy(true);
    try {
      await FastILA.auth.signInWithGoogle("dashboard");
    } catch (e) {
      setError(e.message || "Google sign-in failed");
      setOauthBusy(false);
    }
  };

  const tryAuth = (asRole) => {
    setError(null);
    const e = email.trim().toLowerCase();
    if (!e) { setError("Please enter your email."); return; }
    const result = FastILA.users.authenticate(e, asRole);
    if (!result.ok) { setError(result.reason); return; }
    setRole(result.role);
    onSignIn(result.user);
  };

  // One-click test sign-in: idempotently creates the demo account, then signs in
  const quickSignIn = (asRole) => {
    setError(null);
    const demoEmail = asRole === "admin" ? "admin@demo.local" : "lawyer@demo.local";
    const demoName  = asRole === "admin" ? "Demo Admin"       : "Demo Lawyer";
    let user = FastILA.users.findByEmail(demoEmail);
    if (!user) {
      let lawyerId = null;
      if (asRole === "lawyer") {
        // Create a lawyer profile so the demo lawyer has scheduling, photo, etc.
        lawyerId = "demo-lawyer";
        FastILA.lawyers.update(lawyerId, {
          name: "Demo Lawyer",
          initials: "DL",
          sra: "SRA 0000000",
          photoBg: "#0a4a67",
          languages: ["English"],
          services: ["urgent", "standard", "couples", "wet"],
          rating: 5.0,
          reviews: 0,
          bio: "Demo lawyer for testing the platform.",
        });
      }
      user = FastILA.users.add({ email: demoEmail, fullName: demoName, role: asRole, lawyerId });
    }
    setRole(asRole);
    onSignIn(user);
  };

  return (
    <div className="dash-login">
      <div className="dash-login-card">
        <a className="brand-wordmark on-light" href="?mode=booking" onClick={(e) => { e.preventDefault(); window.location.href = "?mode=booking"; }} title="Go to booking form">
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div className="dash-login-eyebrow">Fast-ILA console</div>
        <h1 className="display dash-login-title">Sign in</h1>

        {stage === "choose" && (
          <>
            <p className="dash-login-sub">Pick how you want to sign in. Lawyers each have their own account and see only their bookings. Admin access has full control.</p>
            <div className="dash-login-options">
              <button className="dash-login-option" onClick={() => setStage("lawyer")}>
                <div className="dash-login-option-icon"><Icon name="user" size={20}/></div>
                <div>
                  <div className="dash-login-option-title">Lawyer sign-in</div>
                  <div className="dash-login-option-sub">For solicitors invited by the admin</div>
                </div>
                <Icon name="chevron-right" size={16}/>
              </button>
              <button className="dash-login-option dash-login-option-admin" onClick={() => setStage("admin")}>
                <div className="dash-login-option-icon"><Icon name="shield" size={20}/></div>
                <div>
                  <div className="dash-login-option-title">Admin sign-in</div>
                  <div className="dash-login-option-sub">Full access to bookings, lawyers, templates, settings</div>
                </div>
                <Icon name="chevron-right" size={16}/>
              </button>
            </div>

            {/* Test access — only shown when Supabase isn't connected */}
            {isMock && (
              <div style={{
                marginTop: 18, padding: 14, borderRadius: 10,
                background: "#f7f5ee", border: "1px dashed #c8d4dc",
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#063952", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  <Icon name="bolt" size={11}/> Test access
                </div>
                <div style={{ fontSize: 12, color: "#5b6b76", marginBottom: 10 }}>
                  No password — one-click sign-in while you're trying the platform. Hidden in production once Supabase is connected.
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-navy btn-sm" style={{ flex: 1 }} onClick={() => quickSignIn("admin")}>
                    <Icon name="shield" size={13}/> Sign in as admin
                  </button>
                  <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => quickSignIn("lawyer")}>
                    <Icon name="user" size={13}/> Sign in as lawyer
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {(stage === "lawyer" || stage === "admin") && (
          <>
            <p className="dash-login-sub">
              {stage === "lawyer"
                ? "Sign in with the email your admin invited you with."
                : <>Enter the email registered as admin. New here? <a href="#" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("fastila:open-setup")); }}>Run the setup wizard</a>.</>}
            </p>

            {/* Google OAuth — works for both lawyer + admin (auth.users.role decides which dashboard) */}
            <button
              className="portal-provider"
              onClick={signInWithGoogle}
              disabled={oauthBusy}
              style={{ marginBottom: 10 }}
            >
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

            <div className="portal-login-divider"><span>or magic link</span></div>

            <div className="portal-login-field">
              <label className="field-label">{stage === "lawyer" ? "Email" : "Admin email"}</label>
              <input
                className="field-input"
                type="email"
                placeholder={stage === "lawyer" ? "lawyer@yourfirm.com" : "admin@yourfirm.com"}
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); setNotice(null); }}
                onKeyDown={(e) => e.key === "Enter" && (isMock ? tryAuth(stage) : passwordSignIn())}
                autoFocus
              />
            </div>
            {!isMock && (
              <div className="portal-login-field">
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); setNotice(null); }}
                  onKeyDown={(e) => e.key === "Enter" && passwordSignIn()}
                />
              </div>
            )}
            {error && <div className="dash-login-error"><Icon name="x-circle" size={12}/> {error}</div>}
            {notice && <div style={{ fontSize: 12.5, color: "#1f7a46", background: "#f4faf6", border: "1px solid #d7eade", borderRadius: 8, padding: "8px 10px", marginBottom: 8 }}><Icon name="check" size={12}/> {notice}</div>}
            {isMock ? (
              <button className="btn btn-navy btn-lg btn-block" onClick={() => tryAuth(stage)} disabled={!email}>
                <Icon name={stage === "lawyer" ? "arrow-right" : "lock"} size={14}/> Sign in as {stage}
              </button>
            ) : (
              <>
                <button className="btn btn-navy btn-lg btn-block" onClick={passwordSignIn} disabled={!email || !password || oauthBusy}>
                  <Icon name="lock" size={14}/> {oauthBusy ? "Signing in…" : "Sign in"}
                </button>
                <button className="dash-login-link" onClick={magicLink} disabled={!email}>
                  <Icon name="mail" size={12}/> Email me a magic link instead
                </button>
              </>
            )}
            <button className="dash-login-link" onClick={() => { setStage("choose"); setError(null); }}>
              <Icon name="arrow-left" size={12}/> Back
            </button>
          </>
        )}

        <div className="portal-login-foot">
          <span><Icon name="lock" size={11}/> Secure sign-in · Google, password or magic link</span>
          <a href="#" onClick={(e) => { e.preventDefault(); const support = (window.FastILA?.firm?.get?.()?.supportEmail) || "info@fast-ila.co.uk"; if (window.fiToast) window.fiToast(`Opening email to ${support}`); window.location.href = `mailto:${support}?subject=Sign-in%20help`; }}>Need help?</a>
        </div>
      </div>
    </div>
  );
};

// Persistent session — survives reload so admins don't re-auth on every refresh
const SESSION_KEY = "fastila_session_v1";
function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Validate session against the live user store
    if (!s.email) return null;
    if (typeof window.FastILA?.users?.findByEmail === "function") {
      const u = window.FastILA.users.findByEmail(s.email);
      if (!u) return null;
      return { user: u, role: u.role };
    }
    return null;
  } catch (_e) { return null; }
}
function saveSession(user) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ email: user.email, since: Date.now() })); } catch (_e) {}
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch (_e) {}
}

// Dashboard view wrapper
const DashboardView = ({ tweaks, setTweaks }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  const [session, setSession] = React.useState(loadSession);
  const [denied, setDenied] = React.useState(null); // {reason, message} when an unapproved email signs in
  const [view, setView] = [tweaks.dashView, (v) => setTweaks("dashView", v)];
  const [role, setRole] = [tweaks.dashRole, (r) => setTweaks("dashRole", r)];
  const [detailRef, setDetailRef] = React.useState(null);
  const [newBookingOpen, setNewBookingOpen] = React.useState(false);
  const [notifOpen, setNotifOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  const search = useGlobalSearch();

  // When the role changes, snap the view to the role's default landing page
  // (e.g. wet specialist → Wet queue; admin → Today). Skip the very first
  // render so we don't override deep-links.
  const firstRoleRef = React.useRef(true);
  React.useEffect(() => {
    if (firstRoleRef.current) { firstRoleRef.current = false; return; }
    if (role === "wet_specialist") setView("wetqueue");
    else if (role === "admin")     setView("today");
    else                            setView("today");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // Expose setView globally so deep child components (like the Edit template
  // button on CertSignWorkflow) can jump the admin to other sections.
  React.useEffect(() => {
    window.fiSetDashView = setView;
    return () => { delete window.fiSetDashView; };
  }, [setView]);

  // Expose a global "open this booking's detail" so the client-history list
  // (on the Clients view + booking detail) can jump between matters.
  React.useEffect(() => {
    window.fiOpenDetail = (ref) => { if (ref) { setDetailRef(ref); setView("detail"); } };
    return () => { delete window.fiOpenDetail; };
  }, [setView]);

  // One-time deep-link: ?view=<id> (used by the calendar OAuth return redirect
  // so the user lands back on the Calendars screen after connecting).
  React.useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get("view");
      const known = ["today","bookings","detail","royalmail","signatures","lawyers","reports","templates","lenders","prompts","integrations","automations","autocenter","control","clients","calendars","recordings","closures","contacts","broadcasts","blog","wetqueue","brokers","profile","settings"];
      if (v && known.includes(v)) setView(v);
    } catch (_e) {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync role from session
  React.useEffect(() => {
    if (session?.role) setRole(session.role);
  }, [session?.role]);

  // Detect Supabase auth session (Google OAuth redirect or active magic link)
  // and resolve the matching FastILA user. If no user row exists for the
  // returned email yet, create a placeholder lawyer-role user — the admin
  // can promote them later from Settings → Team & access.
  React.useEffect(() => {
    if (!window.FastILA || FastILA.mode !== "live" || !FastILA.auth) return;
    let stop = () => {};
    (async () => {
      try {
        const sess = await FastILA.auth.session();
        if (sess && sess.user && sess.user.email) {
          await applyAuthUser(sess.user);
        }
      } catch (_e) {}
      try {
        stop = FastILA.auth.onAuthChange(async (sess) => {
          if (sess && sess.user && sess.user.email) await applyAuthUser(sess.user);
          else { clearSession(); setSession(null); }
        });
      } catch (_e) {}
    })();
    async function applyAuthUser(authUser) {
      const email = authUser.email.toLowerCase().trim();
      // HARD GATE: access is granted ONLY by the server (auth-gate edge fn),
      // which checks app_metadata.role (existing admins) or an APPROVED invite.
      // No auto-provisioning — an unknown/pending/rejected email is signed out.
      const g = await FastILA.auth.gate();
      if (!g || !g.ok) {
        try { await FastILA.auth.signOut(); } catch (_e) {}
        clearSession();
        setSession(null);
        setDenied({
          reason: (g && g.reason) || "not_invited",
          message: (g && g.message) || "This email isn’t authorised for the dashboard.",
          email,
        });
        return;
      }
      // Just-approved lawyers: the server stamped app_metadata.role — refresh the
      // JWT so RLS sees the new role on this very session.
      if (g.healed) { try { await FastILA.auth.refresh(); } catch (_e) {} }
      const role = g.role;
      const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || email;
      let user = FastILA.users.findByEmail(email);
      if (!user) user = FastILA.users.add({ email, fullName, role });
      else if (user.role !== role) user = FastILA.users.update(user.id, { role }) || { ...user, role };
      const merged = { ...user, role };
      setDenied(null);
      saveSession(merged);
      setSession({ user: merged, role });
      setRole(role);
    }
    return () => { try { stop(); } catch (_e) {} };
  }, []);

  // Default detailRef to first booking when bookings load
  React.useEffect(() => {
    if (!detailRef && (window.BOOKINGS || []).length > 0) {
      setDetailRef(window.BOOKINGS[0].ref);
    }
  }, [detailRef]);

  if (denied) {
    return <AccessDenied info={denied} onBack={async () => {
      setDenied(null);
      try { if (window.FastILA && FastILA.mode === "live") await FastILA.auth.signOut(); } catch (_e) {}
    }} />;
  }

  if (!session) {
    return <DashboardLogin onSignIn={(user) => {
      saveSession(user);
      setSession({ user, role: user.role });
      setRole(user.role);
    }} setRole={setRole}/>;
  }

  const signOut = async () => {
    clearSession();
    setSession(null);
    try { if (window.FastILA && FastILA.mode === "live") await FastILA.auth.signOut(); } catch (_e) {}
    fiToast("Signed out");
  };

  const openDetail = (ref) => {
    setDetailRef(ref);
    setView("detail");
  };
  const handleNewBookingCreated = (ref) => {
    openDetail(ref);
    fiNotify("Booking created", `Reference ${ref}`, ref, "success");
  };
  const goHome = () => {
    // Navigate the app back to the booking form
    window.location.href = "?mode=booking";
  };

  const detailBooking = (typeof BOOKINGS !== "undefined") ? BOOKINGS.find(b => b.ref === detailRef) : null;
  const titles = {
    today: { title: role === "admin" ? "Today across the team" : "Your day", sub: new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + " · Europe/London" },
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
    integrations: { title: "Integrations & automation", sub: "Calendars, AI, email & SMS" },
    brokers: { title: "Broker panel", sub: "Referral partners — grow the panel, send mailings" },
    settings: { title: "Settings", sub: "Team access, firm profile, data management" },
  };
  const t = titles[view] || titles.today;
  const currentLawyerId = session?.user?.lawyerId || (role === "lawyer" ? (window.LAWYERS && window.LAWYERS[0]?.id) : null);

  return (
    <div className="dash-shell">
      <DashSidebar
        role={role}
        view={view}
        setView={setView}
        setRole={setRole}
        currentUser={session?.user}
        onSignOut={signOut}
        onOpenProfile={() => setProfileOpen(true)}
        onGoHome={goHome}
      />
      <div className="dash-main">
        <DashTopbar
          title={t.title}
          subtitle={t.sub}
          onSearchClick={() => search.setOpen(true)}
          onNotificationsClick={() => setNotifOpen(true)}
          actions={
            <>
              <button className="btn btn-ghost" onClick={() => Actions.exportBookings()}>
                <Icon name="download" size={14}/> Export
              </button>
              <button className="btn btn-navy" onClick={() => setNewBookingOpen(true)}>
                <Icon name="plus" size={14}/> New booking
              </button>
            </>
          }
        />
        <div className="dash-content">
          {(view === "today" || view === "upcoming") && <TodayView role={role} onOpenDetail={openDetail}/>}
          {view === "bookings" && <BookingsView onOpenDetail={openDetail} role={role} lawyerId={role === "lawyer" ? currentLawyerId : null}/>}
          {view === "detail" && <DetailView bookingRef={detailRef} role={role} onBack={() => setView(role === "admin" ? "bookings" : "today")}/>}
          {view === "royalmail" && <RoyalMailView onOpenDetail={openDetail}/>}
          {view === "signatures" && <SignaturesView role={role} onOpenDetail={openDetail}/>}
          {view === "lawyers" && <LawyersView/>}
          {view === "reports" && <ReportsView/>}
          {view === "templates" && <TemplatesView/>}
          {view === "lenders" && <LendersView role={role}/>}
          {view === "prompts" && <PromptsView/>}
          {view === "integrations" && <IntegrationsView/>}
          {view === "automations" && <AutomationsView/>}
          {view === "autocenter" && <AutomationCenterView/>}
          {view === "control" && <ControlCenterView/>}
          {view === "clients" && <ClientsView onOpenDetail={openDetail}/>}
          {view === "calendars" && <CalendarSyncView/>}
          {view === "recordings" && <RecordingsView onOpenDetail={openDetail}/>}
          {view === "closures" && <ClosureReportView/>}
          {view === "contacts" && <ContactsView/>}
          {view === "broadcasts" && <BroadcastsView/>}
          {view === "blog" && <BlogContentView/>}
          {view === "wetqueue" && <WetSignatureQueueView onOpenDetail={openDetail}/>}
          {view === "brokers" && <BrokersView/>}
          {view === "profile" && <LawyerProfileView lawyerId={currentLawyerId}/>}
          {view === "settings" && <SettingsView onSignOut={signOut}/>}
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
      <NewBookingModal
        open={newBookingOpen}
        onClose={() => setNewBookingOpen(false)}
        onCreated={handleNewBookingCreated}
        defaultLawyerId={role === "lawyer" ? currentLawyerId : null}
      />
      <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)}/>
      <ProfileEditModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        user={session?.user}
        onSaved={() => setSession(s => ({ ...s, user: FastILA.users.findByEmail(s.user.email) || s.user }))}
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
  const initial = React.useMemo(readInitialModeFromURL, []);
  const [forcedMode, setForcedMode] = React.useState(initial.mode || null);
  const hideChrome = !!initial.hideChrome;
  const [setupOpen, setSetupOpen] = React.useState(false);

  // Open the setup wizard the first time we land on the dashboard with no users
  React.useEffect(() => {
    const tryOpen = () => {
      if (!window.FastILA) return;
      const noUsers = (window.USERS || []).length === 0;
      if (noUsers && !sessionStorage.getItem("fastila_setup_dismissed")) {
        setSetupOpen(true);
      }
    };
    // Wait one tick so api.jsx's init() has run
    const t = setTimeout(tryOpen, 400);
    const onOpen = () => setSetupOpen(true);
    window.addEventListener("fastila:open-setup", onOpen);
    return () => { clearTimeout(t); window.removeEventListener("fastila:open-setup", onOpen); };
  }, []);

  // Wake up the App when seed data finishes loading (data.jsx fires this once
  // on hydration). Store mutations DO NOT bump this — individual views opt in
  // to live updates via FastILA.useStore() so we don't unmount in-progress
  // flows like the booking form mid-submit.
  const [dataKey, setDataKey] = React.useState(0);
  React.useEffect(() => {
    const h = () => setDataKey(k => k + 1);
    window.addEventListener("fastila:data-loaded", h);
    return () => window.removeEventListener("fastila:data-loaded", h);
  }, []);

  const mode = forcedMode || tweaks.mode;
  const setMode = (v) => { setForcedMode(null); setTweak("mode", v); };

  const fastila = (typeof window !== "undefined") ? window.FastILA : null;
  const isLive = fastila && fastila.mode === "live";

  return (
    <>
      <SiteChromeStyles/>
      <div className={`app-shell ${hideChrome ? "is-embedded" : ""}`}>
        {!hideChrome && (
          <header className="app-header">
            <div className="app-header-l">
              <a className="brand-wordmark on-light" href="?mode=booking" onClick={(e) => { e.preventDefault(); window.location.href = "?mode=booking"; }} title="Booking form">
                <span className="b-fast">fast</span>
                <span className="b-ila">ila<span className="b-mark"/></span>
              </a>
              <span className="app-tag">Booking system · v6</span>
            </div>
            <ModeSwitcher mode={mode} setMode={setMode}/>
            <div className="app-header-r">
              <span className="app-meta-pill"><Icon name="globe" size={13}/> {fastila?.config?.brand?.domain || "fast-ila.co.uk"}</span>
              {isLive ? (
                <span className="app-meta-pill" style={{background:"#e6f7c8", color:"#063952"}}>
                  <Icon name="check" size={13}/> Live · Supabase
                </span>
              ) : (
                <span className="app-meta-pill app-meta-pill-warn"><Icon name="info" size={13}/> Demo data</span>
              )}
            </div>
          </header>
        )}
        <main className="app-main" key={dataKey}>
          {mode === "booking" && <BookingView tweaks={tweaks}/>}
          {mode === "portal" && <ClientPortal/>}
          {mode === "dashboard" && <DashboardView tweaks={tweaks} setTweaks={setTweak}/>}
        </main>
      </div>
      {!hideChrome && <FastILATweaks tweaks={tweaks} setTweak={setTweak}/>}
      <ToastHost/>
      <PreviewHost/>
      <FirstRunWizard open={setupOpen} onClose={() => {
        setSetupOpen(false);
        try { sessionStorage.setItem("fastila_setup_dismissed", "1"); } catch (_e) {}
      }}/>
    </>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);

// ----------------------------------------------------------------------------
// Iframe embed beacon — when chrome is off (i.e. embedded by the WordPress
// plugin), post the document height to the parent window so the plugin can
// resize the iframe to fit content. No-op when not embedded.
// ----------------------------------------------------------------------------
(function () {
  if (typeof window === "undefined" || window.top === window.self) return;
  try {
    const p = new URLSearchParams(window.location.search);
    if (p.get("chrome") !== "off") return;
  } catch (_e) { return; }

  let lastH = 0;
  function post() {
    const h = Math.max(
      document.documentElement.scrollHeight,
      document.body ? document.body.scrollHeight : 0
    );
    if (Math.abs(h - lastH) < 4) return;
    lastH = h;
    try {
      window.parent.postMessage({ channel: "fastila", type: "height", value: h }, "*");
    } catch (_e) { /* parent same-origin restricted */ }
  }
  window.addEventListener("load", post);
  window.addEventListener("resize", post);
  const obs = new MutationObserver(() => post());
  obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
  // Initial nudge
  setTimeout(post, 300);
})();

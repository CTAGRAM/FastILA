/* global React, Icon, Avatar, StatusPill, SERVICES, LAWYERS, BOOKINGS, KPI, TODAY, fmtDateLong, fmtDateShort, ymd */

// ============================================================================
// Dashboard sidebar + topbar
// ============================================================================
const DashSidebar = ({ role, view, setView, setRole, currentUser, onSignOut, onOpenProfile, onGoHome }) => {
  const lawyerNav = [
    { id: "today", label: "Today", icon: "calendar" },
    { id: "upcoming", label: "Upcoming", icon: "clock" },
    { id: "bookings", label: "My bookings", icon: "doc" },
    { id: "clients", label: "Clients", icon: "users" },
    { id: "signatures", label: "My signatures", icon: "edit" },
    { id: "recordings", label: "Recordings", icon: "video" },
    { id: "lenders", label: "Lender guide", icon: "award" },
    { id: "profile", label: "My profile", icon: "user" },
  ];
  // Wet-signature specialists (e.g. Aashma) focus only on the wet flow.
  // They join calls as the second lawyer and manage the postal pack.
  const wetSpecialistNav = [
    { id: "wetqueue", label: "Wet queue", icon: "stamp" },
    { id: "upcoming", label: "Upcoming calls", icon: "clock" },
    { id: "lenders", label: "Lender guide", icon: "award" },
    { id: "profile", label: "My profile", icon: "user" },
  ];
  const adminNav = [
    { id: "today", label: "Today", icon: "calendar" },
    { id: "bookings", label: "All bookings", icon: "doc" },
    { id: "clients", label: "Clients", icon: "users" },
    { id: "detail", label: "Booking detail", icon: "sparkle" },
    { id: "royalmail", label: "Royal Mail queue", icon: "stamp" },
    { id: "closures", label: "Matters to close", icon: "check-circle" },
    { id: "recordings", label: "Recordings", icon: "video" },
    { id: "lawyers", label: "Lawyers", icon: "users" },
    { id: "calendars", label: "Calendars", icon: "calendar" },
    { id: "templates", label: "Templates", icon: "package" },
    { id: "lenders", label: "Lender guide", icon: "award" },
    { id: "brokers", label: "Brokers", icon: "users" },
    { id: "prompts", label: "AI prompts", icon: "sparkle" },
    { id: "contacts", label: "Contacts", icon: "users" },
    { id: "broadcasts", label: "Broadcasts", icon: "send" },
    { id: "control", label: "Control center", icon: "shield" },
    { id: "integrations", label: "Integrations", icon: "settings" },
    { id: "autocenter", label: "Automation center", icon: "bolt" },
    { id: "reports", label: "Reports & revenue", icon: "pound" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];
  const nav = role === "admin" ? adminNav : role === "wet_specialist" ? wetSpecialistNav : lawyerNav;

  return (
    <aside className="dash-side">
      <div className="dash-side-top">
        <a className="brand-wordmark on-light" href="#" onClick={(e) => { e.preventDefault(); onGoHome && onGoHome(); }} title="Go to booking form">
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div className="dash-side-eyebrow">Internal Console</div>
      </div>

      {/* Demo-only "view-as" switch — hidden in live mode (role comes from the
          signed-in account's app_metadata). Shown only in mock/demo for testing. */}
      {(typeof FastILA === "undefined" || FastILA.mode !== "live") && (
      <div className="dash-role-switch-wrap">
        <div className="dash-role-switch-label">
          <Icon name="info" size={10}/> Demo: view-as
        </div>
        <div className="dash-role-switch" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4 }}>
          <button
            className={`dash-role ${role === "lawyer" ? "is-active" : ""}`}
            onClick={() => setRole("lawyer")}
            title="Primary ILA solicitor — runs the calls"
          >
            <Icon name="user" size={13}/> Lawyer
          </button>
          <button
            className={`dash-role ${role === "wet_specialist" ? "is-active" : ""}`}
            onClick={() => setRole("wet_specialist")}
            title="Wet-signature specialist — joins wet calls + handles post-out"
          >
            <Icon name="stamp" size={13}/> Wet Sig
          </button>
          <button
            className={`dash-role ${role === "admin" ? "is-active" : ""}`}
            onClick={() => setRole("admin")}
            title="Firm administrator — sees everything"
          >
            <Icon name="shield" size={13}/> Admin
          </button>
        </div>
        <div className="dash-side-foot-note">In production, each lawyer logs in to their own account and sees only their data.</div>
      </div>
      )}

      <nav className="dash-nav">
        {nav.map(n => {
          // Compute live counts so the badges reflect real data, not hardcoded demo numbers
          let count = null;
          if (role === "admin" && n.id === "bookings") {
            count = (window.BOOKINGS || []).filter(b => b.status !== "cancelled" && b.status !== "completed").length;
          } else if (role === "admin" && n.id === "royalmail") {
            count = (window.BOOKINGS || []).filter(b => b.dispatch && b.dispatch !== "delivered").length;
          }
          return (
            <button
              key={n.id}
              className={`dash-nav-item ${view === n.id ? "is-active" : ""}`}
              onClick={() => setView(n.id)}
            >
              <Icon name={n.icon} size={17}/>
              <span>{n.label}</span>
              {count !== null && count > 0 && <span className="dash-nav-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      <div className="dash-side-foot">
        <button className="dash-side-prof" onClick={onOpenProfile} title="Edit profile" style={{ background: "transparent", border: 0, padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left", flex: 1 }}>
          <Avatar lawyer={role === "admin"
            ? { initials: (currentUser?.fullName || "Admin").split(/\s+/).map(s=>s[0]).slice(0,2).join("").toUpperCase(), photoBg: "#063952" }
            : (LAWYERS.find(l => l.id === currentUser?.lawyerId) || LAWYERS[0] || { initials: "LW", photoBg: "#0a4a67" })} size={36}/>
          <div>
            <div className="dash-side-name">{currentUser?.fullName || (role === "admin" ? "Admin" : (LAWYERS[0]?.name || "Lawyer"))}</div>
            <div className="dash-side-role">{role === "admin" ? "Super admin" : "Solicitor"}</div>
          </div>
        </button>
        <button className="dash-side-logout" aria-label="Logout" onClick={onSignOut} title="Sign out">
          <Icon name="logout" size={16}/>
        </button>
      </div>
    </aside>
  );
};

const DashTopbar = ({ title, subtitle, actions, onSearchClick, onNotificationsClick }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const unread = (typeof FastILA?.notifications?.unreadCount === "function") ? FastILA.notifications.unreadCount() : 0;
  return (
    <header className="dash-top">
      <div>
        <h1 className="dash-top-title display">{title}</h1>
        {subtitle && <p className="dash-top-sub">{subtitle}</p>}
      </div>
      <div className="dash-top-actions">
        {actions}
        <button className="dash-icon-btn dash-icon-btn-search" aria-label="Search (⌘K)" onClick={onSearchClick}>
          <Icon name="search" size={16}/>
          <kbd className="dash-icon-kbd">⌘K</kbd>
        </button>
        <button className="dash-icon-btn dash-icon-btn-dot" aria-label="Notifications" onClick={onNotificationsClick} style={{ position: "relative" }}>
          <Icon name="bell" size={16}/>
          {unread > 0 && (
            <span style={{
              position: "absolute", top: 4, right: 4, background: "#9a1c1c", color: "#fff",
              borderRadius: 10, padding: "1px 5px", fontSize: 10, fontWeight: 700, minWidth: 16, textAlign: "center",
            }}>{unread > 9 ? "9+" : unread}</span>
          )}
        </button>
      </div>
    </header>
  );
};

// ============================================================================
// KPI Card
// ============================================================================
const KpiCard = ({ label, value, delta, deltaDir, hint, icon, tone }) => (
  <div className={`kpi ${tone ? `kpi-${tone}` : ""}`}>
    <div className="kpi-head">
      <div className="kpi-icon"><Icon name={icon} size={16}/></div>
      <div className="kpi-label">{label}</div>
    </div>
    <div className="kpi-value display">{value}</div>
    {(delta || hint) && (
      <div className="kpi-foot">
        {delta && (
          <span className={`kpi-delta ${deltaDir === "up" ? "is-up" : "is-down"}`}>
            {deltaDir === "up" ? "↑" : "↓"} {delta}
          </span>
        )}
        {hint && <span className="kpi-hint">{hint}</span>}
      </div>
    )}
  </div>
);

// ============================================================================
// View — Today (lawyer view)
// ============================================================================
const TodayView = ({ role, onOpenDetail }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [showNewBooking, setShowNewBooking] = React.useState(false);
  const [scheduleFilter, setScheduleFilter] = React.useState("all"); // all | unpaid | completed | pending

  // Resolve the signed-in lawyer from the session — replaces the hardcoded "amelia"
  const me = React.useMemo(() => {
    try {
      const raw = localStorage.getItem("fastila_session_v1");
      const email = raw ? JSON.parse(raw).email : null;
      return email ? FastILA.users.findByEmail(email) : null;
    } catch (_e) { return null; }
  }, []);
  const lawyerId = me?.lawyerId || null;
  const myLawyer = lawyerId ? (LAWYERS || []).find(l => l.id === lawyerId) : null;
  const myDisplayName = myLawyer?.name || me?.fullName || me?.email || "Your day";

  const todayKey = ymd(new Date()); // use TODAY for live data
  const todays = role === "admin"
    ? BOOKINGS.filter(b => b.date === todayKey)
    : BOOKINGS.filter(b => b.date === todayKey && (!lawyerId || b.lawyerId === lawyerId));

  // Local completion override (booking ref -> true). Lets the lawyer
  // tick off a call without affecting the global mock data.
  const [completed, setCompleted] = React.useState(() => new Set(
    todays.filter(b => b.status === "completed").map(b => b.ref)
  ));
  const toggleDone = (ref, e) => {
    e.stopPropagation();
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };

  const sortedAll = [...todays].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  const sorted = scheduleFilter === "all" ? sortedAll
    : scheduleFilter === "unpaid"    ? sortedAll.filter(b => b.payment === "pending")
    : scheduleFilter === "completed" ? sortedAll.filter(b => b.status === "completed")
    : scheduleFilter === "pending"   ? sortedAll.filter(b => b.status === "scheduled")
    : sortedAll;

  // Build hour rail
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  // Live counts — derived from real data, not hardcoded
  const allBookings = window.BOOKINGS || [];
  const lawyerBookings = role === "lawyer" ? allBookings.filter(b => b.lawyerId === lawyerId) : allBookings;
  const todayTotal = sorted.length;
  const todayGross = sorted.reduce((s, b) => s + (b.amount || 0), 0);
  const paymentsPending = lawyerBookings.filter(b => b.payment === "pending" && b.status !== "cancelled").length;
  const wetSigInTransit = lawyerBookings.filter(b => b.dispatch && b.dispatch !== "delivered").length;
  const callsToday = sorted.length;
  const callsDone = sorted.filter(b => b.status === "completed").length;
  const certsToIssue = lawyerBookings.filter(b => b.status === "completed" && !b.certificateIssued).length;
  const briefsReady = lawyerBookings.filter(b => b.aiSummary && !b.briefReviewed).length;
  const teamSize = (window.LAWYERS || []).length;

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        {role === "admin" ? (
          <>
            <KpiCard icon="calendar" label="Today’s bookings" value={todayTotal}
              hint={teamSize ? `Across ${teamSize} lawyer${teamSize === 1 ? "" : "s"}` : "Add lawyers in Settings → Team"}/>
            <KpiCard icon="pound" label="Today’s revenue (gross)" value={`£${todayGross.toLocaleString()}`}
              hint={todayGross ? `Net £${(todayGross / 1.2).toFixed(2)} + VAT` : "No bookings yet today"}/>
            <KpiCard icon="warning" label="Payments pending" value={paymentsPending}
              tone={paymentsPending > 0 ? "warning" : undefined}
              hint={paymentsPending > 0 ? "Awaiting client care letter response" : "All caught up"}/>
            <KpiCard icon="stamp" label="Wet-sig in transit" value={wetSigInTransit}
              tone={wetSigInTransit > 0 ? "info" : undefined}
              hint={wetSigInTransit > 0 ? "Awaiting docs / ready to post" : "Nothing in transit"}/>
          </>
        ) : (
          <>
            <KpiCard icon="calendar" label="Calls today" value={callsToday}
              hint={callsToday ? `You’ve done ${callsDone} so far` : "No calls scheduled today"}/>
            <KpiCard icon="sparkle" label="Pre-call briefs ready" value={briefsReady}
              tone={briefsReady > 0 ? "info" : undefined}
              hint={briefsReady > 0 ? "AI generated, awaiting review" : "Nothing to review"}/>
            <KpiCard icon="doc" label="Certificates to issue" value={certsToIssue}
              tone={certsToIssue > 0 ? "warning" : undefined}
              hint={certsToIssue > 0 ? "Post-call, draft ready" : "Nothing pending"}/>
            <KpiCard icon="stamp" label="Your wet-sig items" value={wetSigInTransit}
              hint={wetSigInTransit > 0 ? "In progress" : "Nothing in your queue"}/>
          </>
        )}
      </div>

      <div className="dash-grid-row two-col">
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2 className="panel-title">Schedule · {fmtDateLong(TODAY)}</h2>
              <p className="panel-sub">{role === "admin" ? "All lawyers" : myDisplayName} · Europe/London</p>
            </div>
            <div className="panel-actions" style={{ position: "relative" }}>
              <select
                className="filter-chip"
                value={scheduleFilter}
                onChange={(e) => setScheduleFilter(e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="all">Filter · All</option>
                <option value="pending">Scheduled only</option>
                <option value="completed">Completed only</option>
                <option value="unpaid">Unpaid only</option>
              </select>
              {role === "admin" && (
                <button className="btn btn-navy" onClick={() => setShowNewBooking(true)}>
                  <Icon name="plus" size={14}/> New booking
                </button>
              )}
            </div>
          </header>

          <div className="day-rail">
            {hours.map(h => {
              const slotItems = sorted.filter(b => parseInt(b.time) === h);
              return (
                <div key={h} className="day-row">
                  <div className="day-hour">{h.toString().padStart(2, "0")}:00</div>
                  <div className="day-slot">
                    {slotItems.length === 0 ? (
                      <div className="day-empty"/>
                    ) : slotItems.map(b => {
                      const svc = SERVICES.find(s => s.id === b.serviceId);
                      const lawyer = LAWYERS.find(l => l.id === b.lawyerId);
                      const isDone = completed.has(b.ref);
                      return (
                        <button
                          key={b.ref}
                          className={`day-card svc-${b.serviceId} ${isDone ? "is-done" : ""}`}
                          onClick={() => onOpenDetail(b.ref)}
                        >
                          <div className="day-card-l">
                            <div className="day-card-time">{b.time}</div>
                            <div className="day-card-dur">{svc?.duration || 45}m</div>
                          </div>
                          <div className="day-card-c">
                            <div className="day-card-name">{b.clientName}</div>
                            <div className="day-card-meta">
                              <span className="pill pill-cream">{svc?.short || b.serviceId || "—"}</span>
                              {role === "admin" && lawyer && <span className="day-card-lawyer"><Avatar lawyer={lawyer} size={16}/> {lawyer.name.split(" ")[0]}</span>}
                              {b.lender && <span className="day-card-lender">{b.lender}</span>}
                            </div>
                          </div>
                          <div className="day-card-r">
                            <span
                              className={`day-done-tick ${isDone ? "is-on" : ""}`}
                              onClick={(e) => toggleDone(b.ref, e)}
                              title={isDone ? "Mark not done" : "Mark complete"}
                              role="button"
                              tabIndex={0}
                            >
                              <Icon name="check" size={14} stroke={3}/>
                            </span>
                            {!isDone && b.payment === "pending" && <span className="pill pill-warning">Unpaid</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">{role === "admin" ? "Operations queue" : "Your queue"}</h2>
            <p className="panel-sub">Things that need doing</p>
          </header>
          <OperationsQueue role={role} bookings={lawyerBookings} onOpenDetail={onOpenDetail}/>
        </section>
      </div>

      <NewBookingModal
        open={showNewBooking}
        onClose={() => setShowNewBooking(false)}
        onCreated={(ref) => { setShowNewBooking(false); onOpenDetail && onOpenDetail(ref); }}
        defaultLawyerId={role === "lawyer" ? lawyerId : null}
      />
    </div>
  );
};

// ============================================================================
// View — Bookings list (admin)
// ============================================================================
// ============================================================================
// OperationsQueue — derives items from real BOOKINGS so empty stays empty
// ============================================================================
const OperationsQueue = ({ role, bookings, onOpenDetail }) => {
  const items = [];
  if (role === "admin") {
    const unpaid = bookings.filter(b => b.payment === "pending" && b.status !== "cancelled");
    if (unpaid.length) items.push({
      key: "unpaid",
      mark: "warning", icon: "card",
      title: `${unpaid.length} payment${unpaid.length === 1 ? "" : "s"} outstanding`,
      sub: `Chase if unpaid 24h before the call`,
      cta: { label: "Open list", tone: "navy", onClick: () => onOpenDetail && onOpenDetail(unpaid[0].ref) },
    });
    const arrived = bookings.filter(b => b.dispatch === "signed");
    if (arrived.length) items.push({
      key: "arrived",
      mark: "info", icon: "stamp",
      title: `${arrived.length} wet-sig pack${arrived.length === 1 ? "" : "s"} arrived — distribute to lawyers`,
      sub: arrived.slice(0, 3).map(b => b.clientName).join(", "),
      cta: { label: "Open queue", tone: "ghost", onClick: () => onOpenDetail && onOpenDetail(arrived[0].ref) },
    });
    const toPost = bookings.filter(b => b.dispatch === "ready_to_post");
    if (toPost.length) items.push({
      key: "to-post",
      mark: "info", icon: "send",
      title: `${toPost.length} wet-sig pack${toPost.length === 1 ? "" : "s"} to post out today`,
      sub: `${toPost[0].clientName}${toPost[0].lender ? " → " + toPost[0].lender : ""}`,
      cta: { label: "Enter tracking", tone: "lime", onClick: () => onOpenDetail && onOpenDetail(toPost[0].ref) },
    });
    const completed = bookings.filter(b => b.status === "completed").length;
    const noShows = bookings.filter(b => b.status === "no-show").length;
    if (completed > 0) items.push({
      key: "completed-today",
      mark: "success", icon: "award",
      title: `${completed} appointment${completed === 1 ? "" : "s"} completed`,
      sub: noShows ? `${noShows} no-show${noShows === 1 ? "" : "s"} this week` : "All on schedule",
      pill: { label: completed + " done", tone: "success" },
    });
  } else {
    // Lawyer queue
    const briefs = bookings.filter(b => b.aiSummary && !b.briefReviewed);
    for (const b of briefs.slice(0, 2)) items.push({
      key: "brief-" + b.ref,
      mark: "info", icon: "sparkle",
      title: `Review pre-call brief — ${b.clientName}, ${b.time}`,
      sub: "AI brief ready",
      cta: { label: "Open brief", tone: "navy", onClick: () => onOpenDetail && onOpenDetail(b.ref) },
    });
    const certs = bookings.filter(b => b.status === "completed" && !b.certificateIssued).slice(0, 2);
    for (const b of certs) items.push({
      key: "cert-" + b.ref,
      mark: "warning", icon: "doc",
      title: `Issue ILA certificate — ${b.clientName}`,
      sub: `Call completed · draft cert ready`,
      cta: { label: "Issue", tone: "lime", onClick: () => onOpenDetail && onOpenDetail(b.ref) },
    });
    const incoming = bookings.filter(b => b.dispatch === "signed").slice(0, 2);
    for (const b of incoming) items.push({
      key: "incoming-" + b.ref,
      mark: "info", icon: "stamp",
      title: `Sign incoming pack — ${b.clientName}`,
      sub: b.lender ? `Then post to ${b.lender}` : "Then post on",
      cta: { label: "Open", tone: "ghost", onClick: () => onOpenDetail && onOpenDetail(b.ref) },
    });
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: 28, textAlign: "center", color: "#5b6b76" }}>
        <Icon name="check" size={26}/>
        <div style={{ marginTop: 8, fontSize: 14 }}>You're all caught up — nothing in the queue.</div>
      </div>
    );
  }

  return (
    <div className="action-list">
      {items.map(it => (
        <div key={it.key} className="action-item">
          <div className={`action-mark action-mark-${it.mark}`}><Icon name={it.icon} size={16}/></div>
          <div className="flex-1">
            <div className="action-title">{it.title}</div>
            {it.sub && <div className="action-sub">{it.sub}</div>}
          </div>
          {it.cta && (
            <button className={`btn btn-${it.cta.tone}`} onClick={it.cta.onClick}>
              {it.cta.label}
            </button>
          )}
          {it.pill && <span className={`pill pill-${it.pill.tone}`}>{it.pill.label}</span>}
        </div>
      ))}
    </div>
  );
};

const BookingsView = ({ onOpenDetail, lawyerId, role }) => {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [lawyerFilter, setLawyerFilter] = React.useState("all");
  const [lenderFilter, setLenderFilter] = React.useState("all");
  const [paymentFilter, setPaymentFilter] = React.useState("all");
  const [dispatchFilter, setDispatchFilter] = React.useState("all");
  const [monthFilter, setMonthFilter] = React.useState("all");
  const [readyToCloseFilter, setReadyToCloseFilter] = React.useState("all");
  const [newOpen, setNewOpen] = React.useState(false);
  // Re-render when the store changes (a booking is created elsewhere etc.)
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  const baseBookings = lawyerId ? BOOKINGS.filter(b => b.lawyerId === lawyerId) : BOOKINGS;
  // Distinct values for the dropdowns
  const lenderOpts = Array.from(new Set(baseBookings.map(b => b.lender).filter(Boolean))).sort();
  const monthOpts = Array.from(new Set(baseBookings.map(b => (b.date || "").slice(0, 7)).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const monthLabel = (k) => { if (!k || k === "all") return null; const [y, m] = k.split("-"); return new Date(+y, +m - 1, 1).toLocaleString("en-GB", { month: "long", year: "numeric" }); };
  const toggleDone = (ref, e) => {
    e.stopPropagation();
    const b = BOOKINGS.find(x => x.ref === ref);
    if (!b) return;
    if (b.status === "completed") FastILA.bookings.setStatus(ref, "scheduled");
    else FastILA.bookings.setStatus(ref, "completed");
  };
  const completed = new Set(baseBookings.filter(b => b.status === "completed").map(b => b.ref));

  const filtered = baseBookings.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (serviceFilter !== "all" && b.serviceId !== serviceFilter) return false;
    if (source !== "all" && b.source !== source) return false;
    if (lawyerFilter !== "all" && b.lawyerId !== lawyerFilter) return false;
    if (lenderFilter !== "all" && b.lender !== lenderFilter) return false;
    if (paymentFilter !== "all" && (b.payment || "pending") !== paymentFilter) return false;
    if (dispatchFilter !== "all" && (b.dispatch || "") !== dispatchFilter) return false;
    if (monthFilter !== "all" && (b.date || "").slice(0, 7) !== monthFilter) return false;
    if (readyToCloseFilter === "yes" && !b.readyToCloseAt) return false;
    if (readyToCloseFilter === "no"  && b.readyToCloseAt)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(b.clientName || "").toLowerCase().includes(q) &&
          !(b.clientEmail || "").toLowerCase().includes(q) &&
          !(b.ref || "").toLowerCase().includes(q) &&
          !(b.lender || "").toLowerCase().includes(q) &&
          !(b.phone || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const hasActiveFilters = statusFilter !== "all" || serviceFilter !== "all" || source !== "all"
    || lawyerFilter !== "all" || lenderFilter !== "all" || paymentFilter !== "all"
    || dispatchFilter !== "all" || monthFilter !== "all" || readyToCloseFilter !== "all" || !!search;
  const clearAllFilters = () => {
    setStatusFilter("all"); setServiceFilter("all"); setSource("all");
    setLawyerFilter("all"); setLenderFilter("all"); setPaymentFilter("all");
    setDispatchFilter("all"); setMonthFilter("all"); setReadyToCloseFilter("all"); setSearch("");
  };

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        <KpiCard icon="calendar" label="Bookings this week" value={KPI.weekBookings} delta="12%" deltaDir="up" hint="vs last week"/>
        <KpiCard icon="pound" label="Revenue (gross)" value={`£${KPI.weekRevenueGross.toLocaleString()}`} hint={`Net £${KPI.weekRevenueNet.toLocaleString()} + VAT`}/>
        <KpiCard icon="x-circle" label="No-shows" value={KPI.noShowsThisWeek} tone="danger" hint="Both inside 24h window"/>
        <KpiCard icon="award" label="Booking conversion" value={`${Math.round(KPI.conversion * 100)}%`} delta="3pp" deltaDir="up" hint="Visit → completed"/>
      </div>

      <section className="panel">
        <header className="panel-head panel-head-stack">
          <div className="row items-center gap-3 flex-1">
            <h2 className="panel-title">All bookings</h2>
            <span className="pill pill-muted">{filtered.length} of {BOOKINGS.length}</span>
          </div>
          <div className="panel-actions">
            <button className="btn btn-ghost" onClick={() => Actions.exportBookings()}>
              <Icon name="download" size={14}/> Export CSV
            </button>
            <button className="btn btn-navy" onClick={() => setNewOpen(true)}>
              <Icon name="plus" size={14}/> Manual booking
            </button>
          </div>
        </header>
        <div className="filter-bar" style={{ flexWrap: "wrap", rowGap: 8 }}>
          <div className="filter-search" style={{ flex: "1 1 240px", minWidth: 220 }}>
            <Icon name="search" size={15}/>
            <input
              className="filter-search-input"
              placeholder="Search client, email, phone, ref, lender…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-chip" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} title="Booking status">
            <option value="all">Status · All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="closed">Closed</option>
            <option value="no-show">No-show</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="filter-chip" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)} title="Service">
            <option value="all">Service · All</option>
            {SERVICES.map(s => <option key={s.id} value={s.id}>{s.short}</option>)}
          </select>
          <select className="filter-chip" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value)} title="Payment">
            <option value="all">Payment · All</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
          </select>
          {/* Admin-only filters that don't make sense for the lawyer's own bookings */}
          {!lawyerId && (
            <select className="filter-chip" value={lawyerFilter} onChange={(e) => setLawyerFilter(e.target.value)} title="Lawyer">
              <option value="all">Lawyer · All</option>
              {(LAWYERS || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}
          {lenderOpts.length > 0 && (
            <select className="filter-chip" value={lenderFilter} onChange={(e) => setLenderFilter(e.target.value)} title="Lender">
              <option value="all">Lender · All ({lenderOpts.length})</option>
              {lenderOpts.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          )}
          {monthOpts.length > 0 && (
            <select className="filter-chip" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} title="Month of call">
              <option value="all">Month · All</option>
              {monthOpts.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          )}
          <select className="filter-chip" value={dispatchFilter} onChange={(e) => setDispatchFilter(e.target.value)} title="Wet flow stage">
            <option value="all">Wet stage · All</option>
            <option value="awaiting_signature">Awaiting client's pack</option>
            <option value="signed">In our office</option>
            <option value="ready_to_post">Ready to post</option>
            <option value="posted">Posted</option>
            <option value="delivered">Delivered</option>
          </select>
          <select className="filter-chip" value={readyToCloseFilter} onChange={(e) => setReadyToCloseFilter(e.target.value)} title="Ready to close flag">
            <option value="all">Closure · All</option>
            <option value="yes">Flagged for closure</option>
            <option value="no">Not flagged</option>
          </select>
          <select className="filter-chip" value={source} onChange={(e) => setSource(e.target.value)} title="Booking source">
            <option value="all">Source · All</option>
            <option value="fast-ila.co.uk">fast-ila.co.uk</option>
            <option value="fast-ila.com">fast-ila.com</option>
            <option value="internal">Manual (admin)</option>
          </select>
          {hasActiveFilters && (
            <button className="btn btn-ghost btn-sm" onClick={clearAllFilters} title="Reset every filter" style={{ marginLeft: "auto" }}>
              <Icon name="x" size={11}/> Clear filters
            </button>
          )}
        </div>

        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Client</th>
                <th>Service</th>
                <th>Lawyer</th>
                <th>Date</th>
                <th>Time</th>
                <th>Amount</th>
                <th>Done</th>
                <th>Payment</th>
                <th>Source</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => {
                const svc = SERVICES.find(s => s.id === b.serviceId);
                const lawyer = LAWYERS.find(l => l.id === b.lawyerId);
                const isDone = completed.has(b.ref);
                return (
                  <tr key={b.ref} className={`dash-row dash-row-clickable ${isDone ? "row-done" : ""}`} onClick={() => onOpenDetail(b.ref)}>
                    <td>
                      <div className="cell-stack">
                        <div className="cell-strong cell-link">{b.clientName}</div>
                        <div className="cell-sub">{b.clientEmail}</div>
                      </div>
                    </td>
                    <td>
                      <span className="pill pill-cream">{svc?.short || b.serviceId || "—"}</span>
                    </td>
                    <td>
                      {lawyer ? (
                        <div className="row items-center gap-2">
                          <Avatar lawyer={lawyer} size={22}/>
                          <span>{lawyer.name.split(" ")[0]}</span>
                        </div>
                      ) : (
                        <span className="cell-sub">Unassigned</span>
                      )}
                    </td>
                    <td className="cell-mono">{b.date ? fmtDateShort(new Date(...b.date.split("-").map((n, i) => i === 1 ? +n - 1 : +n))) : "—"}</td>
                    <td className="cell-mono">{b.time}</td>
                    <td><strong>£{b.amount}</strong></td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`day-done-tick ${isDone ? "is-on" : ""}`}
                        onClick={(e) => toggleDone(b.ref, e)}
                        title={isDone ? "Mark not done" : "Mark complete"}
                        role="button"
                      >
                        <Icon name="check" size={13} stroke={3}/>
                      </span>
                    </td>
                    <td><StatusPill status={b.payment}/></td>
                    <td className="cell-mono cell-sub">{b.source}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button className="cell-action" onClick={() => onOpenDetail(b.ref)} aria-label="Open booking">
                        <Icon name="chevron-right" size={16}/>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="dash-table-foot">
          <span>Showing {filtered.length} of {BOOKINGS.length}</span>
          <div className="row gap-2">
            <button className="btn btn-ghost btn-sm" disabled>‹ Prev</button>
            <button className="btn btn-ghost btn-sm">Next ›</button>
          </div>
        </div>
      </section>
      <NewBookingModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={(ref) => { onOpenDetail && onOpenDetail(ref); }}
        defaultLawyerId={lawyerId || null}
      />
    </div>
  );
};

// ============================================================================
// SettingsView — admin manages users, firm profile, demo data
// ============================================================================
const SettingsView = ({ onSignOut }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const users = FastILA.users.list();
  const firm = FastILA.firm.get();
  const [firmForm, setFirmForm] = React.useState(firm);
  React.useEffect(() => { setFirmForm(FastILA.firm.get()); }, [users.length]);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [clearConfirm, setClearConfirm] = React.useState(false);
  const [factoryConfirm, setFactoryConfirm] = React.useState(false);

  const saveFirm = () => {
    FastILA.firm.update(firmForm);
    fiToast("Firm profile saved");
  };

  return (
    <div className="dash-grid">
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2 className="panel-title">Team & access</h2>
            <p className="panel-sub">Everyone who can sign in to this console. Lawyers see only their own bookings; admins see everything.</p>
          </div>
          <button className="btn btn-navy" onClick={() => setInviteOpen(true)}>
            <Icon name="plus" size={14}/> Invite member
          </button>
        </header>

        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Linked lawyer</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: "32px 12px", textAlign: "center", color: "#5b6b76" }}>
                  No team members yet. Click <strong>Invite member</strong> to add yourself.
                </td></tr>
              ) : users.map(u => {
                const lawyer = LAWYERS.find(l => l.id === u.lawyerId);
                return (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong></td>
                    <td className="cell-mono">{u.email}</td>
                    <td>
                      <span className={`pill ${u.role === "admin" ? "pill-navy" : "pill-info"}`}>{u.role}</span>
                    </td>
                    <td>{lawyer ? lawyer.name : <span className="cell-sub">—</span>}</td>
                    <td>
                      <span className={`pill ${u.active === false ? "pill-muted" : "pill-success"}`}>
                        {u.active === false ? "Inactive" : "Active"}
                      </span>
                    </td>
                    <td>
                      <div className="row gap-1">
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                          FastILA.users.update(u.id, { active: !(u.active !== false) });
                          fiToast(`${u.fullName} ${u.active === false ? "activated" : "deactivated"}`);
                        }}>
                          {u.active === false ? "Activate" : "Deactivate"}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => {
                          if (confirm(`Remove ${u.fullName} (${u.email})? They will lose access immediately.`)) {
                            FastILA.users.remove(u.id);
                            fiToast(`${u.fullName} removed`);
                          }
                        }}><Icon name="trash" size={12}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Firm profile</h2>
          <p className="panel-sub">Shown on the client care letter, footer, and confirmation emails.</p>
        </header>
        <div className="fi-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: 16 }}>
          <div>
            <label className="field-label">Legal entity</label>
            <input className="field-input" value={firmForm.firm || ""} onChange={(e) => setFirmForm(f => ({ ...f, firm: e.target.value }))}/>
          </div>
          <div>
            <label className="field-label">Trading as</label>
            <input className="field-input" value={firmForm.tradingAs || ""} onChange={(e) => setFirmForm(f => ({ ...f, tradingAs: e.target.value }))}/>
          </div>
          <div>
            <label className="field-label">Domain</label>
            <input className="field-input" value={firmForm.domain || ""} onChange={(e) => setFirmForm(f => ({ ...f, domain: e.target.value }))}/>
          </div>
          <div>
            <label className="field-label">Support email</label>
            <input className="field-input" type="email" value={firmForm.supportEmail || ""} onChange={(e) => setFirmForm(f => ({ ...f, supportEmail: e.target.value }))}/>
          </div>
          <div>
            <label className="field-label">SRA number</label>
            <input className="field-input" value={firmForm.sraNumber || ""} onChange={(e) => setFirmForm(f => ({ ...f, sraNumber: e.target.value }))}/>
          </div>
          <div>
            <label className="field-label">Company number</label>
            <input className="field-input" value={firmForm.companyNumber || ""} onChange={(e) => setFirmForm(f => ({ ...f, companyNumber: e.target.value }))}/>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="field-label">VAT</label>
            <input className="field-input" value={firmForm.vat || ""} onChange={(e) => setFirmForm(f => ({ ...f, vat: e.target.value }))}/>
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-navy" onClick={saveFirm}>
              <Icon name="check" size={14}/> Save firm profile
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Data</h2>
          <p className="panel-sub">Demo data lives in localStorage. Clearing it removes the seeded bookings and lawyers; your real bookings (created via the form) are kept.</p>
        </header>
        <div style={{ padding: "8px 16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "#f7f5ee", borderRadius: 10 }}>
            <div>
              <strong>Clear demo bookings & lawyers</strong>
              <div style={{ fontSize: 13, color: "#5b6b76", marginTop: 4 }}>Removes the demo seed only. Keeps users you've invited and any bookings created via the form.</div>
            </div>
            <button className="btn btn-ghost" onClick={() => setClearConfirm(true)}>
              <Icon name="trash" size={14}/> Clear demo data
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "#fff1f1", borderRadius: 10, border: "1px solid #f3c2c2" }}>
            <div>
              <strong style={{ color: "#9a1c1c" }}>Factory reset</strong>
              <div style={{ fontSize: 13, color: "#5b6b76", marginTop: 4 }}>Wipes everything — users, bookings, firm profile, prompts. You'll go back to the first-run setup.</div>
            </div>
            <button className="btn btn-ghost" onClick={() => setFactoryConfirm(true)} style={{ color: "#9a1c1c" }}>
              <Icon name="trash" size={14}/> Factory reset
            </button>
          </div>
        </div>
      </section>

      <InviteUserModal open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={() => fiToast("Member invited")}/>
      <ConfirmModal
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        title="Clear demo data?"
        body={<p>Removes all 12 seeded bookings + 4 demo lawyers. Real bookings (created via the form) are kept. Continue?</p>}
        confirmLabel="Clear demo data"
        danger
        onConfirm={() => { FastILA.admin.clearDemoData(); fiToast("Demo data cleared"); }}
      />
      <ConfirmModal
        open={factoryConfirm}
        onClose={() => setFactoryConfirm(false)}
        title="Factory reset?"
        body={<p>This wipes <strong>everything</strong> — every booking, user, signature, prompt, template override. You will be returned to the first-run wizard. This cannot be undone.</p>}
        confirmLabel="Yes, wipe everything"
        danger
        onConfirm={() => { FastILA.admin.factoryReset(); }}
      />
    </div>
  );
};

Object.assign(window, { DashSidebar, DashTopbar, KpiCard, TodayView, BookingsView, SettingsView });

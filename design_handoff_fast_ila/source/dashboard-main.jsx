/* global React, Icon, Avatar, StatusPill, SERVICES, LAWYERS, BOOKINGS, KPI, TODAY, fmtDateLong, fmtDateShort, ymd */

// ============================================================================
// Dashboard sidebar + topbar
// ============================================================================
const DashSidebar = ({ role, view, setView, setRole }) => {
  const lawyerNav = [
    { id: "today", label: "Today", icon: "calendar" },
    { id: "upcoming", label: "Upcoming", icon: "clock" },
    { id: "bookings", label: "My bookings", icon: "doc" },
    { id: "signatures", label: "My signatures", icon: "edit" },
    { id: "lenders", label: "Lender guide", icon: "award" },
    { id: "profile", label: "My profile", icon: "user" },
  ];
  const adminNav = [
    { id: "today", label: "Today", icon: "calendar" },
    { id: "bookings", label: "All bookings", icon: "doc" },
    { id: "detail", label: "Booking detail", icon: "sparkle" },
    { id: "royalmail", label: "Royal Mail queue", icon: "stamp" },
    { id: "lawyers", label: "Lawyers", icon: "users" },
    { id: "templates", label: "Templates", icon: "package" },
    { id: "lenders", label: "Lender guide", icon: "award" },
    { id: "brokers", label: "Brokers", icon: "users" },
    { id: "prompts", label: "AI prompts", icon: "sparkle" },
    { id: "integrations", label: "Integrations", icon: "settings" },
    { id: "reports", label: "Reports & revenue", icon: "pound" },
  ];
  const nav = role === "admin" ? adminNav : lawyerNav;

  return (
    <aside className="dash-side">
      <div className="dash-side-top">
        <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
          <span className="b-fast">fast</span>
          <span className="b-ila">ila<span className="b-mark"/></span>
        </a>
        <div className="dash-side-eyebrow">Internal Console</div>
      </div>

      <div className="dash-role-switch-wrap">
        <div className="dash-role-switch-label">
          <Icon name="info" size={10}/> Demo: view-as
        </div>
        <div className="dash-role-switch">
          <button
            className={`dash-role ${role === "lawyer" ? "is-active" : ""}`}
            onClick={() => setRole("lawyer")}
          >
            <Icon name="user" size={14}/> Lawyer
          </button>
          <button
            className={`dash-role ${role === "admin" ? "is-active" : ""}`}
            onClick={() => setRole("admin")}
          >
            <Icon name="shield" size={14}/> Admin
          </button>
        </div>
        <div className="dash-side-foot-note">In production, each lawyer logs in to their own account and sees only their data.</div>
      </div>

      <nav className="dash-nav">
        {nav.map(n => (
          <button
            key={n.id}
            className={`dash-nav-item ${view === n.id ? "is-active" : ""}`}
            onClick={() => setView(n.id)}
          >
            <Icon name={n.icon} size={17}/>
            <span>{n.label}</span>
            {n.id === "royalmail" && role === "admin" && <span className="dash-nav-count">6</span>}
            {n.id === "bookings" && role === "admin" && <span className="dash-nav-count">14</span>}
          </button>
        ))}
      </nav>

      <div className="dash-side-foot">
        <div className="dash-side-prof">
          <Avatar lawyer={role === "admin"
            ? { initials: "GO", photoBg: "#063952" }
            : LAWYERS[0]} size={36}/>
          <div>
            <div className="dash-side-name">{role === "admin" ? "Go Legal Ops" : LAWYERS[0].name}</div>
            <div className="dash-side-role">{role === "admin" ? "Super admin" : "Senior solicitor"}</div>
          </div>
        </div>
        <button className="dash-side-logout" aria-label="Logout">
          <Icon name="logout" size={16}/>
        </button>
      </div>
    </aside>
  );
};

const DashTopbar = ({ title, subtitle, actions, onSearchClick }) => (
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
      <button className="dash-icon-btn dash-icon-btn-dot" aria-label="Notifications"><Icon name="bell" size={16}/></button>
    </div>
  </header>
);

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
  const todayKey = ymd(TODAY);
  const lawyerId = "amelia";
  const todays = role === "admin"
    ? BOOKINGS.filter(b => b.date === todayKey)
    : BOOKINGS.filter(b => b.date === todayKey && b.lawyerId === lawyerId);

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

  const sorted = [...todays].sort((a, b) => a.time.localeCompare(b.time));

  // Build hour rail
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        {role === "admin" ? (
          <>
            <KpiCard icon="calendar" label="Today’s bookings" value={sorted.length}
              delta="2 vs yesterday" deltaDir="up" hint="Across 4 lawyers"/>
            <KpiCard icon="pound" label="Today’s revenue (gross)" value={`£${sorted.reduce((s,b)=>s+b.amount,0)}`}
              hint={`Net £${(sorted.reduce((s,b)=>s+b.amount,0) / 1.2).toFixed(2)} + VAT`}/>
            <KpiCard icon="warning" label="Payments pending" value="3" tone="warning"
              hint="Awaiting client care letter response"/>
            <KpiCard icon="stamp" label="Wet-sig in transit" value="4" tone="info"
              hint="Awaiting docs / ready to post"/>
          </>
        ) : (
          <>
            <KpiCard icon="calendar" label="Calls today" value={sorted.length} hint="You’ve done 1 so far"/>
            <KpiCard icon="sparkle" label="Pre-call briefs ready" value="2" tone="info" hint="AI generated, awaiting review"/>
            <KpiCard icon="doc" label="Certificates to issue" value="3" tone="warning" hint="Post-call, draft ready"/>
            <KpiCard icon="stamp" label="Your wet-sig items" value="2" hint="1 to sign, 1 to post on"/>
          </>
        )}
      </div>

      <div className="dash-grid-row two-col">
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2 className="panel-title">Schedule · {fmtDateLong(TODAY)}</h2>
              <p className="panel-sub">{role === "admin" ? "All lawyers" : "Amelia Hart"} · Europe/London</p>
            </div>
            <div className="panel-actions">
              <button className="btn btn-ghost"><Icon name="filter" size={14}/> Filter</button>
              {role === "admin" && <button className="btn btn-navy"><Icon name="plus" size={14}/> New booking</button>}
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
                            <div className="day-card-dur">{svc.duration}m</div>
                          </div>
                          <div className="day-card-c">
                            <div className="day-card-name">{b.clientName}</div>
                            <div className="day-card-meta">
                              <span className="pill pill-cream">{svc.short}</span>
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
          <div className="action-list">
            {role === "lawyer" ? (
              <>
                <div className="action-item">
                  <div className="action-mark action-mark-info"><Icon name="sparkle" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">Review pre-call brief — Hannah Okonkwo, 15:00</div>
                    <div className="action-sub">3 documents · brief generated · 5 min read</div>
                  </div>
                  <button className="btn btn-navy">Open brief</button>
                </div>
                <div className="action-item">
                  <div className="action-mark action-mark-warning"><Icon name="doc" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">Issue ILA certificate — Mehta couples</div>
                    <div className="action-sub">Call completed 10:30 · advice given · draft cert ready</div>
                  </div>
                  <button className="btn btn-lime">Issue</button>
                </div>
                <div className="action-item">
                  <div className="action-mark action-mark-info"><Icon name="stamp" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">Sign incoming pack — Élodie Bernard</div>
                    <div className="action-sub">Client docs arrived 09:42 · then post to Aldermore</div>
                  </div>
                  <button className="btn btn-ghost">Open</button>
                </div>
                <div className="action-item">
                  <div className="action-mark action-mark-success"><Icon name="check" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">15-minute prep — Hannah Okonkwo, 15:00</div>
                    <div className="action-sub">Urgent ILA · personal guarantee for SME bridging</div>
                  </div>
                  <span className="pill pill-success">Soon</span>
                </div>
              </>
            ) : (
              <>
                <div className="action-item">
                  <div className="action-mark action-mark-warning"><Icon name="card" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">3 payments outstanding</div>
                    <div className="action-sub">Client care letters sent · chase if unpaid 24h before call</div>
                  </div>
                  <button className="btn btn-navy">Open list</button>
                </div>
                <div className="action-item">
                  <div className="action-mark action-mark-info"><Icon name="stamp" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">2 wet-sig packs arrived — distribute to lawyers</div>
                    <div className="action-sub">Received this morning · Bernard, Hassan</div>
                  </div>
                  <button className="btn btn-ghost">Open queue</button>
                </div>
                <div className="action-item">
                  <div className="action-mark action-mark-info"><Icon name="send" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">1 wet-sig pack to post out today</div>
                    <div className="action-sub">Marcus Whitley → Precise Mortgages · Special Delivery</div>
                  </div>
                  <button className="btn btn-lime">Enter tracking</button>
                </div>
                <div className="action-item">
                  <div className="action-mark action-mark-success"><Icon name="award" size={16}/></div>
                  <div className="flex-1">
                    <div className="action-title">Weekly revenue tracking on target</div>
                    <div className="action-sub">£12,830 gross · 12% above last week · see Reports</div>
                  </div>
                  <span className="pill pill-success">+12%</span>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

// ============================================================================
// View — Bookings list (admin)
// ============================================================================
const BookingsView = ({ onOpenDetail, lawyerId, role }) => {
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [serviceFilter, setServiceFilter] = React.useState("all");
  const [source, setSource] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const baseBookings = lawyerId ? BOOKINGS.filter(b => b.lawyerId === lawyerId) : BOOKINGS;
  const [completed, setCompleted] = React.useState(() => new Set(
    baseBookings.filter(b => b.status === "completed").map(b => b.ref)
  ));
  const toggleDone = (ref, e) => {
    e.stopPropagation();
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(ref)) next.delete(ref); else next.add(ref);
      return next;
    });
  };

  const filtered = baseBookings.filter(b => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (serviceFilter !== "all" && b.serviceId !== serviceFilter) return false;
    if (source !== "all" && b.source !== source) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.clientName.toLowerCase().includes(q) &&
          !(b.clientEmail || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

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
            <button className="btn btn-ghost"><Icon name="download" size={14}/> Export CSV</button>
            <button className="btn btn-navy"><Icon name="plus" size={14}/> Manual booking</button>
          </div>
        </header>
        <div className="filter-bar">
          <div className="filter-search">
            <Icon name="search" size={15}/>
            <input
              className="filter-search-input"
              placeholder="Search by client name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select className="filter-chip" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Status · All</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="no-show">No-show</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="filter-chip" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
            <option value="all">Service · All</option>
            {SERVICES.map(s => <option key={s.id} value={s.id}>{s.short}</option>)}
          </select>
          <select className="filter-chip" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">Source · All</option>
            <option value="fast-ila.co.uk">fast-ila.co.uk</option>
            <option value="fast-ila.com">fast-ila.com</option>
          </select>
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
                      <span className="pill pill-cream">{svc.short}</span>
                    </td>
                    <td>
                      <div className="row items-center gap-2">
                        <Avatar lawyer={lawyer} size={22}/>
                        <span>{lawyer.name.split(" ")[0]}</span>
                      </div>
                    </td>
                    <td className="cell-mono">{fmtDateShort(new Date(...b.date.split("-").map((n, i) => i === 1 ? +n - 1 : +n)))}</td>
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
    </div>
  );
};

Object.assign(window, { DashSidebar, DashTopbar, KpiCard, TodayView, BookingsView });

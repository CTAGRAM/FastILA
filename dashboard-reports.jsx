/* global React, Icon, Avatar, KpiCard, StatusPill, LAWYERS, BOOKINGS, SERVICES, MONTHLY_REVENUE, LAWYER_REVENUE_THIS_MONTH */

// ============================================================================
// Reports view — admin only.
// Monthly revenue chart, per-lawyer breakdown, client list per month.
// ============================================================================

const ReportsView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  // Derive monthly series from real BOOKINGS, falling back to whatever was
  // seeded in MONTHLY_REVENUE (empty by default).
  const liveMonthly = React.useMemo(() => {
    const map = new Map();
    for (const b of (window.BOOKINGS || [])) {
      if (!b.date) continue;
      const m = b.date.slice(0, 7); // yyyy-mm
      const cur = map.get(m) || { gross: 0, net: 0, bookings: 0 };
      cur.gross += Number(b.amount || 0);
      cur.bookings += 1;
      map.set(m, cur);
    }
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return Array.from(map.entries()).sort().map(([k, v]) => {
      const [y, mm] = k.split("-");
      return { month: `${months[+mm - 1]} ${y}`, gross: v.gross, net: +(v.gross / 1.2).toFixed(2), bookings: v.bookings };
    });
  }, [(window.BOOKINGS || []).length]);

  const series = (MONTHLY_REVENUE && MONTHLY_REVENUE.length) ? MONTHLY_REVENUE : liveMonthly;
  const [month, setMonth] = React.useState(series.length ? series[series.length - 1].month : "");
  const [view, setView] = React.useState("monthly"); // monthly | lawyers | clients

  // Empty state — no data yet
  if (series.length === 0) {
    return (
      <div className="dash-grid">
        <section className="panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ marginBottom: 12, color: "#5b6b76" }}><Icon name="pound" size={36}/></div>
          <h2 className="panel-title">No revenue yet</h2>
          <p className="panel-sub" style={{ maxWidth: 460, margin: "8px auto 16px" }}>
            Reports populate automatically once you have bookings. Create a booking via the public form or <strong>+ New booking</strong>.
          </p>
        </section>
      </div>
    );
  }

  const maxRevenue = Math.max(...series.map(m => m.gross), 1);
  const total = series.reduce((s, m) => s + m.gross, 0);
  const avgMonth = total / series.length;
  const latest = series[series.length - 1];
  const previous = series[series.length - 2] || { gross: 0 };
  const monthOverMonth = previous.gross > 0
    ? ((latest.gross - previous.gross) / previous.gross * 100).toFixed(1)
    : "—";

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        <KpiCard icon="pound" label={`${latest.month} revenue (gross)`}
          value={`£${latest.gross.toLocaleString()}`}
          delta={`${monthOverMonth}%`} deltaDir={monthOverMonth > 0 ? "up" : "down"}
          hint={`Net £${latest.net.toLocaleString()} + VAT`}/>
        <KpiCard icon="calendar" label={`${latest.month} bookings`} value={latest.bookings}
          hint={latest.bookings ? `Avg £${(latest.gross / latest.bookings).toFixed(0)} per booking` : "No bookings yet"}/>
        <KpiCard icon="award" label="6-month avg / month" value={`£${Math.round(avgMonth).toLocaleString()}`}
          hint={`Trending up over period`}/>
        <KpiCard icon="users" label="Active lawyers" value={LAWYERS.length}
          hint={LAWYERS.length ? `${Math.round(latest.bookings / LAWYERS.length)} avg bookings each` : "Add lawyers in Lawyers view"}/>
      </div>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2 className="panel-title">Monthly revenue</h2>
            <p className="panel-sub">Gross income · last 6 months · VAT-inclusive (gross figure as charged)</p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-ghost" onClick={() => Actions.exportRevenue()}>
              <Icon name="download" size={14}/> Export CSV
            </button>
          </div>
        </header>

        <div className="rev-chart">
          {series.map((m, i) => {
            const pct = (m.gross / maxRevenue) * 100;
            const isLatest = i === series.length - 1;
            return (
              <button
                key={m.month}
                className={`rev-bar ${isLatest ? "is-latest" : ""} ${month === m.month ? "is-active" : ""}`}
                onClick={() => setMonth(m.month)}
                title={`${m.month}: £${m.gross.toLocaleString()}`}
              >
                <div className="rev-bar-amt">£{(m.gross / 1000).toFixed(1)}k</div>
                <div className="rev-bar-track">
                  <div className="rev-bar-fill" style={{ height: `${pct}%` }}/>
                </div>
                <div className="rev-bar-month">{m.month.split(" ")[0]}</div>
                <div className="rev-bar-bookings">{m.bookings} bk</div>
              </button>
            );
          })}
        </div>

        <div className="rev-tabs">
          <button
            className={`rev-tab ${view === "monthly" ? "is-active" : ""}`}
            onClick={() => setView("monthly")}
          >
            <Icon name="calendar" size={14}/> By month
          </button>
          <button
            className={`rev-tab ${view === "lawyers" ? "is-active" : ""}`}
            onClick={() => setView("lawyers")}
          >
            <Icon name="users" size={14}/> By lawyer
          </button>
          <button
            className={`rev-tab ${view === "clients" ? "is-active" : ""}`}
            onClick={() => setView("clients")}
          >
            <Icon name="user" size={14}/> Clients in {month}
          </button>
        </div>

        {view === "monthly" && (
          <div className="table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Bookings</th>
                  <th>Gross</th>
                  <th>Net (back-calc)</th>
                  <th>VAT</th>
                  <th>Avg / booking</th>
                </tr>
              </thead>
              <tbody>
                {[...series].reverse().map(m => (
                  <tr key={m.month} className={`dash-row ${m.month === latest.month ? "row-emph" : ""}`}>
                    <td><strong>{m.month}</strong>{m.month === latest.month && <span className="pill pill-success" style={{ marginLeft: 8 }}>This month</span>}</td>
                    <td className="cell-mono">{m.bookings}</td>
                    <td><strong>£{m.gross.toLocaleString()}</strong></td>
                    <td className="cell-mono">£{m.net.toLocaleString()}</td>
                    <td className="cell-mono">£{(m.gross - m.net).toLocaleString()}</td>
                    <td className="cell-mono">£{m.bookings ? (m.gross / m.bookings).toFixed(0) : 0}</td>
                  </tr>
                ))}
                <tr className="dash-row row-total">
                  <td><strong>Total · {series.length} month{series.length === 1 ? "" : "s"}</strong></td>
                  <td className="cell-mono">{series.reduce((s, m) => s + m.bookings, 0)}</td>
                  <td><strong>£{total.toLocaleString()}</strong></td>
                  <td className="cell-mono">£{series.reduce((s, m) => s + m.net, 0).toLocaleString()}</td>
                  <td className="cell-mono">£{(total - series.reduce((s, m) => s + m.net, 0)).toLocaleString()}</td>
                  <td className="cell-mono">£{series.reduce((s,m)=>s+m.bookings,0) ? (total / series.reduce((s, m) => s + m.bookings, 0)).toFixed(0) : 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {view === "lawyers" && (
          <div className="table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Lawyer</th>
                  <th>Bookings · {latest.month}</th>
                  <th>Gross</th>
                  <th>Net</th>
                  <th>Avg rating</th>
                  <th>Share</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Derive per-lawyer figures from real BOOKINGS in the latest month
                  const liveLawyerRows = (window.LAWYERS || []).map(lw => {
                    const monthRows = (window.BOOKINGS || []).filter(b => {
                      if (!b.date || b.lawyerId !== lw.id) return false;
                      const m = b.date.slice(0, 7);
                      // Compare to latest month label
                      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                      const [y, mm] = m.split("-");
                      return `${months[+mm - 1]} ${y}` === latest.month;
                    });
                    const gross = monthRows.reduce((s, b) => s + (b.amount || 0), 0);
                    return { lawyerId: lw.id, bookings: monthRows.length, gross, net: +(gross / 1.2).toFixed(2), avgRating: lw.rating || "—" };
                  });
                  const rows = (LAWYER_REVENUE_THIS_MONTH && LAWYER_REVENUE_THIS_MONTH.length) ? LAWYER_REVENUE_THIS_MONTH : liveLawyerRows;
                  if (rows.length === 0) {
                    return (
                      <tr><td colSpan={6} style={{ padding: "24px 12px", textAlign: "center", color: "#5b6b76" }}>
                        No lawyers yet — add them in <strong>Lawyers</strong>.
                      </td></tr>
                    );
                  }
                  return rows.map(row => {
                    const l = LAWYERS.find(x => x.id === row.lawyerId);
                    if (!l) return null;
                    const sharePct = latest.gross > 0 ? (row.gross / latest.gross) * 100 : 0;
                    return (
                      <tr key={row.lawyerId} className="dash-row">
                        <td>
                          <div className="row items-center gap-3">
                            <Avatar lawyer={l} size={32}/>
                            <div>
                              <div className="cell-strong">{l.name}</div>
                              <div className="cell-sub">{l.sra}</div>
                            </div>
                          </div>
                        </td>
                        <td className="cell-mono">{row.bookings}</td>
                        <td><strong>£{row.gross.toLocaleString()}</strong></td>
                        <td className="cell-mono">£{row.net.toLocaleString()}</td>
                        <td>
                          <span className="rating">
                            <Icon name="star" size={12}/> {row.avgRating}
                          </span>
                        </td>
                        <td>
                          <div className="rev-share">
                            <div className="rev-share-bar"><div className="rev-share-fill" style={{ width: `${sharePct}%` }}/></div>
                            <span className="rev-share-pct">{sharePct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        )}

        {view === "clients" && (
          <div className="table-wrap">
            <div className="month-selector-bar">
              <span className="cell-sub">Showing clients for</span>
              <select className="filter-chip" value={month} onChange={(e) => setMonth(e.target.value)}>
                {series.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}
              </select>
              <span className="cell-sub">·</span>
              <span className="pill pill-muted">{BOOKINGS.length} clients</span>
            </div>
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Lawyer</th>
                  <th>Date</th>
                  <th>Gross</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {BOOKINGS.map(b => {
                  const svc = SERVICES.find(s => s.id === b.serviceId);
                  const lawyer = LAWYERS.find(l => l.id === b.lawyerId);
                  return (
                    <tr key={b.ref} className="dash-row">
                      <td>
                        <div className="cell-stack">
                          <div className="cell-strong">{b.clientName}</div>
                          <div className="cell-sub">{b.clientEmail}</div>
                        </div>
                      </td>
                      <td><span className="pill pill-cream">{svc.short}</span></td>
                      <td>
                        <div className="row items-center gap-2">
                          <Avatar lawyer={lawyer} size={20}/>
                          <span>{lawyer.name.split(" ")[0]}</span>
                        </div>
                      </td>
                      <td className="cell-mono">{b.date}</td>
                      <td><strong>£{b.amount}</strong></td>
                      <td><StatusPill status={b.payment}/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="dash-grid-row two-col">
        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Service mix · {latest.month}</h2>
            <p className="panel-sub">Revenue contribution by service line</p>
          </header>
          <div className="mix-list">
            {SERVICES.map((s, i) => {
              const bks = Math.round(latest.bookings * [0.15, 0.55, 0.15, 0.15][i]);
              const rev = bks * s.price;
              const pct = (rev / latest.gross) * 100;
              return (
                <div key={s.id} className="mix-row">
                  <div className="mix-row-head">
                    <span className="mix-name">{s.short}</span>
                    <span className="mix-amt">£{rev.toLocaleString()} <span className="cell-sub">· {bks} bookings</span></span>
                  </div>
                  <div className="mix-bar">
                    <div className={`mix-fill mix-fill-${s.id}`} style={{ width: `${pct}%` }}/>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="panel">
          <header className="panel-head">
            <h2 className="panel-title">Operational health · {latest.month}</h2>
          </header>
          <div className="ops-grid">
            <OpRow label="No-shows" value="2.4%" sub="2 of 84 · target ≤ 3%" tone="success"/>
            <OpRow label="Cancellations" value="6.0%" sub="5 of 84 · within window" tone="muted"/>
            <OpRow label="Avg certificate turnaround" value="18h" sub="From call end to PDF issued" tone="success"/>
            <OpRow label="Payments overdue" value="3" sub="Bookings 24h away" tone="warning"/>
            <OpRow label="Wet-sig delivery rate" value="100%" sub="14 of 14 delivered" tone="success"/>
            <OpRow label="Conversion · visit → booking" value="41%" sub="Up 3pp on Apr" tone="success"/>
          </div>
        </section>
      </div>
    </div>
  );
};

const OpRow = ({ label, value, sub, tone }) => (
  <div className={`op-row op-row-${tone}`}>
    <div className="op-row-label">{label}</div>
    <div className="op-row-value">{value}</div>
    <div className="op-row-sub">{sub}</div>
  </div>
);

Object.assign(window, { ReportsView });

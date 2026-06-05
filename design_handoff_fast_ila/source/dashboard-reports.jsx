/* global React, Icon, Avatar, KpiCard, StatusPill, LAWYERS, BOOKINGS, SERVICES, MONTHLY_REVENUE, LAWYER_REVENUE_THIS_MONTH */

// ============================================================================
// Reports view — admin only.
// Monthly revenue chart, per-lawyer breakdown, client list per month.
// ============================================================================

const ReportsView = () => {
  const [month, setMonth] = React.useState("May 2026");
  const [view, setView] = React.useState("monthly"); // monthly | lawyers | clients

  const maxRevenue = Math.max(...MONTHLY_REVENUE.map(m => m.gross));
  const total = MONTHLY_REVENUE.reduce((s, m) => s + m.gross, 0);
  const avgMonth = total / MONTHLY_REVENUE.length;
  const latest = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 1];
  const previous = MONTHLY_REVENUE[MONTHLY_REVENUE.length - 2];
  const monthOverMonth = ((latest.gross - previous.gross) / previous.gross * 100).toFixed(1);

  return (
    <div className="dash-grid">
      <div className="dash-grid-row kpi-row">
        <KpiCard icon="pound" label={`${latest.month} revenue (gross)`}
          value={`£${latest.gross.toLocaleString()}`}
          delta={`${monthOverMonth}%`} deltaDir={monthOverMonth > 0 ? "up" : "down"}
          hint={`Net £${latest.net.toLocaleString()} + VAT`}/>
        <KpiCard icon="calendar" label={`${latest.month} bookings`} value={latest.bookings}
          hint={`Avg £${(latest.gross / latest.bookings).toFixed(0)} per booking`}/>
        <KpiCard icon="award" label="6-month avg / month" value={`£${Math.round(avgMonth).toLocaleString()}`}
          hint={`Trending up over period`}/>
        <KpiCard icon="users" label="Active lawyers" value={LAWYERS.length}
          hint={`${Math.round(latest.bookings / LAWYERS.length)} avg bookings each`}/>
      </div>

      <section className="panel">
        <header className="panel-head">
          <div>
            <h2 className="panel-title">Monthly revenue</h2>
            <p className="panel-sub">Gross income · last 6 months · VAT-inclusive (gross figure as charged)</p>
          </div>
          <div className="panel-actions">
            <button className="btn btn-ghost"><Icon name="download" size={14}/> Export CSV</button>
          </div>
        </header>

        <div className="rev-chart">
          {MONTHLY_REVENUE.map((m, i) => {
            const pct = (m.gross / maxRevenue) * 100;
            const isLatest = i === MONTHLY_REVENUE.length - 1;
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
                {[...MONTHLY_REVENUE].reverse().map(m => (
                  <tr key={m.month} className={`dash-row ${m.month === latest.month ? "row-emph" : ""}`}>
                    <td><strong>{m.month}</strong>{m.month === latest.month && <span className="pill pill-success" style={{ marginLeft: 8 }}>This month</span>}</td>
                    <td className="cell-mono">{m.bookings}</td>
                    <td><strong>£{m.gross.toLocaleString()}</strong></td>
                    <td className="cell-mono">£{m.net.toLocaleString()}</td>
                    <td className="cell-mono">£{(m.gross - m.net).toLocaleString()}</td>
                    <td className="cell-mono">£{(m.gross / m.bookings).toFixed(0)}</td>
                  </tr>
                ))}
                <tr className="dash-row row-total">
                  <td><strong>Total · 6 months</strong></td>
                  <td className="cell-mono">{MONTHLY_REVENUE.reduce((s, m) => s + m.bookings, 0)}</td>
                  <td><strong>£{total.toLocaleString()}</strong></td>
                  <td className="cell-mono">£{MONTHLY_REVENUE.reduce((s, m) => s + m.net, 0).toLocaleString()}</td>
                  <td className="cell-mono">£{(total - MONTHLY_REVENUE.reduce((s, m) => s + m.net, 0)).toLocaleString()}</td>
                  <td className="cell-mono">£{(total / MONTHLY_REVENUE.reduce((s, m) => s + m.bookings, 0)).toFixed(0)}</td>
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
                {LAWYER_REVENUE_THIS_MONTH.map(row => {
                  const l = LAWYERS.find(x => x.id === row.lawyerId);
                  const sharePct = (row.gross / latest.gross) * 100;
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
                })}
              </tbody>
            </table>
          </div>
        )}

        {view === "clients" && (
          <div className="table-wrap">
            <div className="month-selector-bar">
              <span className="cell-sub">Showing clients for</span>
              <select className="filter-chip" value={month} onChange={(e) => setMonth(e.target.value)}>
                {MONTHLY_REVENUE.map(m => <option key={m.month} value={m.month}>{m.month}</option>)}
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

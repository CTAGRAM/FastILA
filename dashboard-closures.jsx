/* global React, Icon, fiToast, Actions */

// ============================================================================
// ClosureReportView — admin's monthly closure report. Every matter a lawyer
// has flagged "ready to close" lands here, grouped by the month it was
// flagged. Admin confirms external closure per row (or in bulk), then exports
// a CSV the admin team can hand to whoever does the formal closure on the
// external system.
// ============================================================================

const monthKey = (iso) => {
  const d = new Date(iso || Date.now());
  return d.toISOString().slice(0, 7); // "YYYY-MM"
};
const monthLabel = (k) => {
  const [y, m] = k.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString("en-GB", { month: "long", year: "numeric" });
};

const ClosureReportView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const all = (window.BOOKINGS || []).filter(b => b.readyToCloseAt);
  const [view, setView] = React.useState("pending"); // pending | closed | all
  const [search, setSearch] = React.useState("");
  const [clientFilter, setClientFilter] = React.useState("all");
  const [lenderFilter, setLenderFilter] = React.useState("all");
  const [lawyerFilter, setLawyerFilter] = React.useState("all");
  const [serviceFilter, setServiceFilter] = React.useState("all");

  // Distinct values for the dropdowns (sorted)
  const clientOptions  = Array.from(new Set(all.map(b => b.clientName).filter(Boolean))).sort();
  const lenderOptions  = Array.from(new Set(all.map(b => b.lender).filter(Boolean))).sort();
  const lawyerOptions  = Array.from(new Set(all.map(b => b.readyToCloseBy || (window.LAWYERS || []).find(l => l.id === b.lawyerId)?.name).filter(Boolean))).sort();
  const serviceOptions = Array.from(new Set(all.map(b => b.serviceId).filter(Boolean))).sort();

  const visible = all.filter(b => {
    if (view === "pending" && b.externallyClosedAt) return false;
    if (view === "closed" && !b.externallyClosedAt) return false;
    if (clientFilter !== "all" && b.clientName !== clientFilter) return false;
    if (lenderFilter !== "all" && b.lender !== lenderFilter) return false;
    if (lawyerFilter !== "all") {
      const lawyerName = b.readyToCloseBy || (window.LAWYERS || []).find(l => l.id === b.lawyerId)?.name;
      if (lawyerName !== lawyerFilter) return false;
    }
    if (serviceFilter !== "all" && b.serviceId !== serviceFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!(b.clientName || "").toLowerCase().includes(q)
        && !(b.ref || "").toLowerCase().includes(q)
        && !(b.lender || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const hasActiveFilter = clientFilter !== "all" || lenderFilter !== "all" || lawyerFilter !== "all" || serviceFilter !== "all" || search;
  const clearFilters = () => { setClientFilter("all"); setLenderFilter("all"); setLawyerFilter("all"); setServiceFilter("all"); setSearch(""); };

  // Group by month flagged
  const byMonth = {};
  visible.forEach(b => {
    const k = monthKey(b.readyToCloseAt);
    (byMonth[k] = byMonth[k] || []).push(b);
  });
  const months = Object.keys(byMonth).sort((a, b) => b.localeCompare(a));

  const pendingCount = all.filter(b => !b.externallyClosedAt).length;
  const closedCount  = all.filter(b => b.externallyClosedAt).length;

  const exportMonth = (k) => {
    const list = byMonth[k] || [];
    const header = "ref,client,lender,service,call_date,marked_ready_at,marked_by,closure_note,externally_closed_at,externally_closed_by\n";
    const rows = list.map(b => [
      b.ref,
      JSON.stringify(b.clientName || ""),
      JSON.stringify(b.lender || ""),
      b.serviceId || "",
      b.date || "",
      b.readyToCloseAt || "",
      JSON.stringify(b.readyToCloseBy || ""),
      JSON.stringify(b.readyToCloseNote || ""),
      b.externallyClosedAt || "",
      JSON.stringify(b.externallyClosedBy || ""),
    ].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `closure-report-${k}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    fiToast(`Exported ${list.length} matter${list.length === 1 ? "" : "s"} for ${monthLabel(k)}`);
  };
  const exportAllVisible = () => {
    if (months.length === 0) { fiToast("Nothing to export"); return; }
    const header = "month,ref,client,lender,service,call_date,marked_ready_at,marked_by,closure_note,externally_closed_at,externally_closed_by\n";
    const rows = months.flatMap(k => byMonth[k].map(b => [
      k, b.ref, JSON.stringify(b.clientName || ""), JSON.stringify(b.lender || ""),
      b.serviceId || "", b.date || "", b.readyToCloseAt || "",
      JSON.stringify(b.readyToCloseBy || ""), JSON.stringify(b.readyToCloseNote || ""),
      b.externallyClosedAt || "", JSON.stringify(b.externallyClosedBy || ""),
    ].join(","))).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `closure-report-all-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    fiToast(`Exported ${visible.length} matters across ${months.length} month${months.length === 1 ? "" : "s"}`);
  };

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 12px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: "#063952", fontSize: 28 }}>Matters to close</h1>
          <p style={{ color: "#5b6b76", marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Every booking a lawyer has flagged ready to close. Use this as the monthly report for whoever formally closes matters on the external system. Confirm each one as you close it, or export the month as CSV.
          </p>
        </div>
        <div className="row gap-2">
          <button className="btn btn-ghost" onClick={exportAllVisible} disabled={visible.length === 0}>
            <Icon name="download" size={13}/> Export visible ({visible.length})
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
        <Kpi label="Pending closure" value={pendingCount} icon="clock" tone="warn"/>
        <Kpi label="Closed externally" value={closedCount} icon="check" tone="success"/>
        <Kpi label="Total flagged" value={all.length} icon="doc" tone="navy"/>
        <Kpi label="Months tracked" value={Object.keys(all.reduce((acc, b) => { acc[monthKey(b.readyToCloseAt)] = 1; return acc; }, {})).length} icon="calendar" tone="info"/>
      </div>

      {/* Filter bar */}
      <div style={{ background: "white", border: "1px solid #e4e8ec", borderRadius: 10, padding: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setView("pending")} className={`btn btn-sm ${view === "pending" ? "btn-navy" : "btn-ghost"}`}>Pending</button>
            <button onClick={() => setView("closed")} className={`btn btn-sm ${view === "closed" ? "btn-navy" : "btn-ghost"}`}>Closed</button>
            <button onClick={() => setView("all")} className={`btn btn-sm ${view === "all" ? "btn-navy" : "btn-ghost"}`}>All</button>
          </div>
          <input
            className="field-input"
            placeholder="Search by client, ref or lender…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <span style={{ fontSize: 12, color: "#5b6b76", marginLeft: "auto", whiteSpace: "nowrap" }}>{visible.length} of {all.length} matters</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#5b6b76", textTransform: "uppercase", letterSpacing: "0.04em" }}>Client</span>
            <select className="field-input" value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
              <option value="all">All clients ({clientOptions.length})</option>
              {clientOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#5b6b76", textTransform: "uppercase", letterSpacing: "0.04em" }}>Lender</span>
            <select className="field-input" value={lenderFilter} onChange={(e) => setLenderFilter(e.target.value)}>
              <option value="all">All lenders</option>
              {lenderOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#5b6b76", textTransform: "uppercase", letterSpacing: "0.04em" }}>Flagged by</span>
            <select className="field-input" value={lawyerFilter} onChange={(e) => setLawyerFilter(e.target.value)}>
              <option value="all">All lawyers</option>
              {lawyerOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label style={{ display: "block" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#5b6b76", textTransform: "uppercase", letterSpacing: "0.04em" }}>Service</span>
            <select className="field-input" value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
              <option value="all">All services</option>
              {serviceOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        {hasActiveFilter && (
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ fontSize: 12, color: "#5b6b76" }}>
              <Icon name="info" size={11}/> Filters active
              {clientFilter !== "all" && <> · Client: <strong>{clientFilter}</strong></>}
              {lenderFilter !== "all" && <> · Lender: <strong>{lenderFilter}</strong></>}
              {lawyerFilter !== "all" && <> · Lawyer: <strong>{lawyerFilter}</strong></>}
              {serviceFilter !== "all" && <> · Service: <strong>{serviceFilter}</strong></>}
              {search && <> · Search: <strong>"{search}"</strong></>}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <Icon name="x" size={11}/> Clear all
            </button>
          </div>
        )}
      </div>

      {all.length === 0 ? (
        <section className="panel" style={{ padding: 40, textAlign: "center", color: "#5b6b76" }}>
          <Icon name="check-circle" size={32}/>
          <h3 style={{ marginTop: 12, color: "#063952" }}>No matters flagged for closure yet</h3>
          <p style={{ fontSize: 13, maxWidth: 460, margin: "8px auto 0" }}>
            When a lawyer finishes a matter and there's nothing left to do, they hit <strong>Mark ready to close</strong> on the booking detail. Those matters appear here for the admin team to formally close on the external system.
          </p>
        </section>
      ) : months.length === 0 ? (
        <section className="panel" style={{ padding: 32, textAlign: "center", color: "#5b6b76" }}>
          <p>No matters match the current filters.</p>
        </section>
      ) : (
        months.map(k => (
          <section key={k} className="panel" style={{ marginBottom: 16 }}>
            <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f5f7f9", borderBottom: "1px solid #e4e8ec" }}>
              <div>
                <strong style={{ color: "#063952", fontSize: 15 }}>{monthLabel(k)}</strong>
                <span style={{ color: "#5b6b76", fontSize: 12, marginLeft: 8 }}>
                  · <strong>{byMonth[k].length}</strong> matter{byMonth[k].length === 1 ? "" : "s"}
                  · {byMonth[k].filter(b => !b.externallyClosedAt).length} pending
                </span>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => exportMonth(k)}>
                <Icon name="download" size={12}/> Export this month
              </button>
            </header>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #eef0f3" }}>
                    <Th>Ref</Th>
                    <Th>Client</Th>
                    <Th>Lender</Th>
                    <Th>Call date</Th>
                    <Th>Flagged by</Th>
                    <Th>Note</Th>
                    <Th>Status</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth[k].map(b => (
                    <tr key={b.ref} style={{ borderBottom: "1px solid #eef0f3" }}>
                      <Td><span style={{ fontFamily: "monospace", fontSize: 12 }}>{b.ref}</span></Td>
                      <Td><strong style={{ color: "#063952" }}>{b.clientName}</strong></Td>
                      <Td>{b.lender || "—"}</Td>
                      <Td>{b.date || "—"}</Td>
                      <Td style={{ fontSize: 12, color: "#5b6b76" }}>
                        {b.readyToCloseBy || "—"}<br/>
                        <span style={{ fontSize: 11 }}>{new Date(b.readyToCloseAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </Td>
                      <Td style={{ maxWidth: 280, fontSize: 12.5, color: "#3d4a52" }}>
                        {b.readyToCloseNote || <span style={{ color: "#cfd8de" }}>(no note)</span>}
                      </Td>
                      <Td>
                        {b.externallyClosedAt ? (
                          <span className="pill pill-success">
                            <Icon name="check" size={10} stroke={3}/> Closed
                          </span>
                        ) : (
                          <span className="pill pill-warning">
                            <Icon name="clock" size={10}/> Pending
                          </span>
                        )}
                      </Td>
                      <Td style={{ textAlign: "right" }}>
                        {!b.externallyClosedAt ? (
                          <button
                            className="btn btn-navy btn-sm"
                            onClick={() => Actions.markExternallyClosed(b.ref, "admin")}
                            title="Mark this matter as formally closed on the external platform"
                          >
                            <Icon name="check" size={11} stroke={3}/> Mark closed
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: "#5b6b76" }}>
                            by {b.externallyClosedBy || "admin"}<br/>
                            {new Date(b.externallyClosedAt).toLocaleString("en-GB", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))
      )}
    </div>
  );
};

const Th = ({ children }) => <th style={{ padding: "10px 12px", fontWeight: 700, color: "#5b6b76", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left" }}>{children}</th>;
const Td = ({ children, style }) => <td style={{ padding: "10px 12px", verticalAlign: "top", ...style }}>{children}</td>;
const Kpi = ({ icon, label, value, tone }) => {
  const colors = {
    navy:    { bg: "#063952", fg: "#e6f7c8" },
    success: { bg: "#e8f5e9", fg: "#1e5128" },
    info:    { bg: "#eaf5fb", fg: "#0a3a55" },
    warn:    { bg: "#fff7e6", fg: "#7a4f00" },
  }[tone];
  return (
    <div style={{ background: colors.bg, color: colors.fg, padding: 14, borderRadius: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.85 }}>
        <Icon name={icon} size={12}/> {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
};

Object.assign(window, { ClosureReportView });

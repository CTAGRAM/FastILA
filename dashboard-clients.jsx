/* global React, Icon, Avatar, StatusPill, FastILA, fiToast, SERVICES, LAWYERS, fmtDateLong */

// ============================================================================
// Clients — returning-client history (Phase: client history)
//  • ClientHistoryList — reusable list of a client's past matters + certificates
//    (used on the booking detail "previous matters" panel, the Clients
//    directory, and the client portal).
//  • ClientsView — admin/lawyer directory of every unique client by email.
// New, self-contained, additive.
// ============================================================================

const CLI_NAVY = "#063952";
const CLI_MUTED = "#5b6b76";

const cliSvcName = (id) => (window.SERVICES || []).find(s => s.id === id)?.name || id || "—";
const cliLawName = (id) => (window.LAWYERS || []).find(l => l.id === id)?.name || "—";
const cliDate = (d) => { try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch (_e) { return d || "—"; } };

// Reusable: a client's matters (newest first) with certificate links.
const ClientHistoryList = ({ email, excludeRef, onOpenDetail, emptyText, hideOpen }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const rows = (FastILA?.clients?.historyByEmail ? FastILA.clients.historyByEmail(email) : [])
    .filter(b => b.ref !== excludeRef);
  const certs = FastILA?.clients?.certsFor ? FastILA.clients.certsFor(rows.flatMap(b => [b.ref, b.id])) : [];
  const certByKey = {};
  certs.forEach(c => { const k = c.booking_ref || c.booking_id; (certByKey[k] = certByKey[k] || []).push(c); });

  const openDetail = (ref) => (onOpenDetail || window.fiOpenDetail || (() => {}))(ref);
  const openDoc = (doc) => { if (typeof window.fiPreviewDoc === "function") window.fiPreviewDoc(doc); };

  if (!rows.length) return <div style={{ fontSize: 13, color: CLI_MUTED }}>{emptyText || "No other matters for this client."}</div>;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {rows.map(b => {
        const cs = certByKey[b.ref] || certByKey[b.id] || [];
        return (
          <div key={b.ref} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", border: "1px solid #e3e9ed", borderRadius: 9, padding: "9px 12px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 12, color: CLI_NAVY }}>{b.ref}</div>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 13, color: CLI_NAVY, fontWeight: 600 }}>{cliSvcName(b.serviceId)}</div>
              <div style={{ fontSize: 11.5, color: CLI_MUTED }}>{cliDate(b.date)}{b.time ? ` · ${b.time}` : ""} · {cliLawName(b.lawyerId)}{b.lender ? ` · ${b.lender}` : ""}</div>
            </div>
            {typeof StatusPill === "function" ? <StatusPill status={b.status}/> : <span style={{ fontSize: 11 }}>{b.status}</span>}
            {b.payment === "paid" && <span style={{ fontSize: 11, color: "#1f7a46", fontWeight: 700 }}>Paid</span>}
            {cs.map((c, i) => (
              <button key={i} className="btn btn-ghost btn-sm" onClick={() => openDoc(c)} title={c.filename}>
                <Icon name="award" size={12}/> {(/cert/i.test(c.kind) ? "Certificate" : /care/i.test(c.kind) ? "Care letter" : "Declaration")}
              </button>
            ))}
            {!hideOpen && <button className="btn btn-ghost btn-sm" onClick={() => openDetail(b.ref)}>Open</button>}
          </div>
        );
      })}
    </div>
  );
};

// Portal: a collapsible "your previous matters + certificates" card, shown to a
// signed-in client above their current booking's steps. Renders nothing for
// first-time clients.
const PortalHistoryCard = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [open, setOpen] = React.useState(false);
  const ctx = (typeof window !== "undefined") ? window.FastILA_currentBooking : null;
  let email = "";
  try { email = (localStorage.getItem("fastila_last_email") || "").toLowerCase(); } catch (_e) { /* ignore */ }
  if (!email || !FastILA?.clients?.historyByEmail) return null;
  const prior = FastILA.clients.historyByEmail(email).filter(b => b.ref !== (ctx && ctx.bookingRef));
  if (!prior.length) return null;
  return (
    <section className="panel" style={{ marginBottom: 16, border: "1px solid #e3e9ed", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpen(o => !o)}>
        <div style={{ fontWeight: 700, color: CLI_NAVY, fontSize: 14 }}>
          <Icon name="doc" size={15}/> Your previous {prior.length === 1 ? "matter" : "matters"} ({prior.length}) &amp; certificates
        </div>
        <Icon name={open ? "chevron-down" : "chevron-right"} size={16}/>
      </div>
      {open && <div style={{ marginTop: 12 }}><ClientHistoryList email={email} excludeRef={ctx && ctx.bookingRef} hideOpen/></div>}
    </section>
  );
};

const ClientsView = ({ onOpenDetail }) => {
  const tick = (typeof FastILA?.useStore === "function") ? FastILA.useStore()[0] : 0;
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState({});
  const list = (FastILA?.clients?.directory ? FastILA.clients.directory() : [])
    .filter(c => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.email.includes(q.toLowerCase()) || (c.phone || "").includes(q));

  const returning = list.filter(c => c.count > 1).length;

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 16px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: CLI_NAVY, fontSize: 28 }}>Clients</h1>
          <p style={{ color: CLI_MUTED, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Everyone who's booked, grouped by email — so returning clients are recognised, never duplicated. Expand a client to see all their matters and certificates.
          </p>
        </div>
      </header>

      <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <input className="field-input" placeholder="Search name, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360 }}/>
        <span className="pill pill-muted" style={{ alignSelf: "center" }}>{list.length} clients · {returning} returning</span>
      </div>

      <section className="panel" style={{ padding: 0, border: "1px solid #e3e9ed", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f7f9fa", textAlign: "left", color: CLI_MUTED }}>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Client</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Email</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Phone</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Matters</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Last seen</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(c => (
              <React.Fragment key={c.email}>
                <tr style={{ borderTop: "1px solid #eef1f3", cursor: "pointer" }} onClick={() => setOpen(o => ({ ...o, [c.email]: !o[c.email] }))}>
                  <td style={{ padding: "10px 14px", color: CLI_NAVY, fontWeight: 600 }}>
                    {c.name || "—"} {c.count > 1 && <span style={{ marginLeft: 6, fontSize: 10.5, fontWeight: 700, color: "#7a5a12", background: "#fdf3dc", borderRadius: 999, padding: "1px 7px" }}>RETURNING</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: CLI_MUTED }}>{c.email}</td>
                  <td style={{ padding: "10px 14px", color: CLI_MUTED }}>{c.phone || "—"}</td>
                  <td style={{ padding: "10px 14px", color: CLI_NAVY, fontWeight: 700 }}>{c.count}</td>
                  <td style={{ padding: "10px 14px", color: CLI_MUTED, whiteSpace: "nowrap" }}>{cliDate(c.lastDate)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}><Icon name={open[c.email] ? "chevron-down" : "chevron-right"} size={15}/></td>
                </tr>
                {open[c.email] && (
                  <tr style={{ background: "#fbfcfd" }}>
                    <td colSpan={6} style={{ padding: "10px 14px" }}>
                      <ClientHistoryList email={c.email} onOpenDetail={onOpenDetail}/>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {list.length === 0 && <tr><td colSpan={6} style={{ padding: 24, color: CLI_MUTED }}>No clients yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
};

window.ClientHistoryList = ClientHistoryList;
window.PortalHistoryCard = PortalHistoryCard;
window.ClientsView = ClientsView;

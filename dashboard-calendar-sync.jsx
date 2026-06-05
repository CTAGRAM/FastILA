/* global React, Icon, Avatar, FastILA, fiToast, LAWYERS */

// ============================================================================
// Calendar & diary sync (Phase 2) — connect each lawyer's Google / Outlook
// diary. Two-way: pulls busy times into the booking form, pushes bookings as
// calendar events with a Meet/Teams link. New, self-contained components.
// ============================================================================

const CAL_NAVY = "#063952";
const CAL_MUTED = "#5b6b76";

const CAL_PROVIDERS = [
  { id: "google", label: "Google Calendar", sub: "Calendar + Google Meet", icon: "calendar" },
];

const calFmt = (iso) => { try { return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); } catch (_e) { return iso; } };

// Reusable per-lawyer panel (used in the admin view AND the lawyer profile).
const CalendarConnectPanel = ({ lawyerId, lawyerName, connections: passed, onChanged }) => {
  const live = FastILA?.mode === "live";
  const [conns, setConns] = React.useState(passed || []);
  const [loading, setLoading] = React.useState(!passed);
  const [busy, setBusy] = React.useState("");

  const load = React.useCallback(async () => {
    if (passed) { setConns(passed); return; }
    try { const all = await FastILA.calendar.connections(lawyerId); setConns((all || []).filter(c => c.lawyer_id === lawyerId)); }
    catch (e) { fiToast("Couldn't load calendars: " + e.message); }
    finally { setLoading(false); }
  }, [lawyerId, passed]);

  React.useEffect(() => { setConns(passed || []); }, [passed]);
  React.useEffect(() => { if (!passed) load(); }, [load, passed]);

  const connect = async (provider) => {
    setBusy(provider);
    try {
      const url = await FastILA.calendar.connectUrl(provider, lawyerId);
      window.location.href = url;   // redirect into the provider consent screen
    } catch (e) { fiToast(e.message); setBusy(""); }
  };
  const disconnect = async (provider) => {
    setBusy(provider);
    try { await FastILA.calendar.disconnect(provider, lawyerId); fiToast("Disconnected"); await load(); onChanged && onChanged(); }
    catch (e) { fiToast("Couldn't disconnect: " + e.message); }
    finally { setBusy(""); }
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {CAL_PROVIDERS.map(p => {
        const c = conns.find(x => x.provider === p.id);
        const connected = c && c.status === "connected";
        const errored = c && c.status === "error";
        return (
          <div key={p.id} style={{
            display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            border: "1px solid #e3e9ed", borderRadius: 10, padding: "12px 14px",
            background: connected ? "#f4faf6" : "#fff",
          }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: "#eef4f7", display: "grid", placeItems: "center", color: CAL_NAVY }}>
              <Icon name={p.icon} size={18}/>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, color: CAL_NAVY, fontSize: 13.5 }}>{p.label}</div>
              <div style={{ fontSize: 12, color: CAL_MUTED, marginTop: 2 }}>
                {connected ? <>Connected{c.account_email ? <> · {c.account_email}</> : null}{c.last_synced_at ? <> · synced {calFmt(c.last_synced_at)}</> : ""}</>
                  : errored ? <span style={{ color: "#a3271a" }}>Error: {c.last_error || "needs reconnect"}</span>
                  : p.sub}
              </div>
            </div>
            {connected || errored
              ? <>
                  {errored && <button className="btn btn-navy btn-sm" disabled={busy === p.id} onClick={() => connect(p.id)}>Reconnect</button>}
                  <button className="btn btn-ghost btn-sm" disabled={busy === p.id} onClick={() => disconnect(p.id)}>
                    <Icon name="x" size={12}/> Disconnect
                  </button>
                </>
              : <button className="btn btn-navy btn-sm" disabled={busy === p.id} onClick={() => connect(p.id)}>
                  <Icon name="plus" size={12}/> {busy === p.id ? "Opening…" : "Connect"}
                </button>}
          </div>
        );
      })}
      {!live && <div style={{ fontSize: 12, color: "#7a4f00" }}>Demo mode — connecting calendars needs the live Supabase backend.</div>}
      {loading && <div style={{ fontSize: 12, color: CAL_MUTED }}>Loading…</div>}
    </div>
  );
};

// Admin overview of every lawyer's calendar connections.
const CalendarSyncView = () => {
  const tick = (typeof FastILA?.useStore === "function") ? FastILA.useStore()[0] : 0;
  const live = FastILA?.mode === "live";
  const [allConns, setAllConns] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!live) { setLoading(false); return; }
    try { setAllConns(await FastILA.calendar.connections()); }
    catch (e) { fiToast("Couldn't load calendars: " + e.message); }
    finally { setLoading(false); }
  }, [live]);

  React.useEffect(() => { load(); }, [load, tick]);

  // Toast the OAuth return result, then clean the URL.
  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      const status = sp.get("calendar");
      if (status === "connected") fiToast("Calendar connected ✓");
      else if (status === "error") fiToast("Calendar connection failed: " + (sp.get("msg") || "unknown error"));
      if (status) {
        sp.delete("calendar"); sp.delete("msg"); sp.delete("view");
        const qs = sp.toString();
        window.history.replaceState({}, "", window.location.pathname + (qs ? "?" + qs : ""));
      }
    } catch (_e) {}
  }, []);

  const syncAll = async () => {
    setSyncing(true);
    try { const r = await FastILA.calendar.syncNow(); fiToast(r?.mock ? "Demo mode — nothing synced" : `Synced ${r?.connections ?? 0} calendar(s) · ${r?.events_created ?? 0} new events`); await load(); }
    catch (e) { fiToast("Sync failed: " + e.message); }
    finally { setSyncing(false); }
  };

  const lawyers = (window.LAWYERS || []);

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 16px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: CAL_NAVY, fontSize: 28 }}>Calendars & diaries</h1>
          <p style={{ color: CAL_MUTED, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Connect each lawyer's Google or Outlook diary. Fast-ILA pulls their busy times so the booking form only offers free slots, and pushes every booking onto their calendar with a Google Meet / Teams link.
          </p>
        </div>
      </header>

      <section className="panel" style={{ padding: 16, marginBottom: 16, background: live ? CAL_NAVY : "#fff7e6", color: live ? "#e6f7c8" : "#7a4f00", border: live ? "none" : "1px solid #f4d99a", borderRadius: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Icon name="calendar" size={18}/>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong style={{ fontSize: 14 }}>{live ? "Two-way calendar sync is active" : "Demo mode — calendar sync not connected"}</strong>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
              {live ? "Diaries re-sync automatically every 15 minutes. Use “Sync now” to refresh immediately." : "Add your Supabase keys in config.js to enable live calendar sync."}
            </div>
          </div>
          <button className="btn btn-lime btn-sm" onClick={syncAll} disabled={syncing || !live}>
            <Icon name="bolt" size={12}/> {syncing ? "Syncing…" : "Sync now"}
          </button>
        </div>
      </section>

      {loading ? (
        <div style={{ color: CAL_MUTED, padding: 20 }}>Loading…</div>
      ) : lawyers.length === 0 ? (
        <div className="panel" style={{ padding: 24, border: "1px solid #e3e9ed", borderRadius: 12, color: CAL_MUTED }}>
          No lawyers yet. Add lawyers under <strong>Lawyers</strong>, then connect their calendars here.
        </div>
      ) : (
        lawyers.map(l => (
          <section key={l.id} className="panel" style={{ padding: 16, marginBottom: 14, border: "1px solid #e3e9ed", borderRadius: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <Avatar lawyer={l} size={36}/>
              <div>
                <div style={{ fontWeight: 700, color: CAL_NAVY }}>{l.name}</div>
                <div style={{ fontSize: 12, color: CAL_MUTED }}>{(l.languages || []).join(" · ")}</div>
              </div>
            </div>
            <CalendarConnectPanel
              lawyerId={l.id}
              lawyerName={l.name}
              connections={allConns.filter(c => c.lawyer_id === l.id)}
              onChanged={load}
            />
          </section>
        ))
      )}
    </div>
  );
};

window.CalendarConnectPanel = CalendarConnectPanel;
window.CalendarSyncView = CalendarSyncView;

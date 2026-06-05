/* global React, Icon, Avatar, FastILA, fiToast, BOOKINGS, LAWYERS, fmtDateLong */

// ============================================================================
// Call recordings & transcripts (Phase 3)
//  • RecordingPanel  — embedded on each booking's detail page: upload a call
//    recording → auto-transcribe (Whisper) → AI file-note summary.
//  • RecordingsView  — admin overview of which matters have recordings.
// New, self-contained components. Additive.
// ============================================================================

const REC_NAVY = "#063952";
const REC_MUTED = "#5b6b76";

const recStatusStyle = (s) => ({
  uploaded:    { bg: "#fdf3dc", fg: "#7a5a12", label: "Uploaded" },
  transcribing:{ bg: "#eaf2fb", fg: "#1f5e8a", label: "Transcribing…" },
  transcribed: { bg: "#e4f3e9", fg: "#1f7a46", label: "Transcribed" },
  error:       { bg: "#fbe5e1", fg: "#a3271a", label: "Error" },
}[s] || { bg: "#eef1f3", fg: "#6b7b85", label: s || "—" });

const RecPill = ({ status }) => {
  const s = recStatusStyle(status);
  return <span style={{ background: s.bg, color: s.fg, padding: "2px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>{s.label}</span>;
};

const fmtBytes = (n) => !n ? "" : n > 1048576 ? (n / 1048576).toFixed(1) + " MB" : Math.round(n / 1024) + " KB";

const RecordingPanel = ({ booking, role }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const live = FastILA?.mode === "live";
  const bookingId = booking?.id || null;       // uuid (live mode)
  const [recs, setRecs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [working, setWorking] = React.useState("");
  const [open, setOpen] = React.useState({});
  const fileRef = React.useRef(null);

  const load = React.useCallback(async () => {
    if (!live || !bookingId) { setLoading(false); return; }
    try { setRecs(await FastILA.recordings.list(bookingId)); }
    catch (e) { fiToast("Couldn't load recordings: " + e.message); }
    finally { setLoading(false); }
  }, [live, bookingId]);

  React.useEffect(() => { load(); }, [load]);

  const onPick = () => fileRef.current && fileRef.current.click();
  const onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const rec = await FastILA.recordings.upload(bookingId, file);
      fiToast("Uploaded — transcribing…");
      await load();
      const res = await FastILA.recordings.transcribe(rec.id);
      fiToast(res?.mock ? "Demo mode — nothing transcribed"
        : res?.ok ? "Transcript ready" : "Transcription failed: " + (res?.error || "unknown"));
      await load();
    } catch (err) { fiToast(err.message); }
    finally { setUploading(false); }
  };

  const transcribe = async (rec) => {
    setWorking(rec.id);
    try {
      const res = await FastILA.recordings.transcribe(rec.id);
      fiToast(res?.ok ? "Transcript ready" : "Failed: " + (res?.error || "unknown"));
      await load();
    } catch (e) { fiToast(e.message); }
    finally { setWorking(""); }
  };
  const remove = async (rec) => {
    if (!window.confirm("Delete this recording and its transcript?")) return;
    setWorking(rec.id);
    try { await FastILA.recordings.remove(rec); fiToast("Deleted"); await load(); }
    catch (e) { fiToast(e.message); }
    finally { setWorking(""); }
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <h2 className="panel-title"><Icon name="video" size={16}/> Recording &amp; transcript</h2>
        <span className="cell-sub">Upload the call recording — it transcribes and summarises automatically</span>
      </header>
      <div style={{ padding: "14px 18px" }}>
        {!live ? (
          <div style={{ fontSize: 13, color: "#7a4f00" }}>Recordings need the live Supabase backend.</div>
        ) : !bookingId ? (
          <div style={{ fontSize: 13, color: REC_MUTED }}>Save the booking to the backend before adding a recording.</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: recs.length ? 14 : 0 }}>
              <button className="btn btn-navy btn-sm" onClick={onPick} disabled={uploading}>
                <Icon name="plus" size={12}/> {uploading ? "Uploading…" : "Upload recording"}
              </button>
              <span style={{ fontSize: 12, color: REC_MUTED }}>Audio or video, up to 25&nbsp;MB (mp3, m4a, wav, mp4…)</span>
              <input ref={fileRef} type="file" accept="audio/*,video/*" style={{ display: "none" }} onChange={onFile}/>
            </div>

            {loading ? <div style={{ color: REC_MUTED, fontSize: 13 }}>Loading…</div>
              : recs.length === 0 ? <div style={{ color: REC_MUTED, fontSize: 13 }}>No recording yet for this matter.</div>
              : recs.map(rec => {
                const tr = rec.transcript;
                const isOpen = !!open[rec.id];
                return (
                  <div key={rec.id} style={{ border: "1px solid #e3e9ed", borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <Icon name="doc" size={15}/>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ fontWeight: 600, color: REC_NAVY, fontSize: 13.5 }}>{rec.filename || "recording"}</div>
                        <div style={{ fontSize: 11.5, color: REC_MUTED }}>
                          {fmtBytes(rec.size_bytes)}{rec.duration_seconds ? ` · ${Math.round(rec.duration_seconds / 60)} min` : ""}
                          {rec.last_error ? <span style={{ color: "#a3271a" }}> · {rec.last_error}</span> : ""}
                        </div>
                      </div>
                      <RecPill status={rec.status}/>
                      {(rec.status === "uploaded" || rec.status === "error") && (
                        <button className="btn btn-ghost btn-sm" disabled={working === rec.id} onClick={() => transcribe(rec)}>
                          <Icon name="sparkle" size={12}/> {working === rec.id ? "Working…" : "Transcribe"}
                        </button>
                      )}
                      {tr && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setOpen(o => ({ ...o, [rec.id]: !o[rec.id] }))}>
                          <Icon name={isOpen ? "chevron-down" : "doc"} size={12}/> {isOpen ? "Hide" : "View transcript"}
                        </button>
                      )}
                      <button className="btn btn-ghost btn-sm" disabled={working === rec.id} onClick={() => remove(rec)} title="Delete">
                        <Icon name="trash" size={12}/>
                      </button>
                    </div>

                    {tr && tr.summary && (
                      <div style={{ marginTop: 10, background: "#f4faf6", border: "1px solid #d7eade", borderRadius: 8, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#1f7a46", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
                          <Icon name="sparkle" size={11}/> AI file note
                        </div>
                        <div style={{ fontSize: 13, color: "#234", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{tr.summary}</div>
                      </div>
                    )}

                    {tr && isOpen && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: REC_MUTED, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
                          Transcript{tr.language ? ` · ${tr.language}` : ""}
                        </div>
                        <div style={{ maxHeight: 260, overflowY: "auto", background: "#fbfcfd", border: "1px solid #eef1f3", borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#234", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                          {tr.text || "(empty transcript)"}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>
    </section>
  );
};

// Admin overview — which matters have recordings / transcripts.
const RecordingsView = ({ onOpenDetail }) => {
  const tick = (typeof FastILA?.useStore === "function") ? FastILA.useStore()[0] : 0;
  const live = FastILA?.mode === "live";
  const [overview, setOverview] = React.useState({});
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (!live) return;
    (async () => { try { setOverview(await FastILA.recordings.overview()); } catch (_e) {} })();
  }, [live, tick]);

  const lawyerName = (id) => (window.LAWYERS || []).find(l => l.id === id)?.name || "—";
  const list = (window.BOOKINGS || [])
    .filter(b => !q || (b.clientName || "").toLowerCase().includes(q.toLowerCase()) || (b.ref || "").toLowerCase().includes(q.toLowerCase()))
    .slice(0, 200);

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 16px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: REC_NAVY, fontSize: 28 }}>Recordings &amp; transcripts</h1>
          <p style={{ color: REC_MUTED, marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Upload each call recording from the matter's detail page — Fast-ILA transcribes it and writes an AI file note automatically. This is the firm-wide overview.
          </p>
        </div>
      </header>

      {!live && (
        <section className="panel" style={{ padding: 16, marginBottom: 16, background: "#fff7e6", border: "1px solid #f4d99a", borderRadius: 12, color: "#7a4f00", fontSize: 13 }}>
          Demo mode — connect Supabase in config.js to store recordings and generate transcripts.
        </section>
      )}

      <input className="field-input" placeholder="Search by client or reference…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 360, marginBottom: 16 }}/>

      <section className="panel" style={{ padding: 0, border: "1px solid #e3e9ed", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f7f9fa", textAlign: "left", color: REC_MUTED }}>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Ref</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Client</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Lawyer</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Date</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}>Recording</th>
              <th style={{ padding: "10px 14px", fontWeight: 600 }}></th>
            </tr>
          </thead>
          <tbody>
            {list.map(b => {
              const ov = overview[b.id] || { count: 0, transcribed: 0 };
              return (
                <tr key={b.ref} style={{ borderTop: "1px solid #eef1f3" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", color: REC_NAVY }}>{b.ref}</td>
                  <td style={{ padding: "10px 14px", color: REC_NAVY }}>{b.clientName}</td>
                  <td style={{ padding: "10px 14px", color: REC_MUTED }}>{lawyerName(b.lawyerId)}</td>
                  <td style={{ padding: "10px 14px", color: REC_MUTED, whiteSpace: "nowrap" }}>{b.date}</td>
                  <td style={{ padding: "10px 14px" }}>
                    {ov.count === 0
                      ? <span style={{ color: "#9aa7af" }}>—</span>
                      : <RecPill status={ov.transcribed ? "transcribed" : "uploaded"}/>}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => onOpenDetail && onOpenDetail(b.ref)}>Open</button>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && <tr><td colSpan={6} style={{ padding: 24, color: REC_MUTED }}>No bookings.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
};

window.RecordingPanel = RecordingPanel;
window.RecordingsView = RecordingsView;

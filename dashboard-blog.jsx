/* global React, Icon, fiToast */

// ============================================================================
// BlogContentView — embeds the firm's Airtable blog-content base inside the
// admin console. The Airtable view is the editing surface (add new posts,
// update statuses, attach images, etc.). An n8n workflow the admin has
// already configured picks up rows ready for publishing and posts them to
// WordPress. This view is intentionally just an iframe wrapper + status bar.
// ============================================================================

const BlogContentView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const at = (window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("airtable_blog")) || {};
  const connected = !!at.embedUrl;
  const n8n = (window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n")) || {};
  const n8nConnected = !!n8n.webhookUrl;

  // Some shared Airtable URLs need /embed prefix to render in an iframe.
  // Accept any of: full embed URL, shrXXX share URL, raw base URL.
  const resolveEmbedUrl = (raw) => {
    if (!raw) return null;
    const u = raw.trim();
    if (u.includes("/embed/")) return u;
    // shr… share IDs — Airtable serves them at /embed/{id}
    const shareMatch = u.match(/airtable\.com\/(shr[a-zA-Z0-9]+)/);
    if (shareMatch) return `https://airtable.com/embed/${shareMatch[1]}`;
    return u;
  };
  const src = resolveEmbedUrl(at.embedUrl);
  const directUrl = at.openUrl || at.embedUrl;

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 12px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: "#063952", fontSize: 28 }}>Blog content</h1>
          <p style={{ color: "#5b6b76", marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            {at.baseName ? <><strong>{at.baseName}</strong> — </> : null}
            Your Airtable blog calendar embedded inline. Add posts, edit drafts, and mark them ready — your n8n workflow handles publishing to WordPress automatically.
          </p>
        </div>
        <div className="row gap-2">
          {directUrl && (
            <a className="btn btn-ghost" href={directUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={13}/> Open in Airtable
            </a>
          )}
        </div>
      </header>

      {/* Status bar — n8n + airtable connection */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ padding: 14, background: connected ? "#e8f5e9" : "#fff7e6", border: "1px solid " + (connected ? "#b8e0bb" : "#f4d99a"), borderRadius: 10, color: connected ? "#1e5128" : "#7a4f00", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Icon name={connected ? "check" : "warning"} size={14} stroke={connected ? 3 : 2}/>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong>Airtable {connected ? "connected" : "not connected"}</strong>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              {connected
                ? "Embed URL configured. Changes you make below are saved to Airtable in real time."
                : "Add your Airtable shared view URL in Integrations → Airtable (blog content) to embed it here."}
            </div>
          </div>
        </div>
        <div style={{ padding: 14, background: n8nConnected ? "#e8f5e9" : "#eaf5fb", border: "1px solid " + (n8nConnected ? "#b8e0bb" : "#b8d7e6"), borderRadius: 10, color: n8nConnected ? "#1e5128" : "#0a3a55", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <Icon name={n8nConnected ? "check" : "info"} size={14} stroke={n8nConnected ? 3 : 2}/>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            <strong>n8n WordPress workflow {n8nConnected ? "connected" : "not connected"}</strong>
            <div style={{ fontSize: 12, marginTop: 4, opacity: 0.9 }}>
              {n8nConnected
                ? "Your existing n8n workflow polls Airtable + publishes ready rows to WordPress. Edit it in n8n if you need to tweak triggers."
                : "Connect n8n in Integrations so the auto-publish workflow can fire."}
            </div>
          </div>
        </div>
      </section>

      {/* Iframe embed */}
      {connected && src ? (
        <section className="panel" style={{ padding: 0, overflow: "hidden", borderRadius: 12, border: "1px solid #e4e8ec" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f5f7f9", borderBottom: "1px solid #e4e8ec", fontSize: 12, color: "#5b6b76" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="doc" size={12}/> Airtable · <code style={{ background: "white", padding: "1px 6px", borderRadius: 4 }}>{src.replace(/^https?:\/\//, "").slice(0, 60)}…</code>
            </span>
            <span>Inline edits save to Airtable automatically</span>
          </div>
          <iframe
            title="Airtable blog content"
            src={src}
            // Airtable's embeds set their own X-Frame-Options to ALLOW for shared views,
            // and ask for fullscreen + storage permission so editing works.
            style={{ width: "100%", height: "78vh", border: 0, background: "white" }}
            allow="clipboard-read; clipboard-write; fullscreen"
            allowFullScreen
          />
        </section>
      ) : (
        <section className="panel" style={{ padding: 40, textAlign: "center", color: "#5b6b76" }}>
          <Icon name="doc" size={32}/>
          <h3 style={{ marginTop: 12, color: "#063952" }}>Connect Airtable to embed your blog content here</h3>
          <p style={{ fontSize: 13.5, maxWidth: 540, margin: "8px auto 16px", lineHeight: 1.5 }}>
            In Airtable: open the view you want to manage from here → <strong>Share view</strong> → <strong>Create a shareable link</strong> (tick "Allow viewers to edit" if your team needs to edit). Copy the URL, then paste it into Integrations → <strong>Airtable (blog content)</strong>.
          </p>
          <button
            className="btn btn-navy"
            onClick={() => { if (typeof window.fiSetDashView === "function") window.fiSetDashView("integrations"); }}
          >
            <Icon name="settings" size={13}/> Go to Integrations
          </button>
        </section>
      )}
    </div>
  );
};

Object.assign(window, { BlogContentView });

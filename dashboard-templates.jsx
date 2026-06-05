/* global React, Icon, FastILA, DocPreviewModal, fiToast, Actions */

// ============================================================================
// Templates library (admin-only)
//
// Three groups — Core, Lender certificates, Firm policies. Nothing is seeded:
// the admin uploads their own client care letter, account details, lender ILA
// certificate templates, and policy PDFs. Files persist via FastILA.documents.
// ============================================================================

const TPL_GROUPS = [
  {
    id: "core",
    title: "Core client documents",
    desc: "Sent to every client through the portal. Upload once; the system personalises the CCL per booking.",
    addLabel: "Add core document",
    kinds: [
      { key: "ccl",  label: "Client care letter (master)",  hint: "We auto-fill name, matter, lawyer and fee per booking" },
      { key: "bank", label: "Client account details",       hint: "Our SRA-regulated client account — same PDF for every client" },
    ],
  },
  {
    id: "lender",
    title: "Lender ILA certificate templates",
    desc: "Upload each lender's template once; lawyers pick the matching one per booking.",
    addLabel: "Add lender template",
    free: true,
  },
  {
    id: "policy",
    title: "Firm policies",
    desc: "Linked from the portal footer and the client care letter.",
    addLabel: "Add policy",
    kinds: [
      { key: "privacy",     label: "Privacy Policy",        hint: "" },
      { key: "tcs",         label: "Terms & Conditions",    hint: "" },
      { key: "complaints",  label: "Complaints procedure",  hint: "" },
    ],
  },
];

// localStorage key for template metadata + IndexedDB blob keys
const TPL_STORE_KEY = "fastila_templates_v2";

function loadTpls() {
  try {
    const raw = localStorage.getItem(TPL_STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_e) { return {}; }
}
function saveTpls(map) {
  try { localStorage.setItem(TPL_STORE_KEY, JSON.stringify(map)); } catch (_e) {}
}

// IndexedDB helpers reused from api.jsx pattern
function openIdb() {
  return new Promise((res, rej) => {
    if (!window.indexedDB) return rej(new Error("IndexedDB not supported"));
    const r = window.indexedDB.open("fastila_files", 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function putBlob(key, blob) {
  const db = await openIdb();
  return new Promise((res, rej) => {
    const tx = db.transaction("blobs", "readwrite");
    tx.objectStore("blobs").put(blob, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}
async function getBlob(key) {
  const db = await openIdb();
  return new Promise((res, rej) => {
    const tx = db.transaction("blobs", "readonly");
    const r = tx.objectStore("blobs").get(key);
    r.onsuccess = () => res(r.result || null);
    r.onerror = () => rej(r.error);
  });
}

const TemplateRow = ({ tpl, onPreview, onReplace, onRemove }) => {
  const iconName = tpl.kind === "lender" ? "award" : tpl.kind === "bank" ? "pound" : tpl.kind === "policy" || tpl.subKind === "privacy" || tpl.subKind === "tcs" || tpl.subKind === "complaints" ? "shield" : "doc";
  return (
    <div className="tpl-row">
      <div className="tpl-row-icon"><Icon name={iconName} size={16}/></div>
      <div className="tpl-row-info">
        <div className="tpl-row-name">{tpl.label}</div>
        {tpl.hint && <div className="tpl-row-desc">{tpl.hint}</div>}
        <div className="tpl-row-meta">
          <span className="mono">{tpl.filename}</span>
          <span className="dot-sep">·</span>
          <span>{tpl.size ? Math.round(tpl.size/1024) + " KB" : "—"}</span>
          <span className="dot-sep">·</span>
          <span>uploaded {new Date(tpl.uploadedAt).toLocaleDateString("en-GB", {day:"numeric", month:"short", year:"numeric"})}</span>
        </div>
      </div>
      <div className="tpl-row-actions">
        <button className="btn btn-ghost btn-sm" onClick={() => onPreview(tpl)}>
          <Icon name="external" size={12}/> Preview
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onReplace(tpl)} title="Replace">
          <Icon name="edit" size={12}/> Replace
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => onRemove(tpl)} title="Remove" style={{ color: "#9a1c1c" }}>
          <Icon name="trash" size={12}/>
        </button>
      </div>
    </div>
  );
};

const TemplateEmptyRow = ({ kind, label, hint, onUpload }) => (
  <div className="tpl-row" style={{ background: "#fafafa" }}>
    <div className="tpl-row-icon" style={{ opacity: 0.5 }}><Icon name="doc" size={16}/></div>
    <div className="tpl-row-info">
      <div className="tpl-row-name" style={{ color: "#5b6b76" }}>{label}</div>
      {hint && <div className="tpl-row-desc">{hint}</div>}
      <div className="tpl-row-meta"><em>Not uploaded yet</em></div>
    </div>
    <div className="tpl-row-actions">
      <button className="btn btn-navy btn-sm" onClick={() => onUpload(kind, label, hint)}>
        <Icon name="plus" size={12}/> Upload
      </button>
    </div>
  </div>
);

const TemplatesView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const [tpls, setTpls] = React.useState(loadTpls);
  const [preview, setPreview] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);

  // Lender form
  const [addLenderOpen, setAddLenderOpen] = React.useState(false);
  const [newLenderName, setNewLenderName] = React.useState("");

  // Hidden file inputs
  const uploadCtx = React.useRef(null); // { groupId, subKind, label, hint, replaceId? }
  const fileRef = React.useRef(null);

  const persist = (next) => { saveTpls(next); setTpls(next); };

  const handleUpload = (groupId, subKind, label, hint, replaceId) => {
    uploadCtx.current = { groupId, subKind, label, hint, replaceId };
    fileRef.current?.click();
  };

  const onFileChosen = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !uploadCtx.current) return;
    const ctx = uploadCtx.current;
    try {
      const id = ctx.replaceId || `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const storageKey = `templates/${ctx.groupId}/${id}-${f.name}`;
      await putBlob(storageKey, f);
      const row = {
        id, groupId: ctx.groupId, subKind: ctx.subKind, label: ctx.label, hint: ctx.hint,
        kind: ctx.groupId === "lender" ? "lender" : ctx.subKind,
        filename: f.name, mime_type: f.type, size: f.size,
        storage_key: storageKey,
        uploadedAt: new Date().toISOString(),
      };
      const next = { ...tpls, [id]: row };
      persist(next);
      fiToast(`${ctx.label} ${ctx.replaceId ? "replaced" : "uploaded"}`);
    } catch (err) {
      fiToast("Upload failed: " + (err.message || err), "err");
    } finally {
      e.target.value = "";
      uploadCtx.current = null;
    }
  };

  const onPreview = async (tpl) => {
    setPreview(tpl);
    try {
      const blob = await getBlob(tpl.storage_key);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (_e) { /* preview falls back to metadata */ }
  };
  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreview(null); setPreviewUrl(null);
  };

  const onReplace = (tpl) => {
    handleUpload(tpl.groupId, tpl.subKind, tpl.label, tpl.hint, tpl.id);
  };

  const onRemove = (tpl) => {
    if (!confirm(`Remove “${tpl.label}”? This cannot be undone.`)) return;
    const next = { ...tpls };
    delete next[tpl.id];
    persist(next);
    fiToast(`${tpl.label} removed`);
  };

  const addLender = () => {
    if (!newLenderName.trim()) return;
    const label = newLenderName.trim();
    handleUpload("lender", null, `${label} ILA certificate`, "Lender-specific template");
    setNewLenderName("");
    setAddLenderOpen(false);
  };

  // Count uploaded
  const allRows = Object.values(tpls);
  const totalUploaded = allRows.length;

  return (
    <div className="dash-grid">
      <section className="panel tpl-banner">
        <div className="tpl-banner-l">
          <div className="tpl-banner-icon"><Icon name="package" size={22}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>Templates &amp; firm-wide documents</h2>
            <p className="panel-sub">Upload once. The system personalises and pushes them to every client's portal automatically — no manual copy-pasting.</p>
          </div>
        </div>
        <div className="tpl-banner-stats">
          <div><strong>{totalUploaded}</strong><span>template{totalUploaded === 1 ? "" : "s"} uploaded</span></div>
        </div>
      </section>

      {TPL_GROUPS.map(group => {
        const groupRows = allRows.filter(r => r.groupId === group.id);
        return (
          <section key={group.id} className="panel">
            <header className="panel-head">
              <div>
                <h2 className="panel-title">{group.title}</h2>
                <p className="panel-sub">{group.desc}</p>
              </div>
              {group.free && (
                <button className="btn btn-navy" onClick={() => setAddLenderOpen(true)}>
                  <Icon name="plus" size={14}/> {group.addLabel}
                </button>
              )}
            </header>

            <div className="tpl-list">
              {/* Fixed-kind groups: render every kind, either as a real row or as an empty upload row */}
              {!group.free && (group.kinds || []).map(k => {
                const row = groupRows.find(r => r.subKind === k.key);
                return row
                  ? <TemplateRow key={k.key} tpl={row} onPreview={onPreview} onReplace={onReplace} onRemove={onRemove}/>
                  : <TemplateEmptyRow
                      key={k.key}
                      kind={k.key}
                      label={k.label}
                      hint={k.hint}
                      onUpload={(_kind, label, hint) => handleUpload(group.id, k.key, label, hint)}
                    />;
              })}

              {/* Free-form groups (lenders): list every uploaded row */}
              {group.free && groupRows.map(row => (
                <TemplateRow key={row.id} tpl={row} onPreview={onPreview} onReplace={onReplace} onRemove={onRemove}/>
              ))}
              {group.free && groupRows.length === 0 && (
                <div style={{ padding: "20px 12px", textAlign: "center", color: "#5b6b76", fontSize: 13 }}>
                  No lender templates uploaded yet. Use <strong>Add lender template</strong> above.
                </div>
              )}

              {group.id === "lender" && addLenderOpen && (
                <div className="tpl-add">
                  <div className="tpl-add-zone">
                    <Icon name="package" size={22}/>
                    <div>
                      <div className="tpl-add-title">Enter the lender's name, then upload their template</div>
                      <div className="tpl-add-sub">PDF only · we keep your master untouched</div>
                    </div>
                  </div>
                  <div className="tpl-add-actions">
                    <input
                      className="field-input"
                      placeholder="Lender name — e.g. Shawbrook Bank"
                      value={newLenderName}
                      onChange={(e) => setNewLenderName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addLender()}
                    />
                    <button className="btn btn-ghost" onClick={() => setAddLenderOpen(false)}>Cancel</button>
                    <button className="btn btn-navy" onClick={addLender} disabled={!newLenderName.trim()}>
                      <Icon name="plus" size={13}/> Choose PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}

      <section className="panel tpl-flow">
        <header className="panel-head">
          <h2 className="panel-title">How clients see your templates</h2>
        </header>
        <div className="tpl-flow-body">
          <div className="tpl-flow-step">
            <div className="tpl-flow-num">1</div>
            <div>
              <div className="tpl-flow-title">You upload here</div>
              <div className="tpl-flow-sub">PDF only · we store the master untouched</div>
            </div>
          </div>
          <Icon name="arrow-right" size={16}/>
          <div className="tpl-flow-step">
            <div className="tpl-flow-num">2</div>
            <div>
              <div className="tpl-flow-title">Auto-personalised per booking</div>
              <div className="tpl-flow-sub">CCL gets the client's name, matter, lawyer and fee</div>
            </div>
          </div>
          <Icon name="arrow-right" size={16}/>
          <div className="tpl-flow-step">
            <div className="tpl-flow-num">3</div>
            <div>
              <div className="tpl-flow-title">Shows up in client portal</div>
              <div className="tpl-flow-sub">Client downloads, signs, you see it sync back live</div>
            </div>
          </div>
        </div>
      </section>

      <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx" onChange={onFileChosen}/>
      <DocPreviewModal
        open={!!preview}
        onClose={closePreview}
        doc={preview && { name: preview.label, filename: preview.filename, size_bytes: preview.size, mime_type: preview.mime_type, storage_key: preview.storage_key }}
      />
    </div>
  );
};

Object.assign(window, { TemplatesView });

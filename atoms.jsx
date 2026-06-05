/* global React */
// Shared atoms: icons, avatars, layout helpers.

const Icon = ({ name, size = 18, stroke = 1.6, ...rest }) => {
  const s = size;
  const props = {
    width: s, height: s, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: stroke,
    strokeLinecap: "round", strokeLinejoin: "round", ...rest,
  };
  switch (name) {
    case "calendar":
      return (<svg {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>);
    case "clock":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>);
    case "user":
      return (<svg {...props}><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>);
    case "users":
      return (<svg {...props}><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M15 20c.5-2 2-3 3.5-3S21.5 18 22 20"/></svg>);
    case "bolt":
      return (<svg {...props}><path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z"/></svg>);
    case "stamp":
      return (<svg {...props}><path d="M5 21h14M7 18h10v-3a4 4 0 0 0-1.6-3.2L14 11v-3a2 2 0 0 0-4 0v3l-1.4.8A4 4 0 0 0 7 15v3z"/></svg>);
    case "doc":
      return (<svg {...props}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>);
    case "check":
      return (<svg {...props}><polyline points="20 6 9 17 4 12"/></svg>);
    case "check-circle":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>);
    case "x":
      return (<svg {...props}><path d="M18 6L6 18M6 6l12 12"/></svg>);
    case "x-circle":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M15 9l-6 6M9 9l6 6"/></svg>);
    case "arrow-right":
      return (<svg {...props}><path d="M5 12h14M13 5l7 7-7 7"/></svg>);
    case "arrow-left":
      return (<svg {...props}><path d="M19 12H5M11 5l-7 7 7 7"/></svg>);
    case "chevron-down":
      return (<svg {...props}><polyline points="6 9 12 15 18 9"/></svg>);
    case "chevron-right":
      return (<svg {...props}><polyline points="9 6 15 12 9 18"/></svg>);
    case "chevron-left":
      return (<svg {...props}><polyline points="15 6 9 12 15 18"/></svg>);
    case "search":
      return (<svg {...props}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>);
    case "phone":
      return (<svg {...props}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.4 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.5 2.7.6A2 2 0 0 1 22 16.9z"/></svg>);
    case "mail":
      return (<svg {...props}><rect x="3" y="5" width="18" height="14" rx="2"/><polyline points="3 7 12 13 21 7"/></svg>);
    case "video":
      return (<svg {...props}><rect x="3" y="6" width="13" height="12" rx="2"/><polygon points="16 10 22 7 22 17 16 14"/></svg>);
    case "shield":
      return (<svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>);
    case "award":
      return (<svg {...props}><circle cx="12" cy="9" r="6"/><path d="M8.2 13.5L7 22l5-3 5 3-1.2-8.5"/></svg>);
    case "menu":
      return (<svg {...props}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>);
    case "more":
      return (<svg {...props}><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>);
    case "globe":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>);
    case "tag":
      return (<svg {...props}><path d="M3 13V4a1 1 0 0 1 1-1h9l8 8-9 9z"/><circle cx="7.5" cy="7.5" r="1.2" fill="currentColor"/></svg>);
    case "card":
      return (<svg {...props}><rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 11h19"/></svg>);
    case "filter":
      return (<svg {...props}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>);
    case "download":
      return (<svg {...props}><path d="M12 3v12M7 10l5 5 5-5M4 19h16"/></svg>);
    case "plus":
      return (<svg {...props}><path d="M12 5v14M5 12h14"/></svg>);
    case "sparkle":
      return (<svg {...props}><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6zM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></svg>);
    case "edit":
      return (<svg {...props}><path d="M11 4H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6"/><path d="M18.5 3.5a2.1 2.1 0 0 1 3 3L12 16l-4 1 1-4z"/></svg>);
    case "trash":
      return (<svg {...props}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>);
    case "lock":
      return (<svg {...props}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>);
    case "info":
      return (<svg {...props}><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>);
    case "warning":
      return (<svg {...props}><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>);
    case "settings":
      return (<svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>);
    case "bell":
      return (<svg {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>);
    case "logout":
      return (<svg {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>);
    case "thumbs-up":
      return (<svg {...props}><path d="M7 22V11M7 11l5-9 1.5 1.2A2 2 0 0 1 14 4.8V8h5.5a2 2 0 0 1 2 2.3l-1.5 9A2 2 0 0 1 18 21H7"/></svg>);
    case "pound":
      return (<svg {...props}><path d="M16 7a3 3 0 0 0-6 0v5H7m9 0h-5m5 5H7v-2c2 0 3-1 3-3"/></svg>);
    case "star":
      return (<svg {...props} fill="currentColor" stroke="none"><polygon points="12 2 14.9 8.6 22 9.3 16.5 14 18.2 21 12 17.3 5.8 21 7.5 14 2 9.3 9.1 8.6"/></svg>);
    case "package":
      return (<svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>);
    case "send":
      return (<svg {...props}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>);
    case "drag":
      return (<svg {...props}><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/></svg>);
    case "external":
      return (<svg {...props}><path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg>);
    default:
      return null;
  }
};

// Tiny in-memory cache so we don't re-open IndexedDB for every avatar render
const __avatarCache = (window.__avatarCache = window.__avatarCache || new Map());

function loadAvatarBlob(key) {
  if (!key) return Promise.resolve(null);
  if (__avatarCache.has(key)) return Promise.resolve(__avatarCache.get(key));
  if (!window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open("fastila_files", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("blobs")) db.createObjectStore("blobs");
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction("blobs", "readonly");
        const get = tx.objectStore("blobs").get(key);
        get.onsuccess = () => {
          const blob = get.result || null;
          const url = blob ? URL.createObjectURL(blob) : null;
          __avatarCache.set(key, url);
          resolve(url);
        };
        get.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    } catch (_e) { resolve(null); }
  });
}

const Avatar = ({ lawyer, size = 40 }) => {
  // Resolve the real photo if the lawyer has one stored in IndexedDB.
  // Renders initials fallback while loading or when no photo.
  const [src, setSrc] = React.useState(lawyer?.photoUrl || null);
  React.useEffect(() => {
    let cancelled = false;
    // Bust cache when key changes: store with key prevents stale reuse
    if (lawyer?.photoUrl) { setSrc(lawyer.photoUrl); return; }
    if (lawyer?.photoKey) {
      loadAvatarBlob(lawyer.photoKey).then(url => { if (!cancelled) setSrc(url); });
    } else {
      setSrc(null);
    }
    return () => { cancelled = true; };
  }, [lawyer?.photoKey, lawyer?.photoUrl, lawyer?.photoUpdatedAt]);

  const bg = lawyer?.photoBg || "#0a4a67";
  const initials = lawyer?.initials || (lawyer?.name || "—").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt={lawyer?.name || "Avatar"}
        style={{
          width: size, height: size, borderRadius: "50%",
          objectFit: "cover", flexShrink: 0, background: bg, display: "inline-block",
        }}
        onError={(e) => { e.target.style.display = "none"; }}
      />
    );
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg,
      color: "white",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36, letterSpacing: "-0.02em",
      fontFamily: "var(--font-display)", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
};

// Status pill helper
const StatusPill = ({ status }) => {
  const map = {
    scheduled: { cls: "pill-info", label: "Scheduled" },
    completed: { cls: "pill-success", label: "Completed" },
    "no-show": { cls: "pill-danger", label: "No-show" },
    cancelled: { cls: "pill-muted", label: "Cancelled" },
    rescheduled: { cls: "pill-warning", label: "Rescheduled" },
    paid: { cls: "pill-success", label: "Paid" },
    pending: { cls: "pill-warning", label: "Pending" },
    refunded: { cls: "pill-muted", label: "Refunded" },
    waived: { cls: "pill-muted", label: "Waived" },
    not_started: { cls: "pill-muted", label: "Not started" },
    awaiting_signature: { cls: "pill-warning", label: "Awaiting signature" },
    signed: { cls: "pill-info", label: "Signed" },
    ready_to_post: { cls: "pill-warning", label: "Ready to post" },
    posted: { cls: "pill-info", label: "Posted" },
    delivered: { cls: "pill-success", label: "Delivered" },
    returned_undelivered: { cls: "pill-danger", label: "Returned" },
  };
  const entry = map[status] || { cls: "pill-muted", label: status };
  return <span className={`pill ${entry.cls}`}>{entry.label}</span>;
};

// Badge helper for service cards
const ServiceBadge = ({ badge, badgeStyle }) => {
  if (!badge) return null;
  const cls = {
    lime: "pill-lime",
    navy: "pill-navy",
    cream: "pill-cream",
  }[badgeStyle] || "pill-muted";
  return <span className={`pill ${cls}`}>{badge}</span>;
};

Object.assign(window, { Icon, Avatar, StatusPill, ServiceBadge });

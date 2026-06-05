/* global React, Icon, Avatar, BOOKINGS, LAWYERS, SERVICES */

// ============================================================================
// GlobalSearch — Cmd+K / Ctrl+K spotlight
// Indexes clients, lenders, brokers, lawyers, tracking numbers, templates,
// AI prompts, and every dashboard section. Type → jump.
// ============================================================================

// Mock lender / broker lists for the index — kept in sync with their own views
const LENDER_NAMES = [
  "Shawbrook Bank plc", "Together Money", "Aldermore Bank", "Precise Mortgages",
  "Kensington Mortgages", "Hampshire Trust Bank", "United Trust Bank", "Paragon Bank",
  "OakNorth Bank", "Funding Circle",
];

const BROKER_INDEX = [
  { id: "b1", name: "Sarah Patel", firm: "Patel Finance Brokers" },
  { id: "b2", name: "James Hardwick", firm: "Hardwick Mortgages Ltd" },
  { id: "b3", name: "Priti Shah", firm: "Shah Property Finance" },
  { id: "b4", name: "David Lin", firm: "Linwood Capital" },
  { id: "b5", name: "Anya Kowalski", firm: "Kowalski & Co Brokers" },
  { id: "b6", name: "Marcus Brown", firm: "Brown & Sons Finance" },
];

const SECTIONS = [
  { id: "today", label: "Today", icon: "calendar", desc: "Your day's schedule" },
  { id: "bookings", label: "All bookings", icon: "doc", desc: "Search, filter, export" },
  { id: "signatures", label: "My signatures", icon: "edit", desc: "Digital + wet signing" },
  { id: "royalmail", label: "Royal Mail queue", icon: "stamp", desc: "Wet-sig tracking" },
  { id: "lawyers", label: "Lawyers & availability", icon: "users", desc: "Profiles, calendars" },
  { id: "lenders", label: "Lender knowledge base", icon: "award", desc: "Digital / wet preferences" },
  { id: "brokers", label: "Broker panel", icon: "users", desc: "Referrals & mailings" },
  { id: "templates", label: "Templates", icon: "package", desc: "Firm-wide documents" },
  { id: "integrations", label: "Integrations", icon: "settings", desc: "N8N, calendars, AI" },
  { id: "prompts", label: "AI prompts", icon: "sparkle", desc: "Claude system prompts" },
  { id: "reports", label: "Reports & revenue", icon: "pound", desc: "Monthly breakdown" },
  { id: "profile", label: "My profile", icon: "user", desc: "Your saved signature" },
];

const GlobalSearch = ({ open, onClose, role, onNavigate, onOpenDetail }) => {
  const [q, setQ] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const inputRef = React.useRef(null);

  // Reset when opening
  React.useEffect(() => {
    if (open) {
      setQ("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // Keyboard handler for ↑↓ Enter Esc
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && results[activeIdx]) {
        e.preventDefault();
        pick(results[activeIdx]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, activeIdx]); // eslint-disable-line

  // Build the index
  const index = React.useMemo(() => {
    const items = [];
    // Bookings → clients
    BOOKINGS.forEach(b => {
      const svc = SERVICES.find(s => s.id === b.serviceId);
      items.push({
        type: "client",
        id: `client-${b.ref}`,
        label: b.clientName,
        sub: `${svc?.short || ""} · ${b.lender || "—"} · ${b.date} ${b.time}`,
        searchable: `${b.clientName} ${b.clientEmail || ""} ${b.phone || ""} ${b.lender || ""} ${b.trackingNumber || ""}`.toLowerCase(),
        action: { kind: "openBooking", ref: b.ref },
        icon: "user",
        tags: [b.trackingNumber && "tracking"].filter(Boolean),
      });
    });
    // Lenders
    LENDER_NAMES.forEach(name => {
      items.push({
        type: "lender", id: `lender-${name}`, label: name, sub: "Lender",
        searchable: name.toLowerCase(),
        action: { kind: "go", view: "lenders" },
        icon: "award",
      });
    });
    // Brokers
    BROKER_INDEX.forEach(b => {
      items.push({
        type: "broker", id: `broker-${b.id}`, label: b.name, sub: `Broker · ${b.firm}`,
        searchable: `${b.name} ${b.firm}`.toLowerCase(),
        action: { kind: "go", view: "brokers" },
        icon: "users",
      });
    });
    // Lawyers
    LAWYERS.forEach(l => {
      items.push({
        type: "lawyer", id: `lawyer-${l.id}`, label: l.name, sub: `Lawyer · ${l.sra}`,
        searchable: `${l.name} ${l.sra || ""}`.toLowerCase(),
        action: { kind: "go", view: "lawyers" },
        icon: "user",
      });
    });
    // Sections (filtered by role)
    SECTIONS.forEach(s => {
      // Hide admin-only sections from lawyers
      const adminOnly = ["brokers", "templates", "integrations", "prompts", "reports", "lawyers"];
      if (role === "lawyer" && adminOnly.includes(s.id)) return;
      items.push({
        type: "section", id: `section-${s.id}`, label: s.label, sub: s.desc,
        searchable: `${s.label} ${s.desc}`.toLowerCase(),
        action: { kind: "go", view: s.id },
        icon: s.icon,
      });
    });
    return items;
  }, [role]);

  const results = React.useMemo(() => {
    if (!q.trim()) {
      // Recent / suggested
      return [
        ...index.filter(i => i.type === "client").slice(0, 4),
        ...index.filter(i => i.type === "section").slice(0, 6),
      ];
    }
    const query = q.toLowerCase();
    const matched = index.filter(i => i.searchable.includes(query));
    // Sort: starts-with > word-boundary > contains
    return matched.sort((a, b) => {
      const aStarts = a.label.toLowerCase().startsWith(query);
      const bStarts = b.label.toLowerCase().startsWith(query);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
    }).slice(0, 12);
  }, [q, index]);

  const pick = (item) => {
    if (item.action.kind === "openBooking") {
      onOpenDetail(item.action.ref);
    } else if (item.action.kind === "go") {
      onNavigate(item.action.view);
    }
    onClose();
  };

  // Group results by type
  const grouped = React.useMemo(() => {
    const g = {};
    results.forEach(r => { (g[r.type] = g[r.type] || []).push(r); });
    return g;
  }, [results]);

  const groupOrder = ["client", "lender", "broker", "lawyer", "section"];
  const groupLabels = {
    client: "Clients",
    lender: "Lenders",
    broker: "Brokers",
    lawyer: "Lawyers",
    section: "Go to",
  };

  if (!open) return null;

  // Flat index for keyboard navigation matches the visual order
  let flatIdx = -1;

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-modal" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-wrap">
          <Icon name="search" size={18}/>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search clients, lenders, brokers, lawyers, tracking numbers…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
          />
          <kbd className="search-esc">ESC</kbd>
        </div>

        <div className="search-results">
          {results.length === 0 ? (
            <div className="search-empty">
              <Icon name="search" size={20}/>
              <span>No matches for <strong>"{q}"</strong></span>
            </div>
          ) : (
            groupOrder.map(groupKey => {
              const items = grouped[groupKey];
              if (!items || items.length === 0) return null;
              return (
                <div key={groupKey} className="search-group">
                  <div className="search-group-label">{groupLabels[groupKey]}</div>
                  {items.map(item => {
                    flatIdx++;
                    const isActive = flatIdx === activeIdx;
                    const myIdx = flatIdx;
                    return (
                      <button
                        key={item.id}
                        className={`search-result ${isActive ? "is-active" : ""}`}
                        onMouseEnter={() => setActiveIdx(myIdx)}
                        onClick={() => pick(item)}
                      >
                        <div className="search-result-icon"><Icon name={item.icon} size={14}/></div>
                        <div className="search-result-info">
                          <div className="search-result-label">
                            {highlight(item.label, q)}
                          </div>
                          <div className="search-result-sub">{item.sub}</div>
                        </div>
                        <Icon name="arrow-right" size={12} className="search-result-arrow"/>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        <footer className="search-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>ESC</kbd> close</span>
        </footer>
      </div>
    </div>
  );
};

// Highlight matching substring
const highlight = (text, q) => {
  if (!q.trim()) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
};

// ----------------------------------------------------------------------------
// Hook — wire up the Cmd+K / Ctrl+K shortcut at the app shell level
// ----------------------------------------------------------------------------
const useGlobalSearch = () => {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen };
};

Object.assign(window, { GlobalSearch, useGlobalSearch });

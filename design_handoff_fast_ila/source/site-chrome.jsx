/* global React, Icon */
// Site chrome — Fast-ILA navy header, top banner, footer strip.
// Mimics the public site so the booking widget can be shown in-context.

const SiteHeader = ({ onBookClick, compact = false }) => {
  return (
    <header className="site-header">
      <div className="site-banner">INSTANT BOOKING: SELECT DATE &amp; TIME</div>
      <div className="site-nav">
        <div className="site-nav-inner">
          <a className="brand-wordmark on-light" href="#" onClick={(e) => e.preventDefault()}>
            <span className="b-fast">fast</span>
            <span className="b-ila">ila<span className="b-mark"/></span>
          </a>
          {!compact && (
            <nav className="site-nav-links">
              <a href="#" onClick={(e) => e.preventDefault()}>Expertise <Icon name="chevron-down" size={14}/></a>
              <a href="#" onClick={(e) => e.preventDefault()}>Client Stories</a>
              <a href="#" onClick={(e) => e.preventDefault()}>About <Icon name="chevron-down" size={14}/></a>
              <a href="#" onClick={(e) => e.preventDefault()}>Resources <Icon name="chevron-down" size={14}/></a>
            </nav>
          )}
          <div className="site-nav-right">
            {!compact && (
              <button className="site-search" aria-label="Search">
                <Icon name="search" size={18}/>
              </button>
            )}
            <button className="btn btn-lime btn-lg" onClick={onBookClick}>
              <Icon name="calendar" size={16}/>
              Book Now
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

const SiteGuaranteeStrip = () => (
  <div className="site-guarantee">
    <div className="site-guarantee-inner">
      <div className="row items-center gap-3">
        <Icon name="award" size={20}/>
        <strong>Price &amp; Service Guarantee</strong>
      </div>
      <div className="row items-center gap-2">
        <span>Got a quote?</span>
        <a href="#" onClick={(e) => e.preventDefault()}><u>We will beat it by at least 10%</u></a>
      </div>
    </div>
  </div>
);

const SiteFooterStrip = () => (
  <div className="site-foot-strip">
    <div className="site-foot-inner">
      <div className="site-foot-pill">
        <Icon name="thumbs-up" size={22}/>
        <span>24-Hour Turnaround</span>
      </div>
      <div className="site-foot-pill">
        <Icon name="pound" size={22}/>
        <span>Fixed fees</span>
      </div>
      <div className="site-foot-pill">
        <Icon name="award" size={22}/>
        <span>Regulated lawyers</span>
      </div>
      <div className="site-foot-pill">
        <Icon name="calendar" size={22}/>
        <span>Book Online</span>
      </div>
    </div>
  </div>
);

const TrustpilotMini = () => (
  <div className="trustpilot-mini">
    <div className="tp-label">Excellent</div>
    <div className="tp-stars">
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className="tp-star">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff9d2a"><polygon points="12 2 14.9 8.6 22 9.3 16.5 14 18.2 21 12 17.3 5.8 21 7.5 14 2 9.3 9.1 8.6"/></svg>
        </span>
      ))}
    </div>
    <div className="tp-meta">
      <strong>5 out of 5</strong> from <strong>1,400+</strong> clients
    </div>
    <div className="tp-meta tp-sub">Rated Excellent on Trustpilot</div>
  </div>
);

// Inject site chrome styles once
const siteChromeStyles = `
.site-header { width: 100%; background: var(--navy-900); }
.site-banner {
  text-align: center;
  color: var(--white);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  padding: 8px 12px;
  background: var(--navy-900);
}
.site-nav { background: var(--white); border-bottom: 1px solid var(--hairline); }
.site-nav-inner {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 16px 28px;
  display: flex;
  align-items: center;
  gap: 32px;
}
.site-nav-links { display: flex; align-items: center; gap: 28px; flex: 1; }
.site-nav-links a {
  color: var(--navy-900);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.site-nav-links a:hover { color: var(--navy-600); }
.site-nav-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.site-search {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: transparent;
  border: none;
  color: var(--navy-900);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.site-search:hover { background: var(--off-white); }

.site-guarantee { background: var(--lime); }
.site-guarantee-inner {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 14px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: var(--navy-900);
  font-size: 14px;
  flex-wrap: wrap;
  gap: 12px;
}
.site-guarantee-inner a { color: var(--navy-900); font-weight: 600; }

.site-foot-strip { background: var(--off-white); border-top: 1px solid var(--hairline); }
.site-foot-inner {
  max-width: var(--max-w);
  margin: 0 auto;
  padding: 24px 28px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.site-foot-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--navy-900);
  font-weight: 700;
  font-size: 14px;
}
@media (max-width: 720px) {
  .site-nav-links { display: none; }
  .site-nav-inner { padding: 14px 18px; }
  .site-banner { font-size: 11px; }
  .site-foot-inner { grid-template-columns: repeat(2, 1fr); gap: 20px; padding: 22px 18px; }
  .site-guarantee-inner { padding: 12px 18px; font-size: 13px; }
}

.trustpilot-mini {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-radius: var(--r-md);
  background: rgba(255,255,255,0.06);
  color: var(--white);
}
.tp-label { font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }
.tp-stars { display: inline-flex; gap: 2px; }
.tp-meta { font-size: 12px; opacity: 0.9; }
.tp-meta strong { font-weight: 700; }
.tp-sub { font-size: 11px; opacity: 0.7; }
`;

const SiteChromeStyles = () => <style>{siteChromeStyles}</style>;

Object.assign(window, { SiteHeader, SiteGuaranteeStrip, SiteFooterStrip, TrustpilotMini, SiteChromeStyles });

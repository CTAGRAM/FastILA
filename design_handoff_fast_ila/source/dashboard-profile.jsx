/* global React, Icon, Avatar, LAWYERS, LawyerSignatureCard */

// ============================================================================
// LawyerProfileView — accessible from sidebar "My profile"
// Lets each lawyer save their own e-signature (used everywhere in Fast-ILA)
// ============================================================================
const LawyerProfileView = ({ lawyerId = "amelia" }) => {
  const lawyer = LAWYERS.find(l => l.id === lawyerId) || LAWYERS[0];

  return (
    <div className="dash-grid">
      <section className="panel">
        <header className="panel-head">
          <div className="row items-center gap-3">
            <Avatar lawyer={lawyer} size={56}/>
            <div>
              <h2 className="panel-title" style={{ fontSize: 18 }}>{lawyer.name}</h2>
              <p className="panel-sub">{lawyer.sra} · {lawyer.languages.join(" · ")}</p>
            </div>
          </div>
          <button className="btn btn-ghost"><Icon name="edit" size={13}/> Edit profile</button>
        </header>
        <div className="aside-body" style={{ padding: "16px 22px" }}>
          <div className="aside-row"><span className="aside-label">Email</span><span className="mono">amelia.hart@nexalaw.com</span></div>
          <div className="aside-row"><span className="aside-label">Calendar sync</span><span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Google Calendar</span></div>
          <div className="aside-row"><span className="aside-label">Daily cap</span><span>6 bookings</span></div>
        </div>
      </section>

      <LawyerSignatureCard lawyerId={lawyerId} lawyerName={lawyer.name}/>
    </div>
  );
};

Object.assign(window, { LawyerProfileView });

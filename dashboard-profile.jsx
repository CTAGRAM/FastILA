/* global React, Icon, Avatar, LAWYERS, LawyerSignatureCard, FastILA,
   ProfileEditModal, LawyerEditModal, CalendarConnectPanel, fiToast */

// ============================================================================
// LawyerProfileView — "My profile" page for a signed-in lawyer.
// Pulls the lawyer record from LAWYERS (if linked) and the user record from
// FastILA.users for email + name. Safe when nothing exists yet.
// ============================================================================
const LawyerProfileView = ({ lawyerId }) => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();

  // Resolve current user from session (set by app.jsx when signed in)
  const sessionEmail = (() => {
    try {
      const raw = localStorage.getItem("fastila_session_v1");
      return raw ? (JSON.parse(raw).email || null) : null;
    } catch (_e) { return null; }
  })();
  const me = sessionEmail ? FastILA.users.findByEmail(sessionEmail) : null;

  // Pick the linked lawyer record. Prop wins, fall back to session.lawyerId.
  const effectiveLawyerId = lawyerId || me?.lawyerId || null;
  const lawyer = (LAWYERS || []).find(l => l.id === effectiveLawyerId) || null;

  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [editLawyerOpen, setEditLawyerOpen] = React.useState(false);

  // Empty state — user has no linked lawyer profile yet (admin hasn't created one)
  if (!lawyer) {
    return (
      <div className="dash-grid">
        <section className="panel" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ marginBottom: 12, color: "#5b6b76" }}><Icon name="user" size={36}/></div>
          <h2 className="panel-title">Profile not set up yet</h2>
          <p className="panel-sub" style={{ maxWidth: 460, margin: "8px auto 16px" }}>
            {me ? (
              <>You're signed in as <strong>{me.fullName || me.email}</strong>, but no lawyer record is linked to your account. An admin can link one via <strong>Settings → Team &amp; access</strong>.</>
            ) : (
              <>Sign in to view your profile.</>
            )}
          </p>
          {me && (
            <button className="btn btn-navy" onClick={() => setEditProfileOpen(true)}>
              <Icon name="edit" size={14}/> Edit my account
            </button>
          )}
        </section>
        <ProfileEditModal
          open={editProfileOpen}
          onClose={() => setEditProfileOpen(false)}
          user={me}
          onSaved={() => fiToast("Profile updated")}
        />
      </div>
    );
  }

  const fullName = lawyer.name || me?.fullName || "Solicitor";
  const sra = lawyer.sra || "SRA pending";
  const langs = (lawyer.languages && lawyer.languages.length) ? lawyer.languages : ["English"];
  const email = me?.email || "—";

  return (
    <div className="dash-grid">
      <section className="panel">
        <header className="panel-head">
          <div className="row items-center gap-3">
            <Avatar lawyer={lawyer} size={56}/>
            <div>
              <h2 className="panel-title" style={{ fontSize: 18 }}>{fullName}</h2>
              <p className="panel-sub">{sra} · {langs.join(" · ")}</p>
            </div>
          </div>
          <div className="row gap-2">
            <button className="btn btn-ghost" onClick={() => setEditProfileOpen(true)}>
              <Icon name="edit" size={13}/> Edit account
            </button>
            <button className="btn btn-ghost" onClick={() => setEditLawyerOpen(true)}>
              <Icon name="user" size={13}/> Edit lawyer record
            </button>
          </div>
        </header>
        <div className="aside-body" style={{ padding: "16px 22px" }}>
          <div className="aside-row"><span className="aside-label">Email</span><span className="mono">{email}</span></div>
          <div className="aside-row"><span className="aside-label">SRA</span><span className="mono">{sra}</span></div>
          <div className="aside-row"><span className="aside-label">Languages</span><span>{langs.join(", ")}</span></div>
          {lawyer.bio && <div className="aside-row"><span className="aside-label">Bio</span><span style={{ maxWidth: 420 }}>{lawyer.bio}</span></div>}
        </div>
      </section>

      {typeof CalendarConnectPanel === "function" && (
        <section className="panel" style={{ padding: 16 }}>
          <header className="panel-head" style={{ padding: "0 0 12px", background: "transparent" }}>
            <div>
              <h2 className="panel-title" style={{ fontSize: 16 }}>Calendar &amp; diary</h2>
              <p className="panel-sub">Connect your Google or Outlook diary so your real availability shows on the booking form, and bookings land on your calendar with a Meet/Teams link.</p>
            </div>
          </header>
          <CalendarConnectPanel lawyerId={effectiveLawyerId} lawyerName={fullName}/>
        </section>
      )}

      {typeof LawyerSignatureCard === "function" && (
        <LawyerSignatureCard lawyerId={effectiveLawyerId} lawyerName={fullName}/>
      )}

      <ProfileEditModal
        open={editProfileOpen}
        onClose={() => setEditProfileOpen(false)}
        user={me}
        onSaved={() => fiToast("Profile updated")}
      />
      <LawyerEditModal
        open={editLawyerOpen}
        onClose={() => setEditLawyerOpen(false)}
        lawyer={lawyer}
        onSaved={() => fiToast("Lawyer record updated")}
      />
    </div>
  );
};

Object.assign(window, { LawyerProfileView });

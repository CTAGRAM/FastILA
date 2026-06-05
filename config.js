/* Fast-ILA runtime configuration.
 * Replace the values below with your Supabase project URL and anon key.
 * Leave blank to run in MOCK mode (uses the seed data in data.jsx — useful for
 * design previews without a live backend).
 *
 *   1) Create a project at https://supabase.com
 *   2) Run supabase/migrations/*.sql then supabase/seed.sql against it
 *   3) Paste the URL and anon key here
 *   4) (Optional) deploy the edge functions:  supabase functions deploy create-booking send-booking-email
 */
window.FAST_ILA_CONFIG = {
  supabaseUrl: "https://xcndxuunmmtyntabtgbr.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjbmR4dXVubW10eW50YWJ0Z2JyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNjg0OTksImV4cCI6MjA5NTc0NDQ5OX0.anVJev0StLmyNqfgPAZrzEBmFcScSdu2Wx7HzQ5rzKM",
  portalReturnUrl: window.location.origin + window.location.pathname,
  brand: {
    firm: "Nexa Law Ltd",
    tradingAs: "Fast-ILA",
    domain: "fast-ila.co.uk",
    supportEmail: "info@fast-ila.co.uk",
  },
  features: {
    realBackend: false,   // auto-set to true at runtime when the keys above are filled
    sendEmails: true,
    enforceAuth: true,    // require Google / magic-link sign-in on portal + dashboard
  },
};

// Auto-flip realBackend when keys look populated.
(function () {
  const c = window.FAST_ILA_CONFIG;
  c.features.realBackend = Boolean(c.supabaseUrl && c.supabaseAnonKey);
})();

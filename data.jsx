/* global window */
// Mock data for the Fast-ILA prototype.
// Services, lawyers, bookings, and helpers used by the booking flow and dashboard.

const SERVICES = [
  {
    id: "urgent",
    slug: "urgent-same-day",
    name: "Urgent / Same-Day ILA Booking",
    short: "Urgent / Same-Day",
    price: 175,
    priceNet: 145.83,
    priceVat: 29.17,
    duration: 60,
    badge: "Fastest Service",
    badgeStyle: "lime",
    minNoticeHours: 2,
    attendeeCount: 1,
    requiresWetSig: false,
    weekends: false,
    delivery: "digital",
    description: "Same-day certificate · Google Meet · digital delivery",
    icon: "bolt",
  },
  {
    id: "standard",
    slug: "ila-standard",
    name: "ILA — Standard Appointment",
    short: "ILA Standard",
    price: 145,
    priceNet: 120.83,
    priceVat: 24.17,
    duration: 45,
    badge: "Most Popular",
    badgeStyle: "navy",
    minNoticeHours: 48,
    attendeeCount: 1,
    requiresWetSig: false,
    weekends: false,
    delivery: "digital",
    description: "45-minute Google Meet · digital certificate within 24h",
    icon: "doc",
  },
  {
    id: "couples",
    slug: "ila-couples",
    name: "ILA for Couples / Joint Signatories",
    short: "ILA for Couples",
    price: 250,
    priceNet: 208.33,
    priceVat: 41.67,
    duration: 60,
    badge: "Best Value",
    badgeStyle: "cream",
    minNoticeHours: 48,
    attendeeCount: 2,
    requiresWetSig: true,
    weekends: false,
    delivery: "postal",
    description: "Both signatories · Google Meet · postage included",
    icon: "users",
  },
  {
    id: "wet",
    slug: "wet-signature-weekend",
    name: "Wet Signature / Weekend",
    short: "Wet Signature / Weekend",
    price: 200,
    priceNet: 166.67,
    priceVat: 33.33,
    duration: 60,
    badge: "Includes Postage",
    badgeStyle: "navy",
    minNoticeHours: 48,
    attendeeCount: 1,
    requiresWetSig: true,
    weekends: true,
    delivery: "postal",
    description: "Google Meet · signed in ink · Royal Mail Special Delivery",
    icon: "stamp",
  },
];

// Lawyers are added by the admin via Settings → Invite member or Lawyers → Add lawyer.
const LAWYERS = [];

// Today is May 27, 2026 - Wed. Build calendar around it.
const TODAY = new Date(2026, 4, 27); // May 27, 2026 (month is 0-indexed)

function fmtTime(d) {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function fmtDateLong(d) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDateShort(d) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// Generate availability map for next 60 days.
// Key: yyyy-mm-dd, Value: array of "HH:MM" slots
function buildAvailability(serviceId) {
  const svc = SERVICES.find(s => s.id === serviceId);
  const map = {};
  for (let i = 0; i < 60; i++) {
    const d = addDays(TODAY, i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    if (isWeekend && !svc.weekends) continue;
    // Skip some random days for realism
    if (i > 0 && (i * 7) % 11 === 0) continue;

    // Time slots: stagger by service
    const slots = [];
    const baseHours = serviceId === "urgent" ? [9, 11, 13, 15, 16, 17, 18]
      : serviceId === "wet" ? [10, 12, 14, 16]
      : [9, 10, 11, 13, 14, 15, 16, 17];
    baseHours.forEach((h, idx) => {
      // Skip some slots for realism
      if ((i + idx) % 5 === 0) return;
      const m = (idx % 2) * 30;
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    });

    // Urgent: today must have slots within 2-hour notice
    if (serviceId === "urgent" && i === 0) {
      const nowH = 14; // pretend it's 14:00
      const filtered = slots.filter(s => parseInt(s) >= nowH + 2);
      if (filtered.length > 0) {
        const key = ymd(d);
        map[key] = filtered;
      }
      continue;
    }
    // Standard / Couples / Wet: needs 48h notice
    if (i < 2 && serviceId !== "urgent") continue;

    const key = ymd(d);
    if (slots.length > 0) map[key] = slots;
  }
  return map;
}

function ymd(d) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Booking statuses + dispatch stages (used by filters/forms)
const STATUSES = ["scheduled", "completed", "no-show", "cancelled"];
const DISPATCH = ["not_started", "awaiting_signature", "signed", "ready_to_post", "posted", "delivered"];

// Starts empty — bookings come from the public form, the portal, or admin's
// "+ New booking" modal. KPI numbers below are recomputed by api.jsx on every
// mutation so the dashboard always reflects real data.
const BOOKINGS = [];

const KPI = {
  todayBookings: 0,
  weekBookings: 0,
  weekRevenueGross: 0,
  weekRevenueNet: 0,
  pendingPayments: 0,
  outstandingSig: 0,
  awaitingPost: 0,
  noShowsThisWeek: 0,
  conversion: 0,
};

// Matter types — Fast-ILA acts for the GUARANTOR / individual, not the company.
const MATTER_TYPES = [
  {
    id: "personal-guarantee",
    name: "Personal Guarantee",
    short: "Personal Guarantee",
    desc: "Director or third-party guaranteeing a company facility",
  },
  {
    id: "occupiers-consent",
    name: "Occupier's Consent",
    short: "Occupier's Consent",
    desc: "Non-borrowing adult occupier postponing rights to a lender",
  },
  {
    id: "transfer-of-equity",
    name: "Transfer of Equity",
    short: "Transfer of Equity",
    desc: "Adding / removing a name on a property title",
  },
  {
    id: "disponer-certificate",
    name: "Disponer Certificate",
    short: "Disponer Certificate",
    desc: "Confirmation of independent advice on a transfer / disposition",
  },
  {
    id: "jbsp-mortgage",
    name: "Joint Borrower Sole Proprietor",
    short: "JBSP Mortgage",
    desc: "Co-borrower with no legal title (typically parent/child)",
  },
  {
    id: "bridging-loan",
    name: "Bridging Loan",
    short: "Bridging Loan",
    desc: "Short-term secured lending — usually with personal guarantee",
  },
  {
    id: "deed-of-subordination",
    name: "Deed of Subordination",
    short: "Deed of Subordination",
    desc: "Subordinating a director's loan / charge behind a senior lender",
  },
];

// Reports series — empty by default. Reports view derives from BOOKINGS in real
// time when this is empty.
const MONTHLY_REVENUE = [];
const LAWYER_REVENUE_THIS_MONTH = [];

Object.assign(window, {
  SERVICES, LAWYERS, BOOKINGS, KPI, MATTER_TYPES, MONTHLY_REVENUE, LAWYER_REVENUE_THIS_MONTH,
  TODAY, fmtTime, fmtDateLong, fmtDateShort, addDays, ymd,
  buildAvailability,
});

// ---------------------------------------------------------------------------
// Live data sync — when FastILA is in 'live' mode, fetch real rows from
// Supabase and replace the seed arrays before the first dashboard render.
// Components that captured a reference to window.BOOKINGS earlier will use
// the new array because we mutate in-place where possible.
// ---------------------------------------------------------------------------
window.FastILA_loadLive = async function () {
  if (!window.FastILA || window.FastILA.mode !== "live") return false;
  try {
    const [svcs, laws, books, matters] = await Promise.all([
      window.FastILA.services.list(),
      window.FastILA.lawyers.list(),
      window.FastILA.bookings.list(),
      window.FastILA.matterTypes.list(),
    ]);

    // Translate Supabase shapes back to the camelCase shape the existing UI expects.
    if (svcs && svcs.length) {
      const mapped = svcs.map(s => ({
        id: s.id, slug: s.slug, name: s.name, short: s.short_name || s.name,
        price: Number(s.price), priceNet: Number(s.price_net || 0), priceVat: Number(s.price_vat || 0),
        duration: s.duration, badge: s.badge, badgeStyle: s.badge_style,
        minNoticeHours: s.min_notice_hours, attendeeCount: s.attendee_count,
        requiresWetSig: s.requires_wet_sig, weekends: s.weekends, delivery: s.delivery,
        description: s.description, icon: s.icon,
      }));
      window.SERVICES.length = 0;
      mapped.forEach(m => window.SERVICES.push(m));
    }

    if (laws && laws.length) {
      const mapped = laws.map(l => ({
        id: l.id, name: l.name, initials: l.initials, sra: l.sra, photoBg: l.photo_bg,
        languages: l.languages || [], services: l.services || [],
        rating: Number(l.rating), reviews: l.reviews || 0, bio: l.bio || "",
        nextSlot: l.next_slot || "Today", bookingsToday: l.bookings_today || 0,
      }));
      window.LAWYERS.length = 0;
      mapped.forEach(m => window.LAWYERS.push(m));
    }

    if (books && books.length) {
      const mapped = books.map(b => ({
        ref: b.ref, clientName: b.client_name, clientEmail: b.client_email,
        serviceId: b.service_id, lawyerId: b.lawyer_id,
        date: b.appointment_date, time: (b.appointment_time || "").slice(0, 5),
        status: b.status, payment: b.payment_status, amount: Number(b.amount || 0),
        source: b.source, lender: b.lender, phone: b.client_phone,
        legal: b.legal_summary, secondSignatory: b.second_signatory_name,
        dispatch: b.dispatch, trackingNumber: b.tracking_number, trackingService: b.tracking_service,
      }));
      window.BOOKINGS.length = 0;
      mapped.forEach(m => window.BOOKINGS.push(m));
    }

    if (matters && matters.length) {
      const mapped = matters.map(m => ({
        id: m.id, name: m.name, short: m.short_name || m.name, desc: m.description || "",
      }));
      window.MATTER_TYPES.length = 0;
      mapped.forEach(x => window.MATTER_TYPES.push(x));
    }

    // KPI snapshot — derive from current bookings array
    if (books && books.length) {
      const todayStr = ymd(new Date());
      const today = books.filter(b => b.appointment_date === todayStr).length;
      const weekRev = books
        .filter(b => b.payment_status === "paid")
        .reduce((sum, b) => sum + Number(b.amount || 0), 0);
      window.KPI.todayBookings = today;
      window.KPI.weekBookings = books.length;
      window.KPI.weekRevenueGross = weekRev;
      window.KPI.weekRevenueNet = +(weekRev / 1.2).toFixed(2);
      window.KPI.pendingPayments = books.filter(b => b.payment_status === "pending").length;
    }

    window.dispatchEvent(new CustomEvent("fastila:data-loaded", { detail: { source: "live" } }));
    return true;
  } catch (e) {
    console.warn("[FastILA] live data load failed; staying on mock seed", e);
    return false;
  }
};

// Kick it off after the page settles — non-blocking.
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => window.FastILA_loadLive());
  } else {
    setTimeout(() => window.FastILA_loadLive(), 0);
  }
}

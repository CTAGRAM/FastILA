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

const LAWYERS = [
  {
    id: "amelia",
    name: "Amelia Hart",
    initials: "AH",
    sra: "SRA 8214091",
    photoBg: "#1f7497",
    languages: ["English", "French"],
    nextSlot: "Today 16:00",
    bookingsToday: 4,
    services: ["urgent", "standard", "couples"],
    rating: 4.9,
    reviews: 312,
    bio: "12 years in property finance ILA. Bridging, JBSP, complex personal guarantees.",
  },
  {
    id: "raj",
    name: "Raj Patel",
    initials: "RP",
    sra: "SRA 6109823",
    photoBg: "#0a4a67",
    languages: ["English", "Hindi", "Gujarati"],
    nextSlot: "Today 17:30",
    bookingsToday: 5,
    services: ["urgent", "standard", "couples", "wet"],
    rating: 4.9,
    reviews: 401,
    bio: "Specialist in joint signatory matters and secured lending.",
  },
  {
    id: "sofia",
    name: "Sofia Martín",
    initials: "SM",
    sra: "SRA 7331205",
    photoBg: "#115d7e",
    languages: ["English", "Spanish", "Portuguese"],
    nextSlot: "Tomorrow 09:30",
    bookingsToday: 3,
    services: ["standard", "couples", "wet"],
    rating: 5.0,
    reviews: 188,
    bio: "Cross-border ILA, weekends, wet-signature dispatch.",
  },
  {
    id: "tom",
    name: "Tom Whitfield",
    initials: "TW",
    sra: "SRA 5982017",
    photoBg: "#042b3d",
    languages: ["English"],
    nextSlot: "Mon 10:00",
    bookingsToday: 2,
    services: ["standard", "urgent"],
    rating: 4.8,
    reviews: 226,
    bio: "Fast turnaround urgent ILA. Plain-English explainer.",
  },
];

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

// Mock bookings for the dashboard
const STATUSES = ["scheduled", "completed", "no-show", "cancelled"];
const DISPATCH = ["not_started", "awaiting_signature", "signed", "ready_to_post", "posted", "delivered"];

const BOOKINGS = [
  {
    ref: "FI-2026-00481", clientName: "Hannah Okonkwo", clientEmail: "hannah.o@gmail.com",
    serviceId: "urgent", lawyerId: "amelia", date: "2026-05-27", time: "15:00",
    status: "scheduled", payment: "paid", amount: 175, source: "fast-ila.co.uk",
    lender: "Funding Circle", phone: "+44 7700 900821", legal: "Personal guarantee for SME loan, signing tomorrow.",
  },
  {
    ref: "FI-2026-00482", clientName: "Daniel Ferreira", clientEmail: "d.ferreira@outlook.com",
    serviceId: "standard", lawyerId: "raj", date: "2026-05-27", time: "16:00",
    status: "scheduled", payment: "paid", amount: 145, source: "fast-ila.com",
    lender: "Together Money", phone: "+44 7700 900112",
  },
  {
    ref: "FI-2026-00480", clientName: "Priya & Rohan Mehta", clientEmail: "priya.mehta@yahoo.co.uk",
    serviceId: "couples", lawyerId: "amelia", date: "2026-05-27", time: "10:30",
    status: "completed", payment: "paid", amount: 250, source: "fast-ila.co.uk",
    lender: "Shawbrook Bank", phone: "+44 7700 900334",
    secondSignatory: "Rohan Mehta", aiSummary: true,
  },
  {
    ref: "FI-2026-00479", clientName: "Marcus Whitley", clientEmail: "marcus.w@hotmail.com",
    serviceId: "wet", lawyerId: "sofia", date: "2026-05-26", time: "14:00",
    status: "completed", payment: "paid", amount: 200, source: "fast-ila.co.uk",
    lender: "Precise Mortgages", phone: "+44 7700 900507",
    dispatch: "posted", trackingNumber: "QY 0918 2244 7 GB", trackingService: "Special Delivery 1pm",
  },
  {
    ref: "FI-2026-00478", clientName: "Élodie Bernard", clientEmail: "elodie.b@protonmail.com",
    serviceId: "wet", lawyerId: "raj", date: "2026-05-25", time: "11:00",
    status: "completed", payment: "paid", amount: 200, source: "fast-ila.com",
    lender: "Aldermore", phone: "+44 7700 900289",
    dispatch: "ready_to_post",
  },
  {
    ref: "FI-2026-00477", clientName: "Tobi Adeyemi", clientEmail: "tobi@adeyemi.co",
    serviceId: "wet", lawyerId: "sofia", date: "2026-05-24", time: "13:00",
    status: "completed", payment: "paid", amount: 200, source: "fast-ila.co.uk",
    lender: "United Trust Bank", phone: "+44 7700 900441",
    dispatch: "signed",
  },
  {
    ref: "FI-2026-00483", clientName: "Eleanor Cross", clientEmail: "eleanor.c@bluemail.com",
    serviceId: "standard", lawyerId: "tom", date: "2026-05-28", time: "09:30",
    status: "scheduled", payment: "paid", amount: 145, source: "fast-ila.co.uk",
    lender: "Kensington Mortgages", phone: "+44 7700 900998",
  },
  {
    ref: "FI-2026-00484", clientName: "Yusuf Demir", clientEmail: "y.demir@gmail.com",
    serviceId: "urgent", lawyerId: "amelia", date: "2026-05-27", time: "17:00",
    status: "scheduled", payment: "pending", amount: 175, source: "fast-ila.co.uk",
    lender: "OakNorth Bank", phone: "+44 7700 900605",
  },
  {
    ref: "FI-2026-00485", clientName: "Anna Kowalski", clientEmail: "anna.k@outlook.com",
    serviceId: "standard", lawyerId: "raj", date: "2026-05-28", time: "11:00",
    status: "scheduled", payment: "paid", amount: 145, source: "fast-ila.com",
    lender: "Paragon Bank", phone: "+44 7700 900773",
  },
  {
    ref: "FI-2026-00476", clientName: "George Lin", clientEmail: "george@linfamily.uk",
    serviceId: "standard", lawyerId: "tom", date: "2026-05-23", time: "10:00",
    status: "no-show", payment: "paid", amount: 145, source: "fast-ila.co.uk",
    phone: "+44 7700 900128",
  },
  {
    ref: "FI-2026-00486", clientName: "Maya Robinson", clientEmail: "maya.r@gmail.com",
    serviceId: "wet", lawyerId: "sofia", date: "2026-05-30", time: "10:00",
    status: "scheduled", payment: "paid", amount: 200, source: "fast-ila.co.uk",
    lender: "Hampshire Trust Bank", phone: "+44 7700 900812",
    dispatch: "awaiting_signature",
  },
  {
    ref: "FI-2026-00475", clientName: "Idris Hassan", clientEmail: "idris@hassan.legal",
    serviceId: "wet", lawyerId: "raj", date: "2026-05-22", time: "15:00",
    status: "completed", payment: "paid", amount: 200, source: "fast-ila.com",
    dispatch: "delivered", trackingNumber: "QY 0918 2244 5 GB", trackingService: "Special Delivery 1pm",
  },
];

const KPI = {
  todayBookings: 14,
  weekBookings: 78,
  weekRevenueGross: 12830,
  weekRevenueNet: 10691.67,
  pendingPayments: 3,
  outstandingSig: 6,
  awaitingPost: 4,
  noShowsThisWeek: 2,
  conversion: 0.41,
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

// Monthly revenue series (for Reports view)
const MONTHLY_REVENUE = [
  { month: "Dec 2025", gross: 9180, net: 7650.00, bookings: 51 },
  { month: "Jan 2026", gross: 10240, net: 8533.33, bookings: 58 },
  { month: "Feb 2026", gross: 11860, net: 9883.33, bookings: 67 },
  { month: "Mar 2026", gross: 13420, net: 11183.33, bookings: 76 },
  { month: "Apr 2026", gross: 12705, net: 10587.50, bookings: 72 },
  { month: "May 2026", gross: 14890, net: 12408.33, bookings: 84 },
];

// Per-lawyer revenue this month (May 2026)
const LAWYER_REVENUE_THIS_MONTH = [
  { lawyerId: "amelia", bookings: 26, gross: 4845, net: 4037.50, avgRating: 4.9 },
  { lawyerId: "raj",    bookings: 28, gross: 5160, net: 4300.00, avgRating: 4.9 },
  { lawyerId: "sofia",  bookings: 18, gross: 3320, net: 2766.67, avgRating: 5.0 },
  { lawyerId: "tom",    bookings: 12, gross: 1565, net: 1304.17, avgRating: 4.8 },
];

Object.assign(window, {
  SERVICES, LAWYERS, BOOKINGS, KPI, MATTER_TYPES, MONTHLY_REVENUE, LAWYER_REVENUE_THIS_MONTH,
  TODAY, fmtTime, fmtDateLong, fmtDateShort, addDays, ymd,
  buildAvailability,
});

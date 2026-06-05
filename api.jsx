/* global window, supabase */
// Fast-ILA data layer.
//
// Single source of truth for bookings, lawyers, services, signatures, documents.
// Backed by Supabase when configured, otherwise by localStorage so the demo
// experience is *actually* persistent — bookings made in the form survive a
// refresh and show up in the dashboard immediately, signatures captured in
// the portal flow into the lawyer's view, etc.
//
// Sync model
// ──────────
//   • Any mutation writes through `mutate()`
//   • mutate() persists to localStorage AND broadcasts `fastila:store-changed`
//     on both the window (same-tab listeners) and a BroadcastChannel
//     (cross-tab — open booking form + dashboard in two tabs, they update live)
//   • app.jsx subscribes to that event and bumps a render key, forcing the
//     visible mode (booking / portal / dashboard) to re-read window.* arrays.

(function () {
  const STORAGE_KEY = "fastila_state_v2";
  const CFG = window.FAST_ILA_CONFIG || {};
  const HAS_BACKEND = Boolean(CFG.features && CFG.features.realBackend && window.supabase);
  const channel = (typeof BroadcastChannel !== "undefined") ? new BroadcastChannel("fastila") : null;

  // ---------------------------------------------------------------------------
  // Supabase client (lazy)
  // ---------------------------------------------------------------------------
  let client = null;
  function sb() {
    if (!HAS_BACKEND) return null;
    if (client) return client;
    client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    return client;
  }

  // ---------------------------------------------------------------------------
  // Persistent slices
  //
  // We do NOT replace the window arrays — components capture them by reference
  // at module load. Instead we mutate them in place. On boot we load from
  // localStorage and overlay onto whatever the seed in data.jsx populated.
  // ---------------------------------------------------------------------------
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveToStorage() {
    if (HAS_BACKEND) return; // Supabase is the store
    try {
      const snap = {
        BOOKINGS: window.BOOKINGS,
        SIGNATURES: window.SIGNATURES || [],
        DOCUMENTS: window.DOCUMENTS || [],
        PAYMENTS: window.PAYMENTS || [],
        UNDERSTANDING: window.UNDERSTANDING || [],
        LAWYERS_OVERRIDES: window.LAWYERS_OVERRIDES || {},
        TEMPLATES: window.TEMPLATES || {},
        PROMPTS: window.PROMPTS || {},
        LENDERS_OVERRIDES: window.LENDERS_OVERRIDES || {},
        BROKERS: window.BROKERS || [],
        INTERNAL_NOTES: window.INTERNAL_NOTES || {},
        USERS: window.USERS || [],
        NOTIFICATIONS: window.NOTIFICATIONS || [],
        FIRM_PROFILE: window.FIRM_PROFILE || null,
        DEMO_CLEARED: window.DEMO_CLEARED || false,
        CONTACTS: window.CONTACTS || [],
        MAILSHOTS: window.MAILSHOTS || [],
        KPI: window.KPI,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
    } catch (e) { console.warn("[FastILA] save failed", e); }
  }

  function hydrateFromStorage() {
    const snap = loadFromStorage();
    if (!snap) return;
    if (snap.BOOKINGS && Array.isArray(snap.BOOKINGS) && snap.BOOKINGS.length) {
      // Merge: keep seed bookings, add or replace by ref from storage
      const byRef = new Map((window.BOOKINGS || []).map(b => [b.ref, b]));
      for (const b of snap.BOOKINGS) byRef.set(b.ref, b);
      const merged = Array.from(byRef.values()).sort((a, b) =>
        String((b.date || "") + (b.time || "")).localeCompare(String((a.date || "") + (a.time || ""))));
      window.BOOKINGS.length = 0;
      merged.forEach(b => window.BOOKINGS.push(b));
    }
    window.SIGNATURES    = snap.SIGNATURES    || [];
    window.DOCUMENTS     = snap.DOCUMENTS     || [];
    window.PAYMENTS      = snap.PAYMENTS      || [];
    window.UNDERSTANDING = snap.UNDERSTANDING || [];
    window.LAWYERS_OVERRIDES = snap.LAWYERS_OVERRIDES || {};
    window.TEMPLATES = snap.TEMPLATES || {};
    window.PROMPTS   = snap.PROMPTS   || {};
    window.LENDERS_OVERRIDES = snap.LENDERS_OVERRIDES || {};
    window.BROKERS         = snap.BROKERS || [];
    window.INTERNAL_NOTES  = snap.INTERNAL_NOTES || {};
    window.USERS           = snap.USERS || [];
    window.NOTIFICATIONS   = snap.NOTIFICATIONS || [];
    window.FIRM_PROFILE    = snap.FIRM_PROFILE || null;
    window.DEMO_CLEARED    = snap.DEMO_CLEARED || false;
    window.CONTACTS        = snap.CONTACTS || [];
    window.MAILSHOTS       = snap.MAILSHOTS || [];

    // Apply lawyer overrides — patch existing, and re-create any that were
    // added entirely via the UI (so they survive a page reload).
    if (window.LAWYERS && Object.keys(window.LAWYERS_OVERRIDES).length) {
      const have = new Set(window.LAWYERS.map(l => l.id));
      for (const [id, ov] of Object.entries(window.LAWYERS_OVERRIDES)) {
        if (have.has(id)) {
          const l = window.LAWYERS.find(x => x.id === id);
          if (l) Object.assign(l, ov);
        } else {
          // Restore a previously user-added lawyer
          window.LAWYERS.push({
            id,
            name: ov.name || "New lawyer",
            initials: ov.initials || (ov.name || "??").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase(),
            sra: ov.sra || "",
            photoBg: ov.photoBg || "#0a4a67",
            languages: ov.languages || ["English"],
            services: ov.services || ["standard"],
            rating: ov.rating != null ? ov.rating : 5.0,
            reviews: ov.reviews || 0,
            bio: ov.bio || "",
            ...ov,
          });
        }
      }
    }
    // If the admin has run "Clear demo data", strip the seeds
    if (window.DEMO_CLEARED) {
      // Bookings: only keep those created via the app (not seeded with the FI-2026-004xx range)
      const userCreated = (window.BOOKINGS || []).filter(b => b.createdAt);
      window.BOOKINGS.length = 0;
      userCreated.forEach(b => window.BOOKINGS.push(b));
      // Lawyers: only keep those in LAWYERS_OVERRIDES (user-created/edited)
      const keepLawyerIds = new Set(Object.keys(window.LAWYERS_OVERRIDES));
      if (keepLawyerIds.size > 0) {
        const userLawyers = (window.LAWYERS || []).filter(l => keepLawyerIds.has(l.id));
        window.LAWYERS.length = 0;
        userLawyers.forEach(l => window.LAWYERS.push(l));
      } else {
        window.LAWYERS.length = 0;
      }
    }

    recomputeKpi();
  }

  function recomputeKpi() {
    const today = (typeof window.ymd === "function") ? window.ymd(new Date()) : new Date().toISOString().slice(0, 10);
    const books = window.BOOKINGS || [];
    const todayCount = books.filter(b => b.date === today).length;
    const weekTotal = books.length;
    const weekRevGross = books.filter(b => b.payment === "paid").reduce((s, b) => s + (b.amount || 0), 0);
    const noShows = books.filter(b => b.status === "no-show").length;
    const pending = books.filter(b => b.payment === "pending").length;
    const outstandingSig = (window.SIGNATURES || []).length === 0 ? 6 : Math.max(0, 6 - new Set(window.SIGNATURES.map(s => s.booking_ref)).size);
    if (window.KPI) {
      window.KPI.todayBookings = todayCount;
      window.KPI.weekBookings = weekTotal;
      window.KPI.weekRevenueGross = weekRevGross;
      window.KPI.weekRevenueNet = +(weekRevGross / 1.2).toFixed(2);
      window.KPI.noShowsThisWeek = noShows;
      window.KPI.pendingPayments = pending;
      window.KPI.outstandingSig = outstandingSig;
    }
  }

  // Main mutator — accepts a function that mutates window state, then persists
  // and broadcasts. Returns whatever the mutator returns.
  function mutate(reason, fn) {
    const result = fn();
    recomputeKpi();
    saveToStorage();
    const detail = { reason, at: Date.now() };
    try { window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail })); } catch (_e) {}
    if (channel) { try { channel.postMessage({ type: "store-changed", detail }); } catch (_e) {} }
    return result;
  }

  // Receive cross-tab updates: reload from storage + re-render.
  if (channel) {
    channel.addEventListener("message", (ev) => {
      if (ev.data?.type === "store-changed") {
        hydrateFromStorage();
        try { window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "cross-tab", remote: true } })); } catch (_e) {}
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  function nextRef() {
    const year = new Date().getFullYear();
    const existing = (window.BOOKINGS || []).map(b => b.ref).filter(r => r && r.startsWith("FI-" + year + "-"));
    let max = 480;
    for (const r of existing) {
      const m = r.match(/FI-\d{4}-(\d+)/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `FI-${year}-${String(max + 1).padStart(5, "0")}`;
  }

  function findBooking(ref) {
    return (window.BOOKINGS || []).find(b => b.ref === ref) || null;
  }

  // ---------------------------------------------------------------------------
  // Services / lawyers / matters / lenders
  // ---------------------------------------------------------------------------
  const services = {
    async list() {
      if (HAS_BACKEND) {
        const { data, error } = await sb().from('services').select('*').eq('active', true).order('sort_order');
        if (!error && data?.length) return data;
      }
      return window.SERVICES || [];
    },
  };

  const lawyers = {
    async list() {
      if (HAS_BACKEND) {
        const { data, error } = await sb().from('lawyers').select('*').eq('active', true);
        if (!error && data?.length) return data;
      }
      return window.LAWYERS || [];
    },
    async update(id, patch) {
      if (HAS_BACKEND) {
        // Upsert so this works for both "Add lawyer" (no row yet) and "Edit".
        // Map UI fields → real DB columns (and drop client-only keys like
        // photoKey) so PostgREST doesn't reject unknown columns.
        const COL = {
          name: "name", initials: "initials", sra: "sra", bio: "bio", email: "email",
          photoBg: "photo_bg", photo_bg: "photo_bg",
          languages: "languages", services: "services", rating: "rating", reviews: "reviews",
          workDays: "work_days", work_days: "work_days",
          workStart: "work_start", work_start: "work_start",
          workEnd: "work_end", work_end: "work_end",
          slotMinutes: "slot_minutes", slot_minutes: "slot_minutes",
          bufferMinutes: "buffer_minutes", buffer_minutes: "buffer_minutes",
        };
        const row = { id, active: true };
        for (const [k, v] of Object.entries(patch)) { if (COL[k] !== undefined) row[COL[k]] = v; }
        if (!row.initials && row.name) row.initials = row.name.split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase();
        const { error } = await sb().from('lawyers').upsert(row, { onConflict: 'id' }).select();
        if (error) throw new Error(error.message);
        await reloadLawyers();   // refresh window.LAWYERS now (don't wait for realtime)
        return { ok: true };
      }
      return mutate(`lawyer.update:${id}`, () => {
        window.LAWYERS = window.LAWYERS || [];
        const l = window.LAWYERS.find(x => x.id === id);
        if (l) {
          Object.assign(l, patch);
        } else {
          // Lawyer doesn't exist yet — add it
          const newLawyer = {
            id,
            name: patch.name || "New lawyer",
            initials: patch.initials || (patch.name || "??").split(/\s+/).map(s => s[0]).slice(0, 2).join("").toUpperCase(),
            sra: "",
            photoBg: "#0a4a67",
            languages: ["English"],
            services: ["standard"],
            rating: 5.0,
            reviews: 0,
            bio: "",
            ...patch,
          };
          window.LAWYERS.push(newLawyer);
        }
        window.LAWYERS_OVERRIDES = window.LAWYERS_OVERRIDES || {};
        window.LAWYERS_OVERRIDES[id] = { ...(window.LAWYERS_OVERRIDES[id] || {}), ...patch };
        return window.LAWYERS.find(x => x.id === id);
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Bookings — CRUD + lifecycle
  // ---------------------------------------------------------------------------
  const bookings = {
    list(filters = {}) {
      let rows = (window.BOOKINGS || []).slice();
      if (filters.lawyer_id) rows = rows.filter(b => b.lawyerId === filters.lawyer_id);
      if (filters.status)    rows = rows.filter(b => b.status === filters.status);
      if (filters.email)     rows = rows.filter(b => b.clientEmail === filters.email);
      if (filters.from)      rows = rows.filter(b => b.date >= filters.from);
      if (filters.to)        rows = rows.filter(b => b.date <= filters.to);
      return rows;
    },

    get(ref) { return findBooking(ref); },

    async create(input) {
      if (HAS_BACKEND) {
        // Try the create-booking edge function first (handles server-side
        // validation + email confirmations if deployed). Fall back to a direct
        // insert against the bookings table if the function isn't deployed —
        // the platform is fully usable without the edge function.
        try {
          const url = `${CFG.supabaseUrl}/functions/v1/create-booking`;
          const r = await fetch(url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "apikey": CFG.supabaseAnonKey,
              "Authorization": `Bearer ${CFG.supabaseAnonKey}`,
            },
            body: JSON.stringify(input),
          });
          if (r.ok) {
            const j = await r.json();
            if (j && j.ok) return j;
          }
          // 404 / 401 / 500 → fall through to direct insert
        } catch (_e) { /* network error / not deployed — fall through */ }
        // Direct insert into the bookings table (RLS lets anon insert
        // unauthenticated bookings per the policies migration).
        const ref = (() => {
          const year = new Date().getFullYear();
          // Generate a temp ref; the DB trigger or default may overwrite. If
          // not set up, this client-side ref will land in the row as-is.
          const rand = Math.floor(Math.random() * 90000 + 10000);
          return `FI-${year}-${String(rand).padStart(5, "0")}`;
        })();
        const { data, error } = await sb().from('bookings').insert({
          ref,
          client_name: input.client_name,
          client_email: input.client_email,
          client_phone: input.client_phone || null,
          service_id: input.service_id,
          lawyer_id: input.lawyer_id || null,
          appointment_date: input.appointment_date || input.date,
          appointment_time: input.appointment_time || input.time,
          lender: input.lender || null,
          legal_summary: input.legal_summary || input.summary || null,
          matter_type: input.matter_type || null,
          amount: input.amount || null,
          source: input.source || "fast-ila.co.uk",
          status: "scheduled",
          payment_status: "pending",
          second_signatory_name: input.second_signatory_name || null,
          second_signatory_email: input.second_signatory_email || null,
          post_recipient: input.post_recipient || null,
          post_address: input.post_address || null,
        }).select().single();
        if (error) throw new Error(error.message);
        return { ok: true, ref: data.ref || ref, id: data.id || ref };
      }
      return mutate("booking.create", () => {
        const ref = nextRef();
        const row = {
          ref,
          clientName: input.client_name,
          clientEmail: input.client_email,
          phone: input.client_phone,
          serviceId: input.service_id,
          lawyerId: input.lawyer_id,
          date: input.appointment_date,
          time: input.appointment_time,
          status: "scheduled",
          payment: "pending",
          amount: input.amount,
          source: input.source || "fast-ila.co.uk",
          lender: input.lender,
          legal: input.legal_summary,
          matterType: input.matter_type || null,
          secondSignatoryName: input.second_signatory_name,
          secondSignatoryEmail: input.second_signatory_email,
          postRecipient: input.post_recipient,
          postAddress: input.post_address,
          createdAt: new Date().toISOString(),
        };
        if (input.service_id === "wet" || input.service_id === "couples") {
          row.dispatch = "not_started";
        }
        (window.BOOKINGS = window.BOOKINGS || []).unshift(row);

        // Auto-add / merge contact for the booker so they land in the mailing list
        try {
          contacts.upsert({
            fullName: input.client_name,
            email: input.client_email,
            phone: input.client_phone,
            source: row.source === "internal" ? "manual" : "booking",
            tags: [input.service_id, input.lender].filter(Boolean).map(t => String(t).toLowerCase().replace(/\s+/g, "-")),
            bookingRefs: [ref],
            optIn: true,
          });
          // Also the second signatory if provided
          if (input.second_signatory_email) {
            contacts.upsert({
              fullName: input.second_signatory_name || "Co-signatory",
              email: input.second_signatory_email,
              source: "booking-cosignatory",
              tags: [input.service_id, "co-signatory"].filter(Boolean),
              bookingRefs: [ref],
              optIn: true,
            });
          }
        } catch (_e) { /* contacts not critical */ }

        return { ok: true, ref, id: ref };
      });
    },

    update(ref, patch) {
      return mutate(`booking.update:${ref}`, () => {
        const b = findBooking(ref);
        if (b) Object.assign(b, patch, { updatedAt: new Date().toISOString() });
        return b;
      });
    },

    setStatus(ref, status)     { return bookings.update(ref, { status }); },
    setPayment(ref, payment)   { return bookings.update(ref, { payment }); },
    setDispatch(ref, dispatch) { return bookings.update(ref, { dispatch }); },
    setTracking(ref, trackingNumber, trackingService = "Royal Mail Special Delivery 1pm") {
      return bookings.update(ref, { trackingNumber, trackingService });
    },
    reschedule(ref, date, time, lawyerId) {
      const patch = { date, time };
      if (lawyerId) patch.lawyerId = lawyerId;
      return bookings.update(ref, patch);
    },
    cancel(ref, reason) {
      return bookings.update(ref, { status: "cancelled", cancelReason: reason });
    },
    addNote(ref, note) {
      return mutate(`booking.note:${ref}`, () => {
        window.INTERNAL_NOTES = window.INTERNAL_NOTES || {};
        const arr = window.INTERNAL_NOTES[ref] || [];
        arr.push({ at: new Date().toISOString(), text: note });
        window.INTERNAL_NOTES[ref] = arr;
        return arr;
      });
    },
    notes(ref) { return (window.INTERNAL_NOTES || {})[ref] || []; },
  };

  // ---------------------------------------------------------------------------
  // Signatures / documents / payments / understanding
  // ---------------------------------------------------------------------------
  const signatures = {
    list(ref) {
      return (window.SIGNATURES || []).filter(s => s.booking_ref === ref);
    },
    record(ref, kind, signedBy, signatureData, role = "client") {
      if (HAS_BACKEND) {
        return sb().from("signatures").insert({
          booking_id: ref, kind, signed_by: signedBy, signed_by_role: role, signature_data: signatureData,
        });
      }
      return mutate(`signature.add:${ref}:${kind}`, () => {
        const row = { booking_ref: ref, kind, signed_by: signedBy, signed_by_role: role, signature_data: signatureData, signed_at: new Date().toISOString() };
        (window.SIGNATURES = window.SIGNATURES || []).push(row);
        return row;
      });
    },
  };

  // -- IndexedDB-backed blob store (used in mock mode for real file persistence)
  const IDB_DB = "fastila_files";
  const IDB_STORE = "blobs";
  function openIdb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB not supported"));
      const req = window.indexedDB.open(IDB_DB, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function putBlob(key, blob) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  async function getBlob(key) {
    const db = await openIdb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  const documents = {
    list(ref) {
      return (window.DOCUMENTS || []).filter(d => d.booking_ref === ref);
    },
    record(ref, kind, file, storageKey, uploadedBy = "client") {
      return mutate(`doc.add:${ref}:${kind}`, () => {
        const row = {
          id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          booking_ref: ref, kind,
          filename: file.name || "document",
          size_bytes: file.size || 0,
          mime_type: file.type || "application/octet-stream",
          uploaded_at: new Date().toISOString(),
          uploaded_by: uploadedBy,  // "client" | "lawyer" | "admin" — drives delete permissions
          storage_key: storageKey || null,
        };
        (window.DOCUMENTS = window.DOCUMENTS || []).push(row);
        return row;
      });
    },
    async upload(ref, kind, file, uploadedBy = "client") {
      if (HAS_BACKEND) {
        const path = `${ref}/${kind}/${Date.now()}-${file.name}`;
        const { error: upErr } = await sb().storage.from('client-docs').upload(path, file, { upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data, error: dbErr } = await sb().from('documents').insert({
          booking_id: ref, kind, storage_path: path,
          filename: file.name, mime_type: file.type, size_bytes: file.size,
          uploaded_by: uploadedBy,
        }).select().single();
        if (dbErr) throw new Error(dbErr.message);
        return data;
      }
      // Mock: persist the actual file bytes in IndexedDB so the lawyer can preview it later
      const storageKey = `${ref}/${kind}/${Date.now()}-${file.name}`;
      try { await putBlob(storageKey, file); } catch (e) { console.warn("[FastILA] idb put failed", e); }
      return documents.record(ref, kind, file, storageKey, uploadedBy);
    },
    async openInTab(doc) {
      if (HAS_BACKEND && doc.storage_path) {
        const { data } = await sb().storage.from('client-docs').createSignedUrl(doc.storage_path, 600);
        if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener");
        return data?.signedUrl;
      }
      if (doc.storage_key) {
        const blob = await getBlob(doc.storage_key);
        if (blob) {
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank", "noopener");
          setTimeout(() => URL.revokeObjectURL(url), 60000);
          return url;
        }
      }
      return null;
    },
    async downloadBlob(doc) {
      if (HAS_BACKEND && doc.storage_path) {
        const { data } = await sb().storage.from('client-docs').createSignedUrl(doc.storage_path, 600);
        if (data?.signedUrl) {
          const a = document.createElement("a"); a.href = data.signedUrl; a.download = doc.filename; a.click();
        }
        return;
      }
      if (doc.storage_key) {
        const blob = await getBlob(doc.storage_key);
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a"); a.href = url; a.download = doc.filename; a.click();
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
      }
    },
    // Read the raw blob — used by the executed-cert builder to fetch the
    // lawyer-signed PDF bytes from IndexedDB so pdf-lib can stamp the client's
    // signature on top.
    async getBlob(doc) {
      if (HAS_BACKEND && doc.storage_path) {
        const { data } = await sb().storage.from('client-docs').createSignedUrl(doc.storage_path, 600);
        if (!data?.signedUrl) return null;
        const res = await fetch(data.signedUrl);
        return await res.blob();
      }
      if (doc.storage_key) {
        return await getBlob(doc.storage_key);
      }
      return null;
    },
    // Remove a document (used when the lawyer replaces the cert with a new one).
    async remove(doc) {
      if (HAS_BACKEND && doc.id) {
        if (doc.storage_path) {
          try { await sb().storage.from('client-docs').remove([doc.storage_path]); } catch (_e) {}
        }
        return sb().from('documents').delete().eq('id', doc.id);
      }
      return mutate(`doc.remove:${doc.id}`, () => {
        const list = window.DOCUMENTS || [];
        const idx = list.findIndex(d => d.id === doc.id || (d.storage_key && d.storage_key === doc.storage_key));
        if (idx >= 0) list.splice(idx, 1);
        return doc;
      });
    },
  };

  const payments = {
    list(ref) { return (window.PAYMENTS || []).filter(p => p.booking_ref === ref); },
    declarePaid(ref, reference) {
      return mutate(`payment.declared:${ref}`, () => {
        const b = findBooking(ref);
        if (b) b.payment = "paid";
        const row = { booking_ref: ref, reference, status: "paid", method: "bank_transfer", paid_at: new Date().toISOString() };
        (window.PAYMENTS = window.PAYMENTS || []).push(row);
        return row;
      });
    },
  };

  const understanding = {
    record(ref, items) {
      return mutate(`understanding.${ref}`, () => {
        window.UNDERSTANDING = window.UNDERSTANDING || [];
        for (const it of items) {
          window.UNDERSTANDING.push({ booking_ref: ref, question_id: it.id, question_text: it.q, answer: !!it.answer, answered_at: new Date().toISOString() });
        }
        return { ok: true };
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Templates / prompts / lenders / brokers
  // ---------------------------------------------------------------------------
  const templates = {
    list() {
      const base = {
        booking_confirmation_email: {
          id: "booking_confirmation_email",
          channel: "email",
          subject: "Your Fast-ILA appointment is booked — {{ref}}",
          body: "Hello {{client_name}},\n\nYour ILA appointment is confirmed.\nRef: {{ref}}\nDate: {{date}}\nTime: {{time}}\n\nOpen your portal: {{portal_url}}\n\nFast-ILA",
        },
        reminder_24h_email: {
          id: "reminder_24h_email",
          channel: "email",
          subject: "Reminder · your Fast-ILA call tomorrow ({{ref}})",
          body: "Hi {{client_name}}, friendly reminder your ILA Meet is tomorrow at {{time}}.",
        },
        care_letter_signed_email: {
          id: "care_letter_signed_email",
          channel: "email",
          subject: "Care letter signed — what's next",
          body: "Thanks {{client_name}}, we've recorded your signed client care letter.",
        },
      };
      return { ...base, ...(window.TEMPLATES || {}) };
    },
    update(id, patch) {
      return mutate(`template.update:${id}`, () => {
        window.TEMPLATES = window.TEMPLATES || {};
        window.TEMPLATES[id] = { ...(templates.list()[id] || {}), ...patch, id };
        return window.TEMPLATES[id];
      });
    },
  };

  const prompts = {
    list() {
      const base = {
        precall_brief: {
          id: "precall_brief",
          label: "Pre-call brief",
          prompt: "You are preparing a pre-call brief for an SRA-regulated ILA appointment. Read the matter docs and produce: (1) transaction in one sentence, (2) instrument being signed, (3) top three risks, (4) red flags around duress or capacity, (5) suggested questions.",
        },
        assistant_dashboard: {
          id: "assistant_dashboard",
          label: "Dashboard assistant",
          prompt: "You are the in-dashboard AI assistant for Fast-ILA. Answer concisely, in British English. Never invent facts about a booking.",
        },
      };
      return { ...base, ...(window.PROMPTS || {}) };
    },
    update(id, patch) {
      return mutate(`prompt.update:${id}`, () => {
        window.PROMPTS = window.PROMPTS || {};
        window.PROMPTS[id] = { ...(prompts.list()[id] || {}), ...patch, id };
        return window.PROMPTS[id];
      });
    },
  };

  const lendersStore = {
    list() {
      // No seeded lenders — admin adds their own panel via Lender guide.
      const overrides = window.LENDERS_OVERRIDES || {};
      return Object.values(overrides).filter(l => l.id);
    },
    upsert(lender) {
      return mutate(`lender.upsert:${lender.id || lender.name}`, () => {
        window.LENDERS_OVERRIDES = window.LENDERS_OVERRIDES || {};
        const id = lender.id || lender.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        window.LENDERS_OVERRIDES[id] = { ...lender, id };
        return window.LENDERS_OVERRIDES[id];
      });
    },
  };

  const brokers = {
    list() { return window.BROKERS || []; },
    add(b)  { return mutate("broker.add", () => { (window.BROKERS = window.BROKERS || []).push({ ...b, id: b.id || `b-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }); return b; }); },
    update(id, patch) { return mutate(`broker.update:${id}`, () => {
      const list = window.BROKERS || [];
      const i = list.findIndex(x => x.id === id);
      if (i >= 0) list[i] = { ...list[i], ...patch };
      return list[i];
    }); },
  };

  // ---------------------------------------------------------------------------
  // Contacts — CRM / mailing list. Sources: imported CSV, public form bookings,
  // manual entries. Each contact stays in sync with its bookings.
  // ---------------------------------------------------------------------------
  const contacts = {
    list() { return window.CONTACTS || []; },
    get(id) { return (window.CONTACTS || []).find(c => c.id === id) || null; },
    findByEmail(email) {
      const e = (email || "").toLowerCase().trim();
      if (!e) return null;
      return (window.CONTACTS || []).find(c => (c.email || "").toLowerCase() === e) || null;
    },
    /**
     * Add or update a contact. Idempotent on email — if a contact already
     * exists with the same email, the patch is merged into the existing row
     * (so booking auto-add won't create duplicates).
     */
    upsert(input) {
      return mutate(`contact.upsert:${input.email || input.id || "?"}`, () => {
        window.CONTACTS = window.CONTACTS || [];
        const existing = input.email ? contacts.findByEmail(input.email) : null;
        if (existing) {
          // Merge — never blank-out existing fields, append tags + bookingRefs
          const merged = { ...existing, ...input,
            tags: Array.from(new Set([...(existing.tags || []), ...(input.tags || [])])),
            bookingRefs: Array.from(new Set([...(existing.bookingRefs || []), ...(input.bookingRefs || [])])),
            lastSeenAt: new Date().toISOString(),
          };
          const i = window.CONTACTS.findIndex(c => c.id === existing.id);
          window.CONTACTS[i] = merged;
          return merged;
        }
        const row = {
          id: input.id || `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          fullName: input.fullName || input.name || "",
          email: (input.email || "").toLowerCase().trim(),
          phone: input.phone || "",
          source: input.source || "manual",
          tags: input.tags || [],
          notes: input.notes || "",
          bookingRefs: input.bookingRefs || [],
          optIn: input.optIn !== false,
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
          ...input,
        };
        window.CONTACTS.push(row);
        return row;
      });
    },
    update(id, patch) {
      return mutate(`contact.update:${id}`, () => {
        const list = window.CONTACTS || [];
        const i = list.findIndex(c => c.id === id);
        if (i >= 0) list[i] = { ...list[i], ...patch };
        return list[i];
      });
    },
    remove(id) {
      return mutate(`contact.remove:${id}`, () => {
        window.CONTACTS = (window.CONTACTS || []).filter(c => c.id !== id);
      });
    },
    setOptIn(id, optIn) { return contacts.update(id, { optIn: !!optIn }); },
    addTag(id, tag) {
      return mutate(`contact.tag:${id}`, () => {
        const c = (window.CONTACTS || []).find(x => x.id === id);
        if (c) c.tags = Array.from(new Set([...(c.tags || []), tag]));
        return c;
      });
    },
    removeTag(id, tag) {
      return mutate(`contact.untag:${id}`, () => {
        const c = (window.CONTACTS || []).find(x => x.id === id);
        if (c) c.tags = (c.tags || []).filter(t => t !== tag);
        return c;
      });
    },
    /**
     * Bulk-import from parsed CSV rows. Returns counts.
     * Expected columns (case-insensitive): name|fullName, email, phone, source, tags, notes.
     */
    importBulk(rows) {
      return mutate("contact.import", () => {
        let added = 0, merged = 0, skipped = 0;
        for (const r of rows) {
          const email = (r.email || r.Email || "").toLowerCase().trim();
          if (!email) { skipped++; continue; }
          const existed = !!contacts.findByEmail(email);
          contacts.upsert({
            fullName: r.fullName || r.fullname || r.name || r.Name || r["Full name"] || "",
            email,
            phone: r.phone || r.Phone || r.mobile || r.Mobile || "",
            source: r.source || r.Source || "import",
            tags: (r.tags || r.Tags || "").split(/[,;|]/).map(t => t.trim()).filter(Boolean),
            notes: r.notes || r.Notes || r.note || "",
            optIn: !(r.optIn === false || /^(no|false|0|opted?[- ]?out)$/i.test(String(r.optIn || "yes"))),
          });
          existed ? merged++ : added++;
        }
        return { added, merged, skipped, total: rows.length };
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Mailshots — log + fire campaigns. In live mode posts to n8n / Resend.
  // ---------------------------------------------------------------------------
  // Saved HTML email templates for broadcasts. Kept in localStorage so they
  // survive refreshes; admins can build a library and reuse them.
  const EMAIL_TEMPLATES_KEY = "fastila_email_templates_v1";
  const emailTemplates = {
    list() {
      try { const raw = localStorage.getItem(EMAIL_TEMPLATES_KEY); return raw ? JSON.parse(raw) : []; }
      catch (_e) { return []; }
    },
    get(id) { return emailTemplates.list().find(t => t.id === id) || null; },
    save(tpl) {
      const all = emailTemplates.list();
      const now = new Date().toISOString();
      if (tpl.id) {
        const idx = all.findIndex(t => t.id === tpl.id);
        if (idx >= 0) all[idx] = { ...all[idx], ...tpl, updatedAt: now };
        else all.push({ ...tpl, updatedAt: now, createdAt: now });
      } else {
        all.push({ id: `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...tpl, updatedAt: now, createdAt: now });
      }
      try { localStorage.setItem(EMAIL_TEMPLATES_KEY, JSON.stringify(all)); } catch (_e) {}
      return all[all.length - 1];
    },
    remove(id) {
      const next = emailTemplates.list().filter(t => t.id !== id);
      try { localStorage.setItem(EMAIL_TEMPLATES_KEY, JSON.stringify(next)); } catch (_e) {}
      return true;
    },
  };

  const mailshots = {
    list() { return (window.MAILSHOTS || []).slice().reverse(); },
    get(id) { return (window.MAILSHOTS || []).find(m => m.id === id) || null; },
    /**
     * Send a broadcast/mailshot to a chosen audience.
     * audience: { contactIds?: string[], rule?: "all" | "opted_in" | "with_bookings" | "with_tag", tag?: string }
     * format: "html" | "text" (HTML emails use the body as-is, text wraps in pre)
     * Routes through n8n if connected — otherwise records it for manual send.
     * Always honours opt-in; opted-out contacts are skipped.
     */
    async send({ subject, body, audience = {}, contactIds = [], channel = "email", format = "html", fromName = null, replyTo = null, templateName = null }) {
      const all = window.CONTACTS || [];
      // Compute final recipient list
      const ids = contactIds && contactIds.length > 0 ? contactIds : (() => {
        if (audience.rule === "all") return all.map(c => c.id);
        if (audience.rule === "opted_in") return all.filter(c => c.optIn !== false).map(c => c.id);
        if (audience.rule === "with_bookings") {
          const refs = new Set((window.BOOKINGS || []).map(b => (b.clientEmail || "").toLowerCase()).filter(Boolean));
          return all.filter(c => refs.has((c.email || "").toLowerCase())).map(c => c.id);
        }
        if (audience.rule === "with_tag" && audience.tag) {
          return all.filter(c => (c.tags || []).includes(audience.tag)).map(c => c.id);
        }
        return [];
      })();
      const recipients = all.filter(c => ids.includes(c.id) && c.optIn !== false);
      const n8n = (typeof window.fiIntegration?.get === "function") ? window.fiIntegration.get("n8n") : null;
      const smtp = (typeof window.fiIntegration?.get === "function") ? window.fiIntegration.get("smtp") : null;
      let delivery = "logged";
      if (n8n?.webhookUrl) {
        try {
          await fetch(n8n.webhookUrl, {
            method: "POST",
            headers: { "content-type": "application/json", ...(n8n.apiKey ? { "X-N8N-Key": n8n.apiKey } : {}) },
            body: JSON.stringify({
              event: "mailshot.send",
              channel, format,
              subject, body,
              fromName: fromName || (smtp && smtp.fromName) || null,
              replyTo: replyTo || (smtp && smtp.replyTo) || null,
              templateName,
              recipients: recipients.map(c => ({ email: c.email, fullName: c.fullName, phone: c.phone, firstName: (c.fullName || "").split(" ")[0] || "there" })),
              audience,
              // Email credentials passed through so the n8n workflow can use
              // them without configuring email per workflow. n8n strips the
              // password before logging the execution.
              smtp: smtp && smtp.password ? {
                provider: smtp.provider || "smtp",
                host: smtp.host || null,
                port: smtp.port ? Number(smtp.port) : null,
                secure: smtp.secure === "true" || smtp.secure === true,
                username: smtp.username || null,
                password: smtp.password,
                fromName: smtp.fromName || fromName || null,
                fromEmail: smtp.fromEmail || null,
                replyTo: smtp.replyTo || replyTo || null,
              } : null,
            }),
          });
          delivery = "n8n";
        } catch (_e) { delivery = "logged-after-error"; }
      }
      const row = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        subject: subject || "(no subject)",
        body: body || "",
        format,
        channel,
        templateName: templateName || null,
        audienceRule: audience.rule || (contactIds.length > 0 ? "manual" : "unknown"),
        audienceTag: audience.tag || null,
        recipientCount: recipients.length,
        skippedOptOut: ids.length - recipients.length,
        delivery,
        sentAt: new Date().toISOString(),
      };
      mutate("mailshot.send", () => {
        (window.MAILSHOTS = window.MAILSHOTS || []).push(row);
      });
      return row;
    },
  };

  // ---------------------------------------------------------------------------
  // Users + access (mock mode owns this in localStorage; Supabase mode delegates)
  // ---------------------------------------------------------------------------
  const users = {
    list() {
      const out = (window.USERS || []).slice();
      // If we have lawyer overrides, surface them as inactive user candidates too
      return out;
    },
    add(user) {
      return mutate(`user.add:${user.email}`, () => {
        const id = user.id || `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const row = {
          id,
          email: (user.email || "").toLowerCase().trim(),
          fullName: user.fullName || user.email,
          role: user.role || "lawyer", // 'admin' | 'lawyer'
          lawyerId: user.lawyerId || null,
          active: user.active !== false,
          invitedAt: new Date().toISOString(),
          ...user,
        };
        window.USERS = window.USERS || [];
        // Replace if same email exists
        const i = window.USERS.findIndex(u => u.email === row.email);
        if (i >= 0) window.USERS[i] = row; else window.USERS.push(row);
        return row;
      });
    },
    remove(id) {
      return mutate(`user.remove:${id}`, () => {
        window.USERS = (window.USERS || []).filter(u => u.id !== id);
      });
    },
    update(id, patch) {
      return mutate(`user.update:${id}`, () => {
        const list = window.USERS || [];
        const i = list.findIndex(u => u.id === id);
        if (i >= 0) list[i] = { ...list[i], ...patch };
        return list[i];
      });
    },
    findByEmail(email) {
      const e = (email || "").toLowerCase().trim();
      return (window.USERS || []).find(u => u.email === e && u.active) || null;
    },
    /**
     * Validate sign-in. In mock mode, just checks the email matches a known
     * user. In live mode this is the magic-link round trip (handled elsewhere).
     * Returns { ok, user, role } or { ok: false, reason }.
     */
    authenticate(email, requiredRole) {
      const u = users.findByEmail(email);
      if (!u) return { ok: false, reason: "No account found for that email. Ask the admin to invite you, or use Settings → Clear demo data to start over." };
      if (requiredRole && u.role !== requiredRole) return { ok: false, reason: `That email is registered as ${u.role}, not ${requiredRole}.` };
      return { ok: true, user: u, role: u.role };
    },
    /**
     * Bootstrap on first run: if no users exist, seed a single fallback admin
     * so the platform isn't locked out before the first-run wizard.
     * The wizard prompts the user to add their own admin account.
     */
    bootstrap() {
      if ((window.USERS || []).length > 0) return;
      const cfg = window.FAST_ILA_CONFIG || {};
      const defaultAdminEmail = cfg.defaultAdminEmail || "karim@nexalaw.com";
      users.add({
        email: defaultAdminEmail,
        fullName: cfg.defaultAdminName || "Admin",
        role: "admin",
        isBootstrap: true,
      });
    },

    /**
     * Migration: strip any users that were seeded from the old demo lawyer
     * pool. Runs on every load. Once the user adds their own admin, the
     * bootstrap admin can be cleared via Settings → Team & access.
     */
    cleanDemoSeeds() {
      const demoEmails = new Set([
        "amelia@nexalaw.com",
        "raj@nexalaw.com",
        "sofia@nexalaw.com",
        "tom@nexalaw.com",
      ]);
      const before = (window.USERS || []).length;
      const realUsers = (window.USERS || []).filter(u => !demoEmails.has((u.email || "").toLowerCase()));
      if (realUsers.length !== before) {
        return mutate("user.clean-demo-seeds", () => {
          window.USERS = realUsers;
        });
      }
    },
  };

  // ---------------------------------------------------------------------------
  // Notifications
  // ---------------------------------------------------------------------------
  const notifications = {
    list() { return (window.NOTIFICATIONS || []).slice().reverse(); },
    add(n) {
      return mutate("notification.add", () => {
        const row = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: n.title || "Notification",
          body: n.body || "",
          kind: n.kind || "info",
          ref: n.ref || null,
          read: false,
          createdAt: new Date().toISOString(),
        };
        (window.NOTIFICATIONS = window.NOTIFICATIONS || []).push(row);
        return row;
      });
    },
    markRead(id) {
      return mutate(`notification.read:${id}`, () => {
        const list = window.NOTIFICATIONS || [];
        const n = list.find(x => x.id === id);
        if (n) n.read = true;
      });
    },
    markAllRead() {
      return mutate("notification.read-all", () => {
        for (const n of (window.NOTIFICATIONS || [])) n.read = true;
      });
    },
    clear() { return mutate("notification.clear", () => { window.NOTIFICATIONS = []; }); },
    unreadCount() { return (window.NOTIFICATIONS || []).filter(n => !n.read).length; },
  };

  // ---------------------------------------------------------------------------
  // Firm-level profile (shown in Settings)
  // ---------------------------------------------------------------------------
  const firm = {
    get() {
      return window.FIRM_PROFILE || {
        firm: "Nexa Law Ltd",
        tradingAs: "Fast-ILA",
        domain: "fast-ila.co.uk",
        supportEmail: "info@fast-ila.co.uk",
        sraNumber: "SRA 524963",
        companyNumber: "09876543",
        vat: "GB 245 670 123",
        clientAccount: { bank: "", account: "", sortCode: "", reference: "KAO/{surname}" },
      };
    },
    update(patch) {
      return mutate("firm.update", () => {
        window.FIRM_PROFILE = { ...firm.get(), ...patch };
        return window.FIRM_PROFILE;
      });
    },
  };

  // ---------------------------------------------------------------------------
  // Admin lifecycle helpers
  // ---------------------------------------------------------------------------
  const admin = {
    /**
     * Wipe all demo data. Keeps user accounts + firm profile. After this the
     * dashboard shows empty arrays until real bookings are created.
     */
    clearDemoData() {
      return mutate("admin.clearDemo", () => {
        window.DEMO_CLEARED = true;
        // Bookings: keep only those created via the app (have createdAt)
        const userCreated = (window.BOOKINGS || []).filter(b => b.createdAt);
        window.BOOKINGS.length = 0;
        userCreated.forEach(b => window.BOOKINGS.push(b));
        // Strip lawyer seeds unless they've been edited
        const overriddenIds = new Set(Object.keys(window.LAWYERS_OVERRIDES || {}));
        const keepLawyers = (window.LAWYERS || []).filter(l => overriddenIds.has(l.id));
        window.LAWYERS.length = 0;
        keepLawyers.forEach(l => window.LAWYERS.push(l));
        // Strip signatures/documents tied to non-existent bookings
        const refs = new Set(window.BOOKINGS.map(b => b.ref));
        window.SIGNATURES = (window.SIGNATURES || []).filter(s => refs.has(s.booking_ref));
        window.DOCUMENTS  = (window.DOCUMENTS  || []).filter(d => refs.has(d.booking_ref));
        window.PAYMENTS   = (window.PAYMENTS   || []).filter(p => refs.has(p.booking_ref));
        window.INTERNAL_NOTES = window.INTERNAL_NOTES || {};
        for (const k of Object.keys(window.INTERNAL_NOTES)) {
          if (!refs.has(k)) delete window.INTERNAL_NOTES[k];
        }
      });
    },
    /** Wipe EVERYTHING including users and reset to first-run state. */
    factoryReset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_e) {}
      try { localStorage.removeItem("fastila_session_v1"); } catch (_e) {}
      try { localStorage.removeItem("fastila_last_ref"); } catch (_e) {}
      try { localStorage.removeItem("fastila_last_email"); } catch (_e) {}
      window.location.reload();
    },
  };

  // ---------------------------------------------------------------------------
  // Auth (used in live mode)
  // ---------------------------------------------------------------------------
  const auth = {
    async signInWithEmail(email, mode = "portal") {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      const { error } = await sb().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: CFG.portalReturnUrl + "?mode=" + mode },
      });
      if (error) throw new Error(error.message);
      return { ok: true };
    },
    /** Email + password sign-in (e.g. info@fast-ila.co.uk). Live mode only. */
    async signInWithPassword(email, password) {
      if (!HAS_BACKEND) return { ok: false, reason: "Password sign-in needs the live backend." };
      const { data, error } = await sb().auth.signInWithPassword({ email: (email || "").trim().toLowerCase(), password });
      if (error) throw new Error(error.message);
      return { ok: true, user: data.user };
    },
    /**
     * Google OAuth — uses Supabase's hosted auth flow. Configure the Google
     * provider in Supabase Dashboard → Authentication → Providers → Google
     * (paste your Google Client ID + Secret there). The redirect URL Supabase
     * shows you must be added to the Google Cloud OAuth client's authorised
     * redirect URIs.
     */
    async signInWithGoogle(returnMode = "portal") {
      if (!HAS_BACKEND) throw new Error("Google sign-in requires Supabase. Mock mode only supports email field.");
      const { data, error } = await sb().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: CFG.portalReturnUrl + "?mode=" + returnMode },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    async signOut()  { if (HAS_BACKEND) await sb().auth.signOut(); },
    async user()     { if (!HAS_BACKEND) return null; const { data } = await sb().auth.getUser(); return data.user; },
    async session()  { if (!HAS_BACKEND) return null; const { data } = await sb().auth.getSession(); return data.session; },
    /**
     * The authoritative dashboard access gate. Called right after a Supabase
     * sign-in. Returns { ok, role?, reason?, message?, healed? }. Only emails
     * that are an admin (app_metadata.role set) or an APPROVED staff invite get
     * ok:true — everyone else is rejected with a reason. `healed:true` means the
     * server just stamped the role onto this user (refresh the session next).
     */
    async gate() {
      if (!HAS_BACKEND) return { ok: true, role: null, mock: true };
      try {
        const { data, error } = await sb().functions.invoke("auth-gate");
        if (error) return { ok: false, reason: "error", message: error.message || "Could not verify your access." };
        return data || { ok: false, reason: "error", message: "Could not verify your access." };
      } catch (e) {
        return { ok: false, reason: "error", message: e.message || "Could not verify your access." };
      }
    },
    /** Pull a fresh JWT (e.g. after auth-gate stamps app_metadata.role). */
    async refresh() { if (HAS_BACKEND) { try { await sb().auth.refreshSession(); } catch (_e) {} } },
    onAuthChange(handler) {
      if (!HAS_BACKEND) return () => {};
      const { data } = sb().auth.onAuthStateChange((_e, sess) => handler(sess));
      return () => { try { data?.subscription?.unsubscribe?.(); } catch (_e) {} };
    },
  };

  // ---------------------------------------------------------------------------
  // Team & access — the 2-step staff approval workflow (admin only). Reads the
  // staff_invites table (admin-RLS), sends invites via the staff-invite edge
  // function, and reflects live status (pending → approved/rejected).
  // ---------------------------------------------------------------------------
  const team = {
    list() { return (window.TEAM || []).slice(); },
    byEmail(email) {
      const e = (email || "").toLowerCase().trim();
      return (window.TEAM || []).find(t => (t.email || "").toLowerCase() === e) || null;
    },
    byLawyerId(id) { return (window.TEAM || []).find(t => t.lawyer_id === id) || null; },
    /** Admin → create/refresh a pending invite + email the approve/reject link. */
    async invite({ email, full_name, role = "lawyer", lawyer_id = null } = {}) {
      if (!HAS_BACKEND) throw new Error("Inviting staff needs the live backend.");
      const { data, error } = await sb().functions.invoke("staff-invite", {
        body: { email: (email || "").trim().toLowerCase(), full_name, role, lawyer_id },
      });
      if (error) throw new Error(error.message || "Invite failed");
      if (!data || data.ok === false) throw new Error((data && data.error) || "Invite failed");
      await reloadTeam();
      return data;
    },
    async resend(email) {
      const t = team.byEmail(email);
      return team.invite({ email, full_name: t && t.full_name, role: (t && t.role) || "lawyer", lawyer_id: (t && t.lawyer_id) || null });
    },
    reload() { return reloadTeam(); },
  };

  // ---------------------------------------------------------------------------
  // Availability — uses bookings to filter out taken slots
  // ---------------------------------------------------------------------------
  const availability = {
    // --- Diary-driven slot generation --------------------------------------
    // Real bookable slots = each lawyer's working hours (work_days/work_start/
    // work_end/slot_minutes on the lawyer record) minus existing bookings minus
    // Google-calendar busy (window.CALENDAR_BUSY). work_days uses JS getDay()
    // numbering (0=Sun … 6=Sat; default Mon–Fri). All data is available to the
    // public booking form (lawyers + calendar_busy are anon-readable).
    _hhmmToMin(t) { const [h, m] = String(t || "0:0").split(":").map(Number); return (h || 0) * 60 + (m || 0); },
    _minToHHMM(m) { const h = Math.floor(m / 60), mm = m % 60; return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`; },
    _ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; },

    /** Real bookable slots for one lawyer + service over the next 60 days. */
    forLawyer(lawyerId, serviceId) {
      const lawyer = (window.LAWYERS || []).find(l => l.id === lawyerId);
      if (!lawyer) return {};
      const svc = (window.SERVICES || []).find(s => s.id === serviceId) || {};
      const days = lawyer.work_days || lawyer.workDays || [1, 2, 3, 4, 5];
      const startMin = availability._hhmmToMin(lawyer.work_start || lawyer.workStart || "09:00");
      const endMin = availability._hhmmToMin(lawyer.work_end || lawyer.workEnd || "17:00");
      const slot = lawyer.slot_minutes || lawyer.slotMinutes || svc.duration || 45;
      const noticeH = (svc.minNoticeHours ?? svc.min_notice_hours ?? 48);
      const allowWeekends = !!svc.weekends;
      const now = new Date();
      const earliest = now.getTime() + noticeH * 3600 * 1000;
      const taken = new Set(
        (window.BOOKINGS || [])
          .filter(b => b.lawyerId === lawyerId && b.status !== "cancelled")
          .map(b => `${b.date}|${b.time}`)
      );
      const out = {};
      for (let i = 0; i < 60; i++) {
        const d = new Date(now); d.setDate(now.getDate() + i); d.setHours(0, 0, 0, 0);
        const dow = d.getDay();
        if ((dow === 0 || dow === 6) && !allowWeekends) continue;
        if (!days.includes(dow)) continue;
        const key = availability._ymd(d);
        const slots = [];
        for (let m = startMin; m + slot <= endMin; m += slot) {
          const hhmm = availability._minToHHMM(m);
          const slotTime = new Date(d); slotTime.setHours(Math.floor(m / 60), m % 60, 0, 0);
          if (slotTime.getTime() < earliest) continue;
          if (taken.has(`${key}|${hhmm}`)) continue;
          if (!availability.isSlotFree(lawyerId, key, hhmm, slot)) continue;
          slots.push(hhmm);
        }
        if (slots.length) out[key] = slots;
      }
      return out;
    },

    _eligible(serviceId) {
      return (window.LAWYERS || []).filter(l =>
        (l.kind || "ila_solicitor") !== "wet_specialist" && (l.services || []).includes(serviceId));
    },

    /** Union of all eligible lawyers' free slots (for the calendar date view). */
    forService(serviceId) {
      const merged = {};
      for (const l of availability._eligible(serviceId)) {
        const av = availability.forLawyer(l.id, serviceId);
        for (const [date, times] of Object.entries(av)) {
          (merged[date] = merged[date] || new Set());
          times.forEach(t => merged[date].add(t));
        }
      }
      const out = {};
      for (const [d, set] of Object.entries(merged)) out[d] = Array.from(set).sort();
      return out;
    },

    /** The earliest N real slots across eligible lawyers (each tagged with lawyer). */
    earliest(serviceId, n = 5) {
      const all = [];
      for (const l of availability._eligible(serviceId)) {
        const av = availability.forLawyer(l.id, serviceId);
        for (const [date, times] of Object.entries(av)) for (const t of times) all.push({ date, time: t, lawyer: l });
      }
      all.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
      return all.slice(0, n);
    },

    // --- Calendar-aware helpers (busy subtraction) -------------------------
    // Busy intervals come from window.CALENDAR_BUSY (synced from the lawyers'
    // Google/Outlook diaries). All comparisons are done in Europe/London local
    // minutes so we never offer a slot that clashes with a real diary event.
    _londonParts(iso) {
      try {
        const s = new Date(iso).toLocaleString("en-CA", {
          timeZone: "Europe/London", hour12: false,
          year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
        });
        const [date, time] = s.replace(",", "").trim().split(/\s+/);
        const [hh, mm] = time.split(":").map(Number);
        return { date, minutes: (hh % 24) * 60 + mm };
      } catch (_e) { return null; }
    },
    /** Busy [startMin,endMin] ranges (London minutes) for a lawyer on a date. */
    busyRangesForLawyer(lawyerId, dateKey) {
      const rows = (window.CALENDAR_BUSY || []).filter(b => b.lawyerId === lawyerId);
      const ranges = [];
      for (const b of rows) {
        const s = availability._londonParts(b.start), e = availability._londonParts(b.end);
        if (!s || !e) continue;
        if (dateKey < s.date || dateKey > e.date) continue;     // interval doesn't touch this day
        const startMin = dateKey > s.date ? 0 : s.minutes;
        const endMin = dateKey < e.date ? 1440 : e.minutes;
        if (endMin > startMin) ranges.push([startMin, endMin]);
      }
      return ranges;
    },
    /** True if a slot at "HH:MM" for `durationMins` is free of diary conflicts. */
    isSlotFree(lawyerId, dateKey, hhmm, durationMins = 45) {
      if (!lawyerId || !(window.CALENDAR_BUSY || []).length) return true;
      const [hh, mm] = String(hhmm).split(":").map(Number);
      const slotStart = hh * 60 + mm, slotEnd = slotStart + durationMins;
      return !availability.busyRangesForLawyer(lawyerId, dateKey)
        .some(([a, b]) => slotStart < b && slotEnd > a);     // overlap test
    },
  };

  // ---------------------------------------------------------------------------
  // CSV export helper
  // ---------------------------------------------------------------------------
  function exportCsv(filename, rows, columns) {
    const esc = (v) => {
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = columns.map(c => esc(c.label)).join(",");
    const body = rows.map(r => columns.map(c => esc(typeof c.value === "function" ? c.value(r) : r[c.value])).join(","));
    const blob = new Blob([head + "\n" + body.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  // ---------------------------------------------------------------------------
  // Automations — Supabase-native reminder/email/SMS engine.
  //   • rules live in public.automation_rules (admin-editable)
  //   • DB triggers queue rows into public.messages on booking create
  //   • pg_cron → dispatch-automations edge function sends them
  // In mock mode the rules persist to localStorage so the UI is fully usable
  // for design/demo without a backend (nothing actually sends).
  // ---------------------------------------------------------------------------
  const AUTO_RULES_KEY = "fastila_automation_rules_v1";
  const DEFAULT_RULES = [
    { key: "booking_confirmation", label: "Booking confirmation", description: "Sent the moment a booking is created.", channel: "both", enabled: true, anchor: "immediate", offset_minutes: 0, sort_order: 10 },
    { key: "reminder_24h", label: "24-hour reminder", description: "Sent 24 hours before the appointment.", channel: "both", enabled: true, anchor: "appointment", offset_minutes: -1440, sort_order: 20 },
    { key: "reminder_1h", label: "1-hour reminder (SMS)", description: "Sent 1 hour before the appointment.", channel: "sms", enabled: false, anchor: "appointment", offset_minutes: -60, sort_order: 30 },
    { key: "payment_chase", label: "Payment reminder", description: "Sent 48h after booking if still unpaid. Auto-cancels once paid.", channel: "both", enabled: true, anchor: "booking_created", offset_minutes: 2880, sort_order: 40 },
    { key: "feedback_request", label: "Feedback request", description: "Sent 2 hours after the appointment.", channel: "email", enabled: false, anchor: "appointment", offset_minutes: 120, sort_order: 50 },
  ];
  function loadMockRules() {
    try { const raw = localStorage.getItem(AUTO_RULES_KEY); if (raw) return JSON.parse(raw); } catch (_e) {}
    return DEFAULT_RULES.map(r => ({ ...r }));
  }
  function saveMockRules(rules) {
    try { localStorage.setItem(AUTO_RULES_KEY, JSON.stringify(rules)); } catch (_e) {}
  }

  const automations = {
    async rules() {
      if (HAS_BACKEND) {
        const { data, error } = await sb().from("automation_rules").select("*").order("sort_order", { ascending: true });
        if (error) throw new Error(error.message);
        return data || [];
      }
      return loadMockRules().sort((a, b) => a.sort_order - b.sort_order);
    },
    async updateRule(key, patch) {
      if (HAS_BACKEND) {
        const { data, error } = await sb().from("automation_rules")
          .update({ ...patch, updated_at: new Date().toISOString() })
          .eq("key", key).select().single();
        if (error) throw new Error(error.message);
        window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "automations.rule" } }));
        return data;
      }
      const rules = loadMockRules();
      const i = rules.findIndex(r => r.key === key);
      if (i >= 0) rules[i] = { ...rules[i], ...patch };
      saveMockRules(rules);
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "automations.rule" } }));
      return rules[i];
    },
    async messages(opts = {}) {
      if (!HAS_BACKEND) return [];
      let q = sb().from("messages").select("*").order("created_at", { ascending: false }).limit(opts.limit || 100);
      if (opts.status) q = q.eq("status", opts.status);
      if (opts.booking_id) q = q.eq("booking_id", opts.booking_id);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
    async runs(limit = 20) {
      if (!HAS_BACKEND) return [];
      const { data } = await sb().from("automation_runs").select("*").order("ran_at", { ascending: false }).limit(limit);
      return data || [];
    },
    /** Counts for the dashboard header: pending / due-now / sent / failed. */
    async stats() {
      if (!HAS_BACKEND) return { pending: 0, due: 0, sent: 0, failed: 0, mock: true };
      const nowIso = new Date().toISOString();
      const count = async (q) => { const { count } = await q; return count || 0; };
      const base = () => sb().from("messages").select("id", { count: "exact", head: true });
      const [pending, due, sent, failed] = await Promise.all([
        count(base().eq("status", "pending")),
        count(base().eq("status", "pending").lte("send_after", nowIso)),
        count(base().eq("status", "sent")),
        count(base().eq("status", "failed")),
      ]);
      return { pending, due, sent, failed };
    },
    /** Admin "Send due now" — invokes the edge function with the user's JWT. */
    async dispatchNow() {
      if (!HAS_BACKEND) return { ok: true, mock: true, processed: 0 };
      const { data, error } = await sb().functions.invoke("dispatch-automations", { body: { source: "manual" } });
      if (error) throw new Error(error.message || "dispatch failed");
      return data;
    },
    /** Admin invites a staff member (sets their role + staff row server-side). */
    async inviteUser(input) {
      if (!HAS_BACKEND) return users.add(input);
      const { data, error } = await sb().functions.invoke("invite-user", { body: input });
      if (error) throw new Error(error.message || "invite failed");
      if (data && data.ok === false) throw new Error(data.error || "invite failed");
      return data;
    },
  };

  // ---------------------------------------------------------------------------
  // Calendar & diary sync (Phase 2) — per-lawyer Google / Outlook connections.
  // All token handling stays server-side in the `calendar` edge function; the
  // browser only ever sees sanitised status + the free/busy cache.
  // ---------------------------------------------------------------------------
  const calendar = {
    async connections(lawyerId) {
      if (!HAS_BACKEND) return [];
      const { data, error } = await sb().functions.invoke("calendar", { body: { action: "status", lawyer_id: lawyerId } });
      if (error) throw new Error(error.message || "status failed");
      return (data && data.connections) || [];
    },
    /** Returns the provider OAuth URL to begin connecting (caller then redirects). */
    async connectUrl(provider, lawyerId) {
      if (!HAS_BACKEND) throw new Error("Calendar sync needs the live backend (set Supabase keys in config.js).");
      const { data, error } = await sb().functions.invoke("calendar", { body: { action: "start", provider, lawyer_id: lawyerId } });
      if (error) throw new Error(error.message || "could not start OAuth");
      if (!data || !data.url) throw new Error(data && data.error ? data.error : "no auth URL returned");
      return data.url;
    },
    async disconnect(provider, lawyerId) {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      const { data, error } = await sb().functions.invoke("calendar", { body: { action: "disconnect", provider, lawyer_id: lawyerId } });
      if (error) throw new Error(error.message || "disconnect failed");
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "calendar.disconnect" } }));
      return data;
    },
    /** Connect the ONE firm Google calendar (mints every booking's Meet link). */
    async connectFirmUrl(provider = "google") {
      if (!HAS_BACKEND) throw new Error("Calendar sync needs the live backend (set Supabase keys in config.js).");
      const { data, error } = await sb().functions.invoke("calendar", { body: { action: "start", firm: true, provider } });
      if (error) throw new Error(error.message || "could not start OAuth");
      if (!data || !data.url) throw new Error(data && data.error ? data.error : "no auth URL returned");
      return data.url;
    },
    async disconnectFirm(provider = "google") {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      const { data, error } = await sb().functions.invoke("calendar", { body: { action: "disconnect", firm: true, provider } });
      if (error) throw new Error(error.message || "disconnect failed");
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "calendar.firm" } }));
      return data;
    },
    /** The firm connection row (kind='firm'), if connected. */
    async firmStatus() {
      const conns = await this.connections();
      return (conns || []).find(c => c.kind === "firm") || null;
    },
    async syncNow(lawyerId) {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      const { data, error } = await sb().functions.invoke("calendar", { body: { action: "sync", lawyer_id: lawyerId, source: "manual" } });
      if (error) throw new Error(error.message || "sync failed");
      return data;
    },
    /** Load the free/busy cache into window.CALENDAR_BUSY (used by availability). */
    async loadBusy() {
      if (!HAS_BACKEND) { window.CALENDAR_BUSY = window.CALENDAR_BUSY || []; return; }
      try {
        const { data } = await sb().from("calendar_busy").select("lawyer_id, provider, starts_at, ends_at");
        window.CALENDAR_BUSY = (data || []).map(r => ({ lawyerId: r.lawyer_id, provider: r.provider, start: r.starts_at, end: r.ends_at }));
        window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "calendar.busy" } }));
      } catch (_e) { window.CALENDAR_BUSY = window.CALENDAR_BUSY || []; }
    },
  };

  // ---------------------------------------------------------------------------
  // Recordings & transcripts (Phase 3) — upload a call recording, auto-transcribe
  // (Whisper) and write an AI summary onto the booking. Files live in the
  // private 'recordings' bucket; all keys stay server-side in the edge fn.
  // ---------------------------------------------------------------------------
  const recordings = {
    async list(bookingId) {
      if (!HAS_BACKEND || !bookingId) return [];
      const [recsRes, trsRes] = await Promise.all([
        sb().from("recordings").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
        sb().from("transcripts").select("*").eq("booking_id", bookingId).order("created_at", { ascending: false }),
      ]);
      const trByRec = {};
      (trsRes.data || []).forEach(t => { if (!trByRec[t.recording_id]) trByRec[t.recording_id] = t; });
      return (recsRes.data || []).map(r => ({ ...r, transcript: trByRec[r.id] || null }));
    },
    /** Map of booking_id → { count, transcribed } for the admin overview. */
    async overview() {
      if (!HAS_BACKEND) return {};
      const [recsRes, trsRes] = await Promise.all([
        sb().from("recordings").select("booking_id,status"),
        sb().from("transcripts").select("booking_id"),
      ]);
      const map = {};
      (recsRes.data || []).forEach(r => { const m = map[r.booking_id] || (map[r.booking_id] = { count: 0, transcribed: 0 }); m.count++; });
      (trsRes.data || []).forEach(t => { const m = map[t.booking_id] || (map[t.booking_id] = { count: 0, transcribed: 0 }); m.transcribed++; });
      return map;
    },
    async upload(bookingId, file) {
      if (!HAS_BACKEND) throw new Error("Recording upload needs the live backend (set Supabase keys in config.js).");
      if (!bookingId) throw new Error("Missing booking id.");
      const safe = (file.name || "recording").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${bookingId}/${Date.now()}-${safe}`;
      const up = await sb().storage.from("recordings").upload(path, file, { contentType: file.type || "application/octet-stream", upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { data, error } = await sb().from("recordings").insert({
        booking_id: bookingId, source: "upload", storage_path: path,
        filename: file.name || safe, mime_type: file.type || null, size_bytes: file.size || null,
      }).select().single();
      if (error) throw new Error(error.message);
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "recording.upload" } }));
      return data;
    },
    async transcribe(recordingId) {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      const { data, error } = await sb().functions.invoke("transcribe", { body: { recording_id: recordingId } });
      if (error) throw new Error(error.message || "transcription failed");
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "recording.transcribed" } }));
      return data;
    },
    /** Phase 3b — pull any new Meet/Teams transcripts now (admin). */
    async ingestNow() {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      const { data, error } = await sb().functions.invoke("recordings-ingest", { body: { source: "manual" } });
      if (error) throw new Error(error.message || "ingest failed");
      return data;
    },
    async remove(rec) {
      if (!HAS_BACKEND) return { ok: true, mock: true };
      try { if (rec.storage_path) await sb().storage.from("recordings").remove([rec.storage_path]); } catch (_e) {}
      await sb().from("recordings").delete().eq("id", rec.id);
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "recording.remove" } }));
      return { ok: true };
    },
  };

  // ---------------------------------------------------------------------------
  // Platform health (Phase 4) — drives the Integrations Control Center.
  //   • health()  → armed schedulers (Vault) + live counts (staff RPC)
  //   • secrets() → which provider secrets are configured (booleans, no values)
  // ---------------------------------------------------------------------------
  const platform = {
    async health() {
      if (!HAS_BACKEND) return null;
      const { data, error } = await sb().rpc("fi_platform_health");
      if (error) throw new Error(error.message);
      return data;
    },
    async secrets() {
      if (!HAS_BACKEND) return null;
      const { data, error } = await sb().functions.invoke("health");
      if (error) throw new Error(error.message || "health check failed");
      return (data && data.secrets) || {};
    },
  };

  // ---------------------------------------------------------------------------
  // Clients — returning-client history. Every booking is linked to a client by
  // email (DB trigger), so we can show a person's full history of bookings +
  // certificates in the portal (their own) and the dashboard (staff: everyone).
  // ---------------------------------------------------------------------------
  const clients = {
    /** Staff directory — one row per unique client, aggregated from the store. */
    directory() {
      const map = {};
      (window.BOOKINGS || []).forEach(b => {
        const e = (b.clientEmail || "").toLowerCase().trim(); if (!e) return;
        const m = map[e] || (map[e] = { email: e, name: b.clientName || "", phone: b.phone || "", count: 0, lastDate: "", refs: [], lenders: {} });
        m.count++; m.refs.push(b.ref);
        if (b.date && b.date > m.lastDate) m.lastDate = b.date;
        if (b.clientName) m.name = b.clientName;
        if (b.phone) m.phone = b.phone;
        if (b.lender) m.lenders[b.lender] = true;
      });
      return Object.values(map)
        .map(m => ({ ...m, lenders: Object.keys(m.lenders) }))
        .sort((a, b) => (b.lastDate || "").localeCompare(a.lastDate || ""));
    },
    /** All bookings for an email, newest first (from the loaded store). */
    historyByEmail(email) {
      const e = (email || "").toLowerCase().trim();
      return (window.BOOKINGS || [])
        .filter(b => (b.clientEmail || "").toLowerCase().trim() === e)
        .slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
    },
    /** Certificate / signed-document records for a set of booking refs/ids. */
    certsFor(refs) {
      const set = new Set(refs || []);
      return (window.DOCUMENTS || []).filter(d =>
        (set.has(d.booking_ref) || set.has(d.booking_id)) &&
        /cert|care_letter|declaration/i.test(d.kind || ""));
    },
    /** Portal: the signed-in client's own bookings (RLS-scoped to them). */
    async myBookings(email) {
      if (!HAS_BACKEND) return clients.historyByEmail(email);
      const { data, error } = await sb().from("bookings")
        .select("ref,id,service_id,lawyer_id,appointment_date,appointment_time,status,payment_status,amount,lender")
        .ilike("client_email", (email || "").trim())
        .order("appointment_date", { ascending: false });
      if (error) return [];
      return data || [];
    },
    /** Public booking form: returning-client check — returns booleans only. */
    async lookupPublic(email) {
      if (!HAS_BACKEND) return { returning: false, count: 0 };
      try { const { data } = await sb().functions.invoke("client-lookup", { body: { email } }); return data || { returning: false, count: 0 }; }
      catch (_e) { return { returning: false, count: 0 }; }
    },
  };

  // ---------------------------------------------------------------------------
  // AI — server-side proxy to Anthropic/OpenAI (keys stay in Supabase secrets).
  // Powers the dashboard assistant, the pre-call brief, and note drafting.
  // ---------------------------------------------------------------------------
  const ai = {
    /** messages: [{role:'user'|'assistant', content}] ; returns { text, provider }. */
    async complete(system, messages, opts = {}) {
      if (!HAS_BACKEND) throw new Error("AI needs the live backend (set Supabase keys in config.js).");
      const { data, error } = await sb().functions.invoke("ai", { body: { system, messages, max_tokens: opts.max_tokens || 1024 } });
      if (error) throw new Error(error.message || "AI request failed");
      if (!data || data.ok === false) throw new Error((data && data.error) || "AI request failed");
      return { text: data.text || "", provider: data.provider };
    },
  };

  // ---------------------------------------------------------------------------
  // useStore hook for components
  // ---------------------------------------------------------------------------
  function useStore() {
    if (!window.React) return [0, () => {}];
    const [tick, setTick] = window.React.useState(0);
    window.React.useEffect(() => {
      const h = () => setTick(t => t + 1);
      window.addEventListener("fastila:store-changed", h);
      return () => window.removeEventListener("fastila:store-changed", h);
    }, []);
    return [tick, () => setTick(t => t + 1)];
  }

  // ---------------------------------------------------------------------------
  // Initialize: hydrate after a microtask so data.jsx has populated the seeds
  // ---------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Realtime subscriptions — when Supabase is live, mirror DB changes into
  // window.* arrays so every open tab/role sees admin/lawyer/client edits
  // instantly. Falls back to localStorage+BroadcastChannel in mock mode.
  // -------------------------------------------------------------------------
  let realtimeChannel = null;
  async function startRealtime() {
    if (!HAS_BACKEND || realtimeChannel) return;
    try {
      const client = sb();
      if (!client) return;
      // One channel, multiple table subscriptions — cheaper than N channels.
      realtimeChannel = client.channel("fastila-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, async () => { await reloadBookings(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "signatures" }, async () => { await reloadSignatures(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "documents" }, async () => { await reloadDocuments(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, async () => { await reloadPayments(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "lawyers" }, async () => { await reloadLawyers(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
          // Automation Center reads messages directly; just nudge a re-render.
          window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.messages" } }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "calendar_busy" }, async () => { await calendar.loadBusy(); })
        .on("postgres_changes", { event: "*", schema: "public", table: "recordings" }, () => {
          window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.recordings" } }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "transcripts" }, () => {
          window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.transcripts" } }));
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "staff_invites" }, async () => { await reloadTeam(); })
        .subscribe();
    } catch (e) { console.warn("[FastILA realtime] failed to subscribe", e); }
  }

  async function reloadBookings() {
    try {
      const { data, error } = await sb().from("bookings").select("*").order("appointment_date", { ascending: false });
      if (error) return;
      // Map Supabase column names → window.BOOKINGS shape the UI reads
      window.BOOKINGS = (data || []).map(r => ({
        ref: r.ref, id: r.id,
        clientName: r.client_name, clientEmail: r.client_email, phone: r.client_phone,
        serviceId: r.service_id, lawyerId: r.lawyer_id,
        date: r.appointment_date, time: r.appointment_time,
        status: r.status, payment: r.payment_status, amount: r.amount,
        lender: r.lender, legal: r.legal_summary, source: r.source,
        dispatch: r.dispatch, trackingNumber: r.tracking_number, trackingService: r.tracking_service,
        postRecipient: r.post_recipient, postAddress: r.post_address,
        secondSignatoryName: r.second_signatory_name, secondSignatoryEmail: r.second_signatory_email,
        matterType: r.matter_type, meetLink: r.meet_link,
        createdAt: r.created_at, completedAt: r.completed_at,
      }));
      saveToStorage();
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.bookings" } }));
    } catch (_e) {}
  }
  async function reloadSignatures() {
    try {
      const { data } = await sb().from("signatures").select("*");
      window.SIGNATURES = (data || []).map(r => ({
        booking_ref: r.booking_id, booking_id: r.booking_id,
        kind: r.kind, signed_by: r.signed_by, signed_by_role: r.signed_by_role,
        signature_data: r.signature_data, signed_at: r.signed_at,
      }));
      saveToStorage();
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.signatures" } }));
    } catch (_e) {}
  }
  async function reloadDocuments() {
    try {
      const { data } = await sb().from("documents").select("*");
      window.DOCUMENTS = (data || []).map(r => ({
        id: r.id, booking_ref: r.booking_id, booking_id: r.booking_id,
        kind: r.kind, filename: r.filename, size_bytes: r.size_bytes,
        mime_type: r.mime_type, storage_path: r.storage_path,
        uploaded_by: r.uploaded_by, uploaded_at: r.created_at,
      }));
      saveToStorage();
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.documents" } }));
    } catch (_e) {}
  }
  async function reloadPayments() {
    try {
      const { data } = await sb().from("payments").select("*");
      window.PAYMENTS = (data || []).map(r => ({
        booking_ref: r.booking_id, reference: r.reference,
        status: r.status, method: r.method, paid_at: r.paid_at,
      }));
      saveToStorage();
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.payments" } }));
    } catch (_e) {}
  }
  async function reloadLawyers() {
    try {
      const { data } = await sb().from("lawyers").select("*").eq("active", true);
      if (!data) return;
      window.LAWYERS = data;
      saveToStorage();
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.lawyers" } }));
    } catch (_e) {}
  }
  // Admin-only: staff_invites drives the dashboard-access status badges. RLS
  // returns nothing for non-admins, so this is a no-op for lawyers.
  async function reloadTeam() {
    if (!HAS_BACKEND) return;
    try {
      const { data, error } = await sb().from("staff_invites").select("*").order("invited_at", { ascending: false });
      if (error) return;
      window.TEAM = (data || []).map(r => ({
        email: r.email, full_name: r.full_name, role: r.role, lawyer_id: r.lawyer_id,
        status: r.status, invited_at: r.invited_at, decided_at: r.decided_at,
      }));
      window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "realtime.team" } }));
    } catch (_e) {}
  }

  function init() {
    hydrateFromStorage();
    users.cleanDemoSeeds();
    users.bootstrap();
    window.dispatchEvent(new CustomEvent("fastila:store-changed", { detail: { reason: "init" } }));
    if (HAS_BACKEND) {
      // Initial server sync — pull live data + subscribe to changes
      (async () => {
        await reloadLawyers();
        await reloadBookings();
        await reloadSignatures();
        await reloadDocuments();
        await reloadPayments();
        await reloadTeam();
        await calendar.loadBusy();
        await startRealtime();
      })();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    setTimeout(init, 0);
  }

  // ---------------------------------------------------------------------------
  // Public surface
  // ---------------------------------------------------------------------------
  window.FastILA = {
    mode: HAS_BACKEND ? "live" : "mock",
    config: CFG,
    services, lawyers, availability, bookings,
    documents, signatures, payments, understanding,
    templates, prompts, lenders: lendersStore, brokers, auth,
    users, notifications, firm, admin,
    contacts, mailshots, emailTemplates, automations, calendar, recordings, platform, clients, ai, team,
    util: { exportCsv, nextRef },
    useStore,
    _hydrate: hydrateFromStorage,
    _save: saveToStorage,
  };

  // Banner
  const tag = HAS_BACKEND ? "%c FastILA · live " : "%c FastILA · mock+persist ";
  const css = HAS_BACKEND
    ? "background:#0a4a67;color:#e6f7c8;padding:2px 6px;border-radius:3px;"
    : "background:#f4e8c2;color:#063952;padding:2px 6px;border-radius:3px;";
  // eslint-disable-next-line no-console
  console.log(tag, css);
})();

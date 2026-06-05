/* global React, Icon, fiToast */

// ============================================================================
// AutomationsView — admin-side catalog of every n8n event the platform fires.
// For each event we show:
//   • the trigger name (the literal `event` field on the webhook payload)
//   • when it fires
//   • a JSON sample payload
//   • a copy-pasteable email subject + body template
//   • a copy-pasteable SMS template
//   • a suggested n8n node chain
// The admin uses this as the spec for the workflows they build in n8n.
// ============================================================================

const AUTOMATION_EVENTS = [
  // -- Booking lifecycle --------------------------------------------------
  {
    id: "booking.created",
    category: "Booking lifecycle",
    title: "Booking created",
    when: "Fires the moment a new ILA booking is submitted via the booking form.",
    sample: {
      event: "booking.created",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      clientEmail: "priya@example.co.uk",
      phone: "+447700900123",
      serviceId: "couples",
      lawyerId: "amelia",
      date: "2026-06-12",
      time: "14:00",
      lender: "Shawbrook Bank",
      summary: "Personal guarantee for company facility.",
      portalUrl: "https://app.fast-ila.co.uk/?mode=portal&ref=FI-2026-00042",
    },
    email: {
      subject: "Your ILA appointment is confirmed — {{ref}}",
      body: `Hi {{firstName}},\n\nThank you for booking your Independent Legal Advice (ILA) appointment.\n\n  • Date: {{date}} at {{time}} (UK time)\n  • Reference: {{ref}}\n  • Solicitor: {{lawyerName}}\n\nNext, please open your client portal to:\n  1. Read and sign your client care letter\n  2. Upload photo ID + proof of address\n  3. Upload the documents your lender has asked you to sign\n  4. Pay the fee by bank transfer\n\nOpen your portal:\n{{portalUrl}}\n\nAny questions, just reply to this email.\n\nKind regards,\nFast-ILA`,
    },
    sms: "Hi {{firstName}}, your ILA appointment on {{date}} {{time}} is confirmed (ref {{ref}}). Open your portal to upload docs & pay: {{portalUrl}}",
    chain: ["Webhook (POST /fastila)", "IF event == 'booking.created'", "Send email (Gmail/Resend)", "Send SMS (Twilio)", "Create row in CRM"],
  },
  {
    id: "booking.care_letter_signed",
    category: "Booking lifecycle",
    title: "Care letter signed",
    when: "Fires when the client signs the CCL in their portal.",
    sample: {
      event: "booking.care_letter_signed",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      clientEmail: "priya@example.co.uk",
      signedAt: "2026-06-10T15:42:00Z",
      portalUrl: "https://app.fast-ila.co.uk/?mode=portal&ref=FI-2026-00042",
    },
    email: {
      subject: "Care letter signed — next step is ID + payment",
      body: `Hi {{firstName}},\n\nThanks for signing your client care letter.\n\nNext steps in your portal:\n  • Upload photo ID and proof of address\n  • Upload your lender's documents (the ones you'll be signing)\n  • Pay the fee by bank transfer — the reference is shown in your portal\n\nOpen your portal:\n{{portalUrl}}\n\nKind regards,\nFast-ILA`,
    },
    sms: "Thanks {{firstName}} — CCL signed. Next: upload your ID + lender docs, and pay. {{portalUrl}}",
    chain: ["Webhook trigger", "IF event == 'booking.care_letter_signed'", "Send email", "Send SMS"],
  },
  {
    id: "booking.payment_declared",
    category: "Booking lifecycle",
    title: "Payment declared by client",
    when: "Fires when the client marks the bank transfer complete in their portal.",
    sample: {
      event: "booking.payment_declared",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      amount: 250.00,
      reference: "KAO/PRIYAMEHTA",
      declaredAt: "2026-06-10T16:05:00Z",
    },
    email: {
      subject: "Payment received — thank you ({{ref}})",
      body: `Hi {{firstName}},\n\nWe've matched your payment of £{{amount}} (ref {{reference}}).\n\nYour call is locked in — your lawyer will message you ahead of time with anything else.\n\nKind regards,\nFast-ILA`,
    },
    sms: "Payment matched — £{{amount}}, ref {{reference}}. We'll see you on the call.",
    chain: ["Webhook trigger", "IF event == 'booking.payment_declared'", "Confirm receipt email", "Update CRM / accounting"],
  },
  {
    id: "booking.cert_delivered",
    category: "Booking lifecycle",
    title: "Signed cert emailed to client",
    when: "Fires when the lawyer hits 'Email signed cert' on a lawyer-only matter. Carries a download reference to the signed PDF so n8n can fetch + attach it.",
    sample: {
      event: "booking.cert_delivered",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      clientEmail: "priya@example.co.uk",
      phone: "+447700900123",
      lender: "Shawbrook Bank",
      portalUrl: "https://app.fast-ila.co.uk/?mode=portal&ref=FI-2026-00042",
      certificate: {
        filename: "Shawbrook_ILA_Cert_Mehta_signed.pdf",
        size_bytes: 184320,
        mime_type: "application/pdf",
        storage_path: "FI-2026-00042/cert_lawyer_signed/1717152400-cert.pdf",
        downloadUrl: "<signed Supabase URL>",
      },
      message: {
        subject: "Your signed ILA certificate — FI-2026-00042",
        body: "<html>…full HTML body with {{firstName}} substituted…</html>",
        format: "html",
      },
      templateName: "Cert delivery (signed ILA)",
      firm: { name: "Nexa Law Ltd", supportEmail: "info@fast-ila.co.uk" },
      smtp: { provider: "resend", password: "re_xxxxxxxxxxxx", fromName: "Fast-ILA", fromEmail: "bookings@yourfirm.com", replyTo: "info@yourfirm.com" },
    },
    email: {
      subject: "{{message.subject}}  (passed through verbatim)",
      body: "{{message.body}}  (HTML — attach the cert downloaded from certificate.downloadUrl)",
    },
    sms: null,
    chain: [
      "Webhook trigger (POST /fastila)",
      "IF event == 'booking.cert_delivered'",
      "HTTP node: download certificate.downloadUrl as binary data",
      "Send email via Resend / Gmail with subject + body + cert attached",
      "Optional: log to CRM and to a Google Sheet",
    ],
  },
  {
    id: "booking.completed",
    category: "Booking lifecycle",
    title: "Booking marked complete",
    when: "Fires when the lawyer marks the matter complete after the call.",
    sample: {
      event: "booking.completed",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      lawyerId: "amelia",
      completedAt: "2026-06-12T15:00:00Z",
    },
    email: {
      subject: "Your ILA call is done — what happens next",
      body: `Hi {{firstName}},\n\nThanks for the call today.\n\nYour solicitor will sign your declaration and ILA certificate shortly. You'll get an email when the signed PDF is ready in your portal.\n\nIf you found us helpful, a quick Google review really helps small firms like ours: {{reviewLink}}\n\nKind regards,\nFast-ILA`,
    },
    sms: "Thanks {{firstName}} — call done. Your certificate will be in your portal shortly: {{portalUrl}}",
    chain: ["Webhook trigger", "IF event == 'booking.completed'", "Send post-call email", "Wait 24h", "Send Google review request"],
  },

  // -- Reminders ----------------------------------------------------------
  {
    id: "booking.reminder.upload_documents",
    category: "Reminders",
    title: "Upload-documents reminder",
    when: "Fires when a lawyer hits 'Send reminder' on the Client uploads panel.",
    sample: {
      event: "booking.reminder.upload_documents",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      clientEmail: "priya@example.co.uk",
      phone: "+447700900123",
      appointmentDate: "2026-06-12",
      appointmentTime: "14:00",
      portalUrl: "https://app.fast-ila.co.uk/?mode=portal&ref=FI-2026-00042",
      message: { subject: "Documents needed for your ILA call", body: "Hi Priya — we still need your photo ID and the lender pack…" },
      channels: ["email", "sms"],
    },
    email: {
      subject: "{{message.subject}}",
      body: "{{message.body}}",
    },
    sms: "{{message.body}}",
    chain: ["Webhook trigger", "IF event == 'booking.reminder.upload_documents'", "IF 'email' in channels → send email with message.subject + message.body", "IF 'sms' in channels → send SMS with message.body"],
  },
  {
    id: "booking.reminder.payment",
    category: "Reminders",
    title: "Payment reminder",
    when: "Fires when a lawyer/admin hits 'Send payment reminder' on a pending-payment booking.",
    sample: {
      event: "booking.reminder.payment",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      clientEmail: "priya@example.co.uk",
      phone: "+447700900123",
      amount: 250.00,
      reference: "KAO/PRIYAMEHTA",
      portalUrl: "https://app.fast-ila.co.uk/?mode=portal&ref=FI-2026-00042",
      message: { subject: "Payment reminder for your ILA call", body: "Hi Priya — your fee of £250.00 hasn't reached us…" },
      channels: ["email", "sms"],
    },
    email: { subject: "{{message.subject}}", body: "{{message.body}}" },
    sms: "{{message.body}}",
    chain: ["Webhook trigger", "IF event == 'booking.reminder.payment'", "Send email", "Send SMS"],
  },
  {
    id: "booking.reminder.review_request",
    category: "Reminders",
    title: "Google review request",
    when: "Fires when a lawyer asks the client for a Google review (typically 24h after the call).",
    sample: {
      event: "booking.reminder.review_request",
      ref: "FI-2026-00042",
      clientName: "Priya Mehta",
      reviewUrl: "https://g.page/r/your-firm/review",
    },
    email: {
      subject: "Quick favour, {{firstName}}?",
      body: `Hi {{firstName}},\n\nIf you found your ILA call helpful, a 1-line Google review really helps us:\n{{reviewUrl}}\n\nThanks so much,\nFast-ILA`,
    },
    sms: "Hi {{firstName}}, would you mind leaving us a quick Google review? {{reviewUrl}} 🙏",
    chain: ["Webhook trigger", "IF event == 'booking.reminder.review_request'", "Send email", "Send SMS"],
  },

  // -- Service changes ----------------------------------------------------
  {
    id: "booking.service_upgraded",
    category: "Service changes",
    title: "Service upgraded (top-up due)",
    when: "Fires when the lawyer swaps a booking to a more expensive service (e.g. digital → wet).",
    sample: {
      event: "booking.service_upgraded",
      ref: "FI-2026-00042",
      client: { name: "Priya Mehta", email: "priya@example.co.uk", phone: "+447700900123" },
      previousService: { id: "couples", name: "Joint ILA", price: 250, delivery: "digital" },
      newService: { id: "wet", name: "Wet signature ILA", price: 350, delivery: "wet" },
      payment: { delta: 100, direction: "client_to_firm", amountToPay: 100, newTotal: 350, reference: "KAO/PRIYAMEHTA", account: { bank: "Lloyds", sortCode: "30-00-00", accountNumber: "12345678", accountName: "Nexa Law Ltd Client Account" } },
      portalUrl: "https://app.fast-ila.co.uk/?mode=portal&ref=FI-2026-00042",
    },
    email: {
      subject: "Quick top-up needed — your ILA service has been upgraded",
      body: `Hi {{firstName}},\n\nWe've upgraded your ILA to: {{newService.name}} (£{{newService.price}}).\n\nThe top-up of £{{payment.amountToPay}} can be paid by bank transfer to:\n\nBank: {{payment.account.bank}}\nSort code: {{payment.account.sortCode}}\nAccount: {{payment.account.accountNumber}}\nAccount name: {{payment.account.accountName}}\nReference: {{payment.reference}}\nAmount: £{{payment.amountToPay}}\n\nThanks,\nFast-ILA`,
    },
    sms: "Hi {{firstName}}, your ILA was upgraded to {{newService.name}}. Top-up of £{{payment.amountToPay}} due. Ref {{payment.reference}}.",
    chain: ["Webhook trigger", "IF event == 'booking.service_upgraded'", "Send email + SMS with bank details", "Notify firm Slack/Teams"],
  },
  {
    id: "booking.service_downgraded",
    category: "Service changes",
    title: "Service downgraded (refund due)",
    when: "Fires when the lawyer swaps a booking to a less expensive service. Refund the difference to the client.",
    sample: {
      event: "booking.service_downgraded",
      ref: "FI-2026-00042",
      client: { name: "Priya Mehta", email: "priya@example.co.uk" },
      previousService: { id: "wet", price: 350 },
      newService: { id: "couples", price: 250 },
      payment: { delta: -100, direction: "firm_to_client", amountToRefund: 100, newTotal: 250 },
    },
    email: {
      subject: "Refund on the way — your ILA fee has been adjusted",
      body: `Hi {{firstName}},\n\nYour ILA service has been changed, and £{{payment.amountToRefund}} will be refunded to the account you paid from.\n\nNew fee: £{{newService.price}}\n\nKind regards,\nFast-ILA`,
    },
    sms: "Hi {{firstName}}, a £{{payment.amountToRefund}} refund is being processed for your ILA fee.",
    chain: ["Webhook trigger", "IF event == 'booking.service_downgraded'", "Trigger refund (manual or Stripe)", "Send refund-notice email"],
  },

  // -- Wet signature flow -------------------------------------------------
  {
    id: "booking.wet.pack_sent",
    category: "Wet signature flow",
    title: "Postal instructions sent to client",
    when: "Fires when the lawyer emails the client our office address so they can post the signed pack back.",
    sample: { event: "booking.wet.pack_sent", ref: "FI-2026-00042", clientName: "Priya Mehta", clientEmail: "priya@example.co.uk", phone: "+447700900123", portalUrl: "…" },
    email: {
      subject: "Where to post your signed pack — {{ref}}",
      body: `Hi {{firstName}},\n\nOnce you've signed your lender documents in ink, please post them to us:\n\n{{firmAddress}}\n\nUse Royal Mail Signed For or Special Delivery so it's tracked. Mark the envelope FAO {{lawyerName}} / ref {{ref}}.\n\nKind regards,\nFast-ILA`,
    },
    sms: "Hi {{firstName}}, post your signed pack to: {{firmAddress}} (FAO {{lawyerName}} / {{ref}}). Use a tracked service.",
    chain: ["Webhook trigger", "Send email + SMS", "Optional: trigger Royal Mail label generation"],
  },
  {
    id: "booking.wet.client_pack_received",
    category: "Wet signature flow",
    title: "Firm received signed pack from client",
    when: "Fires when the lawyer marks 'Received' in the wet flow panel — the client's signed envelope landed at the office.",
    sample: { event: "booking.wet.client_pack_received", ref: "FI-2026-00042", clientName: "Priya Mehta" },
    email: { subject: "We've received your signed pack — {{ref}}", body: `Hi {{firstName}},\n\nQuick update: your signed pack arrived at our office today. Your solicitor will sign and witness it, then post it to the lender.\n\nWe'll send you the Royal Mail tracking number as soon as it's posted.\n\nKind regards,\nFast-ILA` },
    sms: "Hi {{firstName}}, we've received your signed pack. We'll send tracking when we post to the lender.",
    chain: ["Webhook trigger", "Send 'received' email + SMS"],
  },
  {
    id: "booking.wet.solicitor_signed",
    category: "Wet signature flow",
    title: "Solicitor signed & witnessed",
    when: "Fires when the lawyer marks 'Signed & witnessed' — pack is ready to post to the lender.",
    sample: { event: "booking.wet.solicitor_signed", ref: "FI-2026-00042" },
    email: { subject: "Almost there — pack ready to post to your lender", body: `Hi {{firstName}},\n\nYour solicitor has signed and witnessed the pack. We'll post it to the lender today by Royal Mail Special Delivery and send you the tracking number.\n\nKind regards,\nFast-ILA` },
    sms: "Almost done {{firstName}} — pack is signed and about to be posted to your lender.",
    chain: ["Webhook trigger", "Send email + SMS"],
  },
  {
    id: "booking.wet.posted",
    category: "Wet signature flow",
    title: "Posted to recipient (with tracking)",
    when: "Fires when the lawyer marks 'Posted' on the wet flow panel. Includes the Royal Mail tracking number.",
    sample: { event: "booking.wet.posted", ref: "FI-2026-00042", clientName: "Priya Mehta", trackingNumber: "QY 1234 5678 9 GB", trackingService: "Royal Mail Special Delivery 1pm", postedTo: "Shawbrook Bank plc", portalUrl: "…" },
    email: {
      subject: "Posted to your lender — track here ({{ref}})",
      body: `Hi {{firstName}},\n\nYour signed pack is on its way to {{postedTo}} by {{trackingService}}.\n\nTracking: {{trackingNumber}}\nTrack live: https://www.royalmail.com/track-your-item#/tracking-results/{{trackingNumber}}\n\nYou can also view this in your portal: {{portalUrl}}\n\nKind regards,\nFast-ILA`,
    },
    sms: "Posted to {{postedTo}}. Track: https://www.royalmail.com/track-your-item#/tracking-results/{{trackingNumber}}",
    chain: ["Webhook trigger", "Send email + SMS with tracking link"],
  },
  {
    id: "booking.wet.delivered",
    category: "Wet signature flow",
    title: "Delivered to recipient",
    when: "Fires when the lawyer marks 'Delivered' (Royal Mail confirmed receipt).",
    sample: { event: "booking.wet.delivered", ref: "FI-2026-00042", postedTo: "Shawbrook Bank plc" },
    email: { subject: "All done — your pack has been delivered ({{ref}})", body: `Hi {{firstName}},\n\nRoyal Mail has confirmed delivery to {{postedTo}}. Your ILA matter is complete.\n\nIf you found us helpful, a Google review would mean the world: {{reviewLink}}\n\nThanks,\nFast-ILA` },
    sms: "Delivered to {{postedTo}}. Your matter is complete — thank you!",
    chain: ["Webhook trigger", "Send 'complete' email + SMS", "Schedule review request"],
  },
  {
    id: "booking.dispatch.posted",
    category: "Wet signature flow",
    title: "Bulk tracking added (Signatures view)",
    when: "Fires when tracking is added in bulk via the Signatures view tracking modal.",
    sample: { event: "booking.dispatch.posted", ref: "FI-2026-00042", clientName: "Priya Mehta", clientEmail: "priya@example.co.uk", trackingNumber: "QY 1234 5678 9 GB", trackingService: "Royal Mail Special Delivery 1pm", portalUrl: "…" },
    email: { subject: "Tracking number for your pack ({{ref}})", body: `Hi {{firstName}},\n\nYour pack has been posted with tracking {{trackingNumber}} ({{trackingService}}).\n\nTrack live: https://www.royalmail.com/track-your-item#/tracking-results/{{trackingNumber}}\n\nKind regards,\nFast-ILA` },
    sms: "Tracking: {{trackingNumber}}. Live: https://www.royalmail.com/track-your-item#/tracking-results/{{trackingNumber}}",
    chain: ["Webhook trigger", "Send email + SMS"],
  },

  // -- Broadcasts / marketing --------------------------------------------
  {
    id: "mailshot.send",
    category: "Broadcasts",
    title: "Broadcast / mailshot send",
    when: "Fires when the admin sends a broadcast from the Broadcasts view. Carries the audience list + HTML body so n8n can fan it out to Resend, SendGrid, etc.",
    sample: {
      event: "mailshot.send",
      channel: "email",
      format: "html",
      subject: "{{month}} update from Nexa Law — what's new this month",
      body: "<html>…full HTML body with {{firstName}} tokens…</html>",
      fromName: "Fast-ILA",
      replyTo: "info@yourfirm.com",
      templateName: "Monthly newsletter",
      audience: { rule: "with_bookings" },
      recipients: [
        { email: "priya@example.co.uk", fullName: "Priya Mehta", firstName: "Priya", phone: "+447700900123" },
        { email: "rohan@example.co.uk", fullName: "Rohan Mehta", firstName: "Rohan", phone: "+447700900124" },
      ],
      smtp: {
        provider: "resend",
        host: null,
        port: null,
        secure: true,
        username: "resend",
        password: "re_xxxxxxxxxxxx",
        fromName: "Fast-ILA",
        fromEmail: "bookings@yourfirm.com",
        replyTo: "info@yourfirm.com"
      },
    },
    email: {
      subject: "{{subject}}  (passed through verbatim)",
      body: "{{body}}  (passed through verbatim — already contains your HTML)",
    },
    sms: null,
    chain: [
      "Webhook trigger (POST /fastila)",
      "IF event == 'mailshot.send'",
      "Loop over recipients[] (Split In Batches node, batch size 50)",
      "For each recipient: replace {{firstName}} etc. tokens in subject + body",
      "Send via Send Email node — use the smtp{} block from the payload (host/port/user/password OR API key for Resend/SES) so you don't hard-code credentials in n8n",
      "Wait 5s between batches to stay under rate limit",
      "Log results back to a Google Sheet / Airtable",
    ],
  },

  // -- Connection test ----------------------------------------------------
  {
    id: "fastila.connection_test",
    category: "Connection test",
    title: "Connection test ping",
    when: "Fires when the admin clicks 'Test connection' on the n8n integration card.",
    sample: { event: "fastila.connection_test", at: "2026-05-29T12:00:00Z" },
    email: null, sms: null,
    chain: ["Webhook trigger", "Respond 200 OK so the test passes"],
  },
];

const AUTOMATION_CATEGORIES = [
  "Booking lifecycle",
  "Reminders",
  "Service changes",
  "Wet signature flow",
  "Broadcasts",
  "Connection test",
];

// ----------------------------------------------------------------------------
const copy = async (text) => {
  try { await navigator.clipboard.writeText(text); fiToast("Copied to clipboard"); }
  catch (_e) { fiToast("Copy failed — select the text and copy manually", "err"); }
};

const CopyBlock = ({ value, label, mono = true, rows }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#5b6b76" }}>{label}</span>
      <button className="btn btn-ghost btn-sm" onClick={() => copy(value)} style={{ padding: "3px 8px" }}>
        <Icon name="copy" size={11}/> Copy
      </button>
    </div>
    <pre style={{
      background: "#f5f7f9", border: "1px solid #e4e8ec", borderRadius: 6,
      padding: 10, fontSize: 12, lineHeight: 1.5,
      fontFamily: mono ? "monospace" : "inherit",
      whiteSpace: "pre-wrap", wordBreak: "break-word",
      margin: 0, color: "#1f2933",
      maxHeight: rows ? (rows * 18 + 20) : "none",
      overflowY: rows ? "auto" : "visible",
    }}>{value}</pre>
  </div>
);

// localStorage map of { eventId: workflowIdOrUrl } so the admin can save the
// n8n workflow that handles each event and jump straight to it.
const WF_MAP_KEY = "fastila_n8n_workflow_map_v1";
const loadWorkflowMap = () => {
  try { return JSON.parse(localStorage.getItem(WF_MAP_KEY) || "{}"); }
  catch (_e) { return {}; }
};
const saveWorkflowMap = (m) => {
  try { localStorage.setItem(WF_MAP_KEY, JSON.stringify(m)); } catch (_e) {}
};
const resolveWorkflowUrl = (entry, workspaceUrl) => {
  if (!entry) return null;
  const trimmed = String(entry).trim();
  if (!trimmed) return null;
  // Full URL already
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Just an ID — prefix with workspace
  if (!workspaceUrl) return null;
  const base = workspaceUrl.replace(/\/$/, "");
  return `${base}/workflow/${encodeURIComponent(trimmed)}`;
};

const EventCard = ({ ev, workflowMap, setWorkflowMap, workspaceUrl }) => {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const saved = workflowMap[ev.id];
  const resolvedUrl = resolveWorkflowUrl(saved, workspaceUrl);
  const [draft, setDraft] = React.useState(saved || "");

  const saveDraft = (val) => {
    const next = { ...workflowMap };
    if (val && val.trim()) next[ev.id] = val.trim();
    else delete next[ev.id];
    setWorkflowMap(next);
    saveWorkflowMap(next);
    setEditing(false);
    if (val && val.trim()) fiToast("Workflow saved for " + ev.id);
  };
  return (
    <div style={{ background: "white", border: "1px solid #e4e8ec", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "stretch" }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "white", border: "none", cursor: "pointer", textAlign: "left", minWidth: 0 }}
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} size={14}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <code style={{ background: "#f5f7f9", padding: "2px 6px", borderRadius: 4, fontSize: 12, color: "#063952", fontWeight: 700 }}>{ev.id}</code>
              <strong style={{ color: "#063952", fontSize: 14 }}>{ev.title}</strong>
              {resolvedUrl && <span className="pill pill-success" style={{ fontSize: 10 }}><Icon name="check" size={9} stroke={3}/> n8n linked</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "#5b6b76", marginTop: 4 }}>{ev.when}</div>
          </div>
        </button>
        {/* Quick-access shortcut on the collapsed card */}
        {resolvedUrl && (
          <a
            className="btn btn-lime btn-sm"
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Open this workflow in n8n"
            style={{ margin: "12px 12px 12px 0", alignSelf: "center", flexShrink: 0 }}
          >
            <Icon name="external" size={12}/> Open in n8n
          </a>
        )}
      </div>
      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid #eef0f3" }}>
          {/* n8n workflow shortcut for this specific event */}
          <div style={{ marginTop: 14, marginBottom: 14, padding: 12, background: resolvedUrl ? "#f7fbf2" : "#fff7e6", border: "1px solid " + (resolvedUrl ? "#cfe2b2" : "#f4d99a"), borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Icon name="bolt" size={13}/>
              <strong style={{ fontSize: 12.5, color: "#063952" }}>n8n workflow shortcut</strong>
              {resolvedUrl && !editing && <span style={{ fontSize: 11, color: "#1e5128" }}>Linked</span>}
            </div>
            {resolvedUrl && !editing ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <a className="btn btn-navy btn-sm" href={resolvedUrl} target="_blank" rel="noopener noreferrer">
                  <Icon name="external" size={12}/> Open workflow in n8n
                </a>
                <code style={{ background: "white", padding: "4px 8px", borderRadius: 4, fontSize: 11.5, color: "#063952", border: "1px solid #e4e8ec", flex: 1, minWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{resolvedUrl}</code>
                <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(saved); setEditing(true); }}>
                  <Icon name="edit" size={11}/> Edit
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => saveDraft("")} style={{ color: "#9a1c1c" }}>
                  <Icon name="x" size={11}/> Unlink
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 12, color: "#5b6b76", marginBottom: 6, lineHeight: 1.45 }}>
                  Paste the n8n workflow URL (or just the workflow ID) that handles this event. In n8n, open the workflow → copy the URL from the address bar. Once saved, clicking <strong>Open in n8n</strong> jumps straight to it.
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <input
                    className="field-input"
                    style={{ flex: 1, minWidth: 220, fontFamily: "monospace", fontSize: 12.5 }}
                    placeholder={workspaceUrl ? `${workspaceUrl}/workflow/abc123  — or just  abc123` : "https://n8n.yourfirm.com/workflow/abc123"}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveDraft(draft)}
                  />
                  <button className="btn btn-navy btn-sm" onClick={() => saveDraft(draft)} disabled={!draft.trim() && !saved}>
                    <Icon name="check" size={12} stroke={3}/> Save
                  </button>
                  {saved && (
                    <button className="btn btn-ghost btn-sm" onClick={() => { setDraft(saved || ""); setEditing(false); }}>
                      Cancel
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <CopyBlock label="JSON payload (n8n webhook body)" value={JSON.stringify(ev.sample, null, 2)} rows={12}/>
          {ev.email && (
            <>
              <CopyBlock label="Email subject" value={ev.email.subject}/>
              <CopyBlock label="Email body" value={ev.email.body} mono={false} rows={10}/>
            </>
          )}
          {ev.sms && <CopyBlock label="SMS body (160-char target)" value={ev.sms} mono={false}/>}
          <div style={{ marginTop: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#5b6b76" }}>Suggested n8n node chain</span>
            <ol style={{ marginTop: 6, paddingLeft: 20, fontSize: 13, color: "#1f2933", lineHeight: 1.6 }}>
              {ev.chain.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

const AutomationsView = () => {
  if (typeof FastILA?.useStore === "function") FastILA.useStore();
  const n8n = (window.fiIntegration && window.fiIntegration.get && window.fiIntegration.get("n8n")) || {};
  const isConnected = !!(n8n && n8n.webhookUrl);
  const workspaceUrl = n8n.workspaceUrl || (n8n.webhookUrl ? n8n.webhookUrl.replace(/\/webhook\/.*$/, "") : null);
  const [search, setSearch] = React.useState("");
  const [workflowMap, setWorkflowMap] = React.useState(loadWorkflowMap);
  const linkedCount = Object.keys(workflowMap).length;

  const downloadAllAsJSON = () => {
    const blob = new Blob([JSON.stringify({ events: AUTOMATION_EVENTS }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "fastila-automation-events.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    fiToast("Catalog downloaded");
  };

  return (
    <div className="dash-grid">
      <header className="panel-head" style={{ background: "transparent", padding: "0 0 16px" }}>
        <div>
          <h1 className="display" style={{ margin: 0, color: "#063952", fontSize: 28 }}>Automations</h1>
          <p style={{ color: "#5b6b76", marginTop: 6, maxWidth: 760, lineHeight: 1.5 }}>
            Every event the Fast-ILA platform fires to your n8n webhook, with sample payloads, email + SMS templates, and suggested workflows. Build the matching trigger nodes in n8n and the messaging happens automatically.
          </p>
        </div>
      </header>

      {/* n8n status + shortcut bar */}
      <section className="panel" style={{ padding: 16, marginBottom: 16, background: isConnected ? "#063952" : "#fff7e6", color: isConnected ? "#e6f7c8" : "#7a4f00", border: isConnected ? "none" : "1px solid #f4d99a", borderRadius: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <Icon name="settings" size={18}/>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong style={{ fontSize: 14 }}>{isConnected ? "n8n is connected" : "n8n is not connected yet"}</strong>
            <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 4 }}>
              {isConnected
                ? <>Webhook: <code style={{ background: "rgba(230,247,200,0.12)", padding: "1px 6px", borderRadius: 4 }}>{n8n.webhookUrl}</code></>
                : "Connect n8n in Integrations first, then come back here for the trigger catalog."}
            </div>
          </div>
          {isConnected && (
            <button className="btn btn-lime btn-sm" onClick={() => copy(n8n.webhookUrl)}>
              <Icon name="copy" size={12}/> Copy webhook URL
            </button>
          )}
          {workspaceUrl ? (
            <a className="btn btn-lime btn-sm" href={workspaceUrl} target="_blank" rel="noopener noreferrer">
              <Icon name="external" size={12}/> Open n8n workspace
            </a>
          ) : isConnected ? (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Add a "n8n workspace URL" to Integrations for a one-click jump</span>
          ) : null}
          <button className="btn btn-ghost btn-sm" onClick={downloadAllAsJSON} style={{ background: isConnected ? "rgba(230,247,200,0.12)" : "white", color: "inherit", borderColor: isConnected ? "transparent" : "#f4d99a" }}>
            <Icon name="download" size={12}/> Download catalog (JSON)
          </button>
        </div>
      </section>

      {/* Quick start banner */}
      <section className="panel" style={{ padding: 16, marginBottom: 16, background: "#eaf5fb", border: "1px solid #b8d7e6", borderRadius: 10 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Icon name="info" size={14}/>
          <div style={{ fontSize: 13, color: "#0a3a55", lineHeight: 1.6 }}>
            <strong>How it works.</strong> All events POST to the same webhook URL with an <code>event</code> field. Inside n8n, branch with a Switch node on <code>{`{{ $json.event }}`}</code> and route each event to its own email/SMS template. Tokens like <code>{`{{firstName}}`}</code> and <code>{`{{portalUrl}}`}</code> come from the payload.
            <br/><br/>
            <strong>Pro tip:</strong> paste each workflow's URL into the <em>n8n workflow shortcut</em> block on each event so you can jump straight from this page into the matching n8n workflow in one click. <strong>{linkedCount}</strong> of {AUTOMATION_EVENTS.length} events linked so far.
          </div>
        </div>
      </section>

      <input
        className="field-input"
        placeholder="Search events… (e.g. payment, wet, reminder)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 360, marginBottom: 16 }}
      />

      {AUTOMATION_CATEGORIES.map(cat => {
        const list = AUTOMATION_EVENTS.filter(ev => ev.category === cat).filter(ev =>
          !search || ev.id.toLowerCase().includes(search.toLowerCase()) || ev.title.toLowerCase().includes(search.toLowerCase()) || ev.when.toLowerCase().includes(search.toLowerCase())
        );
        if (list.length === 0) return null;
        return (
          <section key={cat} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "#5b6b76", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{cat}</h2>
            {list.map(ev => <EventCard key={ev.id} ev={ev} workflowMap={workflowMap} setWorkflowMap={setWorkflowMap} workspaceUrl={workspaceUrl}/>)}
          </section>
        );
      })}
    </div>
  );
};

Object.assign(window, { AutomationsView });

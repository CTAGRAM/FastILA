/* global React, Icon, BOOKINGS, LAWYERS, SERVICES, MONTHLY_REVENUE, LAWYER_REVENUE_THIS_MONTH, KPI */

// ============================================================================
// Fast-ILA AI Assistant (Claude)
// Floating chat for lawyers + admin. Agentic — can suggest actions
// (add tracking, mark complete, draft chase emails) and answer questions
// using firm data (revenue, lawyers, bookings).
// ============================================================================

const buildContext = (role) => {
  // Compact snapshot of the firm state, fed to Claude as system context.
  const todayKey = "2026-05-27";
  const wetBookings = BOOKINGS.filter(b => b.serviceId === "wet");
  const inProgress = wetBookings.filter(b => b.dispatch && b.dispatch !== "delivered");

  return `You are the Fast-ILA AI assistant — embedded inside the Nexa Law Ltd / Fast-ILA console.
You help ${role === "admin" ? "the firm admin (Karim)" : "a lawyer on the team"} get things done.

You should be SHORT, direct, friendly. UK English. Use £ for currency.

You have these CAPABILITIES (you can describe them as if you're about to do them; the user confirms with the "Yes, do it" button):
- Add a Royal Mail tracking number to a wet-sig booking (notifies the client by email + SMS)
- Mark a booking as completed
- Draft a payment chase email
- Schedule a holiday / block dates for a lawyer
- Generate a pre-call brief from uploaded documents
- Answer questions about revenue and bookings

When the user asks for an action, respond with a short plan in 1-3 lines, then end with one of:
  [ACTION: add_tracking ref=<ref> number=<number>]
  [ACTION: mark_complete ref=<ref>]
  [ACTION: draft_chase ref=<ref>]
  [ACTION: block_dates lawyer=<id> dates=<list>]
  [ACTION: generate_brief ref=<ref>]
A button "Yes, do it" will appear under your reply for these.

DATA YOU KNOW:
- Today: ${todayKey} (Wed 27 May 2026)
- Active lawyers: ${LAWYERS.map(l => `${l.name} (${l.id})`).join(", ")}
- Services & gross fees: ${SERVICES.map(s => `${s.short} £${s.price}`).join(", ")}
- This week: ${KPI.weekBookings} bookings, gross £${KPI.weekRevenueGross.toLocaleString()}, ${KPI.pendingPayments} payments pending, ${KPI.outstandingSig} sigs outstanding
- Monthly revenue (last 6): ${MONTHLY_REVENUE.map(m => `${m.month} £${m.gross} (${m.bookings} bk)`).join("; ")}
- Lawyer revenue this month: ${LAWYER_REVENUE_THIS_MONTH.map(r => {
    const l = LAWYERS.find(x => x.id === r.lawyerId);
    return `${l.name} £${r.gross} (${r.bookings} bk, rating ${r.avgRating})`;
  }).join("; ")}
- Wet-sig bookings in progress: ${inProgress.map(b => `${b.clientName} → ${b.dispatch}${b.trackingNumber ? ` (${b.trackingNumber})` : ""}`).join("; ")}
${role === "admin" ? "" : "\nNote: as a lawyer, only show data for the user's own bookings unless specifically asked otherwise."}

NEVER make up numbers. If asked about something not in this context, say "Let me check — I don't have that to hand."`;
};

const EXAMPLE_PROMPTS = {
  admin: [
    "Who's generated the most revenue this month?",
    "What was our revenue for April 2026?",
    "Add tracking QY 0918 2244 7 GB to Élodie Bernard",
    "Who has unpaid invoices?",
    "Draft a payment chase for Yusuf Demir",
  ],
  lawyer: [
    "What's on my schedule today?",
    "Generate a brief for my 3pm",
    "Mark Mehta as complete",
    "Show outstanding ILA certificates",
    "Block next Friday off",
  ],
};

const parseAction = (text) => {
  const m = text.match(/\[ACTION:\s*([a-z_]+)([^\]]*)\]/i);
  if (!m) return null;
  const type = m[1];
  const params = {};
  const paramRe = /(\w+)=(?:"([^"]+)"|(\S+))/g;
  let pm;
  while ((pm = paramRe.exec(m[2])) !== null) {
    params[pm[1]] = pm[2] || pm[3];
  }
  return { type, params, raw: m[0] };
};

const cleanReply = (text) => text.replace(/\[ACTION:[^\]]+\]/gi, "").trim();

const actionLabel = (action) => {
  switch (action.type) {
    case "add_tracking": return "Yes, add tracking number";
    case "mark_complete": return "Yes, mark as complete";
    case "draft_chase": return "Yes, draft the email";
    case "block_dates": return "Yes, block those dates";
    case "generate_brief": return "Yes, generate the brief";
    default: return "Yes, do it";
  }
};

const AiChat = ({ role }) => {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState([
    {
      role: "assistant",
      text: role === "admin"
        ? "Hi Karim — I can pull revenue numbers, chase payments, add tracking numbers, or just help you decide what to do next. Try asking about April's revenue or who's earned the most this month."
        : "Hi — I can prep your day, generate pre-call briefs from uploaded docs, mark bookings complete, or block dates off. What do you need?",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const send = async (textOverride) => {
    const text = (textOverride ?? input).trim();
    if (!text || thinking) return;
    setInput("");
    const newMessages = [...messages, { role: "user", text }];
    setMessages(newMessages);
    setThinking(true);

    try {
      const systemPrompt = buildContext(role);
      const conversationMessages = newMessages.map(m => ({
        role: m.role,
        content: m.text,
      }));
      const res = await FastILA.ai.complete(systemPrompt, conversationMessages, { max_tokens: 1024 });
      const reply = res.text || "";
      const action = parseAction(reply);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: cleanReply(reply),
        action,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "Sorry — I couldn't reach the AI just now. Please try again in a moment.",
        error: true,
      }]);
    } finally {
      setThinking(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const runAction = (idx, action) => {
    setMessages(prev => prev.map((m, i) =>
      i === idx ? { ...m, actionDone: true } : m
    ));
  };

  const prompts = EXAMPLE_PROMPTS[role] || EXAMPLE_PROMPTS.admin;

  return (
    <>
      <button
        className={`ai-chat-fab ${open ? "is-open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-label="Open AI assistant"
      >
        {open
          ? <Icon name="x" size={20}/>
          : <><Icon name="sparkle" size={18}/><span>Ask AI</span></>}
      </button>

      {open && (
        <div className="ai-chat-panel">
          <header className="ai-chat-head">
            <div className="ai-chat-head-l">
              <div className="ai-chat-mark"><Icon name="sparkle" size={16}/></div>
              <div>
                <div className="ai-chat-title">Fast-ILA Assistant</div>
                <div className="ai-chat-sub">{role === "admin" ? "Admin scope" : "Your bookings only"}</div>
              </div>
            </div>
            <button className="ai-chat-close" onClick={() => setOpen(false)} aria-label="Close">
              <Icon name="x" size={16}/>
            </button>
          </header>

          <div className="ai-chat-body" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ai-chat-msg ai-chat-msg-${m.role}`}>
                {m.role === "assistant" && (
                  <div className="ai-chat-avatar"><Icon name="sparkle" size={12}/></div>
                )}
                <div className="ai-chat-bubble">
                  <div className="ai-chat-text">{m.text}</div>
                  {m.action && !m.actionDone && (
                    <button className="ai-chat-action" onClick={() => runAction(i, m.action)}>
                      <Icon name="check" size={13} stroke={3}/>
                      {actionLabel(m.action)}
                    </button>
                  )}
                  {m.actionDone && (
                    <div className="ai-chat-done">
                      <Icon name="check" size={12} stroke={3}/>
                      Done · audit logged
                    </div>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="ai-chat-msg ai-chat-msg-assistant">
                <div className="ai-chat-avatar"><Icon name="sparkle" size={12}/></div>
                <div className="ai-chat-bubble">
                  <div className="ai-chat-typing">
                    <span/><span/><span/>
                  </div>
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="ai-chat-prompts">
              {prompts.map(p => (
                <button key={p} className="ai-chat-prompt" onClick={() => send(p)}>{p}</button>
              ))}
            </div>
          )}

          <div className="ai-chat-input-wrap">
            <textarea
              className="ai-chat-input"
              placeholder="Ask anything — or tell me what to do"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              disabled={thinking}
            />
            <button
              className="ai-chat-send"
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              aria-label="Send"
            >
              <Icon name="send" size={16}/>
            </button>
          </div>
          <div className="ai-chat-foot">
            <Icon name="lock" size={10}/>
            <span>End-to-end audit logged</span>
          </div>
        </div>
      )}
    </>
  );
};

Object.assign(window, { AiChat });

/* global React, Icon, MATTER_TYPES */

// ============================================================================
// AI Prompts admin view
// The system prompts used for (a) generating the pre-call brief from uploaded
// documents, and (b) powering the AI assistant chat. Editable by admin only.
// Persisted to localStorage; AiChat reads its prompt at message-send time.
// ============================================================================

const DEFAULT_BRIEF_PROMPT = `You are a UK Independent Legal Advice (ILA) preparation assistant for Nexa Law Ltd.

You will read the documents the lawyer has uploaded for a single client matter and produce a structured pre-call brief. The lawyer reads this BEFORE the Google Meet so they can give advice efficiently.

CONTEXT:
- We act ONLY for the guarantor / signatory / individual. Never for the borrower (typically the company) or the lender.
- Matter types we handle: Personal Guarantee, Occupier's Consent, Transfer of Equity, Disponer Certificate, Joint Borrower Sole Proprietor (JBSP), Bridging Loan, Deed of Subordination.
- Property security is usually a company mortgage; we still only act for the named guarantor.

OUTPUT — strictly these sections, in this order:

1. PARTIES — borrower, lender, guarantor(s), borrower's solicitor.
2. LOAN TERMS AT A GLANCE — facility, term, rate, security, guarantee cap, completion deadline.
3. PROPERTY SECURITY — address, value, charge position, title number, any existing encumbrances. Flag cross-collateralisation.
4. KEY CLAUSES TO WALK THROUGH — quote the clause number and 1-line explanation in plain English (cross-default, step-in, all-monies, subrogation waivers, etc).
5. RISKS TO FLAG — specific to this client's position (personal liability surviving property sale, joint & several exposure, indefinite future advances).
6. ILA DISCLOSURE CHECKLIST (SRA) — confirm: independence, plain English, no duress, right to refuse, enforcement risks, capacity.

Be concise. Use plain English. Quote document section numbers wherever possible. Never invent numbers — if a value isn't in the documents, write "[not stated]".`;

const DEFAULT_CHAT_PROMPT = `You are the Fast-ILA AI assistant — embedded inside the Nexa Law Ltd console.

You help {role} get things done.

Be SHORT, direct, friendly. UK English. Use £ for currency.

CAPABILITIES (describe as if about to do them; user confirms with "Yes, do it" button):
- Add a Royal Mail tracking number → notifies the client by email + SMS
- Mark a booking as completed
- Draft a payment chase email
- Block dates / holidays for a lawyer
- Generate a pre-call brief from uploaded documents
- Answer revenue and booking questions from firm data

When the user asks for an ACTION, respond with a 1-3 line plan, then end with:
  [ACTION: add_tracking ref=<ref> number=<number>]
  [ACTION: mark_complete ref=<ref>]
  [ACTION: draft_chase ref=<ref>]
  [ACTION: block_dates lawyer=<id> dates=<list>]
  [ACTION: generate_brief ref=<ref>]

DATA AVAILABLE:
{firmDataContext}

NEVER make up numbers. If asked about something not in the data, say "Let me check — I don't have that to hand."`;

const PROMPT_STORE_KEY = "fastila_prompts_v1";

const getStoredPrompts = () => {
  try {
    const raw = localStorage.getItem(PROMPT_STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};

const saveStoredPrompts = (prompts) => {
  try { localStorage.setItem(PROMPT_STORE_KEY, JSON.stringify(prompts)); } catch (e) {}
};

// Expose getters for AiChat / brief panel to read live prompts
window.fastilaPrompts = {
  brief: () => (getStoredPrompts()?.brief) || DEFAULT_BRIEF_PROMPT,
  chat: () => (getStoredPrompts()?.chat) || DEFAULT_CHAT_PROMPT,
};

const PromptCard = ({ id, title, desc, defaultValue, currentValue, onSave, placeholders }) => {
  const [value, setValue] = React.useState(currentValue);
  const [savedFlash, setSavedFlash] = React.useState(false);
  const dirty = value !== currentValue;

  const save = () => {
    onSave(value);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };
  const reset = () => {
    setValue(defaultValue);
  };

  const chars = value.length;
  const tokens = Math.round(chars / 4);

  return (
    <section className="panel prompt-card">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">
            <Icon name="sparkle" size={15}/>
            {title}
          </h2>
          <p className="panel-sub">{desc}</p>
        </div>
        <div className="prompt-card-meta">
          <span className="pill pill-muted">Claude · ~{tokens} tokens</span>
        </div>
      </header>
      <div className="prompt-card-body">
        <textarea
          className="prompt-textarea mono"
          rows={14}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
        {placeholders && placeholders.length > 0 && (
          <div className="prompt-placeholders">
            <span className="prompt-placeholders-label">Placeholders you can use:</span>
            {placeholders.map(p => <code key={p}>{p}</code>)}
          </div>
        )}
        <div className="prompt-card-foot">
          <div className="prompt-card-info">
            <span><Icon name="info" size={12}/> Saved live — next request will use the new prompt</span>
            {savedFlash && <span className="prompt-saved-flash"><Icon name="check" size={12} stroke={3}/> Saved</span>}
          </div>
          <div className="row gap-2">
            <button className="btn btn-ghost" onClick={reset} disabled={value === defaultValue}>
              <Icon name="x" size={13}/> Reset to default
            </button>
            <button className="btn btn-navy" onClick={save} disabled={!dirty}>
              <Icon name="check" size={13}/> Save changes
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const PromptsView = () => {
  const [stored, setStored] = React.useState(getStoredPrompts() || {});

  const update = (key, val) => {
    const next = { ...stored, [key]: val };
    setStored(next);
    saveStoredPrompts(next);
  };

  return (
    <div className="dash-grid">
      <section className="panel prompts-banner">
        <div className="row items-center gap-3">
          <div className="prompts-banner-icon"><Icon name="sparkle" size={20}/></div>
          <div>
            <h2 className="panel-title" style={{ fontSize: 16 }}>AI prompts — Claude</h2>
            <p className="panel-sub">These are the instructions we give Claude. Tweak them to refine how the brief is structured, how strict the disclaimer is, or what the chat assistant will do. Changes are live the moment you click Save.</p>
          </div>
        </div>
        <div className="prompts-banner-r">
          <span className="pill pill-success"><Icon name="check" size={11} stroke={3}/> Claude Haiku 4.5</span>
        </div>
      </section>

      <PromptCard
        id="brief"
        title="Pre-call brief prompt"
        desc="Used when a lawyer clicks 'Regenerate brief' on a booking. Claude reads the uploaded documents through this system prompt."
        defaultValue={DEFAULT_BRIEF_PROMPT}
        currentValue={stored.brief || DEFAULT_BRIEF_PROMPT}
        onSave={(v) => update("brief", v)}
      />

      <PromptCard
        id="chat"
        title="AI assistant prompt"
        desc="Used by the floating chat button. Powers Q&A about revenue, bookings, and triggers actions like 'add tracking number'."
        defaultValue={DEFAULT_CHAT_PROMPT}
        currentValue={stored.chat || DEFAULT_CHAT_PROMPT}
        onSave={(v) => update("chat", v)}
        placeholders={["{role}", "{firmDataContext}"]}
      />

      <section className="panel">
        <header className="panel-head">
          <h2 className="panel-title">Prompt history</h2>
          <span className="cell-sub">Versioning &amp; rollback</span>
        </header>
        <div className="prompt-history">
          <div className="prompt-history-row">
            <div className="prompt-history-time mono">2 May · 14:18</div>
            <div className="flex-1">
              <strong>Brief prompt edited</strong> — added "Property Security" section · <span className="cell-sub">by Karim Osman</span>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon name="external" size={12}/> View diff</button>
            <button className="btn btn-ghost btn-sm">Restore</button>
          </div>
          <div className="prompt-history-row">
            <div className="prompt-history-time mono">28 Apr · 10:02</div>
            <div className="flex-1">
              <strong>Chat prompt edited</strong> — added "[ACTION: block_dates]" capability · <span className="cell-sub">by Karim Osman</span>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon name="external" size={12}/> View diff</button>
            <button className="btn btn-ghost btn-sm">Restore</button>
          </div>
          <div className="prompt-history-row">
            <div className="prompt-history-time mono">4 Apr · 09:30</div>
            <div className="flex-1">
              <strong>Initial prompts</strong> set live · <span className="cell-sub">by Karim Osman</span>
            </div>
            <button className="btn btn-ghost btn-sm"><Icon name="external" size={12}/> View diff</button>
          </div>
        </div>
      </section>
    </div>
  );
};

Object.assign(window, { PromptsView, DEFAULT_BRIEF_PROMPT, DEFAULT_CHAT_PROMPT });

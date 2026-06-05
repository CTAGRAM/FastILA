# Walk-through: Get Fast-ILA running with Claude Code

A step-by-step guide for **non-technical users**. Follow it in order. Don't skip steps. Total time: about 1 hour the first time, then most steps are one-and-done.

If anything goes wrong, take a screenshot of the error and paste it into Claude Code — it can usually fix its own mess.

---

## Part 1 · Install the tools you need (15–20 min)

You only do this once.

### 1.1 — Install Node.js

This is the engine modern web apps run on.

1. Go to **https://nodejs.org**
2. Click the **big green "LTS" button** to download (the version with "Recommended for Most Users" under it).
3. Open the installer. Click Next / Continue through every screen — don't change any settings.

To check it worked: open **Terminal** (Mac) or **PowerShell** (Windows) and type:

```bash
node --version
```

You should see something like `v20.x.x`. If you do, you're good.

### 1.2 — Install Git

Git is how Claude Code keeps track of what it changes.

- **Mac**: open Terminal, type `git --version`, hit Enter. If it says "command not found", it'll prompt you to install. Click "Install".
- **Windows**: download from **https://git-scm.com/download/win** and run the installer. Accept all defaults.

Check it worked:
```bash
git --version
```

### 1.3 — Install Claude Code

1. Open **Terminal** (Mac) or **PowerShell** (Windows).
2. Paste this and press Enter:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
3. Wait for it to finish (~1 minute).
4. Check it installed:
   ```bash
   claude --version
   ```

### 1.4 — Get an Anthropic API key

Claude Code needs an API key to talk to Claude.

1. Go to **https://console.anthropic.com/**
2. Sign up with your email.
3. Add **£20 of credit** (Billing → Add credits). That'll last for weeks of normal use.
4. Go to **API Keys → Create Key**. Give it a name like "Claude Code". Copy the key (starts with `sk-ant-`).
5. Save the key somewhere safe — you'll paste it once in the next step.

---

## Part 2 · Set up your project folder (5 min)

### 2.1 — Make a permanent folder

Pick a place on your computer to keep your Fast-ILA project.

- **Mac**: open Finder → go to your home folder → make a new folder called **`fast-ila`**.
- **Windows**: open File Explorer → go to `C:\` or `Documents` → make a new folder called **`fast-ila`**.

### 2.2 — Move the handoff zip into it

Find the zip you downloaded (it'll be in your Downloads folder, called `design_handoff_fast_ila.zip` or similar).

1. Double-click the zip to extract it.
2. Drag the extracted **`design_handoff_fast_ila`** folder into your `fast-ila` folder.

Now your folder structure looks like:

```
fast-ila/
└── design_handoff_fast_ila/
    ├── README.md
    └── source/
        ├── index.html
        ├── ai-chat.jsx
        └── ... etc
```

---

## Part 3 · Open Claude Code (5 min)

### 3.1 — Open Terminal at the project folder

- **Mac**: open Finder → right-click on your `fast-ila` folder → **Services → New Terminal at Folder**.
- **Windows**: open the `fast-ila` folder in File Explorer → click the address bar → type `powershell` and hit Enter.

You should now have a black/dark window open, with the path ending in `fast-ila`.

### 3.2 — Start Claude Code

Type this and press Enter:

```bash
claude
```

The first time you run it, it'll ask for your **API key** — paste the one you copied from Anthropic. It saves the key so you only do this once.

You'll see a prompt like:

```
> 
```

That's Claude Code, ready for you to talk to it.

---

## Part 4 · Have Claude Code read the handoff (5 min)

Copy and paste this **exactly** into Claude Code, then press Enter:

```
Read design_handoff_fast_ila/README.md carefully and tell me, in 5 bullet points, what this project is.
```

Wait for it to reply. It should describe Fast-ILA as a booking + portal + dashboard system for Independent Legal Advice, mention Nexa Law and Go Legal Services, the three surfaces (public booking / client portal / internal dashboard), and the recommended stack.

If it gets this right, it has understood the project. If not, paste the question again.

---

## Part 5 · Build the foundation (30 min)

Now we get Claude Code to actually start building. We'll do this in **small chunks** so you can review each one before continuing.

### 5.1 — Scaffold the Next.js app

Paste this and press Enter:

```
Create a new Next.js 14 TypeScript app in a folder called `app/` inside this directory. Use the App Router, Tailwind CSS, and the `src/` directory layout. Don't change anything inside design_handoff_fast_ila/ — that's reference only.

After creating it, give me one paragraph confirming what got created and what command I should run to test it.
```

It'll think for a minute, then create about 50 files. When it's done, **read its summary**.

Test it works:

```bash
cd app
npm install
npm run dev
```

Open **http://localhost:3000** in your browser. You should see a default Next.js welcome page.

Stop the server by pressing **Ctrl+C** in the terminal.

### 5.2 — Set up the database

Paste into Claude Code:

```
In the app/ folder, set up Prisma with a Postgres database. Use Supabase as the host — give me the exact steps to create a Supabase project and connect it, then implement the full schema from design_handoff_fast_ila/README.md (the Prisma model block). Run the first migration. Stop and confirm with me when you're done before moving on.
```

Follow Claude Code's instructions. It'll tell you to:
1. Create a free account at **supabase.com**
2. Create a new project (free tier is fine for now)
3. Copy the database connection string
4. Paste it into a file called `.env.local` in the `app/` folder

Then it'll run the migration. You'll have a real database with all 14+ tables ready.

### 5.3 — Add authentication

Paste:

```
Add authentication to the app/ folder using NextAuth (Auth.js v5). Three roles:
- Admin: hardcoded email karim@nexalaw.com using magic-link email sign-in
- Lawyer: Google OAuth + Microsoft OAuth
- Client: magic-link email sign-in only

Use the rules in design_handoff_fast_ila/README.md section "Auth & roles".

Give me a step-by-step list of what credentials I need to fetch (Google OAuth client ID, etc.) and exactly where to get them.
```

Claude Code will tell you what credentials to set up in Google Cloud Console and where to paste them.

### 5.4 — Build the public booking flow first

Paste:

```
Build the public booking flow from design_handoff_fast_ila/source/booking-flow.jsx as a real Next.js page at /book.

Recreate it pixel-for-pixel using Tailwind classes — the design tokens are in design_handoff_fast_ila/source/tokens.css and the styles in booking.css. Convert them to a Tailwind theme extension first.

Save bookings to the database via a server action. Don't wire up payments — bank transfer flow is handled later.

Confirm with me before doing any other features.
```

This is where the real work starts. Claude Code will build the booking flow for ~30 minutes. Test it at `localhost:3000/book` when it's done.

---

## Part 6 · Keep going, feature by feature

Now you have a working booking flow. The pattern is the same for every other piece:

1. Pick a feature from the README's source-file map (e.g. "client portal", "lawyer console", "wet-sig dispatch")
2. Tell Claude Code: *"Now build [feature X] from `design_handoff_fast_ila/source/[file].jsx`. Stop and confirm when done."*
3. Test it on `localhost:3000`
4. Move on

**Suggested order:**
1. ✅ Public booking flow (you just did this)
2. Client portal (steps 1–8)
3. Lawyer console — Today + My Bookings + Booking detail
4. E-Sign Studio
5. Wet-sig kanban + dispatch
6. Admin Templates + Lenders + Brokers
7. N8N integration + AI features
8. Reports

Tackle one per coding session. Don't try to do everything in a day.

---

## Part 7 · Deploy it (later)

When you have a feature you want lawyers to start testing on a real URL:

```
Deploy this app to Vercel. Give me step-by-step instructions including how to set up the production environment variables.
```

Claude Code walks you through it. Vercel's free tier is enough to start.

---

## Common problems

**"`claude` command not found"** — close and reopen Terminal. The `npm install` step needs Terminal to reload.

**"Permission denied"** on Mac — run with `sudo`: `sudo npm install -g @anthropic-ai/claude-code`.

**Claude Code refuses to do something** — paste this: *"Please go ahead and do it. If you need approval for a destructive action, just ask once."*

**You break something and don't know how** — Claude Code uses Git automatically. Tell it: *"Revert the last change."* It'll roll back.

**You're stuck** — take a screenshot of the error, paste it into Claude Code, and say *"This error came up. What do I do?"*

---

## When to ask for human help

If after 2 hours of trying you're still stuck on one step, **stop and hire a developer for half a day** (£200–400) to get you unstuck. That's much cheaper than burning another full day fighting tooling.

Find one on YunoJuno (UK), UpWork, or ask any friend who works in tech.

---

## What to do today (first session)

Don't try to do everything in one go. **Today's goal**:

- [x] Install Node, Git, Claude Code (Part 1)
- [x] Get an Anthropic API key with £20 credit (Part 1.4)
- [x] Set up the project folder (Part 2)
- [x] Open Claude Code and have it read the README (Parts 3 + 4)

That's it. Stop there. Come back tomorrow for Part 5.

Don't rush — installing the tools cleanly is the foundation everything else stands on.

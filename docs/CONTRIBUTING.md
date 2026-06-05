# Contributing / working in this codebase

There's no build, no linter gate, and no test runner — which makes the conventions below *more* important, not less. Breaking load order or mutating a global directly fails silently at runtime, not at compile time.

> Read [ARCHITECTURE.md](ARCHITECTURE.md) first. The golden rules: **globals, not modules** · **load order matters** · **all writes through `FastILA.*`**.

---

## Ground rules

1. **No `import` / `export`.** Components and helpers attach to `window`. Reference other code via its global (`window.Foo` or just `Foo` once it's defined).
2. **Respect load order.** If file B uses `window.Foo` defined in file A, A's `<script>` tag must come **before** B's in [`index.html`](../index.html). The safe early dependencies are `api.jsx`, `data.jsx`, `atoms.jsx`, `actions.jsx`.
3. **Never mutate store globals directly.** Don't do `window.BOOKINGS.push(...)`. Call a `FastILA.*` method so `mutate()` runs (persist + KPI recompute + re-render). See [DATA-LAYER.md](DATA-LAYER.md).
4. **Read with `useStore()`.** Any component that renders store data should call `FastILA.useStore()` so it re-renders on `fastila:store-changed`.
5. **Match the surrounding style.** Same naming, comment density, and idiom as the file you're editing. Brand tokens come from [`tokens.css`](../tokens.css) (Navy/Lime/Cream, Sora/Inter) — use the CSS variables, don't hard-code hexes.
6. **Additive over destructive.** The backend was built in additive migrations precisely so nothing existing breaks. Prefer adding a column/table/function over altering one. Keep booking triggers `EXCEPTION`-guarded so they can never block a write.

---

## Adding a new dashboard view

1. Create `dashboard-myview.jsx`. Define and expose the component:
   ```jsx
   function MyView() {
     FastILA.useStore();
     /* … */
   }
   window.MyView = MyView;
   ```
2. Add a `<script type="text/babel" src="dashboard-myview.jsx"></script>` tag in [`index.html`](../index.html) **after** its dependencies.
3. Register a nav item + route. Nav arrays live in [`dashboard-main.jsx`](../dashboard-main.jsx) (`{ id, label, icon }`, grouped by role: lawyer / wet_specialist / admin). The view router and `window.fiSetDashView` wire `id` → component; deep-links are handled in [`app.jsx`](../app.jsx) (`?view=…`).
4. Use an `Icon` name that exists in [`atoms.jsx`](../atoms.jsx) (an undefined icon name renders blank).

## Adding a data operation

1. Add a method to the appropriate namespace in [`api.jsx`](../api.jsx) — implement **both** the live (Supabase) and mock (in-memory + `localStorage`) branches, guarded by `HAS_BACKEND`.
2. Route writes through `mutate()` so persistence, KPI recompute, and the re-render event all fire.
3. If the data changes from other devices, add it to the Realtime subscription list (live mode).

## Adding an automation / notification

Don't call providers from the browser. Add a rule to `automation_rules` (or a new edge function), and let `dispatch-automations` send it. See [BACKEND.md](BACKEND.md) → automation engine.

## Adding an AI feature

Route through `FastILA.ai.complete(system, messages)` → the `ai` edge function (server-side Anthropic→OpenAI). Do **not** call `api.anthropic.com` / `window.claude.complete()` from the browser — both were removed (CORS + key exposure + only-works-in-Claude.ai).

---

## Testing changes

There's no automated suite. Test by running the app and exercising the surface:

```bash
python .serve.py 5173
```

- Mock mode (empty `config.js` keys) is the fastest way to iterate on UI.
- For backend changes, validate JSX with `@babel/parser`, edge functions with `deno check`, and test live reads/writes via the Supabase SQL editor / Management API.
- Always re-test RLS as the **anon** role after any policy change (see [SECURITY.md](SECURITY.md)).

---

## Don't edit these

- [`design_handoff_fast_ila/source/`](../design_handoff_fast_ila/source/) — a **duplicate snapshot** of the root `.jsx`/`.css`. Edit the **root** files, not these.
- `node_modules/` — incidental; the app uses CDN libs at runtime.

---

## Pull-request hygiene

Keep diffs additive and scoped. Don't change existing UI or break existing flows unless that *is* the task — the project has a standing constraint to preserve working surfaces. Note any new secret/Vault/OAuth requirement in your PR description and in [CONFIGURATION.md](CONFIGURATION.md).

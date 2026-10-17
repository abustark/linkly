# AGENTS.md — Instructions for AI agents

## Owner's working rules (follow these FIRST)
- **Fast-track by default.** Implement changes directly and report what changed.
- **Commit and push meaningful changes.** Whenever you finish a meaningful/important code change or update (bug fixes, features, refactors, instruction/rule updates, project assets like screenshots), commit it right away with a clear message and push to `origin/main` — do **not** wait to be asked. Group related files logically; skip scratch/experimental noise.
- **Do NOT run tests, builds, linters, or verification gates** unless the user explicitly asks (e.g. "run the tests", "verify", "check it"). Testing happens **only on explicit request**.
- **Remind, don't run.** After writing new code, fixing bugs, or changing anything at all, END your report with a short reminder that tests/debugging are available on request — e.g. *"Want me to run `npm test` or debug this in the browser?"* — and only do it if the user then says yes. This reminder is mandatory for every code-writing or code-fixing task.
- **Images go to the project too.** Any image you produce — browser screenshots, verification/QA captures, generated icons, mockups, diagrams — must be saved BOTH to your temp working dir (e.g. `linkly-audit/shots/` on C:) **and** into `artifacts/` at the repo root (`D:\projects\linkly\artifacts\`). Name files `YYYY-MM-DD-<task-description>.png`, or group them in a per-task subfolder. Never leave a capture only in temp — if you snapped it, the project folder gets a copy. PNGs in `artifacts/` are gitignored: keep captures **local-only** and do not commit them unless explicitly asked.
- When tests ARE requested, the repo gate is `npm test` (node --test). Browser harness (only on request): `node verify-fixes.js` / `node verify-mobile-dash.js` from the `linkly-audit/` temp dir (needs the dev server on :5000).
- No unsolicited extra verification passes, no waiting-for-approval loops — ship the code.

## Commit Naming & Versioning (strict)

- Every commit follows this versioning structure: `2.0.1`, `2.0.2`, ..., `2.0.9`, `2.0.10` ➔ rolls over to `2.1.0`; then `2.1.1`, ..., `2.1.10` ➔ rolls over to `2.2.0`, etc. The third number NEVER exceeds `.10`.
- Format: `<version> - <short description>` (e.g., `2.0.1 - fix dashboard spacing`). Keep it short and clear.
- **One version number per agent response / request batch** — not per issue, not per commit. A single owner request (even if it fixes many issues) consumes exactly ONE version number. Multiple commits inside one response all take that same number (fold follow-up fixes into it — never burn a second number). Only a genuinely new owner request (a new response turn) advances the number.
- Git history before this rule is unversioned; numbering starts at `2.0.0`. Every commit must also be logged in `COMMIT-HISTORY.md` (repo root) with its version and what it did, and the `📌 Next version` line at its top kept current.

## Stack
- Node/Express local server (`server.js`, port 5000), Vercel deployment (`vercel.json`, serverless functions in `api/*.js`).
- MongoDB via mongoose (`api/_models/`), Firebase Admin on the server, Firebase **v10 modular ESM** on the client (`public/firebase-config.js` exposes a v8-style facade as `window.LinklyFirebase`).
- Static frontend in `public/` — **single responsive pages** (`index.html`, `dashboard.html` + `mobile.css` scoped to ≤760px). The old `/m/*` variants are gone; `/m/*` URLs 301-redirect (see `server.js` / `vercel.json`).
- Tests live in `test/` (`node --test`). Browser harness scripts live OUTSIDE the repo in the OpenCode temp dir (`linkly-audit/`) — they fake the Firebase v10 ESM modules via Playwright routes (auth state driven by `window.__AUDIT_STUB__`); if you change `public/firebase-config.js` or its facade surface, port the harness stub to match before any test run.

## Commands
- `npm start` — dev server (needs `.env` with `MONGODB_URI`)
- `npm test` — run the suite (ONLY when the user asks)

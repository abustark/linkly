# linkly Commit Log

This document tracks every commit following the `2.0.x` versioning schema:

- Sequence: `2.0.1`, `2.0.2`, ..., `2.0.9`, `2.0.10` ➔ `2.1.0`, `2.1.1`, ..., `2.1.10` ➔ `2.2.0`, etc. The third number never exceeds `.10`.
- Format: `<version> - <short sentence>`
- **One version number per agent response / request batch** — not per issue, not per commit: a single owner request (even if it fixes many issues) consumes exactly ONE version number, multiple commits inside one response all take that same number (fold follow-up fixes into it — never burn a second number), and only a genuinely new owner request (a new response turn) advances the number.

> ### 📌 Next version — **keep this line current, every commit**
> - **`main` → `2.0.9`** (current head is `2.0.8` — see below)

---

## Commit History

### 2.0.8 - centered QR modal on mobile

- **Date**: 2026-10-22
- **Why**: owner — the mobile QR card had a left-aligned title, QR and footer with the close control out of place; requested centered heading, QR, bottom download and a top-right close.
- **Changes**:
  - `public/dashboard.html`: rebuilt QR dialog — centered "QR Code" title, centered QR, full-width Download PNG at the bottom, and an `×` close button in the top-right corner with `aria-label="Close QR code"`; dialog now labelled via the title.
  - `public/dashboard.css`: new QR card/title/close/container/download styles; desktop layout centered too.
  - `public/mobile.css`: 16px card padding, 40px close target, tighter vertical rhythm and 48px download button at ≤760px.
  - `public/sw.js`: cache bumped to `linkly-v4`.
  - Verified headless Chrome at 1440px and 390px: title/QR centered, download anchored at the bottom, close works; captures in `artifacts/2026-10-22-qr-modal/` (local-only).

### 2.0.7 - redesigned recent links shelf on home

- **Date**: 2026-10-22
- **Why**: owner — the recent links below the shorten card were an unstyled two-line text list; give them a proper product layout.
- **Changes**:
  - `public/index.html`: recent-links card with title, "Saved on this device" note and Clear action; inset rows with a host-initial tile, short path, original URL, relative timestamp and per-row Copy with "Copied" feedback; dashed empty state; stores `createdAt` for new entries; hardened localStorage parsing.
  - `public/home.css`: section card, row/tile/copy/clear/empty-state styling with hover, press and focus states.
  - `public/mobile.css`: compact 34px tiles/buttons and tighter card spacing at ≤760px.
  - `public/sw.js`: cache bumped to `linkly-v3`.
  - Verified in headless Chrome at 1440px (light/dark) and 390px: clipboard copy and Clear both work, empty state renders; captures in `artifacts/2026-10-22-recent-links/` (local-only).

### 2.0.6 - destination editing, traffic breakdown, link expiration + README screenshots

- **Date**: 2026-10-22
- **Why**: approved portfolio feature batch — (1) edit destinations, (2) traffic analytics, (4) README screenshots, (5) link expiration. GitHub Actions CI (#3) intentionally skipped.
- **Changes**:
  - `api/links.js`: shared `verify` auth helper; `PATCH /api/links?shortCode=…` updates a link's destination (http/https only, requiring ownership, ownerless links fail closed); per-account traffic `$facet` aggregation (top 6 referrers/devices/countries); `expiresAt` column in CSV export; Allow header adds PATCH.
  - `api/redirect.js`: branded `statusPage` shared by 404/410 pages; expired links return 410 before counting; each successful redirect records a click event (referrer host, device class, country header); analytics failures never block the redirect.
  - `api/_models/Click.js`: new click-event schema with 90-day TTL; `api/_models/Url.js`: optional `expiresAt`.
  - `api/shorten.js`: accepts optional `expiresIn` (`1d` / `7d` / `30d`), stores and returns `expiresAt`.
  - `server.js`: local Express PATCH route.
  - `public/dashboard.html` / `dashboard.css`: edit-destination modal + action buttons, traffic breakdown panel, expiry badge/date notes.
  - `public/index.html` / `home.css`: expiration selector on the shorten form.
  - `public/sw.js`: cache bumped to `linkly-v2` for the changed assets.
  - `test/*`: PATCH authorization/validation coverage, traffic assertions, click-event + expiry redirect tests, expiration validation tests (36 total); redirect fixture fixed to include `shortCode` after the first full run — `npm test` now passes 36/36.
  - `README.md`: screenshots (light/dark home + dashboard), new features, PATCH API docs, updated test count/structure.
  - `docs/screenshots/`: four README captures added.

### 2.0.5 - header Linkly logo no longer reloads when already on home

- **Date**: 2026-10-19
- **Why**: clicking the brand "L" logo on the home page triggered a full page reload of the page already open.
- **Changes**:
  - `public/index.html`: brand link click handler — when already on `/` (or `/index.html`) it prevents default and smooth-scrolls to top; from other pages it navigates normally.

### 2.0.4 - haptic feedback on all clickable elements

- **Date**: 2026-10-19
- **Why**: owner — tactile feedback for every clickable control.
- **Changes**:
  - `public/shared.js`: delegated click listener (`wireHaptics`) covering buttons, links, `[role="button"]`, labels, selects and checkbox/radio inputs on both pages; tiers — light 8ms tick default, 16ms for primary/submit, double-pulse for danger/delete/logout, 6ms for switches. `navigator.vibrate` no-ops on iOS Safari (API unsupported there). Exposed as `L.haptic` for programmatic use.

### 2.0.3 - home sheet "Home" no longer reloads when already on home

- **Date**: 2026-10-19
- **Why**: clicking Home from the profile sheet while already on the home page triggered a full page reload.
- **Changes**:
  - `public/index.html`: `sheetHome` handler closes the sheet; if already on `/` (or `/index.html`) it just smooth-scrolls to top instead of navigating.

### 2.0.2 - solid brand blue logo/avatar + more breathing room in sign-in card

- **Date**: 2026-10-19
- **Why**: owner — the brand gradient on the logo/avatar reads "AI-styled"; match the flat blue of the "instantly" heading instead. The sign-in-to-shorten card also cramped the GSI button against the description.
- **Changes**:
  - `public/shared.css`: `.logo` and `.avatar` background → solid `var(--brand)` (same blue as `.hero h1 .grad`).
  - `public/home.css`: `.auth-prompt` card extended (32px vertical padding) and gap above the GSI button increased (`prompt-text` margin `--s4` → `--s5`).

### 2.0.1 - dashboard click shows sign-in popup instead of bouncing home

- **Date**: 2026-10-19
- **Why**: clicking "Dashboard" while signed out navigated to `dashboard.html`, which auto-redirected back to home after a delay — the page never stayed put and there was no sign-in prompt in the flow.
- **Changes**:
  - `public/index.html`: Dashboard buttons (header + profile sheet) now check auth at click time — signed in → navigate; signed out → open a sign-in popup (Google GSI button) without leaving the page; after successful sign-in from the popup, proceed to the dashboard.
  - `public/dashboard.html`: added the GIS client script + same sign-in popup; `denyDashboard()` opens the popup instead of the timed bounce to home (Cancel/backdrop/Escape → home); popup closes and the dashboard loads on sign-in; failsafe updated.
  - `public/shared.js`: `renderGSI()` also renders into the popup's GSI container while the popup is open.
  - `public/shared.css`: `.modal-auth` (z-index 970, above the dashboard auth gate) + `.gsi-signin` centering.
  - Both pages: GSI-init retry loop so the popup's Google button still appears if the GIS script loads late.

### 2.0.0 - adopt versioned commits + universal COMMIT-HISTORY.md log

- **Date**: 2026-10-17
- **Why**: owner directive — every repo carries the same recognizable commit-log file name (`COMMIT-HISTORY.md`, repo root); numbering starts at `2.0.0` (history before this commit is unversioned).
- **Changes**:
  - `AGENTS.md`: "Commit Naming & Versioning (strict)" section — `2.0.x` schema with `.10` roll-over, one version per agent response / request batch, commits logged in `COMMIT-HISTORY.md`.
  - `CLAUDE.md`: versioning bullet updated to match (starts at `2.0.0`, logged in `COMMIT-HISTORY.md`).
  - `COMMIT-HISTORY.md`: created at the repo root (same universal name in every project).

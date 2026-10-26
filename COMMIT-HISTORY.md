# linkly Commit Log

This document tracks every commit following the `2.x` versioning schema:

- Sequence: `2.0.1`, `2.0.2`, ..., `2.0.9`, `2.0.10` ➔ `2.1.0`, `2.1.1`, ..., `2.1.10` ➔ `2.2.0`, etc. The third number never exceeds `.10`.
- Format: `<version> - <short sentence>`
- **One version number per agent response / request batch** — not per issue, not per commit: a single owner request (even if it fixes many issues) consumes exactly ONE version number, multiple commits inside one response all take that same number (fold follow-up fixes into it — never burn a second number), and only a genuinely new owner request (a new response turn) advances the number.

> ### 📌 Next version — **keep this line current, every commit**
> - **`main` → `2.2.2`** (current head is `2.2.1` — see below)

---

## Commit History

### 2.2.1 - crop the white margin Google paints around the sign-in button

- **Date**: 2026-10-26
- **Why**: owner — the white "box inside a box" survived 2.2.0 and only shows in dark mode (in light mode the white margin blends into the page). Confirmed on mobile too.
- **Cause**: for accounts with an approved Google session, Google draws the button inside an `accounts.google.com` iframe and paints a white margin around it. The margin is inside a cross-origin iframe, so no CSS here can restyle it, and the explicit `width: 180` from 2.2.0 is not enough on its own to keep Google out of that path.
- **Changes**:
  - New `fitGSI()` in `shared.js`: after the widget renders, if Google's iframe has a real size, the container is pinned to the button box (180×40, `overflow: hidden`) and the iframe is translated so the white margin falls outside the crop. The crop is only applied for a thin margin (≤24px horizontal, ≤8px vertical); a bigger frame means a different Google UI and is left alone. Re-checked at 0/150/500/1200ms because Google injects the iframe asynchronously.
  - When Google renders the plain button (iframe 0×0) the function returns before touching anything — verified the header still measures 180×40 with no inline styles.
  - Service-worker cache bumped to `linkly-v19`.
- **Verification**: visual only — desktop dark mode (header + sign-in card) unchanged at 180×40 with the standard button; the crop maths checked against simulated iframe offsets (left-aligned, centred, right-shifted) — button lands exactly on the container in each. No test/build run (owner rule).

### 2.2.0 - drop Google's white "box inside a box" on the sign-in button

- **Date**: 2026-10-26
- **Why**: owner — the Sign in with Google widget showed a white rectangle wrapped around the button (a bordered box sticking out of a larger white box), most obvious in dark mode.
- **Cause**: Google swaps its normal button for the "personalized" variant (the little profile card) once a Google session has approved the site. That variant is rendered inside an `accounts.google.com` iframe that paints its own white padding around the button, so a white page shows a white band and a dark page shows a white box inside a white box. Google exposes no API to turn personalization off.
- **Changes**:
  - `renderGSI()` now renders the button at an explicit `width: 180`. Google only uses the personalized variant when the button is 200px or wider, so the plain standard button is always rendered — one pill, one border, no white card. Visually the button is ~3px wider than the auto-sized one it replaces.
  - Service-worker cache bumped to `linkly-v18`.
- **Verification**: visual only — desktop header and mobile account sheet in dark mode; button measured 180×40, single 1px `#dadce0` border, header gap still 24px. No test/build run (owner rule).

### 2.1.10 - add breathing room before the Google sign-in button

- **Date**: 2026-10-26
- **Why**: owner — the Google sign-in widget sat almost flush against the theme toggle in the desktop header.
- **Changes**:
  - The Google button container now gets the same 24px gap the other header controls use (it lives outside `.topbar-actions`, so it never inherited that gap).
  - Service-worker cache bumped to `linkly-v17`.
- **Verification**: visual only — desktop header at 1366px, gap measured 12px → 24px. No test/build run (owner rule).

### 2.1.9 - align the recent-link time and rebuild the account menu icons

- **Date**: 2026-10-26
- **Why**: owner — on mobile the `just now` label looked misplaced in the recent-links card, and account-menu icons were inconsistent (logout showed a missing-glyph box, API docs looked unfinished and its text sat tighter than the other rows). Same checks requested for desktop.
- **Changes**:
  - Recent links: the relative time now sits on the short-link line (`/Flip · just now`) instead of floating under the Copy button, so it aligns with the text column on both mobile and desktop.
  - Account menu: replaced the text glyphs with inline SVG icons (home, dashboard, theme, key, external link, logout, trash) so they render the same on every device; removed the underline from the `API docs` link and matched its line-height to the button rows.
  - Hero headline no longer grows on desktop (it wrapped to four lines at 1366px after the copy change); it now stays one line per sentence. Subtitle uses balanced wrapping to avoid a single-word last line.
  - Service-worker cache bumped to `linkly-v16`.
- **Verification**: visual only — mobile 390×844 and desktop 1366×900, account menu and recent card; row spacing measured equal (48px). No test/build run (owner rule).

### 2.1.8 - lead with shortening, regenerate the OG card

- **Date**: 2026-10-25
- **Why**: owner — the site was built as a link shortener; keep analytics/API as supporting features rather than the main pitch (hybrid positioning).
- **Changes**:
  - Home hero now leads with the action: `Shorten long links. / Track every click.` with a one-line description of shortening plus analytics, QR and REST API.
  - Title, description, Open Graph, Twitter and JSON-LD copy updated to `Shorten long links, track clicks` wording.
  - `public/og-image.png` regenerated at 1200×630 with the new headline and chips (`One-click shorten`, `Click analytics`, `REST API`, `Live demo`).
  - PWA manifest name/description aligned with the hybrid pitch.
  - Service-worker cache bumped to `linkly-v15`.
- **Verification**: OG card rendered in the browser at 1200×630; no test/build run (owner rule).

### 2.1.7 - mention short links in the footer tagline

- **Date**: 2026-10-25
- **Why**: owner — the footer tagline should say what the product does, including short links.
- **Changes**:
  - Footer tagline is now `Linkly — short links, link management & analytics.` on every page (home, dashboard, API, privacy, terms, 404).
  - Service-worker cache bumped to `linkly-v14`.
- **Verification**: visual only — no test/build run (owner rule).

### 2.1.6 - tighten the footer link row spacing

- **Date**: 2026-10-25
- **Why**: owner — the gap between the footer copyright text and the `Privacy · Terms · API` row was slightly too large.
- **Changes**:
  - Footer links row `margin-top` reduced from 24px to 16px on every page (shared footer); the 404 footer was already tighter at 10px.
  - Service-worker cache bumped to `linkly-v13`.
- **Verification**: visual only — no test/build run (owner rule).

### 2.1.5 - restore the Live demo button color

- **Date**: 2026-10-25
- **Why**: owner — `Live demo` lost its blue primary styling when the demo/API pair was moved below the recent-links card in 2.1.3.
- **Changes**:
  - `Live demo` is `btn btn-primary` again; `API docs` stays the neutral secondary button, matching the original hero pair.
  - Service-worker cache bumped to `linkly-v12`.
- **Verification**: visual only — home `.home-links` row checked locally; no test/build run (owner rule).

### 2.1.4 - bold the footer links

- **Date**: 2026-10-25
- **Why**: owner — the `Privacy · Terms · API` row should read as bold.
- **Changes**:
  - Footer links are now bold (700) on every page; the 404 footer matches.
  - Service-worker cache bumped to `linkly-v11`.
- **Verification**: visual only — footer checked on the home page; no test/build run (owner rule).

### 2.1.3 - restore the sign-in card and move the demo links out of the hero

- **Date**: 2026-10-24
- **Why**: owner — the 2.1.2 card removal was not wanted (only the focus ring was); the header and footer needed more breathing room; the home page should lead with the shortener again, with the demo/API entry points demoted.
- **Changes**:
  - Restored the `.panel` card on the home sign-in prompt (border, background, radius, padding). The `<main>` focus-ring suppression stays.
  - Moved `Live demo` and `API docs` out of the hero into a quiet button row below the recent-links card (always visible, including for signed-out visitors).
  - Header actions now use a 24px gap between Dashboard, the theme toggle and the Google button.
  - Footer: the `Privacy · Terms · API` row now sits 24px below the copyright lines.
  - Verified the recent-links section still renders as a card (same border/background/radius as the panels).
  - Service-worker cache bumped to `linkly-v10`.
- **Verification**: visual only — signed-in and signed-out home at 1366×768 and 390×844; no test/build run (owner rule).

### 2.1.2 - remove the border box around the home sign-in area

- **Date**: 2026-10-24
- **Why**: owner — the whole home content area read as a bordered card while scrolling, and the hero description needed more technical detail.
- **Changes**:
  - Removed the card chrome from the home sign-in prompt (no border, background, radius or card padding), so the section sits directly on the page instead of inside a bordered box.
  - `<main>` no longer paints a focus ring when the skip link moves focus to it (that ring wrapped the entire content area like a card border).
  - Expanded the hero description with product/stack detail: click and unique-visitor analytics, QR codes, CSV export, REST API, Express, MongoDB and Firebase.
  - Service-worker cache bumped to `linkly-v9`.
- **Verification**: visual only — home at 1440×1000, 700×646 and 390×844; skip-link focus checked; no test/build run (owner rule).

### 2.1.1 - restore the original footer text style

- **Date**: 2026-10-24
- **Why**: owner — the 2.1.0 footer was too plain; bring back the old footer wording and typography without rewording it.
- **Changes**:
  - Restored the original footer copy on every page: two-line copyright (`© 2026 ABu. All rights reserved.` / `Linkly — link management & analytics.`), then the `Privacy · Terms · API` links, then the Playfair Display portfolio block (`Like this build? There's more of my work` / `Open my portfolio ↗`).
  - Restored the old `.foot-cta`, `.foot-cta-kicker` and `.foot-cta-link` styling; footer text is back to body size/color, links back to the 12px muted row.
  - Kept the footer centered on all pages and kept the 404 footer in the same order/style.
  - Loaded Playfair Display on the API, privacy and terms pages so the portfolio line matches the rest.
  - Service-worker cache bumped to `linkly-v8`.
- **Verification**: visual only — home, API and legal footers checked at desktop and mobile widths; no test/build run (owner rule).

### 2.1.0 - simplify the landing page and unify site footers

- **Date**: 2026-10-24
- **Why**: owner — after the demo/API push the home page read as too much text, spacing and alignment were inconsistent, the demo CTAs used different wording, and every page had a different footer.
- **Changes**:
  - **Home:** shortened the hero to one headline, one line of copy and two actions (`Live demo`, `API docs`); removed the feature-points line, the duplicate "Just exploring?" demo line and the tech-stack sentence from the hero. Centered the content block vertically on tall viewports.
  - **Footers:** one `.site-footer` component on home, dashboard, API, privacy, terms and 404 — same centered order (links → copyright → one portfolio line), same hairline and spacing. Removed the old `.legal-footer`, `.foot-cta` and `.foot-cta-kicker` variants.
  - **Demo dashboard:** dropped the redundant "Filtered" stat (2×2 stats on mobile, 4 across on desktop), shortened the demo banner, merged UTM sources and campaigns into one traffic cell, and switched the traffic grid to balanced CSS columns so no empty cell is left at the end.
  - **Table:** widened the Created column so "3d ago · expires 10/30/2026" no longer truncates.
  - **API page:** fixed primary buttons rendering blue-on-blue (invisible label) because `.legal a` overrode `.btn-primary`; unified demo CTA wording.
  - **Sign-in:** Google's button is no longer marked rendered when it is inside a hidden section, so the home auth card retries and does not leave an empty gap.
  - **Cache:** service-worker cache bumped to `linkly-v7` so returning visitors get the new CSS/JS.
- **Verification**: visual only — desktop/mobile screenshots of the home, demo dashboard, API, privacy and 404 pages; no test/build run (owner rule).

### 2.0.10 - public API, live demo, deeper analytics + repositioning

- **Date**: 2026-10-24
- **Why**: owner — finish the portfolio push: (A) a no-sign-in guest demo, (B) a public REST API with keys and docs, (D) deeper analytics, plus fixes for the "tutorial URL shortener" label and the manual-only CI / vanilla-JS weaknesses.
- **Changes**:
  - **Guest demo:** `public/demo-data.js` seeds a 12-link workspace, 30-day click series and 7 traffic groups; `public/dashboard.html` gains `?demo=1` mode (banner, 5 stat cards, read-only edit/delete guards, client-side CSV export, demo link toast); `/demo` rewrites/redirects to the dashboard in `vercel.json` and `server.js`. No database access or shared demo account.
  - **Public API v1:** `api/v1/links.js` (list/create with pagination, search, date filters, daily-quota sharing) and `api/v1/links/[code].js` (get/patch/delete, owner checks); `api/_models/ApiKey.js` + `api/_utils/apiKeys.js` (SHA-256 at rest, `lk_live_` prefix, 10 active keys max, throttled `lastUsedAt`); `api/keys.js` dashboard CRUD/revoke; 120 req/min per key with `X-RateLimit-*` headers.
  - **Shared link helpers:** new `api/_utils/linkUtils.js` (URL/alias/expiry/host/short-URL/quota helpers); `api/shorten.js` refactored onto it.
  - **Analytics depth:** `Click` model adds browser, OS, daily-rotating `visitorHash`, and UTM source/medium/campaign; `api/redirect.js` parses UA/UTM and hashes IP+UA per UTC day when `VISITOR_HASH_SECRET` is set; `api/links.js` facet adds browsers, OSes, UTM sources/campaigns and `uniqueVisitors`; dashboard adds a Unique Visitors stat and four new traffic groups.
  - **API docs:** `public/api.html` + `public/api.css` (auth, quick start, endpoints, examples, limits, error table) and `public/openapi.json` (OpenAPI 3.1); `/docs` route; footer links on home, dashboard and legal pages; sitemap entry.
  - **Repositioning:** home title/meta/hero/CTAs, `README.md`, `PROJECT-INFO.md`, `public/manifest.json` and `package.json` now describe a link management & analytics platform; privacy/terms updated for the new analytics fields, API keys and dates; dashboard/home/404 footer copy and `public/og-image.png` (regenerated at 1200×630) updated to match.
  - **Hardening/ops:** `api/_utils/rateLimit.js` now returns `limit`/`remaining`/`resetAt`; `.env.example` documents `VISITOR_HASH_SECRET`; `server.js` wires `/api/keys`, `/api/v1/links`, `/api/v1/links/:code`, `/demo`, `/docs`; `public/sw.js` cache bumped to `linkly-v6` and precaches API/demo/OpenAPI assets; `vercel.json` adds `/demo` + `/docs` rewrites.
  - **CI:** `.github/workflows/ci.yml` now runs on push to `main` and on pull requests (plus manual dispatch) with concurrency cancellation, replacing manual-only triggers.
- **Verification**: not run — owner explicitly requested no test/build/gate passes during this batch. The suite remains 36 tests; the new API, demo and analytics code is unverified.

### 2.0.9 - production hardening pass

- **Date**: 2026-10-22
- **Why**: owner — close the production-readiness gaps surfaced in the audit/roadmap: abuse controls, account lifecycle, scheduled maintenance, security headers, legal pages and deployment docs.
- **Changes**:
  - `api/shorten.js`, `api/_utils/rateLimit.js`: configurable Mongo-backed daily per-user link quota (`DAILY_LINK_QUOTA`, default 50); fixed `RATE_LIMIT_MAX=0` disabling; custom window/budget support for reuse.
  - `api/redirect.js`: 410 response for disabled links; bot/preview user-agent filtering so crawlers redirect without polluting click analytics; legal footer links on status pages.
  - `api/account.js` + dashboard account modal: irreversible account deletion with recent-auth check, Mongo link/click cleanup, Firebase user removal, typed `DELETE` confirmation, recent-links clear and signed-out confirmation toast.
  - `api/admin.js`: `ADMIN_UIDS`-gated disable/enable endpoint; `Url` moderation fields plus owner/dashboard and expiry indexes.
  - `api/cleanup.js` + `vercel.json` cron: `CRON_SECRET`-gated daily expiry cleanup (links + click events); excludes non-expiring links.
  - `api/health.js`: MongoDB ping health probe for uptime monitors.
  - `api/links.js`: deleting a link also removes its click events (cleanup failure is logged but does not fail the delete).
  - `server.js`, `vercel.json`: HSTS and CSP tightened; API routes wired; jsDelivr removed by self-hosting QRCode.js in `public/vendor/`.
  - `public/privacy.html`, `public/terms.html`, `public/legal.css`: project-level privacy/terms pages, linked from home, dashboard, 404 and redirect status pages; added to sitemap and service-worker precache (`linkly-v5`).
  - `.env.example`, `README.md`: production env/deployment, health, cron, moderation, account-deletion and API documentation.
  - `.github/workflows/ci.yml`, `.github/dependabot.yml`: manual-only CI (no push trigger) and weekly dependency updates.
- **Verification**: not run — owner explicitly requested no test/build/gate passes during this batch. Existing suite untouched apart from a `Click.deleteMany` stub needed for the link-delete change; no new tests added.

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

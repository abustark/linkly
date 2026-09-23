# Linkly — Full Site Audit Report

**Date:** 2026-09-22 · **Scope:** features, UI, layouts, styles, alignment, accessibility, security, API
**Method:** full code review · 16/16 unit tests pass · live API/DB tests (local + production) · automated real-browser audit — 24 scenarios, 6 viewports (320→1440 px), light + dark, signed-out + signed-in, ~35 screenshots, programmatic contrast / overflow / tap-target / ARIA checks · follow-up probes for every suspected issue

---

## Verdict

**Good to publish as a portfolio project after fixing the 6 must-fix items below (~half a day of work).** The foundation is genuinely strong — security headers, tests, auth, rate limiting, dark mode, responsive layout, and modal accessibility all check out. What remains is a handful of visible bugs and README claims that don't match reality.

| Area | Result |
|---|---|
| Tests | ✅ 16/16 pass |
| Page overflow (320–1440 px) | ✅ none anywhere |
| Dark theme contrast | ✅ zero failures |
| Security headers (local + prod) | ✅ CSP, XFO, nosniff, HSTS+preload |
| API auth guards | ✅ all 401 correctly |
| Rate limiting | ✅ 429 at attempt ~30 |
| Redirect + click counting | ✅ verified 302, count 1→2 against real DB (test row cleaned up) |
| Home a11y basics | ✅ single h1, no heading jumps, skip link, focus rings |
| Modal a11y | ✅ focus → Cancel, Esc closes, focus trapped |
| Desktop table layout | ❌ **Delete button clipped / unreachable** |
| Google sign-in button | ❌ **intermittently fails to render (2 of 5 loads)** |
| Dead-link UX | ❌ raw JSON shown |
| README accuracy | ❌ 2 documented features missing/wrong |

---

## 🔴 Must fix before publishing

### 1. Dashboard table: Actions column clipped — Delete unreachable (HIGH)
With realistic data, the table (1182 px) overflows `.table-wrap` (1084 px) at 1440 px. `elementFromPoint` on the Delete button hits the wrapper, not the button — it can only be reached by an undiscovered inner horizontal scroll. Marginal at 1280 px (15 px overflow); visibly clipped at 768 px.
- `public/dashboard.css:79` `.row-actions { flex-wrap: nowrap }` forces min width; `public/dashboard.css:73` ellipsis cell helps but isn't enough
- **Fix:** `table-layout: fixed` with column widths, or `th.actions-col { width: 1%; white-space: nowrap }` + `min-width: 0` on URL cells + shrink `.row-actions` gaps; re-test with long URLs

### 2. Google sign-in button intermittently renders nowhere (HIGH)
Measured 5 clean loads of the home page: **2/5 rendered no sign-in button at all** (header *and* prompt empty); others rendered inconsistently (header only). Root cause: `L.renderGSI()` is called from the `onAuthStateChanged` callback (`public/index.html:234`) **before** `window.onload` runs `google.accounts.id.initialize()` (`public/index.html:195`), and `renderGSI` (`public/shared.js:93`) marks containers with `data-gsi-rendered="1"` even when rendering failed, so the later correct call is skipped. Console shows `Failed to render button before calling initialize()`, `Missing required parameter: client_id`, `initialize() called multiple times`.
- **Fix:** initialize GSI once, synchronously, before any render attempt; only mark a container rendered on success; guard against double `initialize()`. Same bug in `public/m/index.html:194/199/233`.

### 3. CSP blocks the Google sign-in stylesheet (MEDIUM)
Every page load logs: *"Loading the stylesheet 'https://accounts.google.com/gsi/style' violates … style-src"*. The CSP in `server.js:14` and `vercel.json:64` omits `accounts.google.com` from `style-src`. Happens in production too.
- **Fix:** add `https://accounts.google.com` to `style-src`

### 4. Dead short links show raw JSON (MEDIUM UX)
`GET /nope404` → `{"error":"Short URL not found"}` (content-type JSON), local and production. Anyone who shares a typo'd/expired link lands on developer output.
- `api/redirect.js:17`
- **Fix:** when `Accept` includes `text/html`, render a small branded 404 page (logo, "Link not found", CTA to home) instead of JSON

### 5. Local dev: DELETE endpoint missing (MEDIUM — dev only)
`server.js:29-35` registers only `POST /api/shorten`, `GET /api/links`, `GET /:shortCode`. `DELETE /api/links?shortCode=…` returns **404 "Cannot DELETE"** locally (works in production via Vercel routing). Verified live.
- **Fix:** add `app.delete('/api/links', …)` in `server.js` (also wire `GET /api/shorten` → 405 for completeness)

### 6. README claims features that don't exist (LOW — credibility)
- `README.md:24` — "QR code preview and **PNG download**": the QR modal has **no download button** (verified visually)
- `README.md:65` — `DELETE /api/links/:shortCode`: actual endpoint is `DELETE /api/links?shortCode=…`
- **Fix:** implement QR PNG download (canvas → `toDataURL` + download link) *or* correct the README; fix the endpoint doc

---

## 🟡 Should fix (quality bar)

| # | Issue | Where | Fix |
|---|---|---|---|
| 7 | Light-theme muted text contrast **4.43:1** (needs 4.5) — hero subtitle, footer, labels | `shared.css:5` `--muted: #64748b` on `#f4f7fb` | darken to ≈ `#5b6b82` |
| 8 | Search input interpolated into `$regex` **unescaped** — `q=( ` → 500 / ReDoS (auth required to reach) | `api/links.js:40-41` | escape regex metacharacters |
| 9 | Delete guard `if (url.userId && …)` lets **any signed-in user delete ownerless links** | `api/links.js:98` | require `url.userId === decodedToken.uid` |
| 10 | Click-to-copy original URL is a bare `<span>` — not keyboard focusable, no role | `dashboard.html:280,313` | `tabindex="0" role="button"` + Enter/Space handler (or use `<button>`) |
| 11 | Dashboard has **no `<h1>`** (zero headings on page) | `dashboard.html` | add visually-hidden `<h1>Dashboard</h1>` |
| 12 | Profile sheet: no focus trap, no `aria-modal`, avatar button lacks `aria-expanded` (modals do this correctly) | `dashboard.html` / `index.html` | mirror the modal behaviour |
| 13 | `a.btn` ("Open") renders **underlined** while sibling actions are buttons — computed `text-decoration: underline` | `shared.css:162` `.btn` | add `text-decoration: none` |
| 14 | Global `svg { height: 84px; background: … }` selector — any future SVG on dashboard breaks | `dashboard.css:88` | scope to `#sparkline` (or `.sparkline svg`) |
| 15 | Rate limiter trusts first `X-Forwarded-For` value (spoofable locally) + in-memory only per serverless instance | `api/shorten.js:14-18` | use platform IP; consider Upstash/Vercel KV if it matters |
| 16 | CORS wide open locally (`access-control-allow-origin: *` observed) but not on Vercel — inconsistent | `server.js:17` | restrict to site origin |
| 17 | `x-powered-by: Express` exposed | `server.js` | `app.disable('x-powered-by')` |

---

## 🔵 Polish / nice-to-haves

18. **`prefers-color-scheme` ignored** — first-time visitors always get light; default from `matchMedia` (`shared.js:19-21`)
19. **`color-scheme` CSS + `<meta name="theme-color">` missing** — native scrollbars/inputs don't follow dark mode
20. **Breakpoints inconsistent:** `760px` (`home.css:38`) vs `760/761` (`shared.css:249,253,262`) vs `759/760` (`dashboard.css:95,102`) — hybrid layout at exactly 760 px; align to one pair
21. **`transition: 0.15s ease` shorthand = `transition-property: all`** on `.btn`, `.chip`, `.slider` (`shared.css:151,155,165`, `dashboard.css:36`) — list properties explicitly
22. **Three dots `...` instead of `…`** in 4 strings: "Creating short URL...", "Loading links...", "Deleting..." (`index.html:242`, `dashboard.html:63,336,408` + mobile twins) — elsewhere you correctly use `…`
23. **Sparkline hardcodes `#4f46e5`** — doesn't follow theme tokens (`dashboard.html:250`)
24. **Inputs lack `name` / `autocomplete`** — `#longUrl` should have `name="url" autocomplete="url"` (`index.html:63`); alias: `autocomplete="off" spellcheck="false"` (`index.html:68`)
25. **Search/filter/pagination not reflected in URL** — filtered views can't be deep-linked/shared
26. **SEO gap:** `robots.txt` → 404, `sitemap.xml` → 404, no canonical tags, no custom 404 page (all verified against production)
27. **Tap targets below your own 44 px standard:** `.btn.tiny` 38 px, theme switch 48×28, avatar 36×36 (all still pass WCAG's 24 px AA)
28. **Alias availability check** only happens on submit — a debounced live check would feel premium
29. **Footer year** hardcoded `2025` in HTML, fixed by JS — use `getFullYear()` server-side-free or keep JS but it's the fallback that's stale
30. **`measurementId` in Firebase config but Analytics never loaded** — dead config; remove or load
31. **Firebase JS SDK v8.10.0 is legacy** (v8 is deprecated; v9/v10 modular is current) — worth migrating eventually
32. **Home page is thin for a portfolio piece** — consider a "How it works" 3-step section + footer links (GitHub, privacy policy — Google OAuth review likes a privacy policy link)

---

## What's genuinely good (keep it)

- **Security:** full header set locally *and* production incl. HSTS preload; auth required on every mutating endpoint; Host allowlist option; secrets gitignored & untracked (verified `git ls-files`)
- **Tests:** 16 tests incl. word-list/Vercel-rewrite invariants
- **Responsive:** zero horizontal overflow 320→1440 px; dedicated `/m/` pages + the desktop page also reflows correctly to cards at 320 px
- **Dark mode:** passes all contrast checks; persisted; safe-area insets respected
- **Modals:** focus trap, focus moves to Cancel, Esc closes — better than most portfolio projects
- **Real features verified end-to-end:** rate limit (429), 302 redirect + click counting against the real DB (probe row cleaned up), pagination, search, date filters, stats, sparkline, QR render, sheets, toasts
- **OG/Twitter cards** with a proper 1200×630 image (17 KB)

## Coverage notes
- Lighthouse was not collected — `gstatic.com` became unreachable mid-audit (it also blocks the Firebase SDK locally; tests used a vendored copy). Re-run `npx lighthouse` when network allows.
- The dedicated `/m/dashboard.html` signed-in view was the one state the harness couldn't force (auth stub raced a redirect); its markup mirrors the audited desktop dashboard, and the 320 px card layout of the same CSS was verified via `/dashboard.html`.
- Audit artifacts (35 screenshots, JSON reports, scripts) live in `%TEMP%\opencode\linkly-audit\` — outside the repo.

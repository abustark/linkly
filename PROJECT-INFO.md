# Linkly — Project Info Sheet (source of truth for resume & portfolio summaries)

> **Purpose:** every fact an AI (or a person) needs to write a resume "Projects"
> entry or a portfolio project summary for Linkly — without reading the code.
> Generate prose from these facts only; do not invent beyond them. Tune length
> and tone to the target (resume = dense & quantified; portfolio = readable &
> story-driven).

---

## 1. Project identity

| Field | Value |
|---|---|
| Name | **Linkly — Link Management & Analytics Platform** |
| Type | Full-stack web application + public REST API (self-hosted SaaS-style utility) |
| Author | ABu |
| Live site | https://linkly-link.vercel.app |
| Live demo | https://linkly-link.vercel.app/dashboard.html?demo=1 (also `/demo`) |
| API reference | https://linkly-link.vercel.app/api.html · OpenAPI: `/openapi.json` |
| Source | https://github.com/abustark/linkly |
| License | MIT |
| Status | Production-deployed on Vercel, actively maintained (2026) |

**One-liners (pick by context):**
- *10 words:* Link management and analytics platform with a public REST API and live demo.
- *25 words:* Linkly is a link management platform built on Node.js/Express and MongoDB with Firebase Google sign-in, branded short links, privacy-conscious analytics, QR codes and a documented REST API.
- *Elevator pitch:* Linkly turns long URLs into branded short links and shows how they perform. Users sign in with Google, create links with optional aliases and expiration dates, and manage everything — search, filters, 30-day trends, traffic breakdowns, unique visitors, QR codes, CSV export — from a responsive dashboard. A public REST API with revocable, hashed keys lets developers automate the same workflows, and a no-sign-in demo renders a seeded workspace entirely in the browser.

---

## 2. Tech stack — exact versions

| Category | Technology | Version | Role |
|---|---|---|---|
| Runtime | Node.js | v22.18.0 (dev/test machine; LTS, no hard pin) | Server runtime |
| Package manager | npm | 11.19.1 | Dependencies/scripts |
| HTTP framework | Express | ^4.18.2 | Local server (`server.js`) + API handlers |
| Database | MongoDB Atlas | via Mongoose 7 ODM | Persistent storage |
| ODM | Mongoose | ^7.5.0 | Schema/queries (`api/_models`) |
| Auth (server) | firebase-admin | ^13.5.0 | Verifies Firebase ID tokens (Bearer JWTs) |
| Auth (client) | Firebase JS SDK | **v10.12.2** (modular ESM, v8-style facade `window.LinklyFirebase`) | Client session state |
| Sign-in | Google Identity Services (`accounts.google.com/gsi/client`) | current, unversioned | Google button + One Tap credential flow (no OAuth redirect chain) |
| API keys | Node `crypto` | built-in | `lk_live_` key generation + SHA-256 hashing at rest |
| Hosting (prod) | Vercel Serverless Functions | `api/*.js` + `vercel.json` routing/headers | Production deployment |
| Hosting (dev) | Express + nodemon | ^3.0.1 (nodemon) | `npm run dev` on :5000 |
| Middleware/libs | cors, dotenv | ^2.8.5, ^16.3.1 | CORS, env config |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript | ES2022+, **zero frameworks, zero build step** | Single responsive pages |
| QR codes | qrcodejs | 1.0.0 (self-hosted in `public/vendor/`, MIT) | QR render + PNG download |
| Fonts | Google Fonts | Inter, Sora, Playfair Display | Body / display / footer accent |
| PWA | Hand-written service worker + Web App Manifest | versioned cache in `sw.js` (`linkly-v6`) | Installable app, offline shell |
| SEO | canonical, Open Graph, JSON-LD, robots.txt, sitemap.xml, branded 404 | — | Discoverability |
| Testing | Node built-in test runner (`node --test`) | **36 tests / 4 files** | `npm test` |
| Browser QA | Playwright harness (stubbed Firebase v10 ESM modules) | external harness | Desktop + mobile flow verification, dated captures in `artifacts/` (local-only) |
| CI | GitHub Actions | push to `main` + pull requests | Automatic test signal |
| VCS | Git / GitHub | main branch | Trunk-based, versioned commits |

---

## 3. Architecture (how it fits together)

- **Dual deployment target, one codebase:** the same API modules run as a local Express server (`server.js`, port 5000) in development and as Vercel serverless functions (`api/*.js`) in production; models and utilities are shared from `api/_models` and `api/_utils`.
- **Static frontend, no framework:** single responsive pages (`index.html`, `dashboard.html`, `api.html`, legal pages) with module scripts and a CSS custom-property design system; mobile layout handled by one ≤760px stylesheet — the legacy `/m/*` twin pages were merged and now 301-redirect.
- **Data model:** `Url` documents carry owner attribution, an atomic `clickCount`, and pre-aggregated `clicksByDay` day buckets (time-series chart without scanning raw events); `Click` documents store coarse analytics dimensions for 90 days (TTL); `ApiKey` stores only a SHA-256 hash; `RateLimit` documents back persistent rate limiting.
- **Two auth planes:** browser sessions use Firebase ID tokens verified by `firebase-admin`; the public API uses `lk_live_…` keys hashed with SHA-256, checked per request, revocable, capped at 10 active keys per user.
- **Routing:** short codes are 3–12 chars (`[a-zA-Z0-9_-]{3,12}`), enforced by a Vercel rewrite into the redirect function → `302` + atomic `$inc`. `/demo` and `/docs` rewrite to the demo dashboard and API reference.
- **Security pipeline per request:** credential verification (Firebase token or API key) → fail-closed ownership check → Mongo-backed rate limit (per-IP or per-key sliding window, in-memory fallback) → strict input validation.

---

## 4. Feature inventory (technical depth for bullet generation)

1. **Shorten + custom aliases** — alias regex validation, `409` on collision, word-list fallback codes generated to match the routing pattern (invariant-tested); shared helpers in `api/_utils/linkUtils.js` used by both the dashboard and public API.
2. **Redirect analytics** — `302` redirect with atomic click increments; clicks bucketed by day into `clicksByDay` for a 30-day time series while preserving lifetime totals.
3. **Dashboard** — search via `$or` with regex-metacharacter escaping, `7d/30d/All` date filters, and a single-query `$facet` aggregation returning links + aggregates + series + traffic (no N+1 round trips); five stat cards including unique visitors.
4. **Traffic breakdown** — top referrers, devices, countries, browsers, operating systems, UTM sources and campaigns from one aggregation facet pipeline.
5. **Unique visitors** — a salted HMAC of IP + user-agent + UTC day, truncated and stored only as a rotating hash; the raw IP and full UA are never persisted. Disabled when `VISITOR_HASH_SECRET` is unset.
6. **QR codes** — preview modal + PNG download (self-hosted qrcodejs).
7. **CSV export** — `GET /api/links?format=csv` streams the current filtered view as CSV with RFC 4180 quoting and formula-injection guards; `401` without a valid session. Demo mode exports the sample workspace client-side.
8. **Google sign-in (fast path)** — GIS credential/One Tap → ID token → `signInWithCredential` (single API verification; deliberately avoids slow OAuth redirect flows) → `firebase-admin` verification server-side.
9. **Public REST API v1** — `GET/POST /api/v1/links`, `GET/PATCH/DELETE /api/v1/links/{code}`; pagination, search, date filters, structured `{ error: { code, message } }` responses; 120 requests/minute per key with `X-RateLimit-*` headers; creation shares the dashboard's daily quota.
10. **API-key lifecycle** — create/list/revoke from the dashboard, raw key shown once, SHA-256 hash at rest, `lastUsedAt` stamped (throttled), max 10 active keys, keys never recoverable.
11. **Live demo** — `/dashboard.html?demo=1` renders a seeded 12-link workspace, 30-day series and seven traffic groups entirely in the browser; write actions are guarded and demo links show a toast instead of navigating; no database access or shared account.
12. **Rate limiting** — Mongo-backed sliding window on the shorten endpoint and per API key (persistent across serverless cold starts) with automatic in-memory fallback when the DB is unavailable.
13. **PWA** — manifest + icons + service-worker offline shell; installable; cache-version bump is a documented workflow rule.
14. **SEO** — canonical/OG/JSON-LD tags, `robots.txt`, `sitemap.xml` (includes API docs), branded HTML `404` for browsers vs JSON `404` for API clients.
15. **Responsive & mobile-first** — one page per route at every width, ≥44px tap targets, safe-area insets, legacy `/m/*` URLs permanently redirected.
16. **Dark theme** — CSS custom properties + persisted toggle.
17. **Accessibility** — skip links, modal focus trap, `aria` labels/live regions, `prefers-reduced-motion` support.
18. **Security headers** — strict Content-Security-Policy allowlist (incl. Google/GIS origins), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
19. **Account lifecycle & moderation** — account deletion with recent-auth check; `ADMIN_UIDS`-gated disable/enable; cron cleanup for expired links; health probe.
20. **CI** — GitHub Actions runs the 36-test suite on every push to `main` and every pull request, with concurrency cancellation and Dependabot updates.

---

## 5. Quality & testing

- **`npm test` — 36 tests, 4 files, Node built-in runner:** links API (aggregates, search escaping, date ranges, auth rejection), ownership/fail-closed edits & deletes, redirect integrity (atomic increment, click-event capture, expiry/disabled 410s, HTML-vs-JSON error split), create/alias/expiration validation, and a code-generation ↔ routing-pattern invariant.
- **Browser QA harness (Playwright):** Firebase v10 ESM faked at the network layer; verifies desktop + mobile flows, legacy redirects, CSV auth, PWA statics, and 404 behavior; dated QA captures kept in `artifacts/` (PNGs local-only per `.gitignore` — not committed).
- **CI:** GitHub Actions on push + pull request (`.github/workflows/ci.yml`); Dependabot for dependency updates.
- **Docs in-repo:** `README.md`, `PROJECT-INFO.md`, `AUDIT-REPORT.md` (remediation log), `AGENTS.md`/`CLAUDE.md` (AI-agent working rules), `public/api.html` + `public/openapi.json` (API contract).

---

## 6. Scale metrics (quantifiables)

- **79** git-tracked files; **~5,564 lines** across **42** JS/HTML/CSS files (excluding the vendored QR library).
- **17 API operations:** 5 public v1 operations, 12 dashboard/admin/ops endpoints (shorten, list/edit/delete, keys, account, admin, cleanup, health, redirect).
- **4 Mongoose models** (`Url`, `Click`, `ApiKey`, `RateLimit`) + **7 shared utilities**.
- **36 automated tests / 4 test files.**
- **0** frontend frameworks, **0** build steps — plain static assets.
- **30-day** pre-aggregated analytics window; **90-day** raw click retention via TTL index.
- **120 req/min** per API key; **50 links/day** default per-user quota; **10** active API keys max.
- Demo workspace: **12 links**, **30 days** of click series, **7** traffic dimensions — all client-side.

---

## 7. Engineering practices worth mentioning

- Fail-closed authorization (deny when owner data is missing, not just when it mismatches).
- Atomic DB updates for counters — no read-modify-write races.
- Pre-aggregated time-series buckets — chart renders without scanning raw click events.
- Single-query `$facet` aggregation — dashboard loads in one round trip.
- Regex metacharacter escaping in user-driven search (injection/ReDoS care).
- API keys hashed with SHA-256, shown once, revocable, per-key rate limited.
- Privacy-conscious analytics: coarse dimensions only; daily-rotating HMAC for uniques; no IP/UA stored.
- Dual 404 contract (HTML for browsers, JSON for API clients).
- Degradation-by-design fallbacks (in-memory rate limiter when DB is down).
- Versioned service-worker cache with a documented bump rule.
- Self-hosted CDN dependencies; CSP allowlisting every external origin.
- Automatic CI on push + PR; trunk-based Git workflow with versioned, meaningful commits; AI-assisted development governed by in-repo agent rules (`AGENTS.md`).

---

## 8. ATS / keyword tags

link management, link analytics, click tracking, unique visitors, UTM attribution, Node.js, Express, REST API, API keys, SHA-256, OpenAPI 3.1, MongoDB, Mongoose, NoSQL, Firebase Authentication, firebase-admin, Google Identity Services, Google OAuth / ID token, JWT verification, serverless functions, Vercel, PWA, service worker, Web App Manifest, CSV export, time-series aggregation, rate limiting, Content-Security-Policy, security headers, SEO, JSON-LD, responsive design, dark mode, accessibility (WCAG-minded), vanilla JavaScript, ES modules, automated testing, node:test, Playwright, GitHub Actions, Git/GitHub.

---

## 9. Ready-made examples (regenerate freely — facts only)

**Resume bullets:**
- Built a link management and analytics platform (Node.js/Express, MongoDB/Mongoose) with Google sign-in via Firebase + Google Identity Services credential flow — no OAuth redirect chain.
- Designed an analytics pipeline with atomic click increments and pre-aggregated daily buckets powering a 30-day chart in a single `$facet` query, plus referrer/device/country/browser/OS/UTM breakdowns and privacy-preserving unique visitors.
- Shipped a public REST API (OpenAPI 3.1) with revocable SHA-256-hashed keys, per-key rate limiting, structured errors and a documented quick start.
- Added a no-sign-in live demo that renders a seeded 12-link workspace entirely client-side, plus CSV export, QR generation and strict CSP/security headers.
- Shipped as an installable PWA with SEO (JSON-LD, sitemap, branded 404) on Vercel serverless; dual Express dev server from one codebase; CI on every push and PR.
- Wrote 36 automated tests (`node --test`) plus a Playwright browser harness with dated screenshot artifacts.

**Resume project paragraph (3 lines):** Full-stack link management and analytics platform built with Node.js, Express and MongoDB, deployed on Vercel serverless with a local Express dev server from a single codebase. Features Google one-tap sign-in (Firebase + GIS credential flow), branded short links with aliases and expiry, day-bucketed click analytics with 30-day trends, referrer/device/browser/OS/UTM breakdowns, privacy-preserving unique visitors, QR codes, CSV export, and a public REST API with revocable hashed keys and an OpenAPI 3.1 contract. Ships as an installable PWA with strict CSP headers, automatic CI, and a 36-test automated suite.

**Portfolio card (title + ~30 words + stack):** Linkly — a link management and analytics platform: branded short links, 30-day trends, traffic and UTM breakdowns, unique visitors, QR codes, CSV export, and a documented REST API with hashed, revocable keys. Explore the seeded live demo without an account. `Node.js · Express · MongoDB · Firebase · Vercel · Vanilla JS`

**Tone/length guide for the AI:** Frame impact as user capability + the hardest engineering problem solved (no business KPIs). Resume = 3–5 dense bullets or one 3-line paragraph, lead with verbs and numbers, keywords from §8; portfolio = friendly paragraph + feature list + stack chips, mention the live demo, the analytics depth, and the public API; never claim features not listed here.

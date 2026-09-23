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
| Name | **Linkly — URL Shortener & Link Analytics** |
| Type | Full-stack web application (self-hosted SaaS-style utility) |
| Author | ABu |
| Live site | https://linkly-link.vercel.app |
| Source | https://github.com/abustark/linkly |
| License | MIT |
| Status | Production-deployed on Vercel, actively maintained (2026) |

**One-liners (pick by context):**
- *10 words:* Full-stack URL shortener with Google sign-in, click analytics and a PWA dashboard.
- *25 words:* Linkly is a URL shortener built on Node.js/Express and MongoDB with Firebase Google sign-in, custom aliases, QR codes, 30-day click charts, CSV export and an installable PWA frontend.
- *Elevator pitch:* Linkly turns long URLs into short branded links and shows how they perform. Users sign in with Google, create links with optional custom aliases, and manage everything — search, filters, click stats, QR codes, CSV export — from a responsive dashboard. It ships as a production web app with a service worker, strict security headers, and a full automated test suite.

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
| Hosting (prod) | Vercel Serverless Functions | `api/*.js` + `vercel.json` routing/headers | Production deployment |
| Hosting (dev) | Express + nodemon | ^3.0.1 (nodemon) | `npm run dev` on :5000 |
| Middleware/libs | cors, dotenv | ^2.8.5, ^16.3.1 | CORS, env config |
| Frontend | Vanilla HTML5 / CSS3 / JavaScript | ES2022+, **zero frameworks, zero build step** | Two single responsive pages |
| QR codes | qrcodejs | 1.0.0 (pinned, jsDelivr CDN) | QR render + PNG download |
| Fonts | Google Fonts | Inter, Sora, Playfair Display | Body / display / footer accent |
| PWA | Hand-written service worker + Web App Manifest | versioned cache in `sw.js` | Installable app, offline shell |
| SEO | canonical, Open Graph, JSON-LD, robots.txt, sitemap.xml, branded 404 | — | Discoverability |
| Testing | Node built-in test runner (`node --test`) | 23 tests / 4 files | `npm test` |
| Browser QA | Playwright harness (stubbed Firebase v10 ESM modules) | external harness | Desktop + mobile flow verification, ~50 dated screenshots in `artifacts/` |
| VCS | Git / GitHub | main branch | Trunk-based, conventional commits |

---

## 3. Architecture (how it fits together)

- **Dual deployment target, one codebase:** the same API modules run as a local Express server (`server.js`, port 5000) in development and as Vercel serverless functions (`api/*.js`) in production; models and utilities are shared from `api/_models` and `api/_utils`.
- **Static frontend, no framework:** two single responsive pages (`index.html`, `dashboard.html`) with module scripts and a CSS custom-property design system; mobile layout handled by one ≤760px stylesheet — the legacy `/m/*` twin pages were merged and now 301-redirect.
- **Data model:** `Url` documents carry owner attribution, an atomic `clicks` counter, and pre-aggregated `clicksByDay` day buckets (time-series chart without scanning raw events); `RateLimit` documents back persistent rate limiting.
- **Routing:** short codes are 3–12 chars (`[a-zA-Z0-9_-]{3,12}`), enforced by a Vercel rewrite into the redirect function → `302` + atomic `$inc`.
- **Security pipeline per request:** Firebase Bearer-ID-token verification → fail-closed ownership check → Mongo-backed rate limit (per-IP sliding window, in-memory fallback) → strict input validation.

---

## 4. Feature inventory (technical depth for bullet generation)

1. **Shorten + custom aliases** — alias regex validation, `409` on collision, word-list fallback codes generated to match the routing pattern (invariant-tested).
2. **Redirect analytics** — `302` redirect with atomic click increments; clicks bucketed by day into `clicksByDay` for a 30-day time series while preserving lifetime totals.
3. **Dashboard** — search via `$or` with regex-metacharacter escaping, `7d/30d/All` date filters, and a single-query `$facet` aggregation returning links + aggregates + series (no N+1 round trips); stat cards for total links/clicks/top link/filtered count.
4. **QR codes** — preview modal + PNG download (qrcodejs).
5. **CSV export** — `GET /api/links?format=csv` streams the current filtered view as CSV; `401` without a valid session.
6. **Google sign-in (fast path)** — GIS credential/One Tap → ID token → `signInWithCredential` (single API verification; deliberately avoids slow OAuth redirect flows) → `firebase-admin` verification server-side.
7. **Rate limiting** — Mongo-backed sliding window on the shorten endpoint (persistent across serverless cold starts) with automatic in-memory fallback when the DB is unavailable.
8. **PWA** — manifest + icons + service-worker offline shell; installable; cache-version bump is a documented workflow rule.
9. **SEO** — canonical/OG/JSON-LD tags, `robots.txt`, `sitemap.xml`, branded HTML `404` for browsers vs JSON `404` for API clients.
10. **Responsive & mobile-first** — one page per route at every width, ≥44px tap targets, safe-area insets, legacy `/m/*` URLs permanently redirected.
11. **Dark theme** — CSS custom properties + persisted toggle.
12. **Accessibility** — skip links, modal focus trap, `aria` labels/live regions, `prefers-reduced-motion` support.
13. **Security headers** — strict Content-Security-Policy allowlist (incl. Google/GIS origins), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`.
14. **Auth gate UX** — signed-out visitors never glimpse the dashboard layout; a fading "Sign in to see your dashboard" note appears, then a redirect.

---

## 5. Quality & testing

- **`npm test` — 23 tests, 4 files, ~17s, Node built-in runner:** links API (aggregates, search escaping, date ranges, auth rejection), delete ownership (incl. fail-closed for ownerless legacy links + 404s), redirect integrity (atomic increment, HTML-vs-JSON 404 split), create/alias validation (409/400 paths), and a code-generation ↔ routing-pattern invariant.
- **Browser QA harness (Playwright):** Firebase v10 ESM faked at the network layer; verifies desktop + mobile flows, legacy redirects, CSV auth, PWA statics, and 404 behavior; ~50 dated screenshots committed in `artifacts/`.
- **Docs in-repo:** `README.md`, `AUDIT-REPORT.md` (full remediation log), `AGENTS.md`/`CLAUDE.md` (AI-agent working rules), this sheet.

---

## 6. Scale metrics (quantifiables)

- **99** git-tracked files; **3,411 lines** across **26** JS/HTML/CSS files (small, hand-rolled codebase).
- **4 API endpoints** + **10 backend modules** (4 API handlers, 2 Mongoose models, 4 utilities).
- **23 automated tests / 4 test files** — full `npm test` in ~17s.
- **0** frontend frameworks, **0** build steps — plain static assets.
- **30-day** pre-aggregated analytics window; single-query aggregation for dashboard loads.
- **~50** QA screenshots as living visual-regression evidence.

---

## 7. Engineering practices worth mentioning

- Fail-closed authorization (deny when owner data is missing, not just when it mismatches).
- Atomic DB updates for counters — no read-modify-write races.
- Pre-aggregated time-series buckets — chart renders without scanning raw click events.
- Single-query `$facet` aggregation — dashboard loads in one round trip.
- Regex metacharacter escaping in user-driven search (injection/ReDoS care).
- Dual 404 contract (HTML for browsers, JSON for API clients).
- Degradation-by-design fallbacks (in-memory rate limiter when DB is down).
- Versioned service-worker cache with a documented bump rule.
- Pinned CDN dependencies; CSP allowlisting every external origin.
- Trunk-based Git workflow with meaningful-message commits; AI-assisted development governed by in-repo agent rules (`AGENTS.md`).

---

## 8. ATS / keyword tags

url shortener, link analytics, click tracking, Node.js, Express, REST API, MongoDB, Mongoose, NoSQL, Firebase Authentication, firebase-admin, Google Identity Services, Google OAuth / ID token, JWT verification, serverless functions, Vercel, PWA, service worker, Web App Manifest, CSV export, time-series aggregation, rate limiting, Content-Security-Policy, security headers, SEO, JSON-LD, responsive design, dark mode, accessibility (WCAG-minded), vanilla JavaScript, ES modules, automated testing, node:test, Playwright, Git/GitHub.

---

## 9. Ready-made examples (regenerate freely — facts only)

**Resume bullets:**
- Built a full-stack URL shortener (Node.js/Express, MongoDB/Mongoose) with Google sign-in via Firebase + Google Identity Services credential flow — no OAuth redirect chain.
- Designed an analytics pipeline with atomic click increments and pre-aggregated daily buckets powering a 30-day chart in a single `$facet` query.
- Added CSV export, QR generation, persistent Mongo-backed rate limiting (with in-memory fallback) and strict CSP/security headers.
- Shipped as an installable PWA (service worker + manifest) with SEO (JSON-LD, sitemap, branded 404) on Vercel serverless; dual Express dev server from one codebase.
- Wrote 23 automated tests (`node --test`) plus a Playwright browser harness with ~50 screenshot artifacts.

**Resume project paragraph (3 lines):** Full-stack URL shortener built with Node.js, Express and MongoDB, deployed on Vercel serverless with a local Express dev server from a single codebase. Features Google one-tap sign-in (Firebase + GIS credential flow), custom aliases, QR codes, day-bucketed click analytics with a 30-day chart, and CSV export. Ships as an installable PWA with strict CSP headers, SEO best practices, and a 23-test automated suite.

**Portfolio card (title + ~30 words + stack):** Linkly — a polished URL shortener that shortens links, tracks clicks day-by-day, and shows them in a 30-day chart with QR codes, search, filters and CSV export. One-tap Google sign-in, installable PWA, dark mode. `Node.js · Express · MongoDB · Firebase · Vercel · Vanilla JS`

**Tone/length guide for the AI:** resume = 3–5 dense bullets or one 3-line paragraph, lead with verbs and numbers, keywords from §8; portfolio = friendly paragraph + feature list + stack chips, mention the fast sign-in, the chart, and the PWA; never claim features not listed here.

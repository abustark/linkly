# Linkly — URL Shortener

Full-stack URL shortener with Google authentication, MongoDB persistence, custom aliases, click tracking, and a responsive dashboard.

[![Live Demo](https://img.shields.io/badge/Live-Demo-2563eb?style=for-the-badge&logo=vercel&logoColor=white)](https://linkly-link.vercel.app)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Firebase](https://img.shields.io/badge/Auth-Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

> 📄 **[`PROJECT-INFO.md`](PROJECT-INFO.md)** — machine-readable project facts (stack + exact versions, architecture, metrics, keyword tags) designed so an AI can generate resume entries and portfolio project summaries from it alone.

## Overview

Linkly turns long URLs into short, shareable links and tracks how they perform. Users sign in with Google, create links with optional custom aliases and expiration dates, and manage everything from a dashboard — search, filter, edit destinations, see click stats, and download QR codes.

## Screenshots

| Home | Dashboard |
| --- | --- |
| ![Linkly home — light](docs/screenshots/home-light.png) | ![Linkly dashboard — light](docs/screenshots/dashboard-light.png) |
| ![Linkly home — dark](docs/screenshots/home-dark.png) | ![Linkly dashboard — dark](docs/screenshots/dashboard-dark.png) |

## Features

- Shorten long URLs with optional custom aliases (requires Google sign-in)
- Optional link expiration — 24 hours, 7 days or 30 days, with a branded 410 page once expired
- 302 redirects with per-link click counting, bucketed by day for time-series charts
- Firebase Google authentication (JS SDK v10, modular ESM)
- User dashboard with:
  - Search by URL or code
  - Date filters (`All`, `7d`, `30d`)
  - Total links, total clicks, top clicks, filtered count
  - Edit a link's destination without changing its short code
  - QR code preview and PNG download
  - 30-day daily-click time series chart
  - Traffic breakdown — top referrers, device types and countries from click events (90-day retention)
  - CSV export of the current filtered view
- Persistent (Mongo-backed) IP rate limiting plus a configurable daily per-user creation quota
- Account deletion that removes links, click history and the Firebase account
- Bot/preview filtering so only human clicks reach analytics
- Admin takedown API for disabling abusive links
- Scheduled cleanup for expired links and their click events
- Privacy Policy and Terms pages, linked in the footer
- Host validation for generated short URLs
- Dark mode with persisted preference
- Single responsive pages (mobile ≤760px); legacy `/m/*` URLs 301-redirect
- PWA (manifest, icons, service-worker offline shell) and SEO (canonical, JSON-LD, robots, sitemap, branded 404)

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, no framework)
- **Backend:** Node.js, Express, Vercel Serverless Functions
- **Database:** MongoDB Atlas (Mongoose)
- **Auth:** Firebase Authentication (v10 modular)
- **Deployment:** Vercel
- **Fonts:** Inter (body), Sora (display) via Google Fonts

## Local Development

1. Install dependencies:
   - `npm install`
2. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in the values.
   - Required locally: `MONGODB_URI`.
   - `api/serviceAccountKey.json` (gitignored): download your
     Firebase Admin SDK service account JSON from the Firebase console
     (Project settings → Service accounts → Generate new private key) and
     place it here. Alternatively set `FIREBASE_SERVICE_ACCOUNT` (raw JSON
     or base64) in the environment.
   - Optional: `DAILY_LINK_QUOTA` (default `50`), `RATE_LIMIT_MAX`,
     `RATE_LIMIT_WINDOW_MS`, `ALLOWED_HOSTS`, `CRON_SECRET`, `ADMIN_UIDS`.
3. Run locally:
   - `npm run dev`
4. Open:
   - `http://localhost:5000`

### Deployment notes

- **Vercel + MongoDB Atlas** is the supported setup. Add `MONGODB_URI`,
  `FIREBASE_SERVICE_ACCOUNT`, `CORS_ORIGIN`, `CRON_SECRET` and (optionally)
  `ADMIN_UIDS` in the Vercel project environment.
- **Health check:** `GET /api/health` returns `200` when the app can reach
  MongoDB and `503` otherwise. Point an uptime monitor at it.
- **Cleanup cron:** `vercel.json` schedules `/api/cleanup` daily at 03:00 UTC.
  Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Without
  `CRON_SECRET` the endpoint is disabled.
- **Moderation:** set `ADMIN_UIDS` to one or more comma-separated Firebase UIDs.
  Admins can call `POST /api/admin` with `{ "shortCode": "abc", "action":
  "disable" }` (or `"enable"`).
- **Secrets:** never commit `.env`, `api/serviceAccountKey.json`, `CRON_SECRET`
  or `ADMIN_UIDS`.

> Note: Google Sign-In uses the Firebase web config embedded in the pages.
> Admin verification (dashboard, delete) uses the service account above.

## API Endpoints

- `POST /api/shorten` - Create short URL (requires a Firebase ID token in the `Authorization: Bearer <token>` header; optional `expiresIn`: `1d`, `7d` or `30d`)
- `GET /api/links` - Get logged-in user's links + account aggregates + 30-day click series + traffic breakdown (requires auth; add `?format=csv` to export the filtered view as CSV)
- `PATCH /api/links?shortCode=<code>` - Update a link's destination URL (requires auth + ownership)
- `DELETE /api/links?shortCode=<code>` - Delete one of your links and its click events (requires auth + ownership)
- `DELETE /api/account` - Permanently delete the signed-in user's links, click history and Firebase account (requires a recent sign-in)
- `GET /api/health` - Database health probe for uptime monitoring
- `POST /api/admin` - Disable or enable a link; requires a Firebase token for a UID listed in `ADMIN_UIDS`
- `GET /api/cleanup` - Cron-only expired-link cleanup; requires `Authorization: Bearer $CRON_SECRET`
- `GET /:shortCode` - Redirect to original URL (302) and increment the click count for humans; 410 once expired or disabled

## Testing

- `npm test` — 36 tests across 4 files using Node's built-in runner (`node --test`, ~30s): links API (aggregates, search escaping, date ranges, auth, destination edits), ownership/fail-closed edits & deletes, redirect integrity (atomic click increments, click-event capture, expiry 410s, HTML-vs-JSON errors), alias validation, expiration validation, and short-code ↔ rewrite-pattern invariants.
- Browser verification harness (Playwright, stubbed Firebase v10 ESM modules) covers desktop + mobile flows. Committed screenshots live in `docs/screenshots/`; dated QA captures are kept local in `artifacts/` and are gitignored.
- GitHub Actions is included as a **manual** workflow (`.github/workflows/ci.yml`) so tests are never triggered without an explicit run. Add `push:` / `pull_request:` triggers when you want automatic CI.

## Project Structure

```
api/                 Vercel serverless functions + shared backend code
  _models/           Mongoose schemas (Url, Click, RateLimit)
  _utils/            firebase, database, rate limiting, code generation
  account.js         account deletion (Mongo data + Firebase user)
  admin.js           admin-only link disable/enable
  cleanup.js         cron-only expired-link and click cleanup
  health.js          MongoDB health probe
  links.js           list / search / aggregates / CSV export / destination edits
  redirect.js        302 redirect + bot-filtered click tracking + click events (410 on expiry/disable)
  shorten.js         create short link (quota, optional expiration)
public/              static frontend (index.html, dashboard.html, legal pages, CSS, sw.js, manifest…)
public/vendor/       self-hosted QRCode.js (MIT)
server.js            local Express server (development, :5000)
test/                node --test suite (36 tests)
.github/             manual CI workflow + Dependabot
vercel.json          /m/* 301 redirects, :shortCode rewrite, security headers, cleanup cron
docs/screenshots/    README screenshots (light + dark)
PROJECT-INFO.md      project facts sheet for AI-generated resume/portfolio summaries
AUDIT-REPORT.md      full security/quality audit + remediation log
```

## Author

- ABu

# Linkly — URL Shortener

Full-stack URL shortener with Google authentication, MongoDB persistence, custom aliases, click tracking, and a responsive dashboard.

[![Live Demo](https://img.shields.io/badge/Live-Demo-2563eb?style=for-the-badge&logo=vercel&logoColor=white)](https://linkly-link.vercel.app)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Firebase](https://img.shields.io/badge/Auth-Firebase-DD2C00?style=for-the-badge&logo=firebase&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

## Overview

Linkly turns long URLs into short, shareable links and tracks how they perform. Users sign in with Google, create links with optional custom aliases, and manage everything from a dashboard — search, filter, see click stats, and download QR codes.

## Features

- Shorten long URLs with optional custom aliases
- 302 redirects with per-link click counting
- Firebase Google authentication
- User dashboard with:
  - Search by URL or code
  - Date filters (`All`, `7d`, `30d`)
  - Total links, total clicks, top clicks, filtered count
  - QR code preview and PNG download
  - Click trend sparkline
- IP-based rate limiting on the shorten endpoint
- Host validation for generated short URLs
- Dark mode with persisted preference
- Responsive layouts with dedicated mobile pages and a desktop dashboard

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript (vanilla, no framework)
- **Backend:** Node.js, Express, Vercel Serverless Functions
- **Database:** MongoDB Atlas (Mongoose)
- **Auth:** Firebase Authentication
- **Deployment:** Vercel
- **Fonts:** Inter (body), Sora (display) via Google Fonts

## Local Development

1. Install dependencies:
   - `npm install`
2. Configure environment variables:
   - `.env` (gitignored):
     - `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/linkly`
     - `PORT=5000` (optional)
   - `api/serviceAccountKey.json` (gitignored): download your
     Firebase Admin SDK service account JSON from the Firebase console
     (Project settings → Service accounts → Generate new private key) and
     place it here. Alternatively set `FIREBASE_SERVICE_ACCOUNT` (raw JSON
     or base64) in the Vercel environment.
3. Run locally:
   - `npm run dev`
4. Open:
   - `http://localhost:5000`

> Note: Google Sign-In uses the Firebase web config embedded in the pages.
> Admin verification (dashboard, delete) uses the service account above.

## API Endpoints

- `POST /api/shorten` - Create short URL (optional `Authorization: Bearer <token>`)
- `GET /api/links` - Get logged-in user's links (requires auth)
- `DELETE /api/links/:shortCode` - Delete one of your links (requires auth)
- `GET /:shortCode` - Redirect to original URL (302) and increment click count

## Author

- ABu

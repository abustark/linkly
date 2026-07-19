# Linkly - URL Shortener

Linkly is a full-stack URL shortener with Firebase auth, MongoDB persistence, custom aliases, click tracking, and a modern responsive dashboard.

## Live Demo
- Production: `https://linkly-link.vercel.app`

## Portfolio Case Study

### Problem
The original app worked functionally but had basic UI patterns, limited feedback states, and a dashboard that did not present data in a portfolio-ready way.

### Solution
The project was revamped into a polished, resume-focused product with:
- Redesigned home flow for URL creation with inline states and quick actions.
- Redesigned dashboard with search, filters, stat cards, QR actions, and trend visualization.
- Dark mode toggle with persisted preference across pages.
- Improved runtime robustness for database and Firebase environment parsing in serverless deployment.

### Outcomes
- Faster and clearer shorten flow for first-time users.
- Better data clarity with summary metrics and click trend sparkline.
- Improved visual quality suitable for GitHub and LinkedIn showcase.

## Before / After Screenshots

Add your screenshots in `public/screenshots/` and update these paths:

### Home Page
![Home Before](public/screenshots/home-before.png)
![Home After](public/screenshots/home-after.png)

### Dashboard
![Dashboard Before](public/screenshots/dashboard-before.png)
![Dashboard After](public/screenshots/dashboard-after.png)

## Features
- Shorten long URLs
- Optional custom alias support
- Redirect handling with click counting
- Firebase Google authentication
- User dashboard with:
  - Search by URL or code
  - Date filters (`All`, `7d`, `30d`)
  - Total links, total clicks, top clicks, filtered count
  - QR code preview and PNG download
  - Click trend sparkline
- Dark mode with persisted theme

## Tech Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express, Vercel Serverless Functions
- Database: MongoDB Atlas (Mongoose)
- Auth: Firebase Authentication
- Deployment: Vercel

## Local Development
1. Install dependencies:
   - `npm install`
2. Configure environment variables:
   - `.env` (already gitignored):
     - `MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/linkly`
     - `PORT=5000` (optional)
   - `api/serviceAccountKey.json` (already gitignored): download your
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

## OpenCode Model Launcher
- File: `start-ai.bat`
- Run from project root:
  - `start-ai.bat`

What it does:
1. Checks `OPENROUTER_API_KEY`.
2. If missing, prompts once and saves it as a Windows User Environment Variable.
3. Shows model selector (1-9).
4. Generates `.opencode.json` in the current folder.
5. Launches `opencode`.

Notes:
- You usually paste the API key only once on your machine.
- `.opencode.json` is gitignored because it may contain your key.
- For another project, copy `start-ai.bat` there and run it.

## API Endpoints
- `POST /api/shorten` - Create short URL (optional `Authorization: Bearer <token>`)
- `GET /api/links` - Get logged-in user's links (requires auth)
- `DELETE /api/links/:shortCode` - Delete one of your links (requires auth)
- `GET /:shortCode` - Redirect to original URL (302) and increment click count

## Author
- Basith

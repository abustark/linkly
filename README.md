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
2. Configure local environment variables in `.env`:
   - `MONGODB_URI=...`
3. Run locally:
   - `npm run dev`
4. Open:
   - `http://localhost:5000`

## API Endpoints
- `POST /api/shorten` - Create short URL
- `GET /api/links` - Get logged-in user's links
- `GET /:shortCode` - Redirect to original URL and increment click count

## Author
- Basith AbuSyed

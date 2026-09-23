require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.disable('x-powered-by');
const PORT = process.env.PORT || 5000;

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://accounts.google.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'self'"
};

// Browser calls are same-origin, so CORS is only needed for local tooling.
// Localhost is always allowed; add prod via CORS_ORIGIN=https://a,https://b.
const CORS_ORIGINS = (process.env.CORS_ORIGIN || 'https://linkly-link.vercel.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: [/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/, ...CORS_ORIGINS]
}));
app.use(express.json());
app.use((req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
});
// Legacy /m/* URLs from the old split mobile site → merged responsive pages.
app.use('/m', (req, res) => {
    const target = req.originalUrl.replace(/^\/m(?=\/|$)/, '') || '/';
    res.redirect(301, target);
});

app.use(express.static(path.join(__dirname, 'public')));

const shortenRoute = require('./api/shorten');
const linksRoute = require('./api/links');
const redirectRoute = require('./api/redirect');

app.post('/api/shorten', (req, res) => shortenRoute(req, res));
app.get('/api/shorten', (req, res) => shortenRoute(req, res));
app.get('/api/links', (req, res) => linksRoute(req, res));
app.delete('/api/links', (req, res) => linksRoute(req, res));
app.get('/:shortCode', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) return next();
    req.query.shortCode = req.params.shortCode;
    redirectRoute(req, res);
});

// Unknown API routes → JSON; every other miss → branded 404 page.
app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
});
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.listen(PORT, () => {
    console.log(`Linkly server running on http://localhost:${PORT}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.gstatic.com https://accounts.google.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; frame-src https://accounts.google.com; connect-src 'self' https://accounts.google.com https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.googleapis.com; base-uri 'self'; form-action 'self'; object-src 'none'; frame-ancestors 'self'"
};

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
    res.set(SECURITY_HEADERS);
    next();
});
app.use(express.static(path.join(__dirname, 'public')));

const shortenRoute = require('./api/shorten');
const linksRoute = require('./api/links');
const redirectRoute = require('./api/redirect');

app.post('/api/shorten', (req, res) => shortenRoute(req, res));
app.get('/api/links', (req, res) => linksRoute(req, res));
app.get('/:shortCode', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.includes('.')) return next();
    req.query.shortCode = req.params.shortCode;
    redirectRoute(req, res);
});

app.listen(PORT, () => {
    console.log(`Linkly server running on http://localhost:${PORT}`);
});

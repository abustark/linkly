const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const shortenRoute = require('./api/shorten');
const linksRoute = require('./api/links');
const redirectRoute = require('./api/[shortCode]');

app.post('/api/shorten', (req, res) => shortenRoute(req, res));
app.get('/api/links', (req, res) => linksRoute(req, res));
app.get('/:shortCode', (req, res) => {
    req.query.shortCode = req.params.shortCode;
    redirectRoute(req, res);
});

app.listen(PORT, () => {
    console.log(`Linkly server running on http://localhost:${PORT}`);
});

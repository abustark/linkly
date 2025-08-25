const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('../client')); // Serve frontend files

// Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/../client/index.html');
});

app.post('/api/shorten', (req, res) => {
    res.json({ 
        message: 'API endpoint ready - not implemented yet',
        shortUrl: 'http://localhost:5000/temp123'
    });
});

app.get('/:shortCode', (req, res) => {
    res.send(`Redirect endpoint for ${req.params.shortCode} - not implemented yet`);
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Shorty server running on http://localhost:${PORT}`);
});
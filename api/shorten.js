const connectToDatabase = require('./_utils/database');
const { generateShortCode, MAX_CODE_LENGTH } = require('./_utils/generateCode');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');

const MAX_GENERATION_ATTEMPTS = 8;

// Simple in-memory rate limiter (per serverless instance). Set
// RATE_LIMIT_MAX=0 to disable.
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 30;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const rateBuckets = new Map();

function clientIp(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function isRateLimited(ip) {
    if (RATE_LIMIT_MAX <= 0) return false;
    const now = Date.now();
    const bucket = rateBuckets.get(ip);
    if (!bucket || now - bucket.start >= RATE_LIMIT_WINDOW_MS) {
        rateBuckets.set(ip, { start: now, count: 1 });
        return false;
    }
    bucket.count += 1;
    return bucket.count > RATE_LIMIT_MAX;
}

// Only trust the Host header when it matches an allowlist (set via
// ALLOWED_HOSTS=host1,host2). Empty list keeps the previous behavior.
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

function safeHost(req) {
    const requestHost = (req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    if (ALLOWED_HOSTS.length && requestHost && !ALLOWED_HOSTS.includes(requestHost)) {
        return ALLOWED_HOSTS[0];
    }
    return requestHost;
}

module.exports = async (req, res) => {
    const { originalUrl, customAlias } = req.body;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (isRateLimited(clientIp(req))) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        if (!originalUrl) {
            return res.status(400).json({ error: 'originalUrl is required' });
        }

        let userId = null;
        const { authorization } = req.headers;

        if (authorization && authorization.startsWith('Bearer ')) {
            const idToken = authorization.split('Bearer ')[1];
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                userId = decodedToken.uid;
            } catch (error) {
                console.log('Invalid or expired token. Proceeding as anonymous.');
            }
        }

        await connectToDatabase();

        const trimmedUrl = originalUrl.trim();
        const parsedUrl = new URL(trimmedUrl);

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return res.status(400).json({ error: 'Only http and https URLs are allowed.' });
        }

        const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,12}$/;
        let shortCode = customAlias;
        if (shortCode) {
            shortCode = shortCode.trim();
            if (!ALIAS_PATTERN.test(shortCode)) {
                return res.status(400).json({ error: 'Custom alias must be 3-12 characters using letters, numbers, hyphens, or underscores.' });
            }
            const existing = await Url.findOne({ shortCode: shortCode });
            if (existing) {
                return res.status(409).json({ error: 'This custom alias is already in use.' });
            }
        } else {
            shortCode = await generateUniqueShortCode(Url);
        }
        
        const newUrlData = {
            originalUrl: trimmedUrl,
            shortCode: shortCode,
            userId: userId // Add the user's ID if they are authenticated
        };

        const newUrl = new Url(newUrlData);
        await newUrl.save();

        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = safeHost(req);

        const shortUrl = `${protocol}://${host}/${newUrl.shortCode}`;

        res.status(201).json({
            originalUrl: newUrl.originalUrl,
            shortUrl: shortUrl,
            ownedByUser: !!newUrl.userId
        });

    } catch (error) {
        if (error.message.includes('Invalid URL')) {
            return res.status(400).json({ error: 'Invalid URL format' });
        }
        console.error('Shorten error:', error);
        res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
};

async function generateUniqueShortCode(Url) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const candidate = generateShortCode();
        const existing = await Url.findOne({ shortCode: candidate });
        if (!existing) return candidate;
        // On collision, append a short random number to keep the word base,
        // staying within the 12-char limit enforced by the redirect route.
        const suffix = (Math.floor(Math.random() * 90) + 10);
        const retry = `${candidate}${suffix}`;
        if (retry.length <= MAX_CODE_LENGTH) {
            const retryExisting = await Url.findOne({ shortCode: retry });
            if (!retryExisting) return retry;
        }
    }
    throw new Error('Could not generate a unique short code. Please try again.');
}
const connectToDatabase = require('./_utils/database');
const Url = require('./_models/Url');
const admin = require('./_utils/firebase');
const { checkRateLimit } = require('./_utils/rateLimit');
const {
    buildShortUrl,
    parseDestination,
    validateAlias,
    resolveExpiry,
    generateUniqueShortCode,
    dailyLinkQuota
} = require('./_utils/linkUtils');

function clientIp(req) {
    // x-real-ip is set by the platform (Vercel) and cannot be spoofed by the client.
    const realIp = req.headers['x-real-ip'];
    if (realIp) return String(realIp).trim();
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) return String(forwarded).split(',')[0].trim();
    return (req.socket && req.socket.remoteAddress) || 'unknown';
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { originalUrl, customAlias, expiresIn } = req.body || {};

    const rate = await checkRateLimit(clientIp(req), 'shorten');
    if (rate.limited) {
        if (rate.retryAfterSec && typeof res.setHeader === 'function') {
            res.setHeader('Retry-After', String(rate.retryAfterSec));
        }
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        if (!originalUrl) {
            return res.status(400).json({ error: 'originalUrl is required' });
        }

        const { authorization } = req.headers;
        if (!authorization || !authorization.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Sign in required to shorten URLs.' });
        }

        let userId;
        try {
            const decodedToken = await admin.auth().verifyIdToken(authorization.split('Bearer ')[1]);
            userId = decodedToken.uid;
        } catch (error) {
            return res.status(401).json({ error: 'Your session is invalid or expired. Please sign in again.' });
        }

        await connectToDatabase();

        const destination = parseDestination(originalUrl);
        if (destination.error) {
            return res.status(400).json({ error: destination.error });
        }

        const alias = validateAlias(customAlias);
        if (alias.error) {
            return res.status(400).json({ error: alias.error });
        }

        let shortCode = alias.alias;
        if (shortCode) {
            const existing = await Url.findOne({ shortCode });
            if (existing) {
                return res.status(409).json({ error: 'This custom alias is already in use.' });
            }
        } else {
            shortCode = await generateUniqueShortCode(Url);
        }

        const expiry = resolveExpiry(expiresIn);
        if (expiry.error) {
            return res.status(400).json({ error: expiry.error });
        }

        const quota = await checkRateLimit(userId, 'shorten-daily', {
            max: dailyLinkQuota(),
            windowMs: 86400000
        });
        if (quota.limited) {
            if (quota.retryAfterSec && typeof res.setHeader === 'function') {
                res.setHeader('Retry-After', String(quota.retryAfterSec));
            }
            return res.status(429).json({ error: 'Daily link limit reached. Please try again tomorrow.' });
        }

        const newUrl = new Url({
            originalUrl: destination.url,
            shortCode: shortCode,
            userId: userId,
            expiresAt: expiry.expiresAt
        });
        await newUrl.save();

        res.status(201).json({
            originalUrl: newUrl.originalUrl,
            shortUrl: buildShortUrl(req, newUrl.shortCode),
            expiresAt: newUrl.expiresAt,
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

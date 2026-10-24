const connectToDatabase = require('../_utils/database');
const Url = require('../_models/Url');
const { checkRateLimit } = require('../_utils/rateLimit');
const { authenticateApiKey } = require('../_utils/apiKeys');
const {
    buildShortUrl,
    parseDestination,
    validateAlias,
    resolveExpiry,
    generateUniqueShortCode,
    dailyLinkQuota
} = require('../_utils/linkUtils');

const API_RATE_LIMIT = 120;
const API_RATE_WINDOW_MS = 60000;

function sendError(res, status, code, message) {
    return res.status(status).json({ error: { code, message } });
}

function setRateHeaders(res, rate) {
    if (rate.limit !== undefined) res.setHeader('X-RateLimit-Limit', String(rate.limit));
    if (rate.remaining !== undefined) res.setHeader('X-RateLimit-Remaining', String(rate.remaining));
    if (rate.resetAt !== undefined) res.setHeader('X-RateLimit-Reset', String(rate.resetAt));
}

function publicLink(req, link) {
    return {
        shortCode: link.shortCode,
        shortUrl: buildShortUrl(req, link.shortCode),
        originalUrl: link.originalUrl,
        clickCount: link.clickCount || 0,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt || null,
        disabled: !!link.disabled
    };
}

async function authenticate(req, res) {
    const key = await authenticateApiKey(req);
    if (!key) {
        sendError(res, 401, 'invalid_api_key', 'Provide a valid API key using "Authorization: Bearer lk_live_..." or "X-API-Key".');
        return null;
    }
    const rate = await checkRateLimit(String(key._id), 'api', {
        max: API_RATE_LIMIT,
        windowMs: API_RATE_WINDOW_MS
    });
    setRateHeaders(res, rate);
    if (rate.limited) {
        res.setHeader('Retry-After', String(rate.retryAfterSec || 60));
        sendError(res, 429, 'rate_limited', 'Too many requests for this API key. Slow down and retry.');
        return null;
    }
    return key;
}

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
        return res.status(204).end();
    }

    try {
        await connectToDatabase();
    } catch (error) {
        return sendError(res, 503, 'database_unavailable', 'The service is temporarily unavailable.');
    }

    const key = await authenticate(req, res);
    if (!key) return;

    if (req.method === 'GET') {
        try {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 25));
            const skip = (page - 1) * pageSize;

            const query = { userId: key.userId };
            if (req.query.range === '7d') {
                query.createdAt = { $gte: new Date(Date.now() - 7 * 86400000) };
            } else if (req.query.range === '30d') {
                query.createdAt = { $gte: new Date(Date.now() - 30 * 86400000) };
            }

            const search = String(req.query.q || '').trim().toLowerCase();
            if (search) {
                const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                query.$or = [
                    { originalUrl: { $regex: safeSearch, $options: 'i' } },
                    { shortCode: { $regex: safeSearch, $options: 'i' } }
                ];
            }

            const [total, links, totals] = await Promise.all([
                Url.countDocuments(query),
                Url.find(query).sort({ createdAt: -1 }).skip(skip).limit(pageSize),
                Url.aggregate([
                    { $match: { userId: key.userId } },
                    { $group: { _id: null, totalClicks: { $sum: '$clickCount' } } }
                ])
            ]);

            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            return res.status(200).json({
                data: links.map((link) => publicLink(req, link)),
                meta: {
                    page,
                    pageSize,
                    total,
                    totalPages,
                    hasMore: page < totalPages,
                    totalClicks: (totals[0] && totals[0].totalClicks) || 0
                }
            });
        } catch (error) {
            console.error('API list links error:', error);
            return sendError(res, 500, 'internal_error', 'Could not list links.');
        }
    }

    if (req.method === 'POST') {
        try {
            const body = req.body || {};
            const destination = parseDestination(body.url || body.originalUrl);
            if (destination.error) {
                return sendError(res, 400, 'invalid_url', destination.error);
            }

            const alias = validateAlias(body.alias || body.customAlias);
            if (alias.error) {
                return sendError(res, 400, 'invalid_alias', alias.error);
            }

            const expiry = resolveExpiry(body.expiresIn);
            if (expiry.error) {
                return sendError(res, 400, 'invalid_expiry', expiry.error);
            }

            let shortCode = alias.alias;
            if (shortCode) {
                const existing = await Url.findOne({ shortCode });
                if (existing) {
                    return sendError(res, 409, 'alias_taken', 'This alias is already in use.');
                }
            } else {
                shortCode = await generateUniqueShortCode(Url);
            }

            const quota = await checkRateLimit(key.userId, 'shorten-daily', {
                max: dailyLinkQuota(),
                windowMs: 86400000
            });
            if (quota.limited) {
                res.setHeader('Retry-After', String(quota.retryAfterSec || 60));
                return sendError(res, 429, 'quota_exceeded', 'Daily link limit reached. Try again tomorrow.');
            }

            const link = await Url.create({
                originalUrl: destination.url,
                shortCode,
                userId: key.userId,
                expiresAt: expiry.expiresAt
            });

            return res.status(201).json({ data: publicLink(req, link) });
        } catch (error) {
            console.error('API create link error:', error);
            return sendError(res, 500, 'internal_error', 'Could not create the link.');
        }
    }

    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return sendError(res, 405, 'method_not_allowed', 'Use GET or POST on this endpoint.');
};

const connectToDatabase = require('../../_utils/database');
const Url = require('../../_models/Url');
const Click = require('../../_models/Click');
const { checkRateLimit } = require('../../_utils/rateLimit');
const { authenticateApiKey } = require('../../_utils/apiKeys');
const { buildShortUrl, parseDestination } = require('../../_utils/linkUtils');

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

module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE', 'OPTIONS']);
        return res.status(204).end();
    }

    try {
        await connectToDatabase();
    } catch (error) {
        return sendError(res, 503, 'database_unavailable', 'The service is temporarily unavailable.');
    }

    const key = await authenticateApiKey(req);
    if (!key) {
        return sendError(res, 401, 'invalid_api_key', 'Provide a valid API key using "Authorization: Bearer lk_live_..." or "X-API-Key".');
    }

    const rate = await checkRateLimit(String(key._id), 'api', {
        max: API_RATE_LIMIT,
        windowMs: API_RATE_WINDOW_MS
    });
    setRateHeaders(res, rate);
    if (rate.limited) {
        res.setHeader('Retry-After', String(rate.retryAfterSec || 60));
        return sendError(res, 429, 'rate_limited', 'Too many requests for this API key. Slow down and retry.');
    }

    const shortCode = String((req.query && req.query.code) || (req.params && req.params.code) || '').trim();
    if (!shortCode) {
        return sendError(res, 400, 'missing_code', 'A short code is required in the path.');
    }

    try {
        const link = await Url.findOne({ shortCode });
        if (!link) {
            return sendError(res, 404, 'not_found', 'No link exists with that short code.');
        }
        if (link.userId !== key.userId) {
            return sendError(res, 403, 'forbidden', 'This API key does not own that link.');
        }

        if (req.method === 'GET') {
            return res.status(200).json({ data: publicLink(req, link) });
        }

        if (req.method === 'PATCH') {
            const body = req.body || {};
            const destination = parseDestination(body.url || body.originalUrl);
            if (destination.error) {
                return sendError(res, 400, 'invalid_url', destination.error);
            }
            link.originalUrl = destination.url;
            await link.save();
            return res.status(200).json({ data: publicLink(req, link) });
        }

        if (req.method === 'DELETE') {
            await Url.deleteOne({ _id: link._id });
            try {
                await Click.deleteMany({ shortCode: link.shortCode });
            } catch (clickError) {
                console.error('API click cleanup error:', clickError);
            }
            return res.status(200).json({ data: { shortCode: link.shortCode, deleted: true } });
        }

        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE', 'OPTIONS']);
        return sendError(res, 405, 'method_not_allowed', 'Use GET, PATCH or DELETE on this endpoint.');
    } catch (error) {
        console.error('API link error:', error);
        return sendError(res, 500, 'internal_error', 'Could not complete the request.');
    }
};

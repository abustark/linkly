const crypto = require('crypto');
const ApiKey = require('../_models/ApiKey');

const KEY_PREFIX = 'lk_live_';
const MAX_ACTIVE_KEYS = 10;
const LAST_USED_THROTTLE_MS = 60 * 1000;

function hashKey(rawKey) {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function generateRawKey() {
    return `${KEY_PREFIX}${crypto.randomBytes(24).toString('base64url')}`;
}

function displayPrefix(rawKey) {
    return `${rawKey.slice(0, KEY_PREFIX.length + 6)}\u2026`;
}

function extractRawKey(req) {
    const headers = req.headers || {};
    const authorization = String(headers.authorization || '');
    if (authorization.startsWith('Bearer ')) {
        const token = authorization.slice('Bearer '.length).trim();
        if (token.startsWith(KEY_PREFIX)) return token;
    }
    const headerKey = String(headers['x-api-key'] || '').trim();
    return headerKey.startsWith(KEY_PREFIX) ? headerKey : '';
}

async function countActiveKeys(userId) {
    return ApiKey.countDocuments({ userId, revokedAt: null });
}

async function createApiKey(userId, name) {
    const active = await countActiveKeys(userId);
    if (active >= MAX_ACTIVE_KEYS) {
        return { error: `You can have at most ${MAX_ACTIVE_KEYS} active API keys. Revoke one first.` };
    }

    const rawKey = generateRawKey();
    const record = await ApiKey.create({
        userId,
        name: name || 'Default key',
        prefix: displayPrefix(rawKey),
        hash: hashKey(rawKey)
    });

    return { key: rawKey, record };
}

// Returns the ApiKey document for a valid, non-revoked key, or null.
async function authenticateApiKey(req) {
    const rawKey = extractRawKey(req);
    if (!rawKey) return null;

    const record = await ApiKey.findOne({ hash: hashKey(rawKey), revokedAt: null });
    if (!record) return null;

    const now = Date.now();
    if (!record.lastUsedAt || now - new Date(record.lastUsedAt).getTime() > LAST_USED_THROTTLE_MS) {
        // Fire-and-forget: a failed usage stamp must not reject a valid request.
        ApiKey.updateOne({ _id: record._id }, { $set: { lastUsedAt: new Date(now) } }).catch(() => {});
    }
    return record;
}

function publicKeyView(record) {
    return {
        id: String(record._id),
        name: record.name,
        prefix: record.prefix,
        createdAt: record.createdAt,
        lastUsedAt: record.lastUsedAt,
        active: !record.revokedAt
    };
}

module.exports = {
    KEY_PREFIX,
    MAX_ACTIVE_KEYS,
    createApiKey,
    authenticateApiKey,
    publicKeyView
};

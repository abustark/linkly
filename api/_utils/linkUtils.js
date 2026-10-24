const { generateShortCode, MAX_CODE_LENGTH } = require('./generateCode');

const MAX_GENERATION_ATTEMPTS = 8;

const ALIAS_PATTERN = /^[a-zA-Z0-9_-]{3,12}$/;

// Optional lifetime for a short link. Empty/absent means "never expires".
const EXPIRY_MS = {
    '1d': 86400000,
    '7d': 7 * 86400000,
    '30d': 30 * 86400000
};

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

function buildShortUrl(req, shortCode) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = safeHost(req);
    return `${protocol}://${host}/${shortCode}`;
}

function parseDestination(value) {
    if (!value || typeof value !== 'string') {
        return { error: 'originalUrl is required' };
    }
    const trimmed = value.trim();
    let parsed;
    try {
        parsed = new URL(trimmed);
    } catch (error) {
        return { error: 'Invalid URL format' };
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { error: 'Only http and https URLs are allowed.' };
    }
    return { url: trimmed };
}

function validateAlias(value) {
    const alias = String(value || '').trim();
    if (!alias) return { alias: null };
    if (!ALIAS_PATTERN.test(alias)) {
        return { error: 'Custom alias must be 3-12 characters using letters, numbers, hyphens, or underscores.' };
    }
    return { alias };
}

function resolveExpiry(expiresIn) {
    if (!expiresIn) return { expiresAt: null };
    if (!Object.prototype.hasOwnProperty.call(EXPIRY_MS, expiresIn)) {
        return { error: 'expiresIn must be one of: 1d, 7d, 30d.' };
    }
    return { expiresAt: new Date(Date.now() + EXPIRY_MS[expiresIn]) };
}

async function generateUniqueShortCode(Url) {
    for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
        const candidate = generateShortCode();
        const existing = await Url.findOne({ shortCode: candidate });
        if (!existing) return candidate;
        const suffix = (Math.floor(Math.random() * 90) + 10);
        const retry = `${candidate}${suffix}`;
        if (retry.length <= MAX_CODE_LENGTH) {
            const retryExisting = await Url.findOne({ shortCode: retry });
            if (!retryExisting) return retry;
        }
    }
    throw new Error('Could not generate a unique short code. Please try again.');
}

function dailyLinkQuota() {
    const parsed = parseInt(process.env.DAILY_LINK_QUOTA, 10);
    return Number.isFinite(parsed) ? parsed : 50;
}

module.exports = {
    ALIAS_PATTERN,
    EXPIRY_MS,
    buildShortUrl,
    parseDestination,
    validateAlias,
    resolveExpiry,
    generateUniqueShortCode,
    dailyLinkQuota
};

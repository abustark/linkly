const mongoose = require('mongoose');
const connectToDatabase = require('./database');
const RateLimit = require('../_models/RateLimit');

// Persistent rate limiting (shared across serverless instances via MongoDB).
// RATE_LIMIT_MAX=0 disables. Falls back to the old per-instance in-memory
// bucket when the DB is unreachable, so shortening never hard-fails on a
// transient connection error.
function intEnv(name, fallback) {
    const parsed = parseInt(process.env[name], 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const RATE_LIMIT_MAX = intEnv('RATE_LIMIT_MAX', 30);
const RATE_LIMIT_WINDOW_MS = intEnv('RATE_LIMIT_WINDOW_MS', 60000);

const memoryBuckets = new Map();

function inMemoryLimit(key, now, max, windowMs) {
    if (memoryBuckets.size > 500) {
        for (const [k, v] of memoryBuckets) {
            if (now - v.start >= windowMs) memoryBuckets.delete(k);
        }
    }
    const bucket = memoryBuckets.get(key);
    if (!bucket || now - bucket.start >= windowMs) {
        memoryBuckets.set(key, { start: now, count: 1 });
        return { limited: false };
    }
    bucket.count += 1;
    if (bucket.count > max) {
        return { limited: true, retryAfterSec: Math.max(1, Math.ceil((bucket.start + windowMs - now) / 1000)) };
    }
    return { limited: false };
}

// `options` lets callers apply a different budget/window (e.g. the daily
// per-user creation quota) while sharing the Mongo-backed store.
async function checkRateLimit(identifier, keyPrefix, options = {}) {
    const max = Number.isFinite(options.max) ? options.max : RATE_LIMIT_MAX;
    const windowMs = Number.isFinite(options.windowMs) ? options.windowMs : RATE_LIMIT_WINDOW_MS;
    if (max <= 0) return { limited: false };
    const now = Date.now();
    const key = `${keyPrefix}:${identifier}`;

    try {
        await connectToDatabase();
        if (mongoose.connection.readyState !== 1) throw new Error('not connected');

        const windowStart = Math.floor(now / windowMs) * windowMs;
        const docKey = `${key}:${windowStart}`;
        const expiresAt = new Date(windowStart + windowMs + 60000);

        let updated;
        try {
            updated = await RateLimit.findOneAndUpdate(
                { _id: docKey },
                { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
                { upsert: true, new: true }
            );
        } catch (error) {
            // Concurrent first hit in a new window raced the upsert — count it anyway.
            if (error && error.code === 11000) {
                updated = await RateLimit.findOneAndUpdate({ _id: docKey }, { $inc: { count: 1 } }, { new: true });
            } else {
                throw error;
            }
        }

        const count = (updated && updated.count) || 1;
        if (count > max) {
            return {
                limited: true,
                retryAfterSec: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000))
            };
        }
        return { limited: false };
    } catch (error) {
        console.warn('Rate limiter using in-memory fallback:', error.message);
        return inMemoryLimit(key, now, max, windowMs);
    }
}

module.exports = { checkRateLimit };

const mongoose = require('mongoose');
const connectToDatabase = require('./database');
const RateLimit = require('../_models/RateLimit');

// Persistent rate limiting (shared across serverless instances via MongoDB).
// RATE_LIMIT_MAX=0 disables. Falls back to the old per-instance in-memory
// bucket when the DB is unreachable, so shortening never hard-fails on a
// transient connection error.
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX, 10) || 30;
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;

const memoryBuckets = new Map();

function inMemoryLimit(key, now) {
    if (memoryBuckets.size > 500) {
        for (const [k, v] of memoryBuckets) {
            if (now - v.start >= RATE_LIMIT_WINDOW_MS) memoryBuckets.delete(k);
        }
    }
    const bucket = memoryBuckets.get(key);
    if (!bucket || now - bucket.start >= RATE_LIMIT_WINDOW_MS) {
        memoryBuckets.set(key, { start: now, count: 1 });
        return { limited: false };
    }
    bucket.count += 1;
    if (bucket.count > RATE_LIMIT_MAX) {
        return { limited: true, retryAfterSec: Math.max(1, Math.ceil((bucket.start + RATE_LIMIT_WINDOW_MS - now) / 1000)) };
    }
    return { limited: false };
}

async function checkRateLimit(ip, keyPrefix) {
    if (RATE_LIMIT_MAX <= 0) return { limited: false };
    const now = Date.now();
    const key = `${keyPrefix}:${ip}`;

    try {
        await connectToDatabase();
        if (mongoose.connection.readyState !== 1) throw new Error('not connected');

        const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
        const docKey = `${key}:${windowStart}`;
        const expiresAt = new Date(windowStart + RATE_LIMIT_WINDOW_MS + 60000);

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
        if (count > RATE_LIMIT_MAX) {
            return {
                limited: true,
                retryAfterSec: Math.max(1, Math.ceil((windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000))
            };
        }
        return { limited: false };
    } catch (error) {
        console.warn('Rate limiter using in-memory fallback:', error.message);
        return inMemoryLimit(key, now);
    }
}

module.exports = { checkRateLimit };

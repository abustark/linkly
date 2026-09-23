const mongoose = require('mongoose');

// Fixed-window request counter. _id = "<prefix>:<ip>:<windowStart>" so each
// window is its own document; expiresAt (TTL index) cleans old windows up.
const rateLimitSchema = new mongoose.Schema(
    {
        _id: String,
        count: { type: Number, default: 0 },
        expiresAt: { type: Date, required: true }
    },
    { versionKey: false }
);

rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RateLimit', rateLimitSchema);

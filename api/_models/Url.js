const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
    originalUrl: {
        type: String,
        required: true,
        trim: true
    },

     userId: {
        type: String, // This will store the Firebase UID
        required: false, // For now, allow anonymous links
    },

    
    shortCode: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    clickCount: {
        type: Number,
        default: 0
    },
    // Optional expiry; null/absent means the link never expires.
    expiresAt: {
        type: Date,
        default: null
    },
    // Per-day click buckets (UTC day keys, e.g. "2026-09-23") for the time-series chart.
    clicksByDay: {
        type: mongoose.Schema.Types.Mixed,
        required: false
    },
    // Set by moderators; disabled links stop resolving and stop counting clicks.
    disabled: {
        type: Boolean,
        default: false
    },
    disabledAt: {
        type: Date,
        default: null
    },
    disabledBy: {
        type: String,
        default: null
    }
});

// Dashboard queries filter by owner and sort newest first; the expiry index
// keeps the scheduled cleanup pass cheap.
urlSchema.index({ userId: 1, createdAt: -1 });
urlSchema.index({ expiresAt: 1 });

module.exports = mongoose.model('Url', urlSchema);